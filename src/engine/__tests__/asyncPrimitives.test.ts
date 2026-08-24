// Covers Phase 4 (Engine v2.5): queue backpressure/draining, broker pub-sub
// fan-out and at-most-once vs at-least-once delivery, apiGateway's added
// hop, and service chains (cascading failure + composed availability).
// Chapter 0-2's existing tests are untouched -- these are additive.

import { describe, expect, it } from 'vitest'
import { runSimulation } from '../simulate'
import { computeSystemAvailability } from '../metrics'
import { constantTraffic, spikeTraffic } from '../traffic'
import type {
  ApiGatewayConfig,
  BrokerConfig,
  GraphEdge,
  GraphNode,
  QueueConfig,
  ServiceConfig,
  SimGraph,
  Workload,
} from '../types'

function client(id = 'client'): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } }
}
function server(id: string, overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number }> = {}): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: { kind: 'server', capacityRps: overrides.capacityRps ?? 50, baseMs: overrides.baseMs ?? 20, costPerHour: overrides.costPerHour ?? 8 },
  }
}
function queue(id: string, overrides: Partial<QueueConfig> = {}): GraphNode {
  const config: QueueConfig = { kind: 'queue', capacity: 200, drainRps: 40, costPerHour: 5, ...overrides }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}
function broker(id: string, overrides: Partial<BrokerConfig> = {}): GraphNode {
  const config: BrokerConfig = {
    kind: 'broker',
    capacityRps: 30,
    baseMs: 10,
    costPerHour: 6,
    deliverySemantics: 'atMostOnce',
    retryBufferCapacity: 200,
    ...overrides,
  }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}
function apiGateway(id: string, overrides: Partial<ApiGatewayConfig> = {}): GraphNode {
  const config: ApiGatewayConfig = { kind: 'apiGateway', capacityRps: 100, baseMs: 15, costPerHour: 6, ...overrides }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}
function service(id: string, overrides: Partial<ServiceConfig> = {}): GraphNode {
  const config: ServiceConfig = { kind: 'service', capacityRps: 50, baseMs: 20, costPerHour: 9, ...overrides }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}
function edge(source: string, target: string): GraphEdge {
  return { id: `${source}=>${target}`, source, target }
}
function workload(rps: number, overrides: Partial<Workload> = {}): Workload {
  return { durationMs: 5000, tickMs: 250, trafficCurve: constantTraffic(rps), ...overrides }
}

describe('queue', () => {
  it('passes light, steady load through with almost no backlog or error', () => {
    const graph: SimGraph = {
      nodes: [client(), queue('q', { capacity: 200, drainRps: 50 }), server('s')],
      edges: [edge('client', 'q'), edge('q', 's')],
    }
    const result = runSimulation({ graph, workload: workload(20, { durationMs: 5000 }) })
    expect(result.aggregate.errorRate).toBe(0)
    // One tick's worth of arrivals into an empty queue (20rps * 250ms =
    // 5 items) is the true peak, right after that tick's push and before
    // its drain -- the queue fully drains every tick since drainRps (50)
    // comfortably exceeds arrival rate, so it never climbs past that.
    expect(result.aggregate.maxQueueDepth).toBeLessThanOrEqual(5)
  })

  it('absorbs a spike that would otherwise error a bare capacity-limited server', () => {
    const spikeWorkload: Workload = {
      durationMs: 4000,
      tickMs: 250,
      trafficCurve: spikeTraffic(20, 80, 1000, 2000),
    }
    const bareGraph: SimGraph = { nodes: [client(), server('s', { capacityRps: 30 })], edges: [edge('client', 's')] }
    // drainRps deliberately kept below the server's own capacity -- a
    // queue that drains faster than what's behind it just relocates the
    // overload one hop downstream instead of absorbing it.
    const queuedGraph: SimGraph = {
      nodes: [client(), queue('q', { capacity: 500, drainRps: 25 }), server('s', { capacityRps: 30 })],
      edges: [edge('client', 'q'), edge('q', 's')],
    }

    const bareResult = runSimulation({ graph: bareGraph, workload: spikeWorkload })
    const queuedResult = runSimulation({ graph: queuedGraph, workload: spikeWorkload })

    expect(bareResult.aggregate.errorRate).toBeGreaterThan(0)
    expect(queuedResult.aggregate.errorRate).toBeLessThan(0.01)
    expect(queuedResult.aggregate.maxQueueDepth).toBeGreaterThan(0)
  })

  it('still backpressures (errors) once a sustained overload exceeds its own capacity', () => {
    const graph: SimGraph = {
      nodes: [client(), queue('q', { capacity: 10, drainRps: 35 }), server('s', { capacityRps: 200 })],
      edges: [edge('client', 'q'), edge('q', 's')],
    }
    const result = runSimulation({ graph, workload: workload(80, { durationMs: 3000 }) })
    expect(result.aggregate.errorRate).toBeGreaterThan(0)
  })

  it('freezes while its node is killed: no drain, no new backlog accepted', () => {
    const graph: SimGraph = {
      nodes: [client(), queue('q', { capacity: 200, drainRps: 25 }), server('s', { capacityRps: 200 })],
      edges: [edge('client', 'q'), edge('q', 's')],
    }
    const result = runSimulation({
      graph,
      workload: workload(20, { durationMs: 3000 }),
      incidents: [{ id: 'kill', label: 'Outage', startMs: 1000, endMs: 2000, killNodeIds: ['q'] }],
    })

    const beforeKill = result.ticks.filter((t) => t.tMs < 1000)
    const duringKill = result.ticks.filter((t) => t.tMs >= 1000 && t.tMs < 2000)
    expect(beforeKill.every((t) => t.errorRps < 1)).toBe(true)
    expect(duringKill.some((t) => t.errorRps > 0)).toBe(true)
  })
})

