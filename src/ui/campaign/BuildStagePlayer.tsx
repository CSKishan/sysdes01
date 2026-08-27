// Drives a single build stage (guided / solo / twist): optional decision
// card, then canvas + run controls + live dashboard, then debrief.

import { useState } from 'react'
import type { BuildStage } from '@/content/types'
import type { SimGraph } from '@/engine/types'
import { CanvasEditor } from '@/ui/canvas/CanvasEditor'
import { GuidedStepPanel } from '@/ui/guided/GuidedStepPanel'
import { RunControls } from '@/ui/dashboard/RunControls'
import { SimulationDashboardSidebar } from '@/ui/dashboard/SimulationDashboardSidebar'
import { useSimulationPlayback } from '@/ui/dashboard/useSimulationPlayback'
import { DecisionCard } from '@/ui/debrief/DecisionCard'
import { DebriefScreen } from '@/ui/debrief/DebriefScreen'
import { scoreRun, type ScoreResult } from '@/game/scoring'
import { Panel } from '@/ui/shared/Panel'
import { RichParagraphs } from '@/ui/shared/RichText'

export function BuildStagePlayer({
  stage,
  onStageComplete,
  onDecisionMade,
  onDecisionRunComplete,
  hideGuidance = false,
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
}) {
  const [decisionMade, setDecisionMade] = useState(!stage.decisionCard)
  const [graph, setGraph] = useState<SimGraph>(stage.startingGraph)
  const playback = useSimulationPlayback()

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

        <SimulationDashboardSidebar result={playback.result} tickIndex={playback.tickIndex} />
      </div>
    </div>
  )
}
