// Drives a single build stage (guided / solo / twist): optional decision
// card, then canvas + run controls + live dashboard, then debrief.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BuildStage } from '@/content/types'
import type { SimGraph } from '@/engine/types'
import { CanvasEditor } from '@/ui/canvas/CanvasEditor'
import { GuidedStepPanel } from '@/ui/guided/GuidedStepPanel'
import { RunControls } from '@/ui/dashboard/RunControls'
import { SimulationDashboardSidebar } from '@/ui/dashboard/SimulationDashboardSidebar'
import { DEFAULT_METRICS, type MetricKey } from '@/ui/dashboard/MetricsPanel'
import { useSimulationPlayback } from '@/ui/dashboard/useSimulationPlayback'
import { DecisionCard } from '@/ui/debrief/DecisionCard'
import { DebriefScreen } from '@/ui/debrief/DebriefScreen'
import { scoreRun, type ScoreResult } from '@/game/scoring'
import { Panel } from '@/ui/shared/Panel'
import { RichParagraphs } from '@/ui/shared/RichText'

// MetricsPanel's own base six plus, opt-in, whichever Chapter II+ tiles this
// stage's SLO actually measures -- its own doc comment is explicit that
// those four are "opt-in only... once they're actually relevant," not a
// blanket addition to every dashboard. Without this, a stage whose SLO
// includes e.g. maxWriteP99Ms never shows a "Write p50/p99" tile while the
// player is iterating; they'd only discover the number existed after
// running, on the debrief screen.
function visibleMetricsFor(slo: BuildStage['slo']): MetricKey[] {
  const metrics = [...DEFAULT_METRICS]
  if (slo.maxWriteP99Ms !== undefined) metrics.push('writeLatency')
  if (slo.minDurability !== undefined) metrics.push('durability')
  if (slo.maxReplicationLagMs !== undefined) metrics.push('replicationLag')
  if (slo.maxShardImbalance !== undefined) metrics.push('shardImbalance')
  if (slo.maxQueueDepth !== undefined) metrics.push('queueDepth')
  return metrics
}

export function BuildStagePlayer({
  stage,
  onStageComplete,
  onDecisionMade,
  onDecisionRunComplete,
  hideGuidance = false,
  onChallengeComplete,
}: {
  stage: BuildStage
  /** Fires once, when the stage is actually finished (SLO passed). Advances the level. */
  onStageComplete: (score: ScoreResult) => void
  onDecisionMade?: (choiceLabel: string) => void
  /** Fires after every run that followed a decision-card choice, pass or
   * fail -- a failed attempt is still worth a journal entry ("I tried X,
   * it broke because Y"). May fire more than once if the player retries
   * with a different choice. */
  onDecisionRunComplete?: (score: ScoreResult) => void
  /** Challenge mode: build the design cold, no step-by-step narration. */
  hideGuidance?: boolean
  /** Fires once, the first time a Challenge-mode run passes -- what the
   * passing design cost. Only meaningful in challenge mode (hideGuidance).
   * Deliberately doesn't report elapsed time itself: a level can have
   * several build stages (guided/solo/twist), each getting its own
   * BuildStagePlayer instance, so only the caller orchestrating the whole
   * level (LevelPlayer) knows when the player actually started and which
   * stage is the last one worth recording a leaderboard attempt for. */
  onChallengeComplete?: (result: { costPerHour: number }) => void
}) {
  const [decisionMade, setDecisionMade] = useState(!stage.decisionCard)
  const [graph, setGraph] = useState<SimGraph>(stage.startingGraph)
  const playback = useSimulationPlayback()
  const visibleMetrics = useMemo(() => visibleMetricsFor(stage.slo), [stage.slo])
  // A ref, not state: this is bookkeeping for the effect below, not
  // something the render output depends on, so there's no reason to pay
  // for an extra re-render setting it would trigger. Read/written only
  // inside the effect, never during render.
  const challengeRecordedRef = useRef(false)

  // Reports a Challenge-mode pass exactly once, from an effect rather than
  // inline during render -- calling a prop callback directly in the render
  // body is the kind of side effect React's render pass isn't supposed to
  // have, even though it happens to work today.
  useEffect(() => {
    if (!hideGuidance || challengeRecordedRef.current || playback.status !== 'done' || !playback.result) return
    const score = scoreRun(playback.result, stage.slo)
    if (!score.passed) return
    challengeRecordedRef.current = true
    onChallengeComplete?.({ costPerHour: playback.result.aggregate.costPerHour })
  }, [hideGuidance, playback.status, playback.result, stage.slo, onChallengeComplete])

  if (!decisionMade && stage.decisionCard) {
    return (
      <DecisionCard
        card={stage.decisionCard}
        onChoose={(option) => {
          onDecisionMade?.(option.label)
          setGraph(option.applyToGraph ? option.applyToGraph(stage.startingGraph) : stage.startingGraph)
          setDecisionMade(true)
        }}
      />
    )
  }

  if (playback.status === 'done' && playback.result) {
    const score = scoreRun(playback.result, stage.slo)
    if (stage.decisionCard) onDecisionRunComplete?.(score)
    return (
      <DebriefScreen
        score={score}
        content={stage.debrief}
        onContinue={() => onStageComplete(score)}
        onRetry={() => {
          if (stage.decisionCard) {
            // Let the player pick a different option and see a different
            // consequence, rather than being stuck re-running the same
            // failed configuration.
            setDecisionMade(false)
            setGraph(stage.startingGraph)
          }
          playback.reset()
        }}
      />
    )
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3 p-4">
      <Panel className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-100">{stage.title}</h2>
            <RichParagraphs paragraphs={stage.brief} className="mt-1 max-w-2xl text-sm" />
          </div>
          <RunControls
            status={playback.status}
            onRun={() => playback.run(graph, stage.workload, stage.incidents)}
            onReset={playback.reset}
          />
        </div>
        {playback.errorMessage && (
          <p className="mt-2 border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-sm text-bad-500">
            {playback.errorMessage}
          </p>
        )}
      </Panel>

      <div className="flex min-h-0 flex-1 gap-3">
        {!hideGuidance && stage.mode === 'guided' && stage.guidedSteps && (
          <GuidedStepPanel steps={stage.guidedSteps} onAllStepsDone={() => {}} />
        )}

        <div className="min-w-0 flex-1">
          <CanvasEditor
            key={stage.title}
            graph={graph}
            onGraphChange={setGraph}
            unlockedKinds={stage.unlockedKinds}
            liveMetrics={playback.liveMetrics}
            lockedNodeIds={stage.lockedNodeIds}
          />
        </div>

        <SimulationDashboardSidebar
          result={playback.result}
          tickIndex={playback.tickIndex}
          visibleMetrics={visibleMetrics}
          showQueueDepth={stage.slo.maxQueueDepth !== undefined}
        />
      </div>
    </div>
  )
}
