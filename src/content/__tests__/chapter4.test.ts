// Validates the numbers hand-picked for each Chapter IV anchor build
// actually produce the intended pass/fail through the real engine. Same
// standard as chapter1.test.ts/chapter2.test.ts/chapter3.test.ts.

import { describe, expect, it } from 'vitest'
import { runSimulation } from '@/engine/simulate'
import { scoreRun } from '@/game/scoring'
import type { GraphEdge, GraphNode, LoadBalancerConfig, SimGraph } from '@/engine/types'
import { CHAPTER_4_LEVELS } from '../chapter4'

function findLevel(id: string) {
  const level = CHAPTER_4_LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`level ${id} not found`)
  return level
}

function buildStage(levelId: string, stageIndex: number) {
  const level = findLevel(levelId)
  const stage = level.stages[stageIndex]
  if (stage.kind !== 'build') throw new Error(`stage ${stageIndex} of ${levelId} is not a build stage`)
  return stage
}

function client(id = 'client'): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } }
}
function server(id: string, overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number }> = {}, region?: string): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    region,
    config: { kind: 'server', capacityRps: overrides.capacityRps ?? 50, baseMs: overrides.baseMs ?? 30, costPerHour: overrides.costPerHour ?? 8 },
  }
}
function loadBalancer(id: string, overrides: Partial<LoadBalancerConfig> = {}): GraphNode {
  return { id, label: id, position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4, ...overrides } }
}
function edge(source: string, target: string, overrides: Partial<GraphEdge> = {}): GraphEdge {
  return { id: `${source}=>${target}`, source, target, ...overrides }
}

describe('ch4-circuit-breaker: The Switch That Wouldn\'t Reset', () => {
  const stage = buildStage('ch4-circuit-breaker', 2)

  it('an over-sensitive, slow-to-recover breaker turns a half-second blip into a self-inflicted outage', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('a sensibly tuned breaker barely reacts to the same blip -- using only the sliders NodeInspector actually exposes (capacity, trip threshold, open duration, half-open trial; windowMs has no UI control, so it must stay at its authored default)', () => {
    const graph: SimGraph = {
      ...stage.startingGraph,
      nodes: stage.startingGraph.nodes.map((n) =>
        n.id === 'cb' && n.config.kind === 'circuitBreaker'
          ? { ...n, config: { ...n.config, errorThreshold: 0.5, openDurationMs: 500, halfOpenTrialFraction: 0.5 } }
          : n,
      ),
    }
    const result = runSimulation({ graph, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch4-rate-limiting: The Line That Wouldn\'t Move', () => {
  const stage = buildStage('ch4-rate-limiting', 2)

  it('a bare Intake Counter lets p99 latency blow up during the burst', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('an Intake Window tuned below the counter\'s capacity protects p99 for admitted traffic', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        { id: 'rl', label: 'Intake Window', position: { x: 0, y: 0 }, config: { kind: 'rateLimiter', algorithm: 'tokenBucket', sustainedRps: 25, burstCapacity: 5, windowMs: 1000, costPerHour: 4 } },
        server('intake', { capacityRps: 30, baseMs: 40 }),
      ],
      edges: [edge('client', 'rl'), edge('rl', 'intake')],
    }
    const result = runSimulation({ graph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch4-service-discovery: The Dispatcher Learns to Check', () => {
  const stage = buildStage('ch4-service-discovery', 2)

  it('a health-blind dispatcher keeps sending the dead instance its fair share', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('a health-aware dispatcher routes entirely around it', () => {
    const graph: SimGraph = {
      ...stage.startingGraph,
      nodes: stage.startingGraph.nodes.map((n) =>
        n.id === 'dispatcher' && n.config.kind === 'loadBalancer' ? { ...n, config: { ...n.config, healthAware: true } } : n,
      ),
    }
    const result = runSimulation({ graph, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch4-disaster-recovery: One Depot, One Region', () => {
  const stage = buildStage('ch4-disaster-recovery', 2)

  it('a single-region depot goes fully dark when its whole region loses power', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('a health-aware dispatcher plus a standby depot fails over cleanly -- using exactly what a player can place (no edge inspector exists to tag the new node\'s region or the new edge\'s crossRegionLatencyMs, so both are left unset, same as a canvas-placed node would be)', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        loadBalancer('dispatcher', { healthAware: true }),
        server('depot-east', { capacityRps: 100, baseMs: 30 }, 'us-east'),
        server('depot-west', { capacityRps: 100, baseMs: 30 }),
      ],
      edges: [edge('client', 'dispatcher'), edge('dispatcher', 'depot-east'), edge('dispatcher', 'depot-west')],
    }
    const result = runSimulation({ graph, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('sequence diagrams', () => {
  it('every SequenceDiagram step in Chapter IV has a non-empty label', () => {
    for (const level of CHAPTER_4_LEVELS) {
      for (const stage of level.stages) {
        if (stage.kind === 'teach' && stage.sequenceDiagram) {
          for (const step of stage.sequenceDiagram.steps) {
            expect(step.label.length, `${level.id}: empty sequence step label`).toBeGreaterThan(0)
          }
        }
      }
    }
  })
})

describe('Chapter IV coverage', () => {
  it('has all 10 README Chapter IV topics, each with at least 2 quiz questions', () => {
    expect(CHAPTER_4_LEVELS.length).toBe(10)
    for (const level of CHAPTER_4_LEVELS) {
      expect(level.quizQuestions?.length ?? 0, `${level.id}: missing quiz questions`).toBeGreaterThanOrEqual(2)
    }
  })
})
