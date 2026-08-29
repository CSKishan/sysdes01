import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import clsx from 'clsx'

export function Panel({
  children,
  className,
  plain = false,
  ...rest
}: {
  children: ReactNode
  className?: string
  /** Skip the drafting-style corner marks -- for panels nested inside
   * another panel, where a second set of brackets would be visual noise. */
  plain?: boolean
} & ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={clsx(
        'border border-ink-700 bg-ink-900/90',
        !plain && 'corner-marks',
        className,
      )}
      {...rest}
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
