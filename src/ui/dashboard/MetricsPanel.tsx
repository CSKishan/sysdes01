import type { SimResult } from '@/engine/types'
import { StatTile } from './StatTile'

export type MetricKey =
  | 'latency'
  | 'throughput'
  | 'errors'
  | 'cost'
  | 'cacheHitRate'
  | 'availability'
  | 'writeLatency'
  | 'durability'
  | 'replicationLag'
  | 'shardImbalance'
  | 'queueDepth'

// The six metrics every Chapter 0/1 level already relies on as its
// implicit default (no level has ever authored `visibleMetrics`). The four
// Chapter II+ metrics (writeLatency, durability, replicationLag,
// shardImbalance) are opt-in only -- a level lists them explicitly once
// they're actually relevant, instead of every existing dashboard suddenly
// growing four new near-always-neutral tiles.
const DEFAULT_METRICS: MetricKey[] = ['latency', 'throughput', 'errors', 'cost', 'cacheHitRate', 'availability']

export function MetricsPanel({
  result,
  tickIndex,
  visibleMetrics = DEFAULT_METRICS,
}: {
  result: SimResult | null
  /** Which tick to read live values from; omit to show the final aggregate. */
  tickIndex?: number
  visibleMetrics?: MetricKey[]
}) {
  if (!result) {
    return (
      <div className="grid grid-cols-2 gap-2 opacity-40">
        {visibleMetrics.map((key) => (
          <StatTile key={key} label={labelFor(key)} value="—" />
        ))}
      </div>
    )
  }

  const tick = tickIndex !== undefined ? result.ticks[Math.min(tickIndex, result.ticks.length - 1)] : null
  const p50 = tick ? tick.p50Ms : result.aggregate.p50Ms
  const p99 = tick ? tick.p99Ms : result.aggregate.p99Ms
  const throughput = tick ? tick.completedRps : result.aggregate.throughputRps
  const errorRate = tick
    ? tick.offeredRps > 0
      ? tick.errorRps / tick.offeredRps
      : 0
    : result.aggregate.errorRate

  return (
    <div className="grid grid-cols-2 gap-2">
      {visibleMetrics.includes('latency') && (
        <StatTile
          label="p50 / p99 latency"
          value={`${Math.round(p50)} / ${Math.round(p99)}ms`}
          tone={p99 > 1000 ? 'bad' : p99 > 400 ? 'warn' : 'ok'}
        />
      )}
      {visibleMetrics.includes('throughput') && (
        <StatTile label="Completed" value={`${Math.round(throughput)} rps`} />
      )}
      {visibleMetrics.includes('errors') && (
        <StatTile
          label="Error rate"
          value={`${(errorRate * 100).toFixed(1)}%`}
          tone={errorRate > 0.05 ? 'bad' : errorRate > 0 ? 'warn' : 'ok'}
        />
      )}
      {visibleMetrics.includes('cost') && (
        <StatTile label="Cost" value={`$${result.aggregate.costPerHour.toFixed(0)}/hr`} />
      )}
      {visibleMetrics.includes('cacheHitRate') && result.aggregate.avgCacheHitRate !== null && (
        <StatTile
          label="Cache hit rate"
          value={`${Math.round((result.aggregate.avgCacheHitRate ?? 0) * 100)}%`}
          tone="ok"
        />
      )}
      {visibleMetrics.includes('availability') && (
        <StatTile
          label="Availability"
          value={`${(result.aggregate.availability * 100).toFixed(3)}%`}
          tone={result.aggregate.availability >= 0.999 ? 'ok' : result.aggregate.availability >= 0.99 ? 'warn' : 'bad'}
        />
      )}
      {visibleMetrics.includes('writeLatency') && (
        <StatTile
          label="Write p50 / p99"
          value={`${Math.round(result.aggregate.writeP50Ms)} / ${Math.round(result.aggregate.writeP99Ms)}ms`}
          tone={result.aggregate.writeP99Ms > 1000 ? 'bad' : result.aggregate.writeP99Ms > 400 ? 'warn' : 'ok'}
        />
      )}
      {visibleMetrics.includes('durability') && (
        <StatTile
          label="Durability"
          value={`${(result.aggregate.durability * 100).toFixed(3)}%`}
          tone={result.aggregate.durability >= 0.999 ? 'ok' : result.aggregate.durability >= 0.99 ? 'warn' : 'bad'}
        />
      )}
      {visibleMetrics.includes('replicationLag') && (
        <StatTile
          label="Replication lag"
          value={`${Math.round(result.aggregate.maxReplicationLagMs)}ms`}
          tone={result.aggregate.maxReplicationLagMs > 500 ? 'bad' : result.aggregate.maxReplicationLagMs > 100 ? 'warn' : 'ok'}
        />
      )}
      {visibleMetrics.includes('shardImbalance') && (
        <StatTile
          label="Shard imbalance"
          value={`${result.aggregate.maxShardImbalance.toFixed(2)}x`}
          tone={result.aggregate.maxShardImbalance > 2 ? 'bad' : result.aggregate.maxShardImbalance > 1.3 ? 'warn' : 'ok'}
        />
      )}
      {visibleMetrics.includes('queueDepth') && (
        <StatTile label="Peak queue depth" value={`${Math.round(result.aggregate.maxQueueDepth)} items`} />
      )}
    </div>
  )
}

function labelFor(key: MetricKey): string {
  switch (key) {
    case 'latency':
      return 'p50 / p99 latency'
    case 'throughput':
      return 'Completed'
    case 'errors':
      return 'Error rate'
    case 'cost':
      return 'Cost'
    case 'cacheHitRate':
      return 'Cache hit rate'
    case 'availability':
      return 'Availability'
    case 'writeLatency':
      return 'Write p50 / p99'
    case 'durability':
      return 'Durability'
    case 'replicationLag':
      return 'Replication lag'
    case 'shardImbalance':
      return 'Shard imbalance'
    case 'queueDepth':
      return 'Peak queue depth'
  }
}
