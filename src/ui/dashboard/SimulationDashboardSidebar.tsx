// The "Dashboard" + "Latency over time" (+ optional "Queue depth over time")
// sidebar panel stack, shared by every screen that runs a simulation and
// shows its live/final numbers next to the canvas (BuildStagePlayer,
// SandboxView, CaseStudyDesignStage) -- factored out once a third near-
// identical copy of this block showed up, rather than pasting a fourth.

import { useMemo } from 'react'
import type { SimResult } from '@/engine/types'
import { MetricsPanel, type MetricKey } from './MetricsPanel'
import { LatencyChart } from './LatencyChart'
import { QueueDepthChart } from './QueueDepthChart'
import { Panel } from '@/ui/shared/Panel'

export function SimulationDashboardSidebar({
  result,
  tickIndex,
  visibleMetrics,
  showQueueDepth = false,
}: {
  result: SimResult | null
  tickIndex: number
  visibleMetrics?: MetricKey[]
  /** Sandbox and case-study design both pass this -- either can end up with
   * a level-less graph the player wired a queue/broker/rate limiter into
   * themselves, with no fixed target graph to know that ahead of time.
   * BuildStagePlayer passes it only when the stage's own SLO measures
   * maxQueueDepth. */
  showQueueDepth?: boolean
}) {
  // Scans the whole nodeTicks array, so it's worth not redoing on every
  // playback tick -- only `result` actually changes what this returns,
  // not `tickIndex`, which is what actually ticks during playback.
  const hasQueueDepthData = useMemo(() => result?.nodeTicks.some((nm) => nm.queueDepth !== undefined) ?? false, [result])

  return (
    <div className="flex w-64 shrink-0 flex-col gap-3">
      <Panel className="p-3">
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
          Dashboard
        </p>
        <MetricsPanel result={result} tickIndex={tickIndex} visibleMetrics={visibleMetrics} />
      </Panel>
      {result && (
        <Panel className="p-3">
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            Latency over time
          </p>
          <LatencyChart result={result} tickIndex={tickIndex} />
        </Panel>
      )}
      {showQueueDepth && result && hasQueueDepthData && (
        <Panel className="p-3">
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            Queue depth over time
          </p>
          <QueueDepthChart result={result} tickIndex={tickIndex} />
        </Panel>
      )}
    </div>
  )
}
