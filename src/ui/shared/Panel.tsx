import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Panel({
  children,
  className,
  plain = false,
}: {
  children: ReactNode
  className?: string
  /** Skip the drafting-style corner marks -- for panels nested inside
   * another panel, where a second set of brackets would be visual noise. */
  plain?: boolean
}) {
  return (
    <div
      className={clsx(
        'border border-ink-700 bg-ink-900/90',
        !plain && 'corner-marks',
        className,
      )}
    >
      {!plain && (
        <>
          <span className="corner-mark-tr" />
          <span className="corner-mark-bl" />
        </>
      )}
      {children}
    </div>
  )
}
