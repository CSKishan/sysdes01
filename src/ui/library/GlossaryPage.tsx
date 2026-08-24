import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GLOSSARY } from '@/content/glossary'
import { Panel } from '@/ui/shared/Panel'
import { LibraryLayout } from './LibraryLayout'

export function GlossaryPage() {
  const [query, setQuery] = useState('')

  const entries = useMemo(() => {
    const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term))
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <LibraryLayout>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter terms…"
        className="mb-4 w-full border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-brand-500"
      />
      <Panel className="divide-y divide-ink-800 p-0">
        {entries.map((entry) => (
          <div key={entry.term} className="p-4">
            <p className="text-sm font-semibold text-ink-100">
              {entry.topicId ? (
                <Link to={`/library/topic/${entry.topicId}`} className="hover:text-brand-400">
                  {entry.term}
                </Link>
              ) : (
                entry.term
              )}
            </p>
            <p className="mt-1 text-sm text-ink-400">{entry.definition}</p>
          </div>
        ))}
        {entries.length === 0 && <p className="p-4 text-sm text-ink-500">No terms match "{query}".</p>}
      </Panel>
    </LibraryLayout>
  )
}
