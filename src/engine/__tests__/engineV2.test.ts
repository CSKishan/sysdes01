// Covers every Phase 2 engine addition: the read/write split, the
// database/replica/shardRouter primitives, severed-edge incidents, and
// computeSystemDurability. Chapter I's existing tests (simulate.test.ts,
// availability.test.ts) are untouched and still pass -- these are additive.

import { describe, expect, it } from 'vitest'
import { runSimulation } from '../simulate'
import { computeSystemDurability } from '../metrics'
import { constantTraffic } from '../traffic'
import type {
  DatabaseConfig,
  GraphEdge,
  GraphNode,
  ReplicaConfig,
  ShardRouterConfig,
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
    config: { kind: 'server', capacityRps: overrides.capacityRps ?? 50, baseMs: overrides.baseMs ?? 80, costPerHour: overrides.costPerHour ?? 8 },
  }
}
function database(id: string, overrides: Partial<DatabaseConfig> = {}): GraphNode {
  const config: DatabaseConfig = {
    kind: 'database',
    engine: 'sql',
    capacityRps: 60,
    baseMs: 40,
    writeCapacityRps: 25,
    writeBaseMs: 60,
    indexed: false,
    costPerHour: 12,
    ...overrides,
  }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}
function replica(id: string, overrides: Partial<ReplicaConfig> = {}): GraphNode {
  const config: ReplicaConfig = {
    kind: 'replica',
    capacityRps: 60,
    baseMs: 40,
    costPerHour: 10,
    replicationMode: 'async',
    staleReadFraction: 0.2,
    replicationLagMs: 150,
    ...overrides,
  }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}
function shardRouter(id: string, overrides: Partial<ShardRouterConfig> = {}): GraphNode {
  const config: ShardRouterConfig = {
    kind: 'shardRouter',
    strategy: 'modulo',
    keyspaceSize: 1000,
    zipfS: 1.5,
    costPerHour: 4,
    ...overrides,
  }
  return { id, label: id, config, position: { x: 0, y: 0 } }
}
function edge(source: string, target: string): GraphEdge {
  return { id: `${source}=>${target}`, source, target }
}
function workload(rps: number, overrides: Partial<Workload> = {}): Workload {
  return { durationMs: 5000, tickMs: 250, trafficCurve: constantTraffic(rps), ...overrides }
}

describe('read/write split', () => {
  it('a workload with no writeFraction behaves exactly as before: no write-opType traffic at all', () => {
    const graph: SimGraph = { nodes: [client(), server('s1')], edges: [edge('client', 's1')] }
    const result = runSimulation({ graph, workload: workload(30) })
    expect(result.aggregate.writeP50Ms).toBe(0)
    expect(result.aggregate.writeP99Ms).toBe(0)
    expect(result.aggregate.throughputRps).toBeGreaterThan(25)
  })

  it('a mixed workload produces both read and write terminated traffic through an opType-agnostic server', () => {
    const graph: SimGraph = { nodes: [client(), server('s1', { capacityRps: 200 })], edges: [edge('client', 's1')] }
    const result = runSimulation({ graph, workload: workload(100, { writeFraction: 0.4 }) })
    expect(result.aggregate.throughputRps).toBeGreaterThan(90)
    expect(result.aggregate.writeP99Ms).toBeGreaterThan(0)
    // A plain server doesn't distinguish reads from writes, so their
    // latency should land in the same ballpark.
    expect(result.aggregate.writeP99Ms).toBeCloseTo(result.aggregate.p99Ms, 0)
  })
})

