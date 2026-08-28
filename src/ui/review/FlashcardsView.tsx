// Phase 9.2: term -> definition drills off the glossary, scheduled with the
// same SM-2 engine the quiz review uses (spacedRepetitionStore).

import { useState } from 'react'
import { ArrowLeft, BookMarked } from 'lucide-react'
import { GLOSSARY } from '@/content/glossary'
import { QUALITY, useSpacedRepetitionStore, type Quality } from '@/game/spacedRepetitionStore'
import { createSeededRng } from '@/engine/rng'
import { shuffle } from '@/content/quizBank'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { FlipCard } from './FlipCard'

export function FlashcardsView({ onBack }: { onBack: () => void }) {
  const getDueCardIds = useSpacedRepetitionStore((s) => s.getDueCardIds)
  const reviewCard = useSpacedRepetitionStore((s) => s.reviewCard)

  const [queue] = useState(() => {
    const dueTerms = getDueCardIds(
      'glossary',
      GLOSSARY.map((g) => g.term),
    )
    return shuffle(dueTerms, createSeededRng(Date.now()))
  })
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const term = queue[index]
  const entry = GLOSSARY.find((g) => g.term === term)

  function rate(quality: Quality) {
    reviewCard('glossary', term, quality)
    if (index + 1 >= queue.length) {
      setIndex(queue.length) // past the end -> "done" screen below
      return
    }
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Panel className="p-8">
          <h1 className="flex items-center justify-center gap-2 text-lg font-semibold text-ink-100">
            <BookMarked className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
            Flashcards
          </h1>
          <p className="mt-3 text-sm text-ink-400">Nothing's due right now — check back later.</p>
          <Button variant="secondary" onClick={onBack} className="mt-6">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Review
          </Button>
        </Panel>
      </div>
    )
  }

  if (index >= queue.length || !entry) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Panel className="p-8">
          <h1 className="text-lg font-semibold text-ink-100">Deck complete</h1>
          <p className="mt-3 text-sm text-ink-400">
            Reviewed {queue.length} card{queue.length === 1 ? '' : 's'}.
          </p>
          <Button onClick={onBack} className="mt-6">
            Back to Review
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="mb-6 flex items-center justify-between text-xs text-ink-500">
        <span>
          Card {index + 1} of {queue.length}
        </span>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Review
        </Button>
      </div>
      <FlipCard
        eyebrow="Glossary"
        front={entry.term}
        back={entry.definition}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        actions={
          <>
            <Button variant="secondary" onClick={() => rate(QUALITY.AGAIN)}>
              Again
            </Button>
            <Button variant="secondary" onClick={() => rate(QUALITY.HARD)}>
              Hard
            </Button>
            <Button variant="secondary" onClick={() => rate(QUALITY.GOOD)}>
              Good
            </Button>
            <Button onClick={() => rate(QUALITY.EASY)}>Easy</Button>
          </>
        }
      />
    </div>
  )
}
