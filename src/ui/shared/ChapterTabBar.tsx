import clsx from 'clsx'
import { CHAPTERS, getLevelsForChapter } from '@/content/registry'
import { useProgressStore } from '@/game/progressStore'

/** One tab per chapter, shared by the campaign map and the Library's
 * Topics view so both browse the curriculum the same way instead of as a
 * single long scroll. `flex-wrap` rather than a horizontal scroll: on a
 * narrow viewport the tabs stack onto a second line, no scrollbar. */
export function ChapterTabBar({
  activeChapterId,
  onSelect,
  showProgress = false,
}: {
  activeChapterId: string
  onSelect: (chapterId: string) => void
  /** Show a done/total badge per tab -- wanted on the campaign map, noise
   * in the Library where progress isn't the point. */
  showProgress?: boolean
}) {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)

  return (
    <div
      className="mb-6 flex flex-wrap gap-x-1 gap-y-0 border-b border-ink-700"
      role="tablist"
      aria-label="Chapters"
    >
      {CHAPTERS.map((chapter) => {
        const levels = getLevelsForChapter(chapter.id)
        const doneCount = levels.filter((l) => completedLevelIds.includes(l.id)).length
        const active = chapter.id === activeChapterId
        const [label] = chapter.title.split(' · ')
        return (
          <button
            key={chapter.id}
            type="button"
            role="tab"
            id={`chapter-tab-${chapter.id}`}
            data-testid={`chapter-tab-${chapter.id}`}
            aria-selected={active}
            aria-controls={`chapter-panel-${chapter.id}`}
            onClick={() => onSelect(chapter.id)}
            className={clsx(
              '-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest transition-colors',
              active
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-ink-500 hover:text-ink-200',
            )}
          >
            {label}
            {showProgress && (
              <span
                className={clsx(
                  'font-mono text-[10px] tracking-wide',
                  doneCount === levels.length && levels.length > 0 ? 'text-ok-500' : 'text-ink-500',
                )}
              >
                {doneCount}/{levels.length}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
