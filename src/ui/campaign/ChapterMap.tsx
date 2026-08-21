import clsx from 'clsx'
import { Package, Target, BookOpen, FlaskConical, Check, Lock, Zap, Settings } from 'lucide-react'
import { CHAPTERS, getLevelsForChapter, isLevelUnlocked } from '@/content/registry'
import { useProgressStore } from '@/game/progressStore'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

export function ChapterMap({
  onPlayLevel,
  onOpenJournal,
  onOpenSandbox,
  onOpenQuiz,
  onOpenSettings,
}: {
  onPlayLevel: (levelId: string, challengeMode: boolean) => void
  onOpenJournal: () => void
  onOpenSandbox: () => void
  onOpenQuiz: () => void
  onOpenSettings: () => void
}) {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const starsByLevelId = useProgressStore((s) => s.starsByLevelId)
  const isChallengeUnlocked = useProgressStore((s) => s.isChallengeUnlocked)

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-brand-500" strokeWidth={1.6} />
          <div>
            <h1 className="text-2xl font-semibold text-ink-100">Packet and Post</h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-400">
              Learn system design by running the delivery empire
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onOpenQuiz}>
            <Target className="h-3.5 w-3.5" strokeWidth={1.8} />
            Quiz
          </Button>
          <Button variant="secondary" onClick={onOpenJournal}>
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} />
            Journal
          </Button>
          <Button variant="secondary" onClick={onOpenSandbox}>
            <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.8} />
            Sandbox
          </Button>
          <Button variant="ghost" onClick={onOpenSettings} aria-label="Settings">
            <Settings className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {CHAPTERS.map((chapter) => {
          const levels = getLevelsForChapter(chapter.id)
          const doneCount = levels.filter((l) => completedLevelIds.includes(l.id)).length
          return (
            <Panel key={chapter.id} className="p-5">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-brand-400">
                  {chapter.title}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wide text-ink-500">
                  {doneCount}/{levels.length}
                </span>
              </div>
              <div className="mb-4 h-1 w-full border border-ink-700 bg-ink-950">
                <div
                  className="h-full bg-brand-500/70"
                  style={{ width: `${levels.length ? (doneCount / levels.length) * 100 : 0}%` }}
                />
              </div>
              <p className="mb-4 text-sm text-ink-400">{chapter.subtitle}</p>
              <div className="flex flex-col gap-2">
                {levels.map((level) => {
                  const unlocked = isLevelUnlocked(level.id, completedLevelIds)
                  const completed = completedLevelIds.includes(level.id)
                  const stars = starsByLevelId[level.id] ?? 0
                  const challengeReady = isChallengeUnlocked(level.id)

                  return (
                    <div
                      key={level.id}
                      data-testid={`level-row-${level.id}`}
                      data-unlocked={unlocked}
                      data-completed={completed}
                      className={clsx(
                        'flex items-center justify-between border px-4 py-3',
                        unlocked ? 'border-ink-700 bg-ink-900/60' : 'border-ink-800 bg-ink-950/40 opacity-50',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink-100">
                          {completed && <Check className="h-3.5 w-3.5 shrink-0 text-ok-500" strokeWidth={2} />}
                          {level.title}
                        </p>
                        <p className="flex items-center gap-1.5 truncate font-mono text-[10px] uppercase tracking-wide text-ink-500">
                          {level.realConcept}
                          {completed && stars > 0 && (
                            <span className="text-brand-400">{'★'.repeat(stars)}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {challengeReady && (
                          <Button
                            variant="ghost"
                            data-testid={`challenge-${level.id}`}
                            onClick={() => onPlayLevel(level.id, true)}
                            disabled={!unlocked}
                          >
                            <Zap className="h-3.5 w-3.5" strokeWidth={1.8} />
                            Challenge
                          </Button>
                        )}
                        <Button
                          data-testid={`play-${level.id}`}
                          onClick={() => onPlayLevel(level.id, false)}
                          disabled={!unlocked}
                        >
                          {completed ? (
                            'Replay'
                          ) : unlocked ? (
                            'Play'
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" strokeWidth={1.8} />
                              Locked
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
