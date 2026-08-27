// Turns a SimResult + a level's SLO target into a pass/fail and a star
// rating. Kept separate from the engine because scoring is a game concern,
// not a simulation concern — the engine shouldn't know what "3 stars" means.

import type { SimResult } from '@/engine/types'
import type { SloTarget } from '@/content/types'

export interface SloCheck {
  label: string
  passed: boolean
  actual: string
  target: string
  /** SRE "burn rate": how fast this run is consuming its error budget for
   * this dimension, relative to sustainable. 1.0 = exactly at the line (the
   * whole budget, used at exactly the rate that lasts the target period);
   * 2.0 = burning it twice as fast as sustainable (exhausts the budget in
   * half the time); < 1 = comfortably under. Always >= 0 and <= 1 when the
   * check passes, matching how marginFromRatio derives margin from it. */
  ratio: number
}

export interface ScoreResult {
  passed: boolean
  stars: 0 | 1 | 2 | 3
  checks: SloCheck[]
}

/** ratio should be actual/target for "lower is better" metrics, or target/actual
 * for "higher is better" ones — always <= 1 when the check passes. */
function marginFromRatio(ratio: number): number {
  return Math.max(0, Math.min(1, 1 - ratio))
}

/** The one source of truth for how each SLO field is labeled and how its
 * authored target number is formatted -- shared with the Library's topic
 * pages (which show a level's targets with no SimResult to score against),
 * so the two can't quietly drift apart into disagreeing about what a
 * level's own SLO says. */
export const SLO_FIELD_FORMATS: Record<keyof SloTarget, { label: string; formatTarget: (v: number) => string }> = {
  maxP99Ms: { label: 'p99 latency', formatTarget: (v) => `≤ ${v}ms` },
  maxErrorRate: { label: 'Error rate', formatTarget: (v) => `≤ ${(v * 100).toFixed(1)}%` },
  maxCostPerHour: { label: 'Cost', formatTarget: (v) => `≤ $${v}/hr` },
  minAvgCacheHitRate: { label: 'Cache hit rate', formatTarget: (v) => `≥ ${(v * 100).toFixed(0)}%` },
  minThroughputRps: { label: 'Throughput', formatTarget: (v) => `≥ ${v} rps` },
  minAvailability: { label: 'Availability', formatTarget: (v) => `≥ ${(v * 100).toFixed(3)}%` },
  maxStaleReadRate: { label: 'Stale reads', formatTarget: (v) => `≤ ${(v * 100).toFixed(1)}%` },
  minDurability: { label: 'Durability', formatTarget: (v) => `≥ ${(v * 100).toFixed(3)}%` },
  maxWriteP99Ms: { label: 'Write p99 latency', formatTarget: (v) => `≤ ${v}ms` },
  maxReplicationLagMs: { label: 'Replication lag', formatTarget: (v) => `≤ ${v}ms` },
  maxShardImbalance: { label: 'Shard imbalance', formatTarget: (v) => `≤ ${v.toFixed(2)}x` },
  maxQueueDepth: { label: 'Queue depth', formatTarget: (v) => `≤ ${v} items` },
}

