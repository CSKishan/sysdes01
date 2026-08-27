import type { ReactNode } from 'react'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

/** Shared front/back card shell for both the glossary flashcards and the
 * interview-phrase deck -- "show a prompt, reveal an answer on demand,
 * offer some action once revealed" is the same interaction either way;
 * only the prompt/answer content and the post-reveal actions differ. */
export function FlipCard({
  eyebrow,
  front,
  back,
  revealed,
  onReveal,
  actions,
}: {
  eyebrow: string
  front: ReactNode
  back: ReactNode
  revealed: boolean
  onReveal: () => void
  /** Rendered only once revealed -- e.g. SM-2 rating buttons, or a "next" button. */
  actions?: ReactNode
}) {
  return (
    <Panel className="p-8 text-center">
      <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">{eyebrow}</p>
      <p className="text-lg font-medium text-ink-100">{front}</p>
      {revealed ? (
        <p className="mt-5 border-t border-ink-800 pt-5 text-sm text-ink-300">{back}</p>
      ) : (
        <Button variant="secondary" onClick={onReveal} className="mt-6">
          Show answer
        </Button>
      )}
      {revealed && actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </Panel>
  )
}
