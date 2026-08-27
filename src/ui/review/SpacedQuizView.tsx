// Phase 9.1: the same ~150+ question bank Quiz mode already draws from
// (buildQuizBank), but resurfaced on an SM-2 schedule instead of a random
// session -- "what am I actually about to forget" instead of "everything
// I've unlocked, shuffled." Quality is derived from correctness rather than
// self-rated (unlike flashcards): right on the first click reads as a GOOD
// review, wrong as an AGAIN -- there's already a definite right answer, so
// asking the player to also self-rate would be redundant.

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ArrowLeft, Target } from 'lucide-react'
import { buildQuizBank, quizCardId, shuffle } from '@/content/quizBank'
import { useProgressStore } from '@/game/progressStore'
import { useQuizStore } from '@/game/quizStore'
import { QUALITY, useSpacedRepetitionStore } from '@/game/spacedRepetitionStore'
import { createSeededRng } from '@/engine/rng'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

export function SpacedQuizView({ onBack }: { onBack: () => void }) {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const getDueCardIds = useSpacedRepetitionStore((s) => s.getDueCardIds)
  const reviewCard = useSpacedRepetitionStore((s) => s.reviewCard)
  const recordSession = useQuizStore((s) => s.recordSession)

  const bank = useMemo(() => buildQuizBank(completedLevelIds), [completedLevelIds])
  const [queue] = useState(() => {
    const dueIds = new Set(getDueCardIds('quiz', bank.map((q) => quizCardId(q))))
    return shuffle(bank.filter((q) => dueIds.has(quizCardId(q))), createSeededRng(Date.now()))
  })

  const [index, setIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [byChapter, setByChapter] = useState<Record<string, { correct: number; total: number }>>({})

  if (bank.length === 0) {
    return (
      <EmptyState onBack={onBack} message="Nothing to review yet — finish a level first, and its questions unlock here." />
    )
  }
  if (queue.length === 0) {
    return <EmptyState onBack={onBack} message="Nothing's due right now — check back later." />
  }
  if (index >= queue.length) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Panel className="p-8">
          <h1 className="text-lg font-semibold text-ink-100">Review complete</h1>
          <p className="mt-3 text-sm text-ink-400">
            Went through {queue.length} due question{queue.length === 1 ? '' : 's'}.
          </p>
          <Button onClick={onBack} className="mt-6">
            Back to Review
          </Button>
        </Panel>
      </div>
    )
  }

  const question = queue[index]
  const selected = question.options.find((o) => o.id === selectedId)

  function choose(optionId: string) {
    if (selectedId) return
    setSelectedId(optionId)
    const correct = Boolean(question.options.find((o) => o.id === optionId)?.correct)
    reviewCard('quiz', quizCardId(question), correct ? QUALITY.GOOD : QUALITY.AGAIN)
    if (correct) setCorrectCount((c) => c + 1)
    setByChapter((prev) => {
      const existing = prev[question.chapterId] ?? { correct: 0, total: 0 }
      return {
        ...prev,
        [question.chapterId]: { correct: existing.correct + (correct ? 1 : 0), total: existing.total + 1 },
      }
    })
  }

  function next() {
    // Feeds the same quizStore session history QuizView's random-mix
    // sessions do, so ProgressDashboard's weak-area detection (which reads
    // only from quizStore) also sees spaced-review activity -- previously
    // it was blind to anything done through this screen.
    if (index + 1 >= queue.length) {
      recordSession({ correct: correctCount, total: queue.length, byChapter })
    }
    setSelectedId(null)
    setIndex((i) => i + 1)
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="mb-6 flex items-center justify-between text-xs text-ink-500">
        <span>
          Question {index + 1} of {queue.length}
        </span>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Review
        </Button>
      </div>
      <Panel className="p-8">
        <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          {question.levelTitle}
        </p>
        <p className="mb-5 text-base font-medium text-ink-100">{question.question}</p>
        <div className="flex flex-col gap-2">
          {question.options.map((option) => {
            const isSelected = option.id === selectedId
            return (
              <button
                key={option.id}
                onClick={() => choose(option.id)}
                disabled={Boolean(selectedId)}
                className={clsx(
                  'border px-4 py-2.5 text-left text-sm transition-colors',
                  !isSelected && 'border-ink-700 bg-ink-900 text-ink-200 hover:border-ink-500',
                  isSelected && option.correct && 'border-ok-500 bg-ok-500/10 text-ink-100',
                  isSelected && !option.correct && 'border-bad-500 bg-bad-500/10 text-ink-100',
                  selectedId && !isSelected && 'opacity-40',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        {selected && (
          <p className={clsx('mt-3 text-sm', selected.correct ? 'text-ok-500' : 'text-bad-500')}>{selected.feedback}</p>
        )}
        {selectedId && (
          <Button onClick={next} className="mt-5 w-full">
            {index + 1 >= queue.length ? 'Finish' : 'Next'}
          </Button>
        )}
      </Panel>
    </div>
  )
}

function EmptyState({ onBack, message }: { onBack: () => void; message: string }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <Panel className="p-8">
        <h1 className="flex items-center justify-center gap-2 text-lg font-semibold text-ink-100">
          <Target className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
          Spaced quiz review
        </h1>
        <p className="mt-3 text-sm text-ink-400">{message}</p>
        <Button variant="secondary" onClick={onBack} className="mt-6">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Review
        </Button>
      </Panel>
    </div>
  )
}
