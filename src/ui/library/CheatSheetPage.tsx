import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { CHAPTERS, getLevelsForChapter } from '@/content/registry'
import { Button } from '@/ui/shared/Button'

/** One condensed page per chapter: rule of thumb + interview phrase for
 * every build level, the README-quoted key idea for every teach-only one.
 * Deliberately outside LibraryLayout -- @media print in index.css hides
 * everything but this content, so what prints is one page, not the app
 * chrome around it. */
export function CheatSheetPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const chapter = CHAPTERS.find((c) => c.id === chapterId)

  // Scoped to this page's own mount, not a global print rule -- printing
  // any other page must keep its normal (unprinted-for) appearance.
  useEffect(() => {
    document.body.classList.add('print-cheatsheet')
    return () => document.body.classList.remove('print-cheatsheet')
  }, [])

  if (!chapter) return <Navigate to="/library" replace />

  const levels = getLevelsForChapter(chapter.id)

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          to="/library"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400 hover:text-ink-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Library
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" strokeWidth={1.8} />
          Print / save PDF
        </Button>
      </div>

      <h1 className="mb-1 text-xl font-semibold text-ink-100 print:text-black">
        {chapter.title} — Cheat Sheet
      </h1>
      <p className="mb-6 text-sm text-ink-400 print:text-neutral-600">{chapter.subtitle}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
        {levels.map((level) => {
          const buildStage = level.stages.find((s) => s.kind === 'build')
          const teachStage = level.stages.find((s) => s.kind === 'teach')
          const ruleOfThumb = buildStage?.kind === 'build' ? buildStage.debrief.ruleOfThumb : undefined
          const interviewPhrase = buildStage?.kind === 'build' ? buildStage.debrief.interviewPhrase : undefined
          const keyIdea = teachStage?.kind === 'teach' ? teachStage.readmeQuote.text : undefined

          return (
            <div
              key={level.id}
              className="break-inside-avoid border border-ink-700 bg-ink-900/60 p-3 print:border-neutral-300 print:bg-white"
            >
              <p className="text-xs font-semibold text-ink-100 print:text-black">{level.title}</p>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-ink-500 print:text-neutral-500">
                {level.realConcept}
              </p>
              {ruleOfThumb && (
                <p className="text-[11px] text-ink-300 print:text-neutral-800">{ruleOfThumb}</p>
              )}
              {interviewPhrase && (
                <p className="mt-1 text-[11px] italic text-ink-400 print:text-neutral-600">
                  {interviewPhrase}
                </p>
              )}
              {!ruleOfThumb && keyIdea && (
                <p className="text-[11px] text-ink-300 print:text-neutral-800">{keyIdea}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
