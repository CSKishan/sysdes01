import { useState } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { Package, Target, BookOpen, BookMarked, FlaskConical, Check, Lock, Zap, Settings, Briefcase, Layers, TrendingUp } from 'lucide-react'
import { CHAPTERS, getLevelsForChapter, isLevelUnlocked } from '@/content/registry'
import { useProgressStore } from '@/game/progressStore'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { ChapterTabBar } from '@/ui/shared/ChapterTabBar'
import { SearchButton } from '@/ui/library/SearchPalette'

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

  // Land on the chapter the player is actually working through -- the
  // first one that still has an unlocked, not-yet-completed level -- so a
  // returning player doesn't have to hunt for where they left off. Lazy
  // initializer, so it runs once per mount; navigating into a level
  // unmounts the map, so finishing a chapter's last level lands you on
  // the next chapter's tab when you come back.
  const [activeChapterId, setActiveChapterId] = useState<string>(() => {
    const playable = CHAPTERS.find((chapter) =>
      getLevelsForChapter(chapter.id).some(
        (l) => isLevelUnlocked(l.id, completedLevelIds) && !completedLevelIds.includes(l.id),
      ),
    )
    return (playable ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0])?.id ?? 'ch0'
  })
  const activeChapter = CHAPTERS.find((c) => c.id === activeChapterId) ?? CHAPTERS[0]

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* The app name gets its own banner rather than sharing a row with
          the section nav -- it's the one fixed landmark on the page. */}
      <section className="mb-4 flex items-center gap-3 border border-ink-700 bg-ink-900/90 px-5 py-4">
        <Package className="h-6 w-6 shrink-0 text-brand-500" strokeWidth={1.6} />
        <div>
          <h1 className="text-2xl font-semibold text-ink-100">Packet and Post</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-400">
            Learn system design by running the delivery empire
          </p>
        </div>
      </section>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Sections">
        <Link
          to="/library"
          className="inline-flex items-center gap-2 border border-ink-700 bg-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-200 hover:border-brand-500/50 hover:text-ink-100"
        >
          <BookMarked className="h-3.5 w-3.5" strokeWidth={1.8} />
          Library
        </Link>
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
        <Link
          to="/case-studies"
          className="inline-flex items-center gap-2 border border-ink-700 bg-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-200 hover:border-brand-500/50 hover:text-ink-100"
        >
          <Briefcase className="h-3.5 w-3.5" strokeWidth={1.8} />
          Case Studies
        </Link>
        <Link
          to="/review"
          className="inline-flex items-center gap-2 border border-ink-700 bg-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-200 hover:border-brand-500/50 hover:text-ink-100"
        >
          <Layers className="h-3.5 w-3.5" strokeWidth={1.8} />
          Review
        </Link>
        <Link
          to="/progress"
          className="inline-flex items-center gap-2 border border-ink-700 bg-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-200 hover:border-brand-500/50 hover:text-ink-100"
        >
          <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.8} />
          Progress
        </Link>
        <Button variant="ghost" onClick={onOpenSettings} aria-label="Settings">
          <Settings className="h-3.5 w-3.5" strokeWidth={1.8} />
        </Button>
      </nav>

      {/* Opening the palette needs a visible affordance -- Ctrl/Cmd-K
          alone is invisible to a first-time user. */}
      <SearchButton className="mb-8 w-full sm:w-96" />

      {/* One tab per chapter -- the whole campaign used to be a single
          long scroll. */}
      <ChapterTabBar activeChapterId={activeChapter.id} onSelect={setActiveChapterId} showProgress />

      {CHAPTERS.map((chapter) => {
        const active = chapter.id === activeChapter.id
        const levels = getLevelsForChapter(chapter.id)
        const doneCount = levels.filter((l) => completedLevelIds.includes(l.id)).length
        return (
          <Panel
            key={chapter.id}
            role="tabpanel"
            id={`chapter-panel-${chapter.id}`}
            aria-labelledby={`chapter-tab-${chapter.id}`}
            hidden={!active}
            className="p-5"
          >
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
                      'flex flex-col gap-2 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
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
  )
}
