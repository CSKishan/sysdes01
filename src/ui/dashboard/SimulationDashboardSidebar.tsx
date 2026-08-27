// The "Dashboard" + "Latency over time" (+ optional "Queue depth over time")
// sidebar panel stack, shared by every screen that runs a simulation and
// shows its live/final numbers next to the canvas (BuildStagePlayer,
// SandboxView, CaseStudyDesignStage) -- factored out once a third near-
// identical copy of this block showed up, rather than pasting a fourth.

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
  /** Sandbox is the only screen that surfaces queue depth today, since it's
   * the only place a level-less graph might contain a queue/broker/rate
   * limiter the player added themselves. */
  showQueueDepth?: boolean
}) {
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
      {showQueueDepth && result && result.nodeTicks.some((nm) => nm.queueDepth !== undefined) && (
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
