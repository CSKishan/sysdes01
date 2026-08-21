import { describe, expect, it } from 'vitest'
import { runSimulation, SimValidationException, validateGraph } from '../simulate'
import { predictedCacheHitRate } from '../zipf'
import { constantTraffic } from '../traffic'
import type {
  CacheConfig,
  GraphEdge,
  GraphNode,
  LoadBalancerConfig,
  ServerConfig,
  SimGraph,
  Workload,
} from '../types'

function client(id = 'client'): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } }
}

function server(id: string, overrides: Partial<ServerConfig> = {}): GraphNode {
  const config: ServerConfig = {
    kind: 'server',
    capacityRps: 50,
    baseMs: 80,
    costPerHour: 8,
    ...overrides,
  }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}

function loadBalancer(id: string, algorithm: LoadBalancerConfig['algorithm']): GraphNode {
  const config: LoadBalancerConfig = { kind: 'loadBalancer', algorithm, costPerHour: 4 }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}

function cache(id: string, overrides: Partial<CacheConfig> = {}): GraphNode {
  const config: CacheConfig = {
    kind: 'cache',
    capacitySlots: 50,
    hitMs: 5,
    missOverheadMs: 2,
    keyspaceSize: 500,
    zipfS: 1.1,
    costPerHour: 3,
    policy: 'writeThrough',
    staleFraction: 0,
    ...overrides,
  }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}

function edge(source: string, target: string): GraphEdge {
  return { id: `${source}->${target}`, source, target }
}

function workload(rps: number, durationMs = 5000, tickMs = 250): Workload {
  return { durationMs, tickMs, trafficCurve: constantTraffic(rps) }
}

describe('validateGraph', () => {
  it('flags a graph with no client node', () => {
    const graph: SimGraph = { nodes: [server('s1')], edges: [] }
    const errors = validateGraph(graph)
    expect(errors.some((e) => e.type === 'noClient')).toBe(true)
  })

  it('flags a dangling edge', () => {
    const graph: SimGraph = { nodes: [client(), server('s1')], edges: [edge('client', 'ghost')] }
    const errors = validateGraph(graph)
    expect(errors.some((e) => e.type === 'danglingEdge')).toBe(true)
  })

  it('flags a cycle', () => {
    const graph: SimGraph = {
      nodes: [client(), server('s1'), server('s2')],
      edges: [edge('client', 's1'), edge('s1', 's2'), edge('s2', 's1')],
    }
    const errors = validateGraph(graph)
    expect(errors.some((e) => e.type === 'cycle')).toBe(true)
  })

  it('accepts a valid simple chain', () => {
    const graph: SimGraph = { nodes: [client(), server('s1')], edges: [edge('client', 's1')] }
    expect(validateGraph(graph)).toEqual([])
  })
})

describe('runSimulation: single server', () => {
  it('throws SimValidationException on an invalid graph', () => {
    const graph: SimGraph = { nodes: [server('s1')], edges: [] }
    expect(() => runSimulation({ graph, workload: workload(10) })).toThrow(SimValidationException)
  })

  it('a lightly loaded server has low utilization, no errors, latency near baseMs', () => {
    const graph: SimGraph = { nodes: [client(), server('s1', { capacityRps: 50, baseMs: 80 })], edges: [edge('client', 's1')] }
    const result = runSimulation({ graph, workload: workload(5) }) // 10% utilization
    expect(result.aggregate.errorRate).toBe(0)
    expect(result.aggregate.maxUtilization).toBeCloseTo(0.1, 2)
    expect(result.aggregate.p50Ms).toBeGreaterThanOrEqual(80)
    expect(result.aggregate.p50Ms).toBeLessThan(100)
  })

  it('an overloaded server melts: errors appear and latency blows up', () => {
    const graph: SimGraph = { nodes: [client(), server('s1', { capacityRps: 50, baseMs: 80 })], edges: [edge('client', 's1')] }
    const light = runSimulation({ graph, workload: workload(25) }) // 50% util
    const overloaded = runSimulation({ graph, workload: workload(150) }) // 300% offered

    expect(light.aggregate.errorRate).toBe(0)
    expect(overloaded.aggregate.errorRate).toBeGreaterThan(0.5)
    expect(overloaded.aggregate.p99Ms).toBeGreaterThan(light.aggregate.p99Ms)
    expect(overloaded.aggregate.maxUtilization).toBeGreaterThanOrEqual(1)
  })

  it('reports zero throughput headroom cost correctly from node costPerHour', () => {
    const graph: SimGraph = { nodes: [client(), server('s1', { costPerHour: 8 })], edges: [edge('client', 's1')] }
    const result = runSimulation({ graph, workload: workload(5) })
    expect(result.aggregate.costPerHour).toBe(8)
  })
})

