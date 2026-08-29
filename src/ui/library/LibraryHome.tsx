import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { CHAPTERS, getLevelsForChapter } from '@/content/registry'
import { Panel } from '@/ui/shared/Panel'
import { ChapterTabBar } from '@/ui/shared/ChapterTabBar'
import { LibraryLayout } from './LibraryLayout'

export function LibraryHome() {
  const [activeChapterId, setActiveChapterId] = useState<string>(() => CHAPTERS[0]?.id ?? 'ch0')
  const activeChapter = CHAPTERS.find((c) => c.id === activeChapterId) ?? CHAPTERS[0]

  return (
    <LibraryLayout>
      <ChapterTabBar activeChapterId={activeChapter.id} onSelect={setActiveChapterId} />

      {CHAPTERS.map((chapter) => {
        const levels = getLevelsForChapter(chapter.id)
        return (
          <Panel
            key={chapter.id}
            role="tabpanel"
            id={`chapter-panel-${chapter.id}`}
            aria-labelledby={`chapter-tab-${chapter.id}`}
            hidden={chapter.id !== activeChapter.id}
            className="p-5"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-brand-400">
                {chapter.title}
              </h2>
              <Link
                to={`/library/cheatsheet/${chapter.id}`}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400 hover:text-ink-100"
              >
                <Printer className="h-3 w-3" strokeWidth={1.8} />
                Cheat sheet
              </Link>
            </div>
            <p className="mb-4 text-sm text-ink-400">{chapter.subtitle}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {levels.map((level) => (
                <Link
                  key={level.id}
                  to={`/library/topic/${level.id}`}
                  className="border border-ink-700 bg-ink-900/60 px-4 py-3 transition-colors hover:border-brand-500/50"
                >
                  <p className="truncate text-sm font-medium text-ink-100">{level.title}</p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-wide text-ink-500">
                    {level.realConcept}
                  </p>
                </Link>
              ))}
            </div>
          </Panel>
        )
      })}
    </LibraryLayout>
  )
}
