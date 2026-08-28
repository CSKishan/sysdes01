// Phase 9.1/9.2/9.3's landing screen: a picker between the three review
// decks, each with its own due/available count so it reads like a real
// study tool ("12 due") rather than a blind menu.

import { Link } from 'react-router-dom'
import { ArrowLeft, Layers, BookMarked, Quote, Target } from 'lucide-react'
import { GLOSSARY } from '@/content/glossary'
import { buildQuizBank, quizCardId } from '@/content/quizBank'
import { buildInterviewPhraseDeck } from '@/content/interviewPhrases'
import { useProgressStore } from '@/game/progressStore'
import { useCaseStudyProgressStore } from '@/game/caseStudyProgressStore'
import { useSpacedRepetitionStore } from '@/game/spacedRepetitionStore'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

export function ReviewHome({ onBack }: { onBack: () => void }) {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const completedCaseStudyIds = useCaseStudyProgressStore((s) => s.completedCaseStudyIds)
  const getDueCardIds = useSpacedRepetitionStore((s) => s.getDueCardIds)

  const quizBank = buildQuizBank(completedLevelIds)
  const glossaryTerms = GLOSSARY.map((g) => g.term)
  const phraseDeck = buildInterviewPhraseDeck(completedLevelIds, completedCaseStudyIds)

  const quizDue = getDueCardIds('quiz', quizBank.map((q) => quizCardId(q))).length
  const glossaryDue = getDueCardIds('glossary', glossaryTerms).length

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-ink-100">
          <Layers className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
          Review
        </h1>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Map
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                <Target className="h-4 w-4 text-brand-400" strokeWidth={1.8} />
                Spaced quiz review
              </h2>
              <p className="mt-1 text-xs text-ink-400">
                Every question you've unlocked, resurfaced on an SM-2 schedule instead of at random.
              </p>
            </div>
            {quizBank.length > 0 && (
              <span className="shrink-0 font-mono text-xs text-ink-500">{quizDue} due</span>
            )}
          </div>
          <Link
            to="/review/quiz"
            className="mt-3 inline-flex items-center justify-center border border-brand-500 bg-brand-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-950 hover:border-brand-400 hover:bg-brand-400"
          >
            {quizBank.length === 0 ? 'Nothing unlocked yet' : 'Review'}
          </Link>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                <BookMarked className="h-4 w-4 text-brand-400" strokeWidth={1.8} />
                Glossary flashcards
              </h2>
              <p className="mt-1 text-xs text-ink-400">Term → definition drills, same SM-2 schedule.</p>
            </div>
            <span className="shrink-0 font-mono text-xs text-ink-500">{glossaryDue} due</span>
          </div>
          <Link
            to="/review/flashcards"
            className="mt-3 inline-flex items-center justify-center border border-brand-500 bg-brand-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-950 hover:border-brand-400 hover:bg-brand-400"
          >
            Review
          </Link>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                <Quote className="h-4 w-4 text-brand-400" strokeWidth={1.8} />
                Interview phrases
              </h2>
              <p className="mt-1 text-xs text-ink-400">
                Every "how I'd say this out loud" line from what you've completed, in one practice deck.
              </p>
            </div>
            {phraseDeck.length > 0 && <span className="shrink-0 font-mono text-xs text-ink-500">{phraseDeck.length}</span>}
          </div>
          <Link
            to="/review/interview-phrases"
            className="mt-3 inline-flex items-center justify-center border border-brand-500 bg-brand-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-950 hover:border-brand-400 hover:bg-brand-400"
          >
            {phraseDeck.length === 0 ? 'Nothing unlocked yet' : 'Practice'}
          </Link>
        </Panel>
      </div>
    </div>
  )
}
