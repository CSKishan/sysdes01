import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' &&
          'border-brand-500 bg-brand-500 text-ink-950 hover:bg-brand-400 hover:border-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400',
        variant === 'secondary' &&
          'border-ink-700 bg-ink-800 text-ink-200 hover:border-brand-500/50 hover:text-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-400',
        variant === 'ghost' &&
          'border-transparent bg-transparent text-ink-400 hover:border-ink-700 hover:text-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-400',
        className,
      )}
      {...props}
    />
  )
}
