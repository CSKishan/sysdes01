// Achievement definitions (Phase 9.6) -- tied to real engineering feats a
// run's own numbers can prove, not scripted milestones. Checked against
// every completed simulation run (see useSimulationPlayback.ts), so these
// fire the same way whether the run happened in a guided level, Sandbox, or
// a case study design.

import type { IncidentWindow, SimGraph, SimResult } from '@/engine/types'

export interface AchievementContext {
  graph: SimGraph
  result: SimResult
  incidents: IncidentWindow[]
  /** Includes the run that just finished. */
  totalRunsCompleted: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  check: (ctx: AchievementContext) => boolean
}

function hasNodeKind(graph: SimGraph, kind: string): boolean {
  return graph.nodes.some((n) => n.config.kind === kind)
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-delivery',
    title: 'First Delivery',
    description: 'Ran your first simulation.',
    check: (ctx) => ctx.totalRunsCompleted >= 1,
  },
  {
    id: 'seasoned-dispatcher',
    title: 'Seasoned Dispatcher',
    description: 'Ran 10 simulations.',
    check: (ctx) => ctx.totalRunsCompleted >= 10,
  },
  {
    id: 'veteran-of-the-route',
    title: 'Veteran of the Route',
    description: 'Ran 50 simulations.',
    check: (ctx) => ctx.totalRunsCompleted >= 50,
  },
  {
    id: 'five-nines',
    title: 'Five Nines',
    description: 'Hit 99.999% estimated availability on a design.',
    check: (ctx) => ctx.result.aggregate.availability >= 0.99999,
  },
  {
    id: 'zero-defects',
    title: 'Zero Defects',
    description: 'Cleared a real traffic load with a 0% error rate.',
    check: (ctx) => ctx.result.aggregate.errorRate === 0 && ctx.result.aggregate.throughputRps > 0,
  },
  {
    id: 'weathered-the-storm',
    title: 'Weathered the Storm',
    description: 'Kept errors under 5% while an incident was configured for the run.',
    check: (ctx) =>
      ctx.incidents.length > 0 && ctx.result.aggregate.errorRate < 0.05 && ctx.result.aggregate.throughputRps > 0,
  },
  {
    id: 'cache-money',
    title: 'Cache Money',
    description: 'Got a cache hit rate of 75% or higher.',
    // The campaign's own caching lesson (Chapter I's "Shelf" level, a
    // 50-slot cache against its authored keyspace/zipfS) predicts ~73.4%
    // hit rate -- an 80% bar sat just above what that reference level
    // produces, so it never earned this playing exactly as taught. 75%
    // requires a deliberate improvement over the lesson's own baseline
    // without requiring an unprompted 2x cache-size jump to clear it.
    check: (ctx) => ctx.result.aggregate.avgCacheHitRate !== null && ctx.result.aggregate.avgCacheHitRate >= 0.75,
  },
  {
    id: 'built-to-last',
    title: 'Built to Last',
    description: 'A database/replica design with 99.99%+ estimated write durability.',
    check: (ctx) =>
      (hasNodeKind(ctx.graph, 'database') || hasNodeKind(ctx.graph, 'replica')) && ctx.result.aggregate.durability >= 0.9999,
  },
  {
    id: 'even-keel',
    title: 'Even Keel',
    description: 'A sharded design with shard load imbalance at 1.6x or better.',
    // maxShardImbalance is purely a function of key-traffic skew (zipfS),
    // not capacity or routing strategy -- every authored shard level uses
    // zipfS 1.5 (the reference default), which measured at ~2.0-3.4x
    // depending on shard count, well above the original 1.3x bar. 1.6x
    // still excludes that default outright, but is reachable with a
    // deliberately lower-skew Sandbox design (zipfS ~1.1) instead of
    // requiring the near-zero skew a 1.3x bar effectively demanded.
    check: (ctx) =>
      hasNodeKind(ctx.graph, 'shardRouter') &&
      ctx.result.aggregate.maxShardImbalance <= 1.6 &&
      ctx.result.aggregate.throughputRps > 0,
  },
  {
    id: 'shoestring-budget',
    title: 'Shoestring Budget',
    description: 'Served 100+ rps for $15/hr or less with under 5% errors.',
    // The original 30rps/$20 bar was clearable by a single early level's
    // default single-node design (a default server already costs $8/hr and
    // clears 40rps), before the player made any deliberate cost trade-off.
    // Raising both the throughput floor and lowering the cost ceiling
    // together means clearing it needs genuine efficient scaling, not an
    // incidental early-game default.
    check: (ctx) =>
      ctx.result.aggregate.costPerHour > 0 &&
      ctx.result.aggregate.costPerHour <= 15 &&
      ctx.result.aggregate.throughputRps >= 100 &&
      ctx.result.aggregate.errorRate < 0.05,
  },
]
