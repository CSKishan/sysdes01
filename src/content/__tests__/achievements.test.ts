// Fixture-based, like scoring.test.ts's fakeResult -- an achievement's
// `check` is a pure predicate over {graph, result, incidents,
// totalRunsCompleted}, so there's no need to run these through the real
// engine the way content-truth tests do for authored levels.

import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, type AchievementContext } from '../achievements'
import type { GraphNode, SimAggregate, SimResult } from '@/engine/types'

function fakeAggregate(overrides: Partial<SimAggregate> = {}): SimAggregate {
  return {
    p50Ms: 50,
    p99Ms: 100,
    throughputRps: 40,
    errorRate: 0,
    costPerHour: 10,
    avgCacheHitRate: null,
    staleReadRate: 0,
    availability: 1,
    durability: 1,
    maxUtilization: 0.5,
    bottleneckNodeId: null,
    writeP50Ms: 0,
    writeP99Ms: 0,
    maxShardImbalance: 1,
    maxReplicationLagMs: 0,
    maxQueueDepth: 0,
    ...overrides,
  }
}

function fakeResult(overrides: Partial<SimAggregate> = {}): SimResult {
  return { ticks: [], nodeTicks: [], aggregate: fakeAggregate(overrides) }
}

function node(kind: string): GraphNode {
  return { id: kind, label: kind, position: { x: 0, y: 0 }, config: { kind } as GraphNode['config'] }
}

function fakeContext(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    graph: { nodes: [node('client')], edges: [] },
    result: fakeResult(),
    incidents: [],
    totalRunsCompleted: 1,
    ...overrides,
  }
}

function achievement(id: string) {
  const a = ACHIEVEMENTS.find((a) => a.id === id)
  if (!a) throw new Error(`no achievement named ${id}`)
  return a
}

describe('achievements', () => {
  it('every achievement has a unique id', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id))
    expect(ids.size).toBe(ACHIEVEMENTS.length)
  })

  it('first-delivery/seasoned-dispatcher/veteran-of-the-route are pure run-count milestones', () => {
    const ctx = (n: number) => fakeContext({ totalRunsCompleted: n })
    expect(achievement('first-delivery').check(ctx(1))).toBe(true)
    expect(achievement('first-delivery').check(ctx(0))).toBe(false)
    expect(achievement('seasoned-dispatcher').check(ctx(10))).toBe(true)
    expect(achievement('seasoned-dispatcher').check(ctx(9))).toBe(false)
    expect(achievement('veteran-of-the-route').check(ctx(50))).toBe(true)
    expect(achievement('veteran-of-the-route').check(ctx(49))).toBe(false)
  })

  it('five-nines requires 99.999% availability, not merely high availability', () => {
    expect(achievement('five-nines').check(fakeContext({ result: fakeResult({ availability: 0.9999 }) }))).toBe(false)
    expect(achievement('five-nines').check(fakeContext({ result: fakeResult({ availability: 0.99999 }) }))).toBe(true)
  })

  it("zero-defects requires actual completed traffic, not just a trivially-empty 0% error rate", () => {
    // The same disconnected-graph trap meetsLoad/rubricScoring guard against
    // elsewhere: 0 errors because nothing was ever attempted isn't "zero defects".
    expect(achievement('zero-defects').check(fakeContext({ result: fakeResult({ errorRate: 0, throughputRps: 0 }) }))).toBe(
      false,
    )
    expect(achievement('zero-defects').check(fakeContext({ result: fakeResult({ errorRate: 0, throughputRps: 40 }) }))).toBe(
      true,
    )
  })

  it('weathered-the-storm requires an incident to actually be configured for the run', () => {
    const passingRun = fakeResult({ errorRate: 0.01, throughputRps: 40 })
    expect(achievement('weathered-the-storm').check(fakeContext({ result: passingRun, incidents: [] }))).toBe(false)
    expect(
      achievement('weathered-the-storm').check(
        fakeContext({ result: passingRun, incidents: [{ id: 'x', label: 'x', startMs: 0, endMs: 100 }] }),
      ),
    ).toBe(true)
  })

  it('cache-money requires an actual cache hit rate, not the "no cache at all" null default', () => {
    expect(achievement('cache-money').check(fakeContext({ result: fakeResult({ avgCacheHitRate: null }) }))).toBe(false)
    expect(achievement('cache-money').check(fakeContext({ result: fakeResult({ avgCacheHitRate: 0.5 }) }))).toBe(false)
    expect(achievement('cache-money').check(fakeContext({ result: fakeResult({ avgCacheHitRate: 0.85 }) }))).toBe(true)
  })

  it("built-to-last requires a database/replica node -- durability defaults to a perfect 1.0 when there's neither", () => {
    const noDbGraph = { nodes: [node('client'), node('server')], edges: [] }
    const dbGraph = { nodes: [node('client'), node('database')], edges: [] }
    const nearPerfect = fakeResult({ durability: 0.99995 })
    expect(achievement('built-to-last').check(fakeContext({ graph: noDbGraph, result: nearPerfect }))).toBe(false)
    expect(achievement('built-to-last').check(fakeContext({ graph: dbGraph, result: nearPerfect }))).toBe(true)
  })

  it('even-keel requires an actual shardRouter node, not just a low default maxShardImbalance', () => {
    const noRouterGraph = { nodes: [node('client'), node('database')], edges: [] }
    const routerGraph = { nodes: [node('client'), node('shardRouter')], edges: [] }
    const balanced = fakeResult({ maxShardImbalance: 1.1, throughputRps: 40 })
    expect(achievement('even-keel').check(fakeContext({ graph: noRouterGraph, result: balanced }))).toBe(false)
    expect(achievement('even-keel').check(fakeContext({ graph: routerGraph, result: balanced }))).toBe(true)
  })

  it('shoestring-budget requires real throughput and a nonzero cost, not a free/empty design', () => {
    const free = fakeResult({ costPerHour: 0, throughputRps: 120, errorRate: 0 })
    const cheap = fakeResult({ costPerHour: 12, throughputRps: 120, errorRate: 0 })
    const expensive = fakeResult({ costPerHour: 40, throughputRps: 120, errorRate: 0 })
    expect(achievement('shoestring-budget').check(fakeContext({ result: free }))).toBe(false)
    expect(achievement('shoestring-budget').check(fakeContext({ result: cheap }))).toBe(true)
    expect(achievement('shoestring-budget').check(fakeContext({ result: expensive }))).toBe(false)
  })

  it('shoestring-budget requires the throughput floor too, not just a low cost', () => {
    const lowThroughput = fakeResult({ costPerHour: 12, throughputRps: 40, errorRate: 0 })
    expect(achievement('shoestring-budget').check(fakeContext({ result: lowThroughput }))).toBe(false)
  })
})
