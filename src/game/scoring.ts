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
  /** How close to the limit the run came: 0 = right at the line, 1 = tons of headroom. */
  margin: number
}

export interface ScoreResult {
  passed: boolean
  stars: 0 | 2 | 3
  checks: SloCheck[]
}

/** ratio should be actual/target for "lower is better" metrics, or target/actual
 * for "higher is better" ones — always <= 1 when the check passes. */
function marginFromRatio(ratio: number): number {
  return Math.max(0, Math.min(1, 1 - ratio))
}

export function scoreRun(result: SimResult, slo: SloTarget): ScoreResult {
  const checks: SloCheck[] = []

  if (slo.maxP99Ms !== undefined) {
    const ratio = result.aggregate.p99Ms / slo.maxP99Ms
    checks.push({
      label: 'p99 latency',
      passed: ratio <= 1,
      actual: `${Math.round(result.aggregate.p99Ms)}ms`,
      target: `≤ ${slo.maxP99Ms}ms`,
      margin: marginFromRatio(ratio),
    })
  }
  if (slo.maxErrorRate !== undefined) {
    const ratio =
      slo.maxErrorRate > 0 ? result.aggregate.errorRate / slo.maxErrorRate : result.aggregate.errorRate > 0 ? Infinity : 0
    checks.push({
      label: 'Error rate',
      passed: ratio <= 1,
      actual: `${(result.aggregate.errorRate * 100).toFixed(1)}%`,
      target: `≤ ${(slo.maxErrorRate * 100).toFixed(1)}%`,
      margin: marginFromRatio(ratio),
    })
  }
  if (slo.maxCostPerHour !== undefined) {
    const ratio = result.aggregate.costPerHour / slo.maxCostPerHour
    checks.push({
      label: 'Cost',
      passed: ratio <= 1,
      actual: `$${result.aggregate.costPerHour.toFixed(0)}/hr`,
      target: `≤ $${slo.maxCostPerHour}/hr`,
      margin: marginFromRatio(ratio),
    })
  }
  if (slo.minAvgCacheHitRate !== undefined) {
    const actual = result.aggregate.avgCacheHitRate ?? 0
    const ratio = actual > 0 ? slo.minAvgCacheHitRate / actual : Infinity
    checks.push({
      label: 'Cache hit rate',
      passed: actual >= slo.minAvgCacheHitRate,
      actual: `${(actual * 100).toFixed(0)}%`,
      target: `≥ ${(slo.minAvgCacheHitRate * 100).toFixed(0)}%`,
      margin: marginFromRatio(ratio),
    })
  }
  if (slo.minThroughputRps !== undefined) {
    const ratio = slo.minThroughputRps > 0 ? slo.minThroughputRps / Math.max(result.aggregate.throughputRps, 1e-9) : 0
    checks.push({
      label: 'Throughput',
      passed: result.aggregate.throughputRps >= slo.minThroughputRps,
      actual: `${Math.round(result.aggregate.throughputRps)} rps`,
      target: `≥ ${slo.minThroughputRps} rps`,
      margin: marginFromRatio(ratio),
    })
  }
  if (slo.minAvailability !== undefined) {
    const ratio = result.aggregate.availability > 0 ? slo.minAvailability / result.aggregate.availability : Infinity
    checks.push({
      label: 'Availability',
      passed: result.aggregate.availability >= slo.minAvailability,
      actual: `${(result.aggregate.availability * 100).toFixed(3)}%`,
      target: `≥ ${(slo.minAvailability * 100).toFixed(3)}%`,
      margin: marginFromRatio(ratio),
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
      label: 'Stale reads',
      passed: ratio <= 1,
      actual: `${(result.aggregate.staleReadRate * 100).toFixed(1)}%`,
      target: `≤ ${(slo.maxStaleReadRate * 100).toFixed(1)}%`,
      margin: marginFromRatio(ratio),
    })
  }

  const passed = checks.every((c) => c.passed)
  const worstMargin = checks.length > 0 ? Math.min(...checks.map((c) => c.margin)) : 1
  const stars: 0 | 2 | 3 = !passed ? 0 : worstMargin >= 0.3 ? 3 : 2

  return { passed, stars, checks }
}
