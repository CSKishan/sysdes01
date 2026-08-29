import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import { BookMarked, ArrowLeft } from 'lucide-react'
import { SearchButton } from './SearchPalette'

const TABS = [
  { href: '/library', label: 'Topics', exact: true },
  { href: '/library/glossary', label: 'Glossary', exact: false },
  { href: '/library/numbers', label: 'Numbers', exact: false },
  { href: '/library/attribution', label: 'Attribution', exact: false },
]

/** Shared chrome for every /library/* page: the ungated door the plan
 * calls for -- reachable without progress, and always showing a way back
 * to both the campaign map and the other library sections. */
export function LibraryLayout({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookMarked className="h-6 w-6 text-brand-500" strokeWidth={1.6} />
          <div>
            <h1 className="text-xl font-semibold text-ink-100">Library</h1>
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink-400">
              Every topic, ungated
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 border border-ink-700 bg-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-200 hover:border-brand-500/50 hover:text-ink-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Map
        </Link>
      </header>

      <SearchButton className="mb-8 w-full sm:w-96" />

      <nav className="mb-8 flex gap-1 border-b border-ink-800">
        {TABS.map((tab) => {
          const active = tab.exact ? location.pathname === tab.href : location.pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={clsx(
                'border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors',
                active
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-ink-400 hover:text-ink-200',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {children}
    </div>
  )
}
