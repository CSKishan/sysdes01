// Validates that the numbers hand-picked for each Chapter I level actually
// produce the intended pass/fail through the real engine -- not just that
// the content typechecks. A level whose "obvious" starting design already
// passes, or whose intended fix doesn't actually fix it, is a content bug.

import { describe, expect, it } from 'vitest'
import { runSimulation } from '@/engine/simulate'
import { scoreRun } from '@/game/scoring'
import type { CacheConfig, LoadBalancerConfig, ServerConfig, SimGraph } from '@/engine/types'
import { CHAPTER_1_LEVELS } from '../chapter1'
import { computeSystemAvailability } from '@/engine/metrics'

function findLevel(id: string) {
  const level = CHAPTER_1_LEVELS.find((l) => l.id === id)
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

describe('ch1-l2: The Lunch Rush', () => {
  const stage = buildStage('ch1-l2', 2)

  it('the default single depot (capacity 50) fails under the ramp to 90rps', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('turning the depot\'s capacity up clears the SLO (the intended vertical-scaling fix)', () => {
    const upgraded = withNode(stage.startingGraph, 'depot-1', (c: ServerConfig) => ({
      ...c,
      capacityRps: 200,
    }))
    const result = runSimulation({ graph: upgraded, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch1-l3: A Second Depot', () => {
  const stage = buildStage('ch1-l3', 2)

  it('the intended guided solution (dispatcher + two default depots) passes', () => {
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        { id: 'dispatcher', label: 'Dispatcher', position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4 } },
        { id: 'depot-a', label: 'Depot A', position: { x: 0, y: 0 }, config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8 } },
        { id: 'depot-b', label: 'Depot B', position: { x: 0, y: 0 }, config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8 } },
      ],
      edges: [edge('client', 'dispatcher'), edge('dispatcher', 'depot-a'), edge('dispatcher', 'depot-b')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })

  it('a single depot alone (no second depot) fails the same traffic', () => {
    const singleDepot: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        { id: 'depot-a', label: 'Depot A', position: { x: 0, y: 0 }, config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8 } },
      ],
      edges: [edge('client', 'depot-a')],
    }
    const result = runSimulation({ graph: singleDepot, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })
})

describe('ch1-l4: Dispatch Rules', () => {
  const stage = buildStage('ch1-l4', 2)

  it('round robin (the default) fails to balance a 150/50-capacity pool', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('switching to least-connections fixes it', () => {
    const fixed = withNode(stage.startingGraph, 'dispatcher', (c: LoadBalancerConfig) => ({
      ...c,
      algorithm: 'leastConnections',
    }))
    const result = runSimulation({ graph: fixed, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch1-l5: The Shelf', () => {
  it('guided stage: shelf between client and storeroom passes', () => {
    const stage = buildStage('ch1-l5', 2)
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        { id: 'shelf', label: 'Shelf', position: { x: 0, y: 0 }, config: { kind: 'cache', capacitySlots: 50, keyspaceSize: 500, zipfS: 1.1, hitMs: 5, missOverheadMs: 2, costPerHour: 3, policy: 'writeThrough', staleFraction: 0 } },
      ],
      edges: [edge('client', 'shelf'), edge('shelf', 'storeroom')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })

  it('twist stage: write-around\'s staleFraction breaches the stale-read SLO', () => {
    const stage = buildStage('ch1-l5', 4)
    const staleGraph = withNode(stage.startingGraph, 'shelf', (c: CacheConfig) => ({
      ...c,
      policy: 'writeAround',
      staleFraction: 0.6,
    }))
    const result = runSimulation({ graph: staleGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
    expect(result.aggregate.staleReadRate).toBeGreaterThan(stage.slo.maxStaleReadRate!)
  })

  it('twist stage: write-through (staleFraction 0) clears the SLO', () => {
    const stage = buildStage('ch1-l5', 4)
    const freshGraph = withNode(stage.startingGraph, 'shelf', (c: CacheConfig) => ({
      ...c,
      policy: 'writeThrough',
      staleFraction: 0,
    }))
    const result = runSimulation({ graph: freshGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch1-l1: One Courier', () => {
  it('the intended guided solution (one default depot) passes', () => {
    const stage = buildStage('ch1-l1', 2)
    const solved: SimGraph = {
      nodes: [...stage.startingGraph.nodes, { id: 'depot', label: 'Depot', position: { x: 0, y: 0 }, config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8 } }],
      edges: [edge('client', 'depot')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })

  it('an empty/disconnected graph does not trivially pass', () => {
    const stage = buildStage('ch1-l1', 2)
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })
})

describe('ch1-cdn: The Pickup Locker', () => {
  const level = findLevel('ch1-cdn')
  const stage = level.stages.find((s) => s.kind === 'build')!
  if (stage.kind !== 'build') throw new Error('expected a build stage')

  it('an unmitigated 300ms-distant origin fails the latency SLO', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('the intended solution (a shelf/locker in front of the distant depot) passes', () => {
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        {
          id: 'locker',
          label: 'Pickup Locker',
          position: { x: 0, y: 0 },
          config: {
            kind: 'cache',
            capacitySlots: 50,
            keyspaceSize: 300,
            zipfS: 1.2,
            hitMs: 8,
            missOverheadMs: 5,
            costPerHour: 3,
            policy: 'writeThrough',
            staleFraction: 0,
          },
        },
      ],
      edges: [edge('client', 'locker'), edge('locker', 'distant-depot')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch1-availability: The Contract', () => {
  const level = findLevel('ch1-availability')
  const stage = level.stages.find((s) => s.kind === 'build')!
  if (stage.kind !== 'build') throw new Error('expected a build stage')

  it('matches the README worked example directly: two 99.9% components in series -> 99.8%', () => {
    // Sanity-checks the exact formula this level teaches, independent of
    // level content, against the source README's own numbers.
    const graph: SimGraph = {
      nodes: [
        { id: 'client', label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } },
        { id: 'lb', label: 'LB', position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4, availability: 0.999 } },
        { id: 's1', label: 'S1', position: { x: 0, y: 0 }, config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8, availability: 0.999 } },
      ],
      edges: [edge('client', 'lb'), edge('lb', 's1')],
    }
    expect(computeSystemAvailability(graph)).toBeCloseTo(0.999 * 0.999, 6)
  })

  it('a single default depot fails the 99.8% contract', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('the intended solution (dispatcher + redundant second depot) clears the contract', () => {
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        { id: 'dispatcher', label: 'Dispatcher', position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4 } },
        { id: 'depot-2', label: 'Depot 2', position: { x: 0, y: 0 }, config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8 } },
      ],
      // depot-1 (already in startingGraph, locked) now routes through the
      // dispatcher alongside a fresh redundant depot-2.
      edges: [
        { id: 'client=>dispatcher', source: 'client', target: 'dispatcher' },
        edge('dispatcher', 'depot-1'),
        edge('dispatcher', 'depot-2'),
      ],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch1-scalability: The Real Ceiling', () => {
  const level = findLevel('ch1-scalability')
  const stage = level.stages.find((s) => s.kind === 'build')!
  if (stage.kind !== 'build') throw new Error('expected a build stage')

  it('the single maxed-out depot (300rps cap) cannot absorb 320rps demand', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
    expect(result.aggregate.errorRate).toBeGreaterThan(stage.slo.maxErrorRate!)
  })

  it('adding a second depot at default capacity (50rps) still fails -- sizing matters, not just topology', () => {
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        { id: 'dispatcher', label: 'Dispatcher', position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4 } },
        { id: 'depot-2', label: 'Depot 2', position: { x: 0, y: 0 }, config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8 } },
      ],
      edges: [edge('client', 'dispatcher'), edge('dispatcher', 'megadepot'), edge('dispatcher', 'depot-2')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('the intended solution (dispatcher + a properly-sized second depot) clears the ceiling', () => {
    const solved: SimGraph = {
      nodes: [
        ...stage.startingGraph.nodes,
        { id: 'dispatcher', label: 'Dispatcher', position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4 } },
        { id: 'depot-2', label: 'Depot 2', position: { x: 0, y: 0 }, config: { kind: 'server', capacityRps: 230, baseMs: 80, costPerHour: 8 } },
      ],
      edges: [edge('client', 'dispatcher'), edge('dispatcher', 'megadepot'), edge('dispatcher', 'depot-2')],
    }
    const result = runSimulation({ graph: solved, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

