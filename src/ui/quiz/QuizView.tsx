// Practice mode: pick random questions across everything completed, or
// narrow to one chapter, answer one at a time (reusing the same
// option/feedback interaction as the teach-stage comprehension check),
// then see a score summary broken down by chapter.

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Target, ArrowLeft } from 'lucide-react'
import { availableChapterOptions, buildQuizBank, shuffle, type QuizBankEntry } from '@/content/quizBank'
import { useProgressStore } from '@/game/progressStore'
import { useQuizStore } from '@/game/quizStore'
import { createSeededRng } from '@/engine/rng'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

const QUESTIONS_PER_SESSION = 10

type Mode = { kind: 'picker' } | { kind: 'running'; questions: QuizBankEntry[] } | { kind: 'done'; correct: number; total: number; byChapter: Record<string, { correct: number; total: number }> }

export function QuizView({ onBack }: { onBack: () => void }) {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const recordSession = useQuizStore((s) => s.recordSession)
  const bank = useMemo(() => buildQuizBank(completedLevelIds), [completedLevelIds])
  const chapterOptions = useMemo(() => availableChapterOptions(completedLevelIds), [completedLevelIds])
  const [mode, setMode] = useState<Mode>({ kind: 'picker' })

  function start(chapterId: string | null) {
    const pool = chapterId ? bank.filter((q) => q.chapterId === chapterId) : bank
    const rng = createSeededRng(Date.now())
    const questions = shuffle(pool, rng).slice(0, QUESTIONS_PER_SESSION)
    setMode({ kind: 'running', questions })
  }

  if (bank.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Panel className="p-8">
          <h1 className="flex items-center justify-center gap-2 text-lg font-semibold text-ink-100">
            <Target className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
            Quiz
          </h1>
          <p className="mt-3 text-sm text-ink-400">
            Nothing to practice yet — finish a level first, and its questions unlock here.
          </p>
          <Button variant="secondary" onClick={onBack} className="mt-6">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Map
          </Button>
        </Panel>
      </div>
    )
  }

  if (mode.kind === 'picker') {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <Panel className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-ink-100">
              <Target className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
              Quiz
            </h1>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              Map
            </Button>
          </div>
          <p className="mb-4 text-sm text-ink-400">
            {bank.length} question{bank.length === 1 ? '' : 's'} available from what you've completed so far.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => start(null)}>Random mix — {Math.min(QUESTIONS_PER_SESSION, bank.length)} questions</Button>
            {chapterOptions.map((c) => (
              <Button key={c.chapterId} variant="secondary" onClick={() => start(c.chapterId)}>
                {c.title} only — {Math.min(QUESTIONS_PER_SESSION, c.questionCount)} questions
              </Button>
            ))}
          </div>
        </Panel>
      </div>
    )
  }

  if (mode.kind === 'running') {
    return (
      <QuizRun
        questions={mode.questions}
        onDone={(correct, byChapter) => {
          const total = mode.questions.length
          recordSession({ correct, total, byChapter })
          setMode({ kind: 'done', correct, total, byChapter })
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Panel className="p-8 text-center">
        <h1 className="text-lg font-semibold text-ink-100">Session complete</h1>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-brand-400">
          {mode.correct} / {mode.total}
        </p>
        <div className="mt-6 flex flex-col gap-2 text-left">
          {Object.entries(mode.byChapter).map(([chapterId, stats]) => (
            <div
              key={chapterId}
              className="flex items-center justify-between border border-ink-700 bg-ink-950/50 px-3 py-2 text-sm"
            >
              <span className="text-ink-300">{chapterId}</span>
              <span className="font-mono tabular-nums text-ink-100">
                {stats.correct}/{stats.total}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => setMode({ kind: 'picker' })}>
            Again
          </Button>
          <Button onClick={onBack}>Back to map</Button>
        </div>
      </Panel>
    </div>
  )
}

function QuizRun({
  questions,
  onDone,
}: {
  questions: QuizBankEntry[]
  onDone: (correct: number, byChapter: Record<string, { correct: number; total: number }>) => void
}) {
  const [index, setIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [byChapter, setByChapter] = useState<Record<string, { correct: number; total: number }>>({})

  const question = questions[index]
  const selected = question.options.find((o) => o.id === selectedId)
  const isLast = index === questions.length - 1

  function choose(optionId: string) {
    if (selectedId) return
    setSelectedId(optionId)
    const option = question.options.find((o) => o.id === optionId)
    const correct = Boolean(option?.correct)
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
    if (isLast) {
      onDone(correctCount, byChapter)
      return
    }
    setSelectedId(null)
    setIndex((i) => i + 1)
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Panel className="p-8">
        <div className="mb-4 flex items-center justify-between text-xs text-ink-500">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>{question.levelTitle}</span>
        </div>
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
          <p className={clsx('mt-3 text-sm', selected.correct ? 'text-ok-500' : 'text-bad-500')}>
            {selected.feedback}
          </p>
        )}
        {selectedId && (
          <Button onClick={next} className="mt-5 w-full">
            {isLast ? 'See results' : 'Next question'}
          </Button>
        )}
      </Panel>
    </div>
  )
}