describe('broker', () => {
  it('pub-sub fan-out: every subscriber gets its own full copy, not a split', () => {
    const graph: SimGraph = {
      nodes: [client(), broker('b', { capacityRps: 1000 }), server('s1', { capacityRps: 1000 }), server('s2', { capacityRps: 1000 })],
      edges: [edge('client', 'b'), edge('b', 's1'), edge('b', 's2')],
    }
    const result = runSimulation({ graph, workload: workload(40, { durationMs: 1000 }) })
    const midTick = 250
    const s1 = result.nodeTicks.find((n) => n.nodeId === 's1' && n.tMs === midTick)
    const s2 = result.nodeTicks.find((n) => n.nodeId === 's2' && n.tMs === midTick)
    expect(s1!.inboundRps).toBeCloseTo(40, 0)
    expect(s2!.inboundRps).toBeCloseTo(40, 0)
  })

  it('atMostOnce drops overload immediately with no retry backlog', () => {
    const graph: SimGraph = {
      nodes: [client(), broker('b', { capacityRps: 30, deliverySemantics: 'atMostOnce' }), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'b'), edge('b', 's')],
    }
    const result = runSimulation({ graph, workload: workload(50, { durationMs: 2000 }) })
    expect(result.aggregate.errorRate).toBeGreaterThan(0)
    expect(result.aggregate.maxQueueDepth).toBe(0)
  })

  it('atLeastOnce retries a transient overload instead of dropping it, atMostOnce does not', () => {
    const burstWorkload: Workload = {
      durationMs: 3000,
      tickMs: 250,
      trafficCurve: spikeTraffic(10, 60, 500, 1000),
    }
    const atMostOnceGraph: SimGraph = {
      nodes: [client(), broker('b', { capacityRps: 30, deliverySemantics: 'atMostOnce' }), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'b'), edge('b', 's')],
    }
    const atLeastOnceGraph: SimGraph = {
      nodes: [
        client(),
        broker('b', { capacityRps: 30, deliverySemantics: 'atLeastOnce', retryBufferCapacity: 500 }),
        server('s', { capacityRps: 1000 }),
      ],
      edges: [edge('client', 'b'), edge('b', 's')],
    }

    const atMostOnceResult = runSimulation({ graph: atMostOnceGraph, workload: burstWorkload })
    const atLeastOnceResult = runSimulation({ graph: atLeastOnceGraph, workload: burstWorkload })

    expect(atLeastOnceResult.aggregate.errorRate).toBeLessThan(atMostOnceResult.aggregate.errorRate)
    expect(atLeastOnceResult.aggregate.maxQueueDepth).toBeGreaterThan(0)
  })
})

describe('apiGateway', () => {
  it('adds its own hop latency on top of whatever is behind it', () => {
    const graph: SimGraph = {
      nodes: [client(), apiGateway('gw', { capacityRps: 100, baseMs: 15 }), server('s', { capacityRps: 100, baseMs: 5 })],
      edges: [edge('client', 'gw'), edge('gw', 's')],
    }
    const result = runSimulation({ graph, workload: workload(10, { durationMs: 2000 }) })
    expect(result.aggregate.p50Ms).toBeGreaterThan(15)
  })

  it('errors once its own capacity is exceeded, independent of what is behind it', () => {
    const graph: SimGraph = {
      nodes: [client(), apiGateway('gw', { capacityRps: 50 }), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'gw'), edge('gw', 's')],
    }
    const result = runSimulation({ graph, workload: workload(150, { durationMs: 2000 }) })
    expect(result.aggregate.errorRate).toBeGreaterThan(0)
  })
})

describe('service', () => {
  it('cascading failure: a healthy service still errors out its traffic when its own dependency is killed', () => {
    const graph: SimGraph = {
      nodes: [client(), service('a', { capacityRps: 1000 }), service('b', { capacityRps: 1000 })],
      edges: [edge('client', 'a'), edge('a', 'b')],
    }
    const result = runSimulation({
      graph,
      workload: workload(20, { durationMs: 2000 }),
      incidents: [{ id: 'kill-b', label: 'Service B down', startMs: 0, endMs: 2000, killNodeIds: ['b'] }],
    })

    expect(result.aggregate.errorRate).toBeGreaterThan(0.9)
    const serviceAOwnErrors = result.nodeTicks.filter((n) => n.nodeId === 'a')
    expect(serviceAOwnErrors.every((n) => n.errorRps < 1)).toBe(true)
  })

  it('a chain of services composes availability down, unlike one monolith', () => {
    const monolith: SimGraph = { nodes: [client(), service('a')], edges: [edge('client', 'a')] }
    const chain: SimGraph = {
      nodes: [client(), service('a'), service('b')],
      edges: [edge('client', 'a'), edge('a', 'b')],
    }
    const monolithAvailability = computeSystemAvailability(monolith)
    const chainAvailability = computeSystemAvailability(chain)
    expect(chainAvailability).toBeLessThan(monolithAvailability)
    expect(chainAvailability).toBeCloseTo(monolithAvailability * monolithAvailability, 5)
  })
})
