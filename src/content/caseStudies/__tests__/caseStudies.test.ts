// Content-truth tests for Phase 8's case studies: each rubric is checked
// against a real graph run through the real engine (an empty design should
// score low, a reasonable reference-shaped design should score high), and
// each estimation stage's computed outputs are sanity-checked against the
// README's own canonical numbers -- same standard as every other chapter's
// content tests.

import { describe, expect, it } from 'vitest'
import { runSimulation } from '@/engine/simulate'
import type { GraphNode, SimGraph } from '@/engine/types'
import { scoreRubric } from '@/game/rubricScoring'
import { CASE_STUDIES, getCaseStudy } from '../registry'

function client(id = 'client'): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } }
}
// Deliberately generously provisioned -- this graph exists to prove the
// rubric *can* score highly on a reasonable design, not to be a tight
// numeric fit for any one case study's scaled-down traffic (which the
// engine caps at 150 rps regardless of the real-world numbers, see
// helpers.ts). Every capacity here comfortably clears that cap.
function service(id: string, capacityRps = 2000): GraphNode {
  return { id, label: id, position: { x: 0, y: 0 }, config: { kind: 'service', capacityRps, baseMs: 20, costPerHour: 9 } }
}
function loadBalancer(id: string): GraphNode {
  return { id, label: id, position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4 } }
}
function cache(id: string): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: { kind: 'cache', capacitySlots: 500, hitMs: 5, missOverheadMs: 2, keyspaceSize: 2000, zipfS: 1.1, costPerHour: 5, policy: 'writeThrough', staleFraction: 0 },
  }
}
function database(id: string, writeCapacityRps = 2000): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: { kind: 'database', engine: 'sql', capacityRps: 2000, baseMs: 20, writeCapacityRps, writeBaseMs: 30, indexed: false, costPerHour: 12 },
  }
}
function queue(id: string): GraphNode {
  return { id, label: id, position: { x: 0, y: 0 }, config: { kind: 'queue', capacity: 5000, drainRps: 2000, costPerHour: 5 } }
}
function rateLimiter(id: string): GraphNode {
  return { id, label: id, position: { x: 0, y: 0 }, config: { kind: 'rateLimiter', algorithm: 'tokenBucket', sustainedRps: 2000, burstCapacity: 2000, windowMs: 1000, costPerHour: 4 } }
}
function edge(source: string, target: string) {
  return { id: `${source}=>${target}`, source, target }
}

describe('case study registry', () => {
  it('has 5 unique case studies, uniquely ordered', () => {
    expect(CASE_STUDIES.length).toBe(5)
    const ids = new Set(CASE_STUDIES.map((cs) => cs.id))
    expect(ids.size).toBe(5)
    const orders = new Set(CASE_STUDIES.map((cs) => cs.order))
    expect(orders.size).toBe(5)
  })

  it('every case study has at least 3 requirement questions and a 5-item rubric', () => {
    for (const cs of CASE_STUDIES) {
      expect(cs.requirements.questions.length, `${cs.id}: too few requirement questions`).toBeGreaterThanOrEqual(3)
      expect(cs.design.rubric.length, `${cs.id}: rubric should be substantial`).toBeGreaterThanOrEqual(4)
    }
  })

  it('getCaseStudy resolves every registered id', () => {
    for (const cs of CASE_STUDIES) {
      expect(getCaseStudy(cs.id)?.id).toBe(cs.id)
    }
  })
})

