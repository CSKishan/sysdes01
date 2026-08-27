import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { CASE_STUDIES } from '@/content/caseStudies/registry'
import { getLevel, isLevelUnlocked } from '@/content/registry'
import { useProgressStore } from '@/game/progressStore'
import { useCaseStudyProgressStore } from '@/game/caseStudyProgressStore'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

// Exported so App.tsx's CaseStudyRoute can re-check the same gate for
// direct-link access, the same way LevelRoute re-checks isLevelUnlocked.
export const INTERVIEWS_LEVEL_ID = 'ch5-interviews'

export function CaseStudyMenu({
  onOpenCaseStudy,
  onPlayLevel,
  onBack,
}: {
  onOpenCaseStudy: (caseStudyId: string) => void
  onPlayLevel: (levelId: string) => void
  onBack: () => void
}) {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const interviewsCompleted = completedLevelIds.includes(INTERVIEWS_LEVEL_ID)
  const interviewsUnlocked = isLevelUnlocked(INTERVIEWS_LEVEL_ID, completedLevelIds)
  const interviewsLevel = getLevel(INTERVIEWS_LEVEL_ID)
  const completedCaseStudyIds = useCaseStudyProgressStore((s) => s.completedCaseStudyIds)
  const bestScores = useCaseStudyProgressStore((s) => s.bestScorePercentByCaseStudyId)

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100">Chapter V · Case Studies</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-400">
            Open-ended design. No target graph, no binary pass/fail — just a rubric and a reference.
          </p>
        </div>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Map
        </Button>
      </header>

      {interviewsLevel && (
        <Panel className="mb-6 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink-100">
                {interviewsCompleted && <Check className="h-3.5 w-3.5 text-ok-500" strokeWidth={2} />}
                {interviewsLevel.title}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-500">
                The 7-step framework every case study below follows — start here.
              </p>
              {!interviewsCompleted && (
                <p className="mt-1 text-[11px] text-ink-500">Finish this to unlock the case studies below.</p>
              )}
            </div>
            <Button onClick={() => onPlayLevel(INTERVIEWS_LEVEL_ID)} disabled={!interviewsUnlocked}>
              {!interviewsUnlocked ? (
                <>
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Locked
                </>
              ) : interviewsCompleted ? (
                'Replay'
              ) : (
                'Play'
              )}
            </Button>
          </div>
        </Panel>
      )}

      <div className="flex flex-col gap-3">
        {CASE_STUDIES.map((cs) => {
          const completed = completedCaseStudyIds.includes(cs.id)
          const bestScore = bestScores[cs.id]
          return (
            <Panel key={cs.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink-100">
                    {completed && <Check className="h-3.5 w-3.5 shrink-0 text-ok-500" strokeWidth={2} />}
                    {cs.title}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-500">
                    {cs.realConcept}
                    {completed && bestScore !== undefined && (
                      <span className="ml-2 text-brand-400">best {bestScore}%</span>
                    )}
                  </p>
                </div>
                <Button onClick={() => onOpenCaseStudy(cs.id)} disabled={!interviewsCompleted}>
                  {!interviewsCompleted ? (
                    <>
                      <Lock className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Locked
                    </>
                  ) : completed ? (
                    'Replay'
                  ) : (
                    'Design it'
                  )}
                </Button>
              </div>
            </Panel>
          )
        })}
      </div>

      <p className="mt-6 text-center">
        <Link to="/journal" className="text-xs text-ink-500 underline hover:text-ink-300">
          Ran a timed drill? Your transcript is in the journal.
        </Link>
      </p>
    </div>
  )
}
