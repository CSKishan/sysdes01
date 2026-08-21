import { describe, expect, it } from 'vitest'
import { computeSystemAvailability } from '../metrics'
import type { GraphEdge, GraphNode, SimGraph } from '../types'

function client(id = 'client'): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } }
}
function server(id: string, availability?: number): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8, availability },
  }
}
function loadBalancer(id: string, availability?: number): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4, availability },
  }
}
function edge(source: string, target: string): GraphEdge {
  return { id: `${source}=>${target}`, source, target }
}

describe('computeSystemAvailability', () => {
  it('a single server in series matches its own availability', () => {
    const graph: SimGraph = { nodes: [client(), server('s1', 0.999)], edges: [edge('client', 's1')] }
    expect(computeSystemAvailability(graph)).toBeCloseTo(0.999, 6)
  })

  it('two components in series matches the README worked example: 99.9% x 99.9% = 99.8%', () => {
    // client -> lb (99.9%) -> single server (99.9%): the LB and its one
    // downstream branch compose in series since there's no redundancy.
    const graph: SimGraph = {
      nodes: [client(), loadBalancer('lb', 0.999), server('s1', 0.999)],
      edges: [edge('client', 'lb'), edge('lb', 's1')],
    }
    expect(computeSystemAvailability(graph)).toBeCloseTo(0.999 * 0.999, 6)
  })

  it('two redundant servers behind a (perfectly available) dispatcher compose in parallel', () => {
    const graph: SimGraph = {
      nodes: [client(), loadBalancer('lb', 1), server('a', 0.99), server('b', 0.99)],
      edges: [edge('client', 'lb'), edge('lb', 'a'), edge('lb', 'b')],
    }
    // 1 - (1-0.99)*(1-0.99) = 0.9999
    expect(computeSystemAvailability(graph)).toBeCloseTo(0.9999, 6)
  })

  it('redundancy behind an imperfect dispatcher is capped by the dispatcher itself', () => {
    const graph: SimGraph = {
      nodes: [client(), loadBalancer('lb', 0.999), server('a', 0.999999), server('b', 0.999999)],
      edges: [edge('client', 'lb'), edge('lb', 'a'), edge('lb', 'b')],
    }
    const result = computeSystemAvailability(graph)
    // near-perfect servers still can't push the system past the LB's own 99.9%
    expect(result).toBeLessThan(0.9995)
    expect(result).toBeGreaterThan(0.998)
  })

  it('redundant servers beat a single server of the same individual availability', () => {
    const single: SimGraph = { nodes: [client(), server('s1', 0.95)], edges: [edge('client', 's1')] }
    const redundant: SimGraph = {
      nodes: [client(), loadBalancer('lb', 1), server('a', 0.95), server('b', 0.95)],
      edges: [edge('client', 'lb'), edge('lb', 'a'), edge('lb', 'b')],
    }
    expect(computeSystemAvailability(redundant)).toBeGreaterThan(computeSystemAvailability(single))
  })

  it('falls back to sensible defaults when availability is unset', () => {
    const graph: SimGraph = { nodes: [client(), server('s1')], edges: [edge('client', 's1')] }
    const result = computeSystemAvailability(graph)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})
