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
  // Sighted users get the tone (ok/warn/bad) purely from color -- folded
  // into the aria-label too, or a screen-reader user hears only the raw
  // number with no severity cue at all, exactly the signal the color
  // exists to carry. Only called out for warn/bad: "ok"/"neutral" are the
  // expected default, not worth an extra qualifier every tile that's fine
  // doesn't need one.
  const toneSuffix = tone === 'warn' ? ' (warning level)' : tone === 'bad' ? ' (critical level)' : ''

  return (
    <div
      className="border border-ink-700 bg-ink-800/60 px-3 py-2.5"
      role="group"
      aria-label={`${label}: ${value}${toneSuffix}${sublabel ? `, ${sublabel}` : ''}`}
    >
      {/* The group's own aria-label above already says "label: value,
          sublabel" as one unit -- hide the individual text nodes from the
          accessibility tree so a screen reader doesn't announce all of it
          twice. Sighted layout is unaffected; aria-hidden only affects the
          a11y tree. */}
      <p className="font-mono text-[9.5px] uppercase tracking-wide text-ink-400" aria-hidden="true">{label}</p>
      <p
        aria-hidden="true"
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
      {sublabel && (
        <p className="font-mono text-[9.5px] text-ink-400" aria-hidden="true">
          {sublabel}
        </p>
      )}
    </div>
  )
}
