import { useMemo } from 'react'
import { Line } from 'recharts'
import type { SimResult } from '@/engine/types'
import { TickLineChart } from './TickLineChart'
import { useThemeColor } from '@/ui/shared/useThemeColor'

// The same handful of distinguishable line colors as everywhere else
// (warn/muted-ink/ok/bad) -- this game's graphs rarely have more than two
// or three queue/broker nodes on screen at once.
const LINE_COLOR_VARS = ['--color-warn-500', '--color-ink-400', '--color-ok-500', '--color-bad-500']

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

  // Fixed-size, unconditional hook calls (rules of hooks) -- called ahead
  // of the early return below so the hook count never changes between
  // renders regardless of how many node ids there turn out to be.
  const lineColors = [
    useThemeColor(LINE_COLOR_VARS[0]),
    useThemeColor(LINE_COLOR_VARS[1]),
    useThemeColor(LINE_COLOR_VARS[2]),
    useThemeColor(LINE_COLOR_VARS[3]),
  ]

  if (nodeIds.length === 0) return null

  const data = result.ticks.slice(0, tickIndex + 1).map((t) => ({ tMs: t.tMs, ...byTick.get(t.tMs) }))

  return (
    <TickLineChart data={data}>
      {nodeIds.map((nodeId, i) => (
        <Line
          key={nodeId}
          type="monotone"
          dataKey={nodeId}
          stroke={lineColors[i % lineColors.length]}
          strokeWidth={1.5}
          dot={false}
          name={nodeId}
          connectNulls
        />
      ))}
    </TickLineChart>
  )
}