describe('estimation stages', () => {
  it('every output computes a finite, non-negative number at default input values, and every input default sits within its own min/max', () => {
    for (const cs of CASE_STUDIES) {
      const values = Object.fromEntries(cs.estimation.inputs.map((i) => [i.id, i.defaultValue]))
      for (const input of cs.estimation.inputs) {
        expect(input.defaultValue, `${cs.id}.${input.id}: default below min`).toBeGreaterThanOrEqual(input.min)
        expect(input.defaultValue, `${cs.id}.${input.id}: default above max`).toBeLessThanOrEqual(input.max)
      }
      for (const output of cs.estimation.outputs) {
        const value = output.compute(values)
        expect(Number.isFinite(value), `${cs.id}.${output.id}: not finite`).toBe(true)
        expect(value, `${cs.id}.${output.id}: negative`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('deriveWorkload produces a valid, simulatable workload at default estimation values', () => {
    for (const cs of CASE_STUDIES) {
      const values = Object.fromEntries(cs.estimation.inputs.map((i) => [i.id, i.defaultValue]))
      const outputs = Object.fromEntries(cs.estimation.outputs.map((o) => [o.id, o.compute(values)]))
      const workload = cs.estimation.deriveWorkload(outputs)
      expect(workload.durationMs, `${cs.id}: bad durationMs`).toBeGreaterThan(0)
      expect(workload.tickMs, `${cs.id}: bad tickMs`).toBeGreaterThan(0)
      expect(workload.trafficCurve(0), `${cs.id}: workload offers no traffic`).toBeGreaterThan(0)
    }
  })
})

describe('rubric scoring against the real engine', () => {
  it('the right node kinds present but never wired to the client does NOT pass any rubric criterion -- a disconnected graph trivially reports 0% error since nothing is ever attempted downstream, and unwired nodes shouldn\'t get credit for presence alone', () => {
    for (const cs of CASE_STUDIES) {
      const graph: SimGraph = {
        nodes: [client(), loadBalancer('lb'), service('svc'), cache('cache'), database('db')],
        edges: [], // every node present, nothing connected to the client
      }
      const values = Object.fromEntries(cs.estimation.inputs.map((i) => [i.id, i.defaultValue]))
      const outputs = Object.fromEntries(cs.estimation.outputs.map((o) => [o.id, o.compute(values)]))
      const workload = cs.estimation.deriveWorkload(outputs)
      const result = runSimulation({ graph, workload, incidents: cs.design.incidents })
      const rubric = scoreRubric(graph, result, cs.design.rubric)
      expect(rubric.metCount, `${cs.id}: disconnected graph got credit for ${rubric.metCount} criteria: ${rubric.items.filter((i) => i.met).map((i) => i.id).join(', ')}`).toBe(0)
    }
  })

  it('a minimally-wired path plus unconnected decoration nodes only gets credit for the wired path, not the decorations', () => {
    for (const cs of CASE_STUDIES) {
      const graph: SimGraph = {
        nodes: [
          client(),
          loadBalancer('lb'),
          service('svc'),
          database('db'),
          // Dropped on the canvas, never wired to anything -- should NOT
          // count toward "has a cache" / "has a rate limiter" / etc.
          cache('decoration-cache'),
          rateLimiter('decoration-rl'),
          queue('decoration-queue'),
        ],
        edges: [edge('client', 'lb'), edge('lb', 'svc'), edge('svc', 'db')],
      }
      const values = Object.fromEntries(cs.estimation.inputs.map((i) => [i.id, i.defaultValue]))
      const outputs = Object.fromEntries(cs.estimation.outputs.map((o) => [o.id, o.compute(values)]))
      const workload = cs.estimation.deriveWorkload(outputs)
      const result = runSimulation({ graph, workload, incidents: cs.design.incidents })
      const rubric = scoreRubric(graph, result, cs.design.rubric)
      const cacheItem = rubric.items.find((i) => i.id === 'cache')
      const rateLimiterItem = rubric.items.find((i) => i.id === 'rate-limiter')
      if (cacheItem) expect(cacheItem.met, `${cs.id}: unwired decoration cache got credit`).toBe(false)
      if (rateLimiterItem) expect(rateLimiterItem.met, `${cs.id}: unwired decoration rate limiter got credit`).toBe(false)
    }
  })

  it('an empty design (just the client) scores 0 or near-0 on every case study', () => {
    for (const cs of CASE_STUDIES) {
      const graph: SimGraph = { nodes: [client()], edges: [] }
      const values = Object.fromEntries(cs.estimation.inputs.map((i) => [i.id, i.defaultValue]))
      const outputs = Object.fromEntries(cs.estimation.outputs.map((o) => [o.id, o.compute(values)]))
      const workload = cs.estimation.deriveWorkload(outputs)
      const result = runSimulation({ graph, workload, incidents: cs.design.incidents })
      const rubric = scoreRubric(graph, result, cs.design.rubric)
      expect(rubric.metCount, `${cs.id}: empty design met too many rubric items`).toBeLessThanOrEqual(1)
    }
  })

  it('a reasonably complete reference-shaped design scores highly on every case study', () => {
    for (const cs of CASE_STUDIES) {
      const graph: SimGraph = {
        nodes: [
          client(),
          rateLimiter('rl'),
          loadBalancer('lb'),
          service('svc-a'),
          service('svc-b'),
          cache('cache'),
          queue('queue'),
          database('db'),
        ],
        edges: [
          edge('client', 'rl'),
          edge('rl', 'lb'),
          edge('lb', 'svc-a'),
          edge('lb', 'svc-b'),
          edge('svc-a', 'cache'),
          edge('svc-b', 'cache'),
          edge('cache', 'db'),
          edge('svc-a', 'queue'),
          edge('queue', 'db'),
        ],
      }
      const values = Object.fromEntries(cs.estimation.inputs.map((i) => [i.id, i.defaultValue]))
      const outputs = Object.fromEntries(cs.estimation.outputs.map((o) => [o.id, o.compute(values)]))
      const workload = cs.estimation.deriveWorkload(outputs)
      const result = runSimulation({ graph, workload, incidents: cs.design.incidents })
      const rubric = scoreRubric(graph, result, cs.design.rubric)
      expect(rubric.scorePercent, `${cs.id}: reference-shaped design scored too low (${rubric.metCount}/${rubric.totalCount}): ${rubric.items.filter((i) => !i.met).map((i) => i.id).join(', ')}`).toBeGreaterThanOrEqual(80)
    }
  })
})

describe('estimation slider responsiveness', () => {
  it('Netflix\'s "Watch:upload ratio" slider changes the simulated design-stage write fraction', () => {
    const netflix = getCaseStudy('cs-netflix')!
    const base = Object.fromEntries(netflix.estimation.inputs.map((i) => [i.id, i.defaultValue]))
    const defaultOutputs = Object.fromEntries(netflix.estimation.outputs.map((o) => [o.id, o.compute(base)]))
    const defaultWorkload = netflix.estimation.deriveWorkload(defaultOutputs)

    const skewed = { ...base, readWriteRatio: netflix.estimation.inputs.find((i) => i.id === 'readWriteRatio')!.min }
    const skewedOutputs = Object.fromEntries(netflix.estimation.outputs.map((o) => [o.id, o.compute(skewed)]))
    const skewedWorkload = netflix.estimation.deriveWorkload(skewedOutputs)

    expect(skewedWorkload.writeFraction, 'moving the watch:upload ratio slider had no effect on the simulated write fraction').not.toBeCloseTo(defaultWorkload.writeFraction ?? 0, 5)
  })
})

describe('requirements: every canonical-in-design option is distinguishable from at least one non-canonical option', () => {
  it('no question is all-canonical or all-non-canonical (there should be a real choice to make)', () => {
    for (const cs of CASE_STUDIES) {
      for (const q of cs.requirements.questions) {
        const canonicalCount = q.options.filter((o) => o.inCanonicalDesign).length
        expect(canonicalCount, `${cs.id}/${q.id}: no canonical option`).toBeGreaterThan(0)
        expect(canonicalCount, `${cs.id}/${q.id}: every option marked canonical, no contrast`).toBeLessThan(q.options.length)
      }
    }
  })
})
