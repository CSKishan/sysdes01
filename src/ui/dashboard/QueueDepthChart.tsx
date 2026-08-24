import { useMemo } from 'react'
import { Line } from 'recharts'
import type { SimResult } from '@/engine/types'
import { TickLineChart } from './TickLineChart'

// A handful of distinguishable line colors -- this game's graphs rarely
// have more than two or three queue/broker nodes on screen at once.
const LINE_COLORS = ['#f2b366', '#7c8aa5', '#5fd88f', '#e2685f']

/** Backlog size over time for every queue/at-least-once-broker node in the
 * run -- the queue/broker counterpart to LatencyChart, since "did the
 * backlog stay bounded" is its own read on a run, distinct from latency or
 * throughput (see Phase 4.5: queue depth over time). Renders nothing if
 * the graph has no such node. */
export function QueueDepthChart({ result, tickIndex }: { result: SimResult; tickIndex: number }) {
  // Neither of these depends on tickIndex (only the final slice below
  // does), but tickIndex changes on every playback frame -- without this,
  // the full nodeTicks array would get rescanned on every single tick.
  const { nodeIds, byTick } = useMemo(() => {
    const nodeIds = Array.from(
      new Set(result.nodeTicks.filter((nm) => nm.queueDepth !== undefined).map((nm) => nm.nodeId)),
    )
    const byTick = new Map<number, Record<string, number>>()
    for (const nm of result.nodeTicks) {
      if (nm.queueDepth === undefined) continue
      const row = byTick.get(nm.tMs) ?? {}
      row[nm.nodeId] = nm.queueDepth
      byTick.set(nm.tMs, row)
    }
    return { nodeIds, byTick }
  }, [result])

  if (nodeIds.length === 0) return null

  const data = result.ticks.slice(0, tickIndex + 1).map((t) => ({ tMs: t.tMs, ...byTick.get(t.tMs) }))

  return (
    <TickLineChart data={data}>
      {nodeIds.map((nodeId, i) => (
        <Line
          key={nodeId}
          type="monotone"
          dataKey={nodeId}
          stroke={LINE_COLORS[i % LINE_COLORS.length]}
          strokeWidth={1.5}
          dot={false}
          name={nodeId}
          connectNulls
        />
      ))}
    </TickLineChart>
  )
}
