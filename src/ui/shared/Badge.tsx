import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'brand'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
        tone === 'neutral' && 'border-ink-600 bg-ink-700 text-ink-200',
        tone === 'ok' && 'border-ok-500/40 bg-ok-500/10 text-ok-500',
        tone === 'warn' && 'border-warn-500/40 bg-warn-500/10 text-warn-500',
        tone === 'bad' && 'border-bad-500/40 bg-bad-500/10 text-bad-500',
        tone === 'brand' && 'border-brand-500/40 bg-brand-500/10 text-brand-400',
      )}
    >
      {children}
    </span>
  )
}
