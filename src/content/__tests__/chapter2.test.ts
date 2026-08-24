// Validates that the numbers hand-picked for each Chapter II build level
// actually produce the intended pass/fail through the real engine -- same
// pattern as chapter1.test.ts.

import { describe, expect, it } from 'vitest'
import { runSimulation } from '@/engine/simulate'
import { scoreRun } from '@/game/scoring'
import type { DatabaseConfig, ReplicaConfig, SimGraph } from '@/engine/types'
import { CHAPTER_2_LEVELS } from '../chapter2'

function findLevel(id: string) {
  const level = CHAPTER_2_LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`level ${id} not found`)
  return level
}

function buildStage(levelId: string, stageIndex: number) {
  const level = findLevel(levelId)
  const stage = level.stages[stageIndex]
  if (stage.kind !== 'build') throw new Error(`stage ${stageIndex} of ${levelId} is not a build stage`)
  return stage
}

function withNode(graph: SimGraph, nodeId: string, mutate: (config: any) => any): SimGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === nodeId ? { ...n, config: mutate(n.config) } : n)),
  }
}

function edge(source: string, target: string) {
  return { id: `${source}=>${target}`, source, target }
}

describe('ch2-db-intro: The Permanent Ledger', () => {
  const stage = buildStage('ch2-db-intro', 2)

  it('an empty/disconnected graph does not trivially pass', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('the intended solution (client wired to a default Ledger) passes', () => {
    const solved: SimGraph = {
      nodes: [...stage.startingGraph.nodes, { id: 'ledger', label: 'Ledger', position: { x: 0, y: 0 }, config: { kind: 'database', engine: 'sql', capacityRps: 60, baseMs: 40, writeCapacityRps: 25, writeBaseMs: 60, indexed: false, costPerHour: 12 } }],
      edges: [edge('client', 'ledger')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch2-replication: A Second Copy of the Ledger', () => {
  it('guided stage: a single Ledger fails under read-heavy traffic', () => {
    const stage = buildStage('ch2-replication', 2)
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('guided stage: adding a sized-up replica in front clears the SLO', () => {
    const stage = buildStage('ch2-replication', 2)
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        {
          id: 'backup',
          label: 'Ledger Copy',
          position: { x: 0, y: 0 },
          config: { kind: 'replica', capacityRps: 90, baseMs: 40, costPerHour: 10, replicationMode: 'async', staleReadFraction: 0.15, replicationLagMs: 150, syncAckWaitMs: 40 },
        },
      ],
      edges: [edge('client', 'backup'), edge('backup', 'ledger')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })

  it('twist stage: async replication breaches the stale-read SLO', () => {
    const stage = buildStage('ch2-replication', 3)
    const asyncGraph = withNode(stage.startingGraph, 'backup', (c: ReplicaConfig) => ({
      ...c,
      replicationMode: 'async',
      staleReadFraction: 0.3,
    }))
    const result = runSimulation({ graph: asyncGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
    expect(result.aggregate.staleReadRate).toBeGreaterThan(stage.slo.maxStaleReadRate!)
  })

  it('twist stage: sync replication clears the SLO', () => {
    const stage = buildStage('ch2-replication', 3)
    const syncGraph = withNode(stage.startingGraph, 'backup', (c: ReplicaConfig) => ({
      ...c,
      replicationMode: 'sync',
      staleReadFraction: 0,
    }))
    const result = runSimulation({ graph: syncGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch2-indexes: Marking the Pages', () => {
  const stage = buildStage('ch2-indexes', 2)

  it('an unindexed Ledger fails the read-latency SLO', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('toggling indexed=true clears the SLO', () => {
    const indexed = withNode(stage.startingGraph, 'ledger', (c: DatabaseConfig) => ({ ...c, indexed: true }))
    const result = runSimulation({ graph: indexed, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })

  it('indexing makes reads faster and writes slower, exactly as taught', () => {
    const unindexedResult = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const indexed = withNode(stage.startingGraph, 'ledger', (c: DatabaseConfig) => ({ ...c, indexed: true }))
    const indexedResult = runSimulation({ graph: indexed, workload: stage.workload })
    expect(indexedResult.aggregate.p99Ms).toBeLessThan(unindexedResult.aggregate.p99Ms)
    expect(indexedResult.aggregate.writeP99Ms).toBeGreaterThan(unindexedResult.aggregate.writeP99Ms)
  })
})

describe('ch2-normalization: One Book, or Many', () => {
  const stage = buildStage('ch2-normalization', 2)

  it('staying normalized (the default) fails the read-heavy SLO', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('the normalize decision-card option keeps it failing', () => {
    const option = stage.decisionCard!.options.find((o) => o.id === 'normalize')!
    const applied = option.applyToGraph!(stage.startingGraph)
    const result = runSimulation({ graph: applied, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('the denormalize decision-card option clears the SLO', () => {
    const option = stage.decisionCard!.options.find((o) => o.id === 'denormalize')!
    const applied = option.applyToGraph!(stage.startingGraph)
    const result = runSimulation({ graph: applied, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch2-cap: When the Line Goes Down', () => {
  const stage = buildStage('ch2-cap', 2)

  it('the single-path option fails once the Main Ledger outage hits (total outage, not just writes)', () => {
    const option = stage.decisionCard!.options.find((o) => o.id === 'single')!
    const applied = option.applyToGraph!(stage.startingGraph)
    const result = runSimulation({ graph: applied, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('the redundant-backup option clears the SLO -- reads survive the outage, only writes error', () => {
    const option = stage.decisionCard!.options.find((o) => o.id === 'redundant')!
    const applied = option.applyToGraph!(stage.startingGraph)
    const result = runSimulation({ graph: applied, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })

  it('the outage window really does hit 0 throughput for the single-path option', () => {
    const option = stage.decisionCard!.options.find((o) => o.id === 'single')!
    const applied = option.applyToGraph!(stage.startingGraph)
    const result = runSimulation({ graph: applied, workload: stage.workload, incidents: stage.incidents })
    const duringOutage = result.ticks.filter((t) => t.tMs >= 2000 && t.tMs < 4000)
    expect(duringOutage.every((t) => t.completedRps === 0)).toBe(true)
  })
})

describe('ch2-distributed-transactions: All Depots Agree, or None Do', () => {
  const stage = buildStage('ch2-distributed-transactions', 2)

  it('the intended solution (sync-replicated write path) clears the SLO', () => {
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        {
          id: 'copy',
          label: 'Ledger Copy',
          position: { x: 0, y: 0 },
          config: { kind: 'replica', capacityRps: 60, baseMs: 40, costPerHour: 10, replicationMode: 'sync', staleReadFraction: 0, replicationLagMs: 0, syncAckWaitMs: 40 },
        },
        { id: 'ledger', label: 'Ledger', position: { x: 0, y: 0 }, config: { kind: 'database', engine: 'sql', capacityRps: 60, baseMs: 40, writeCapacityRps: 25, writeBaseMs: 60, indexed: false, costPerHour: 12 } },
      ],
      edges: [edge('client', 'copy'), edge('copy', 'ledger')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })

  it('synchronous coordination is measurably slower than asynchronous for the same topology', () => {
    const syncGraph: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        { id: 'copy', label: 'Ledger Copy', position: { x: 0, y: 0 }, config: { kind: 'replica', capacityRps: 60, baseMs: 40, costPerHour: 10, replicationMode: 'sync', staleReadFraction: 0, replicationLagMs: 0, syncAckWaitMs: 40 } },
        { id: 'ledger', label: 'Ledger', position: { x: 0, y: 0 }, config: { kind: 'database', engine: 'sql', capacityRps: 60, baseMs: 40, writeCapacityRps: 25, writeBaseMs: 60, indexed: false, costPerHour: 12 } },
      ],
      edges: [edge('client', 'copy'), edge('copy', 'ledger')],
    }
    const asyncGraph = withNode(syncGraph, 'copy', (c: ReplicaConfig) => ({ ...c, replicationMode: 'async' }))
    const syncResult = runSimulation({ graph: syncGraph, workload: stage.workload })
    const asyncResult = runSimulation({ graph: asyncGraph, workload: stage.workload })
    expect(syncResult.aggregate.writeP99Ms).toBeGreaterThan(asyncResult.aggregate.writeP99Ms)
  })
})

describe('ch2-sharding: The Regional Sorting Desks', () => {
  const stage = buildStage('ch2-sharding', 2)

  it('the default, evenly-sized shards fail under a hot key', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('identifies shard-0 as the hot shard (highest error rate)', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const shard0Errors = result.nodeTicks.filter((t) => t.nodeId === 'shard-0').reduce((acc, t) => acc + t.errorRps, 0)
    const otherShardErrors = ['shard-1', 'shard-2', 'shard-3'].map((id) =>
      result.nodeTicks.filter((t) => t.nodeId === id).reduce((acc, t) => acc + t.errorRps, 0),
    )
    expect(shard0Errors).toBeGreaterThan(0)
    expect(otherShardErrors.every((e) => e < shard0Errors)).toBe(true)
  })

  it('sizing up the hot shard clears the SLO', () => {
    const fixed = withNode(stage.startingGraph, 'shard-0', (c: DatabaseConfig) => ({
      ...c,
      capacityRps: 300,
      writeCapacityRps: 150,
    }))
    const result = runSimulation({ graph: fixed, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch2-consistent-hashing: Adding a Fifth Desk', () => {
  const stage = buildStage('ch2-consistent-hashing', 2)

  it('an empty/disconnected graph does not trivially pass', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('the intended solution (a consistent-hashing desk with three depots) passes', () => {
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        { id: 'desk', label: 'Sorting Desk', position: { x: 0, y: 0 }, config: { kind: 'shardRouter', strategy: 'consistentHash', keyspaceSize: 1000, zipfS: 1.5, costPerHour: 4 } },
        { id: 'shard-0', label: 'Ledger A', position: { x: 0, y: 0 }, config: { kind: 'database', engine: 'sql', capacityRps: 60, baseMs: 40, writeCapacityRps: 25, writeBaseMs: 60, indexed: false, costPerHour: 12 } },
        { id: 'shard-1', label: 'Ledger B', position: { x: 0, y: 0 }, config: { kind: 'database', engine: 'sql', capacityRps: 60, baseMs: 40, writeCapacityRps: 25, writeBaseMs: 60, indexed: false, costPerHour: 12 } },
        { id: 'shard-2', label: 'Ledger C', position: { x: 0, y: 0 }, config: { kind: 'database', engine: 'sql', capacityRps: 60, baseMs: 40, writeCapacityRps: 25, writeBaseMs: 60, indexed: false, costPerHour: 12 } },
      ],
      edges: [edge('client', 'desk'), edge('desk', 'shard-0'), edge('desk', 'shard-1'), edge('desk', 'shard-2')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})
