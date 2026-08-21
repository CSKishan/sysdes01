import { useState } from 'react'
import clsx from 'clsx'
import type { ComprehensionCheck as ComprehensionCheckType } from '@/content/types'

export function ComprehensionCheck({
  check,
  onPassed,
}: {
  check: ComprehensionCheckType
  onPassed: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [passed, setPassed] = useState(false)

  const selected = check.options.find((o) => o.id === selectedId)

  function choose(id: string) {
    setSelectedId(id)
    const option = check.options.find((o) => o.id === id)
    if (option?.correct) setPassed(true)
  }

  return (
    <div className="mt-6 border border-ink-700 bg-ink-950/50 p-5">
      <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
        Quick check
      </p>
      <p className="mb-4 font-medium text-ink-100">{check.question}</p>
      <div className="flex flex-col gap-2">
        {check.options.map((option) => {
          const isSelected = option.id === selectedId
          return (
            <button
              key={option.id}
              data-testid={option.correct ? 'check-option-correct' : 'check-option-wrong'}
              onClick={() => choose(option.id)}
              disabled={passed}
              className={clsx(
                'border px-4 py-2.5 text-left text-sm transition-colors',
                !isSelected && 'border-ink-700 bg-ink-900 text-ink-200 hover:border-ink-500',
                isSelected && option.correct && 'border-ok-500 bg-ok-500/10 text-ink-100',
                isSelected && !option.correct && 'border-bad-500 bg-bad-500/10 text-ink-100',
                passed && !isSelected && 'opacity-40',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {selected && (
        <p
          className={clsx(
            'mt-3 text-sm',
            selected.correct ? 'text-ok-500' : 'text-bad-500',
          )}
        >
          {selected.feedback}
        </p>
      )}
      {passed && (
        <button
          onClick={onPassed}
          className="mt-4 inline-flex items-center justify-center border border-brand-500 bg-brand-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-950 hover:border-brand-400 hover:bg-brand-400"
        >
          Continue
        </button>
      )}
    </div>
  )
}