describe('database primitive', () => {
  it('reads and writes use separate capacity/latency at low utilization', () => {
    const graph: SimGraph = { nodes: [client(), database('db')], edges: [edge('client', 'db')] }
    const result = runSimulation({ graph, workload: workload(10, { writeFraction: 0.3, durationMs: 2000 }) })
    expect(result.aggregate.errorRate).toBe(0)
    expect(result.aggregate.throughputRps).toBeGreaterThan(9)
  })

  it('an overloaded write path errors even while reads are comfortably served', () => {
    // 30 writes/sec against a 25rps write capacity overflows; 10 reads/sec
    // against 60rps read capacity is nowhere near it.
    const graph: SimGraph = { nodes: [client(), database('db')], edges: [edge('client', 'db')] }
    const result = runSimulation({ graph, workload: workload(40, { writeFraction: 0.75, durationMs: 2000 }) })
    expect(result.aggregate.errorRate).toBeGreaterThan(0)
  })

  it('indexed=true makes reads faster and writes slower than indexed=false, at the same low-utilization traffic', () => {
    const trafficWorkload = workload(10, { writeFraction: 0.3, durationMs: 2000 })
    const withoutIndex: SimGraph = { nodes: [client(), database('db', { indexed: false })], edges: [edge('client', 'db')] }
    const withIndex: SimGraph = { nodes: [client(), database('db', { indexed: true })], edges: [edge('client', 'db')] }

    const resultWithout = runSimulation({ graph: withoutIndex, workload: trafficWorkload })
    const resultWith = runSimulation({ graph: withIndex, workload: trafficWorkload })

    // p50/p99 (mixed, 70% reads) should improve once indexed -- reads
    // dominate the traffic mix and get much faster.
    expect(resultWith.aggregate.p50Ms).toBeLessThan(resultWithout.aggregate.p50Ms)
    // The write path should get slower once indexed (index maintenance
    // overhead on every write).
    expect(resultWith.aggregate.writeP99Ms).toBeGreaterThan(resultWithout.aggregate.writeP99Ms)
  })
})

describe('replica primitive', () => {
  it('an async replica reports a staleReadRate matching its configured staleReadFraction when all traffic is reads through it', () => {
    const graph: SimGraph = { nodes: [client(), replica('r1', { staleReadFraction: 0.25 })], edges: [edge('client', 'r1')] }
    const result = runSimulation({ graph, workload: workload(20, { durationMs: 2000 }) })
    expect(result.aggregate.staleReadRate).toBeCloseTo(0.25, 2)
  })

  it('a sync replica never reports stale reads, even if staleReadFraction is authored nonzero', () => {
    const graph: SimGraph = {
      nodes: [client(), replica('r1', { replicationMode: 'sync', staleReadFraction: 0.9 })],
      edges: [edge('client', 'r1')],
    }
    const result = runSimulation({ graph, workload: workload(20, { durationMs: 2000 }) })
    expect(result.aggregate.staleReadRate).toBe(0)
  })

  it('a write segment routed through a replica passes through to the next node instead of resolving there', () => {
    const graph: SimGraph = {
      nodes: [client(), replica('r1'), server('primary', { capacityRps: 200 })],
      edges: [edge('client', 'r1'), edge('r1', 'primary')],
    }
    const result = runSimulation({ graph, workload: workload(20, { writeFraction: 1, durationMs: 2000 }) })
    const primaryTicks = result.nodeTicks.filter((t) => t.nodeId === 'primary')
    expect(primaryTicks.some((t) => t.inboundRps > 0)).toBe(true)
    expect(result.aggregate.throughputRps).toBeGreaterThan(15)
  })

  it('maxReplicationLagMs reflects an async replica but ignores a sync one', () => {
    const asyncGraph: SimGraph = {
      nodes: [client(), replica('r1', { replicationMode: 'async', replicationLagMs: 300 })],
      edges: [edge('client', 'r1')],
    }
    const syncGraph: SimGraph = {
      nodes: [client(), replica('r1', { replicationMode: 'sync', replicationLagMs: 300 })],
      edges: [edge('client', 'r1')],
    }
    expect(runSimulation({ graph: asyncGraph, workload: workload(10, { durationMs: 1000 }) }).aggregate.maxReplicationLagMs).toBe(300)
    expect(runSimulation({ graph: syncGraph, workload: workload(10, { durationMs: 1000 }) }).aggregate.maxReplicationLagMs).toBe(0)
  })

  it('a killed replica errors out write traffic too, not just reads', () => {
    const graph: SimGraph = {
      nodes: [client(), replica('r1'), server('primary', { capacityRps: 200 })],
      edges: [edge('client', 'r1'), edge('r1', 'primary')],
    }
    const result = runSimulation({
      graph,
      workload: workload(20, { writeFraction: 1, durationMs: 2000 }),
      incidents: [{ id: 'outage', label: 'Outage', startMs: 0, endMs: 2000, killNodeIds: ['r1'] }],
    })
    expect(result.aggregate.errorRate).toBeCloseTo(1, 2)
    const primaryTicks = result.nodeTicks.filter((t) => t.nodeId === 'primary')
    expect(primaryTicks.every((t) => t.inboundRps === 0)).toBe(true)
  })
})