export function scoreRun(result: SimResult, slo: SloTarget): ScoreResult {
  const checks: SloCheck[] = []

  if (slo.maxP99Ms !== undefined) {
    const ratio = result.aggregate.p99Ms / slo.maxP99Ms
    checks.push({
      label: SLO_FIELD_FORMATS.maxP99Ms.label,
      passed: ratio <= 1,
      actual: `${Math.round(result.aggregate.p99Ms)}ms`,
      target: SLO_FIELD_FORMATS.maxP99Ms.formatTarget(slo.maxP99Ms),
      ratio,
    })
  }
  if (slo.maxErrorRate !== undefined) {
    const ratio =
      slo.maxErrorRate > 0 ? result.aggregate.errorRate / slo.maxErrorRate : result.aggregate.errorRate > 0 ? Infinity : 0
    checks.push({
      label: SLO_FIELD_FORMATS.maxErrorRate.label,
      passed: ratio <= 1,
      actual: `${(result.aggregate.errorRate * 100).toFixed(1)}%`,
      target: SLO_FIELD_FORMATS.maxErrorRate.formatTarget(slo.maxErrorRate),
      ratio,
    })
  }
  if (slo.maxCostPerHour !== undefined) {
    const ratio = result.aggregate.costPerHour / slo.maxCostPerHour
    checks.push({
      label: SLO_FIELD_FORMATS.maxCostPerHour.label,
      passed: ratio <= 1,
      actual: `$${result.aggregate.costPerHour.toFixed(0)}/hr`,
      target: SLO_FIELD_FORMATS.maxCostPerHour.formatTarget(slo.maxCostPerHour),
      ratio,
    })
  }
  if (slo.minAvgCacheHitRate !== undefined) {
    const actual = result.aggregate.avgCacheHitRate ?? 0
    const ratio = slo.minAvgCacheHitRate / Math.max(actual, 1e-9)
    checks.push({
      label: SLO_FIELD_FORMATS.minAvgCacheHitRate.label,
      passed: actual >= slo.minAvgCacheHitRate,
      actual: `${(actual * 100).toFixed(0)}%`,
      target: SLO_FIELD_FORMATS.minAvgCacheHitRate.formatTarget(slo.minAvgCacheHitRate),
      ratio,
    })
  }
  if (slo.minThroughputRps !== undefined) {
    const ratio = slo.minThroughputRps > 0 ? slo.minThroughputRps / Math.max(result.aggregate.throughputRps, 1e-9) : 0
    checks.push({
      label: SLO_FIELD_FORMATS.minThroughputRps.label,
      passed: result.aggregate.throughputRps >= slo.minThroughputRps,
      actual: `${Math.round(result.aggregate.throughputRps)} rps`,
      target: SLO_FIELD_FORMATS.minThroughputRps.formatTarget(slo.minThroughputRps),
      ratio,
    })
  }
  if (slo.minAvailability !== undefined) {
    const ratio = slo.minAvailability / Math.max(result.aggregate.availability, 1e-9)
    checks.push({
      label: SLO_FIELD_FORMATS.minAvailability.label,
      passed: result.aggregate.availability >= slo.minAvailability,
      actual: `${(result.aggregate.availability * 100).toFixed(3)}%`,
      target: SLO_FIELD_FORMATS.minAvailability.formatTarget(slo.minAvailability),
      ratio,
    })
  }
  if (slo.maxStaleReadRate !== undefined) {
    const ratio =
      slo.maxStaleReadRate > 0
        ? result.aggregate.staleReadRate / slo.maxStaleReadRate
        : result.aggregate.staleReadRate > 0
          ? Infinity
          : 0
    checks.push({
      label: SLO_FIELD_FORMATS.maxStaleReadRate.label,
      passed: ratio <= 1,
      actual: `${(result.aggregate.staleReadRate * 100).toFixed(1)}%`,
      target: SLO_FIELD_FORMATS.maxStaleReadRate.formatTarget(slo.maxStaleReadRate),
      ratio,
    })
  }
  if (slo.minDurability !== undefined) {
    const ratio = slo.minDurability / Math.max(result.aggregate.durability, 1e-9)
    checks.push({
      label: SLO_FIELD_FORMATS.minDurability.label,
      passed: result.aggregate.durability >= slo.minDurability,
      actual: `${(result.aggregate.durability * 100).toFixed(3)}%`,
      target: SLO_FIELD_FORMATS.minDurability.formatTarget(slo.minDurability),
      ratio,
    })
  }
  if (slo.maxWriteP99Ms !== undefined) {
    // Same zero-target guard as maxErrorRate/maxStaleReadRate/maxQueueDepth
    // above: a plain division here would be 0/0 = NaN whenever a design
    // with genuinely zero write latency meets a `maxWriteP99Ms: 0` target,
    // and `NaN <= 1` is false -- silently failing a check the design
    // actually satisfies exactly.
    const ratio =
      slo.maxWriteP99Ms > 0 ? result.aggregate.writeP99Ms / slo.maxWriteP99Ms : result.aggregate.writeP99Ms > 0 ? Infinity : 0
    checks.push({
      label: SLO_FIELD_FORMATS.maxWriteP99Ms.label,
      passed: ratio <= 1,
      actual: `${Math.round(result.aggregate.writeP99Ms)}ms`,
      target: SLO_FIELD_FORMATS.maxWriteP99Ms.formatTarget(slo.maxWriteP99Ms),
      ratio,
    })
  }
  if (slo.maxReplicationLagMs !== undefined) {
    // Same zero-target guard -- `maxReplicationLagMs: 0` ("no async lag
    // allowed") is a natural SLO for an all-synchronous-replica design,
    // which legitimately reports 0ms lag.
    const ratio =
      slo.maxReplicationLagMs > 0
        ? result.aggregate.maxReplicationLagMs / slo.maxReplicationLagMs
        : result.aggregate.maxReplicationLagMs > 0
          ? Infinity
          : 0
    checks.push({
      label: SLO_FIELD_FORMATS.maxReplicationLagMs.label,
      passed: ratio <= 1,
      actual: `${Math.round(result.aggregate.maxReplicationLagMs)}ms`,
      target: SLO_FIELD_FORMATS.maxReplicationLagMs.formatTarget(slo.maxReplicationLagMs),
      ratio,
    })
  }
  if (slo.maxShardImbalance !== undefined) {
    const ratio = result.aggregate.maxShardImbalance / slo.maxShardImbalance
    checks.push({
      label: SLO_FIELD_FORMATS.maxShardImbalance.label,
      passed: ratio <= 1,
      actual: `${result.aggregate.maxShardImbalance.toFixed(2)}x`,
      target: SLO_FIELD_FORMATS.maxShardImbalance.formatTarget(slo.maxShardImbalance),
      ratio,
    })
  }
  if (slo.maxQueueDepth !== undefined) {
    const ratio =
      slo.maxQueueDepth > 0 ? result.aggregate.maxQueueDepth / slo.maxQueueDepth : result.aggregate.maxQueueDepth > 0 ? Infinity : 0
    checks.push({
      label: SLO_FIELD_FORMATS.maxQueueDepth.label,
      passed: ratio <= 1,
      actual: `${Math.round(result.aggregate.maxQueueDepth)} items`,
      target: SLO_FIELD_FORMATS.maxQueueDepth.formatTarget(slo.maxQueueDepth),
      ratio,
    })
  }

  const passed = checks.every((c) => c.passed)
  const worstMargin = checks.length > 0 ? Math.min(...checks.map((c) => marginFromRatio(c.ratio))) : 1
  const stars: 0 | 1 | 2 | 3 = !passed ? 0 : worstMargin >= 0.3 ? 3 : worstMargin >= 0.15 ? 2 : 1

  return { passed, stars, checks }
}
