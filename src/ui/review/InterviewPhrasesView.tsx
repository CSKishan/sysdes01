// Phase 9.3: every completed topic's "how I'd say this out loud" line,
// collected into one practice deck -- step through, read the prompt, say
// the phrase out loud (or read it), move on. No SM-2 here; this is
// rehearsal, not a memory check with a right/wrong signal to schedule off.

import { useState } from 'react'
import { ArrowLeft, Quote, Shuffle } from 'lucide-react'
import { buildInterviewPhraseDeck } from '@/content/interviewPhrases'
import { useProgressStore } from '@/game/progressStore'
import { useCaseStudyProgressStore } from '@/game/caseStudyProgressStore'
import { createSeededRng } from '@/engine/rng'
import { shuffle } from '@/content/quizBank'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { FlipCard } from './FlipCard'

export function InterviewPhrasesView({ onBack }: { onBack: () => void }) {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const completedCaseStudyIds = useCaseStudyProgressStore((s) => s.completedCaseStudyIds)
  const deck = buildInterviewPhraseDeck(completedLevelIds, completedCaseStudyIds)

  const [order, setOrder] = useState(() => deck.map((_, i) => i))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  if (deck.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Panel className="p-8">
          <h1 className="flex items-center justify-center gap-2 text-lg font-semibold text-ink-100">
            <Quote className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
            Interview phrases
          </h1>
          <p className="mt-3 text-sm text-ink-400">
            Nothing yet — finish a level or case study and its phrasing shows up here.
          </p>
          <Button variant="secondary" onClick={onBack} className="mt-6">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Review
          </Button>
        </Panel>
      </div>
    )
  }

  const card = deck[order[index % order.length]]

  function next() {
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  function reshuffle() {
    setOrder(shuffle(deck.map((_, i) => i), createSeededRng(Date.now())))
    setIndex(0)
    setRevealed(false)
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="mb-6 flex items-center justify-between text-xs text-ink-500">
        <span>
          {(index % order.length) + 1} of {order.length}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={reshuffle}>
            <Shuffle className="h-3.5 w-3.5" strokeWidth={1.8} />
            Shuffle
          </Button>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Review
          </Button>
        </div>
      </div>
      <FlipCard
        eyebrow={card.chapterTitle}
        front={card.title}
        back={<span className="italic">{card.phrase}</span>}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        actions={<Button onClick={next}>Next</Button>}
      />
    </div>
  )
}