describe('shardRouter primitive', () => {
  it('a Zipf-skewed keyspace produces a genuinely uneven shard split under modulo routing', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        shardRouter('router', { zipfS: 1.5, keyspaceSize: 1000 }),
        server('shard-0', { capacityRps: 500 }),
        server('shard-1', { capacityRps: 500 }),
        server('shard-2', { capacityRps: 500 }),
        server('shard-3', { capacityRps: 500 }),
      ],
      edges: [
        edge('client', 'router'),
        edge('router', 'shard-0'),
        edge('router', 'shard-1'),
        edge('router', 'shard-2'),
        edge('router', 'shard-3'),
      ],
    }
    const result = runSimulation({ graph, workload: workload(100, { durationMs: 2000 }) })
    expect(result.aggregate.maxShardImbalance).toBeGreaterThan(1.2)
  })

  it('a uniform keyspace (zipfS = 0) is close to perfectly even across shards', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        shardRouter('router', { zipfS: 0, keyspaceSize: 1000 }),
        server('shard-0', { capacityRps: 500 }),
        server('shard-1', { capacityRps: 500 }),
        server('shard-2', { capacityRps: 500 }),
        server('shard-3', { capacityRps: 500 }),
      ],
      edges: [
        edge('client', 'router'),
        edge('router', 'shard-0'),
        edge('router', 'shard-1'),
        edge('router', 'shard-2'),
        edge('router', 'shard-3'),
      ],
    }
    const result = runSimulation({ graph, workload: workload(100, { durationMs: 2000 }) })
    expect(result.aggregate.maxShardImbalance).toBeLessThan(1.05)
  })

  it('a graph with no shardRouter reports the neutral value (1x, not a penalty)', () => {
    const graph: SimGraph = { nodes: [client(), server('s1')], edges: [edge('client', 's1')] }
    const result = runSimulation({ graph, workload: workload(20, { durationMs: 1000 }) })
    expect(result.aggregate.maxShardImbalance).toBe(1)
  })

  it('a killed shard router errors out all its traffic instead of routing normally', () => {
    const graph: SimGraph = {
      nodes: [client(), shardRouter('router'), server('shard-0', { capacityRps: 500 }), server('shard-1', { capacityRps: 500 })],
      edges: [edge('client', 'router'), edge('router', 'shard-0'), edge('router', 'shard-1')],
    }
    const result = runSimulation({
      graph,
      workload: workload(50, { durationMs: 2000 }),
      incidents: [{ id: 'outage', label: 'Outage', startMs: 0, endMs: 2000, killNodeIds: ['router'] }],
    })
    expect(result.aggregate.errorRate).toBeCloseTo(1, 2)
    expect(result.aggregate.throughputRps).toBeCloseTo(0, 1)
  })

  it('an unwired shard router (no shards connected yet) terminates traffic instead of silently dropping it', () => {
    const graph: SimGraph = { nodes: [client(), shardRouter('router')], edges: [edge('client', 'router')] }
    const result = runSimulation({ graph, workload: workload(30, { durationMs: 1000 }) })
    expect(result.aggregate.throughputRps).toBeGreaterThan(25)
    expect(result.aggregate.errorRate).toBe(0)
  })

  it('keyspaceSize <= 0 falls back to an even split instead of silently routing 0% of traffic everywhere', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        shardRouter('router', { keyspaceSize: 0 }),
        server('shard-0', { capacityRps: 500 }),
        server('shard-1', { capacityRps: 500 }),
      ],
      edges: [edge('client', 'router'), edge('router', 'shard-0'), edge('router', 'shard-1')],
    }
    const result = runSimulation({ graph, workload: workload(40, { durationMs: 1000 }) })
    expect(result.aggregate.throughputRps).toBeGreaterThan(35)
  })
})

