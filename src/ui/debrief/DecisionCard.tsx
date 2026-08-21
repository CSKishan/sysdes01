import { useState } from 'react'
import clsx from 'clsx'
import type { DecisionCard as DecisionCardType } from '@/content/types'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

export function DecisionCard({
  card,
  onChoose,
}: {
  card: DecisionCardType
  onChoose: (option: DecisionCardType['options'][number]) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-16">
      <Panel className="w-full p-8">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          Your call
        </p>
        <h2 className="mb-5 text-xl font-semibold text-ink-100">{card.prompt}</h2>
        <div className="flex flex-col gap-3">
          {card.options.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedId(option.id)}
              className={clsx(
                'border px-4 py-3 text-left transition-colors',
                selectedId === option.id
                  ? 'border-brand-400 bg-brand-500/10'
                  : 'border-ink-700 bg-ink-900 hover:border-ink-500',
              )}
            >
              <p className="text-sm font-medium text-ink-100">{option.label}</p>
              <p className="mt-1 text-xs text-ink-400">{option.description}</p>
            </button>
          ))}
        </div>
      </Panel>
      <Button
        disabled={!selectedId}
        onClick={() => {
          const option = card.options.find((o) => o.id === selectedId)
          if (option) onChoose(option)
        }}
        className="min-w-40"
      >
        Build it
      </Button>
    </div>
  )
}
