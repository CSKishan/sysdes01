// Orchestrates a level's stages in order: situation -> teach -> build(s).
// This is the top of the "I do -> we do -> you do" structure described in
// the plan -- everything upstream (teach layer, canvas, dashboard, debrief)
// gets composed here into one playable level.

import { useState } from 'react'
import { ArrowLeft, Zap } from 'lucide-react'
import type { ComponentKind } from '@/engine/types'
import type { Level } from '@/content/types'
import type { LevelStars } from '@/game/progressStore'
import { useJournalStore } from '@/game/journalStore'
import { SituationScreen } from '@/ui/teach/SituationScreen'
import { TeachScreen } from '@/ui/teach/TeachScreen'
import { BuildStagePlayer } from './BuildStagePlayer'
import { Button } from '@/ui/shared/Button'

export function LevelPlayer({
  level,
  onExit,
  onLevelComplete,
  challengeMode = false,
}: {
  level: Level
  onExit: () => void
  onLevelComplete: (stars: LevelStars, unlockedKinds: ComponentKind[]) => void
  /** Skip the taught stages and step-by-step narration -- for a level the
   * player has already completed once in Guided mode. */
  challengeMode?: boolean
}) {
  const [stageIndex, setStageIndex] = useState(0)
  const [pendingChoiceLabel, setPendingChoiceLabel] = useState<string | null>(null)
  const addJournalEntry = useJournalStore((s) => s.addEntry)

  const stages = challengeMode ? level.stages.filter((s) => s.kind === 'build') : level.stages
  const stage = stages[stageIndex]
  const isLastStage = stageIndex === stages.length - 1

  function goNext() {
    if (isLastStage) {
      // Only situation/teach stages call this -- a build stage's own
      // onStageComplete handler (below) is what finishes a level that ends
      // on a build. So reaching this branch means the level has no build
      // stage at all (e.g. Chapter 0's teach-only levels): finishing the
      // last teach stage finishes the level outright.
      onLevelComplete(3, [])
      return
    }
    setStageIndex((i) => i + 1)
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="flex items-center justify-between border-b border-ink-800 px-4 py-2">
        <Button variant="ghost" onClick={onExit}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Map
        </Button>
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-ink-100">
            {level.title}
            {challengeMode && (
              <span className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-brand-400">
                <Zap className="h-3 w-3" strokeWidth={1.8} />
                Challenge
              </span>
            )}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-500">
            {level.realConcept} · {level.analogyName}
          </p>
        </div>
        <div className="flex gap-1">
          {stages.map((_, i) => (
            <div key={i} className={`h-1.5 w-6 ${i <= stageIndex ? 'bg-brand-400' : 'bg-ink-700'}`} />
          ))}
        </div>
      </header>

      {stage.kind === 'situation' && <SituationScreen stage={stage} onContinue={goNext} />}
      {stage.kind === 'teach' && <TeachScreen stage={stage} onContinue={goNext} />}
      {stage.kind === 'build' && (
        <BuildStagePlayer
          key={stageIndex}
          stage={stage}
          hideGuidance={challengeMode}
          onDecisionMade={(label) => setPendingChoiceLabel(label)}
          onDecisionRunComplete={(score) => {
            // Fires after every run that followed a decision-card choice --
            // including a failed attempt, which is worth journaling too
            // ("I tried X, it broke because Y"). Can fire more than once
            // per stage if the player retries with a different choice.
            if (!pendingChoiceLabel) return
            addJournalEntry({
              levelId: level.id,
              levelTitle: level.title,
              situation: stage.brief[0] ?? stage.title,
              choiceLabel: pendingChoiceLabel,
              outcomeSummary: `${score.passed ? 'Passed' : 'Failed'} — ${score.checks
                .map((c) => `${c.label}: ${c.actual} (target ${c.target})`)
                .join(', ')}`,
              ruleDerived: stage.debrief.ruleOfThumb,
            })
          }}
          onStageComplete={(score) => {
            if (isLastStage) {
              onLevelComplete(score.stars, stage.unlockedKinds)
            } else {
              goNext()
            }
          }}
        />
      )}
    </div>
  )
}
