import clsx from 'clsx'

export function StatTile({
  label,
  value,
  tone = 'neutral',
  sublabel,
}: {
  label: string
  value: string
  tone?: 'neutral' | 'ok' | 'warn' | 'bad'
  sublabel?: string
}) {
  return (
    <div className="border border-ink-700 bg-ink-800/60 px-3 py-2.5">
      <p className="font-mono text-[9.5px] uppercase tracking-wide text-ink-400">{label}</p>
      <p
        className={clsx(
          'mt-0.5 font-mono text-lg tabular-nums',
          tone === 'neutral' && 'text-ink-100',
          tone === 'ok' && 'text-ok-500',
          tone === 'warn' && 'text-warn-500',
          tone === 'bad' && 'text-bad-500',
        )}
      >
        {value}
      </p>
      {sublabel && <p className="font-mono text-[9.5px] text-ink-400">{sublabel}</p>}
    </div>
  )
}