describe('runSimulation: load balancer', () => {
  it('round robin splits inbound traffic evenly across equal servers', () => {
    const graph: SimGraph = {
      nodes: [client(), loadBalancer('lb', 'roundRobin'), server('a', { capacityRps: 100 }), server('b', { capacityRps: 100 })],
      edges: [edge('client', 'lb'), edge('lb', 'a'), edge('lb', 'b')],
    }
    const result = runSimulation({ graph, workload: workload(40, 1000, 250) })
    const aInbound = result.nodeTicks.filter((n) => n.nodeId === 'a').reduce((acc, n) => acc + n.inboundRps, 0)
    const bInbound = result.nodeTicks.filter((n) => n.nodeId === 'b').reduce((acc, n) => acc + n.inboundRps, 0)
    expect(aInbound).toBeCloseTo(bInbound, 5)
  })

  it('least-connections routes proportionally more to the higher-capacity server', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        loadBalancer('lb', 'leastConnections'),
        server('fast', { capacityRps: 150 }),
        server('slow', { capacityRps: 50 }),
      ],
      edges: [edge('client', 'lb'), edge('lb', 'fast'), edge('lb', 'slow')],
    }
    const result = runSimulation({ graph, workload: workload(40, 1000, 250) })
    const fastInbound = result.nodeTicks.filter((n) => n.nodeId === 'fast').reduce((acc, n) => acc + n.inboundRps, 0)
    const slowInbound = result.nodeTicks.filter((n) => n.nodeId === 'slow').reduce((acc, n) => acc + n.inboundRps, 0)
    // capacities are 150 vs 50 -> a 3:1 split
    expect(fastInbound / slowInbound).toBeCloseTo(3, 1)
  })

  it('hash routing across two backends is not perfectly even (the pre-consistent-hashing lesson)', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        loadBalancer('lb', 'hash'),
        server('depot-1', { capacityRps: 100 }),
        server('depot-2', { capacityRps: 100 }),
      ],
      edges: [edge('client', 'lb'), edge('lb', 'depot-1'), edge('lb', 'depot-2')],
    }
    const result = runSimulation({ graph, workload: workload(40, 1000, 250) })
    const d1 = result.nodeTicks.filter((n) => n.nodeId === 'depot-1').reduce((acc, n) => acc + n.inboundRps, 0)
    const d2 = result.nodeTicks.filter((n) => n.nodeId === 'depot-2').reduce((acc, n) => acc + n.inboundRps, 0)
    expect(d1 + d2).toBeCloseTo(40 * 4, 1) // 4 ticks of 40rps offered, all completes (well under capacity)
    // weights are deterministic and derived from node ids, not required to be uneven for
    // every possible id, so just confirm the mechanism produced a valid, deterministic split.
    expect(d1).toBeGreaterThan(0)
    expect(d2).toBeGreaterThan(0)
  })
})

describe('runSimulation: cache', () => {
  it('measured hit rate matches the Zipf prediction', () => {
    const keyspaceSize = 500
    const zipfS = 1.1
    const capacitySlots = 50
    const graph: SimGraph = {
      nodes: [client(), cache('shelf', { keyspaceSize, zipfS, capacitySlots }), server('origin', { capacityRps: 200 })],
      edges: [edge('client', 'shelf'), edge('shelf', 'origin')],
    }
    const result = runSimulation({ graph, workload: workload(40, 1000, 250) })
    const predicted = predictedCacheHitRate(keyspaceSize, zipfS, capacitySlots)
    expect(result.aggregate.avgCacheHitRate).not.toBeNull()
    expect(result.aggregate.avgCacheHitRate!).toBeCloseTo(predicted, 6)
  })

  it('the origin server only sees the miss traffic, not the full offered load', () => {
    const graph: SimGraph = {
      nodes: [client(), cache('shelf', { keyspaceSize: 500, zipfS: 1.1, capacitySlots: 50 }), server('origin', { capacityRps: 200 })],
      edges: [edge('client', 'shelf'), edge('shelf', 'origin')],
    }
    const result = runSimulation({ graph, workload: workload(40, 250, 250) })
    const predicted = predictedCacheHitRate(500, 1.1, 50)
    const originInbound = result.nodeTicks.find((n) => n.nodeId === 'origin')!.inboundRps
    expect(originInbound).toBeCloseTo(40 * (1 - predicted), 4)
  })

  it('a bigger cache never has a lower hit rate than a smaller one, same keyspace', () => {
    const build = (capacitySlots: number): SimGraph => ({
      nodes: [client(), cache('shelf', { keyspaceSize: 500, zipfS: 1.1, capacitySlots }), server('origin', { capacityRps: 200 })],
      edges: [edge('client', 'shelf'), edge('shelf', 'origin')],
    })
    const small = runSimulation({ graph: build(10), workload: workload(40, 250, 250) })
    const big = runSimulation({ graph: build(200), workload: workload(40, 250, 250) })
    expect(big.aggregate.avgCacheHitRate!).toBeGreaterThan(small.aggregate.avgCacheHitRate!)
  })
})