describe('severed-edge incidents (network partition)', () => {
  it('a severed edge blocks traffic across it only while the incident is active', () => {
    const graph: SimGraph = { nodes: [client(), server('s1', { capacityRps: 200 })], edges: [edge('client', 's1')] }
    const result = runSimulation({
      graph,
      workload: workload(50, { durationMs: 3000, tickMs: 250 }),
      incidents: [{ id: 'partition', label: 'Partition', startMs: 1000, endMs: 2000, severedEdgeIds: ['client=>s1'] }],
    })
    const duringIncident = result.ticks.filter((t) => t.tMs >= 1000 && t.tMs < 2000)
    const outsideIncident = result.ticks.filter((t) => t.tMs < 1000 || t.tMs >= 2000)
    expect(duringIncident.every((t) => t.completedRps === 0)).toBe(true)
    expect(outsideIncident.some((t) => t.completedRps > 0)).toBe(true)
  })
})

describe('computeSystemDurability', () => {
  it('a single database in the graph reports its own availability', () => {
    const graph: SimGraph = { nodes: [client(), database('db', { availability: 0.995 })], edges: [edge('client', 'db')] }
    expect(computeSystemDurability(graph)).toBeCloseTo(0.995, 6)
  })

  it('a sync replica adds a redundant durable copy, composed in parallel', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        database('db', { availability: 0.99 }),
        replica('r1', { replicationMode: 'sync', availability: 0.99 }),
      ],
      edges: [edge('client', 'db'), edge('client', 'r1')],
    }
    // 1 - (1-0.99)*(1-0.99) = 0.9999
    expect(computeSystemDurability(graph)).toBeCloseTo(0.9999, 6)
  })

  it('a sync replica that is NOT wired into the graph does not count -- only reachable copies do', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        database('db', { availability: 0.99 }),
        replica('r1', { replicationMode: 'sync', availability: 0.9999 }),
      ],
      edges: [edge('client', 'db')],
    }
    // r1 has no edge at all -- an unconnected node dropped on the canvas
    // shouldn't inflate durability just for existing.
    expect(computeSystemDurability(graph)).toBeCloseTo(0.99, 6)
  })

  it('an async replica does NOT count toward durability -- it may not have the latest write', () => {
    const withoutReplica: SimGraph = { nodes: [client(), database('db', { availability: 0.99 })], edges: [edge('client', 'db')] }
    const withAsyncReplica: SimGraph = {
      nodes: [
        client(),
        database('db', { availability: 0.99 }),
        replica('r1', { replicationMode: 'async', availability: 0.9999 }),
      ],
      edges: [edge('client', 'db'), edge('client', 'r1')],
    }
    expect(computeSystemDurability(withAsyncReplica)).toBeCloseTo(computeSystemDurability(withoutReplica), 6)
  })

  it('returns 1 (nothing to lose) when the graph has no database or replica at all', () => {
    const graph: SimGraph = { nodes: [client(), server('s1')], edges: [edge('client', 's1')] }
    expect(computeSystemDurability(graph)).toBe(1)
  })
})
