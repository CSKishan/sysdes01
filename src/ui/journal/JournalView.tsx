import { BookOpen, ArrowLeft } from 'lucide-react'
import { useJournalStore } from '@/game/journalStore'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

export function JournalView({ onBack }: { onBack: () => void }) {
  const entries = useJournalStore((s) => s.entries)

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ink-100">
            <BookOpen className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
            Your decision journal
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Every trade-off you've chosen, and what actually happened when you ran it.
          </p>
        </div>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Map
        </Button>
      </div>

      {entries.length === 0 && (
        <Panel className="p-8 text-center text-sm text-ink-400">
          Nothing here yet — this fills in automatically the first time a level asks you to make a
          real trade-off call.
        </Panel>
      )}

      <div className="flex flex-col gap-3">
        {[...entries].reverse().map((entry) => (
          <Panel key={entry.id} className="p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink-500">{entry.levelTitle}</p>
            <p className="mt-1 text-sm text-ink-200">{entry.situation}</p>
            <p className="mt-2 text-sm">
              <span className="text-ink-400">You chose: </span>
              <span className="font-medium text-brand-400">{entry.choiceLabel}</span>
            </p>
            <p className="mt-1 text-xs text-ink-500">{entry.outcomeSummary}</p>
            <p className="mt-2 bg-ink-950/50 px-3 py-1.5 text-xs text-ink-300">
              <span className="font-semibold text-ink-100">Rule: </span>
              {entry.ruleDerived}
            </p>
          </Panel>
        ))}
      </div>
    </div>
  )
}