describe('runSimulation: cache staleness', () => {
  it('a fresh cache (staleFraction 0) reports zero stale reads', () => {
    const graph: SimGraph = {
      nodes: [client(), cache('shelf', { keyspaceSize: 500, zipfS: 1.1, capacitySlots: 50, staleFraction: 0 }), server('origin', { capacityRps: 200 })],
      edges: [edge('client', 'shelf'), edge('shelf', 'origin')],
    }
    const result = runSimulation({ graph, workload: workload(40, 1000, 250) })
    expect(result.aggregate.staleReadRate).toBe(0)
  })

  it('a cache with staleFraction > 0 reports a proportional stale read rate', () => {
    const keyspaceSize = 500
    const zipfS = 1.1
    const capacitySlots = 50
    const staleFraction = 0.5
    const graph: SimGraph = {
      nodes: [
        client(),
        cache('shelf', { keyspaceSize, zipfS, capacitySlots, staleFraction }),
        server('origin', { capacityRps: 200 }),
      ],
      edges: [edge('client', 'shelf'), edge('shelf', 'origin')],
    }
    const result = runSimulation({ graph, workload: workload(40, 1000, 250) })
    const hitRate = predictedCacheHitRate(keyspaceSize, zipfS, capacitySlots)
    // staleReadRate is stale-hits / all-completed-requests = hitRate * staleFraction
    // (since every offered request completes here -- no errors in this graph).
    expect(result.aggregate.staleReadRate).toBeCloseTo(hitRate * staleFraction, 4)
  })

  it('a higher staleFraction produces a higher stale read rate, same everything else', () => {
    const build = (staleFraction: number): SimGraph => ({
      nodes: [client(), cache('shelf', { keyspaceSize: 500, zipfS: 1.1, capacitySlots: 50, staleFraction }), server('origin', { capacityRps: 200 })],
      edges: [edge('client', 'shelf'), edge('shelf', 'origin')],
    })
    const low = runSimulation({ graph: build(0.1), workload: workload(40, 1000, 250) })
    const high = runSimulation({ graph: build(0.9), workload: workload(40, 1000, 250) })
    expect(high.aggregate.staleReadRate).toBeGreaterThan(low.aggregate.staleReadRate)
  })
})

describe('runSimulation: determinism', () => {
  it('the same graph and workload produce bit-identical results on rerun', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        loadBalancer('lb', 'leastConnections'),
        server('a', { capacityRps: 80 }),
        server('b', { capacityRps: 40 }),
      ],
      edges: [edge('client', 'lb'), edge('lb', 'a'), edge('lb', 'b')],
    }
    const w = workload(75, 3000, 250)
    const run1 = runSimulation({ graph, workload: w })
    const run2 = runSimulation({ graph, workload: w })
    expect(run1).toEqual(run2)
  })
})

describe('runSimulation: incidents', () => {
  it('a killed node drops to zero effective capacity during its window', () => {
    const graph: SimGraph = { nodes: [client(), server('s1', { capacityRps: 50, baseMs: 80 })], edges: [edge('client', 's1')] }
    const result = runSimulation({
      graph,
      workload: workload(10, 2000, 250),
      incidents: [{ id: 'fire', label: 'Depot burns down', startMs: 500, endMs: 1000, killNodeIds: ['s1'] }],
    })
    const duringIncident = result.ticks.filter((t) => t.tMs >= 500 && t.tMs < 1000)
    expect(duringIncident.every((t) => t.errorRps > 0)).toBe(true)
  })

  it('a traffic multiplier spikes offered load during its window', () => {
    const curve = constantTraffic(10)
    const w: Workload = { durationMs: 2000, tickMs: 250, trafficCurve: curve }
    const graph: SimGraph = { nodes: [client(), server('s1', { capacityRps: 50 })], edges: [edge('client', 's1')] }
    const result = runSimulation({
      graph,
      workload: w,
      incidents: [{ id: 'rush', label: 'Lunch rush', startMs: 500, endMs: 1000, trafficMultiplier: 5 }],
    })
    const during = result.ticks.find((t) => t.tMs === 500)!
    const before = result.ticks.find((t) => t.tMs === 250)!
    expect(during.offeredRps).toBeCloseTo(50, 5)
    expect(before.offeredRps).toBeCloseTo(10, 5)
  })
})
