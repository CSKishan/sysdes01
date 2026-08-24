import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BookOpen, Tag } from 'lucide-react'
import { searchContent } from '@/content/searchIndex'

/** Global Ctrl/Cmd-K quick-open over the Library corpus (Phase 1.2). Mounted
 * once at the app root so it works from anywhere, not just inside /library
 * -- "look something up mid-level" is a real use case this game didn't
 * support before. */
export function SearchPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()

  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (openRef.current) {
          setOpen(false)
        } else {
          setQuery('')
          setActiveIndex(0)
          setOpen(true)
        }
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Stable across re-renders (typing, arrow keys) so React attaches it once
  // per actual mount of the input -- an inline `ref={(el) => ...}` here
  // gets a new function identity every render, so React would detach and
  // reattach (and re-focus) it on every keystroke instead of just once.
  const focusOnMount = useCallback((el: HTMLInputElement | null) => {
    el?.focus()
  }, [])

  const results = searchContent(query)

  function go(href: string) {
    setOpen(false)
    navigate(href)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 px-4 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        className="corner-marks w-full max-w-lg border border-ink-700 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-500" strokeWidth={1.8} />
          <input
            // A ref callback (not an effect) so focus lands in the same
            // commit the input mounts in -- an effect + rAF left a window
            // where fast typing right after Ctrl+K landed on <body> instead.
            ref={focusOnMount}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter' && results[activeIndex]) {
                go(results[activeIndex].doc.href)
              }
            }}
            placeholder="Search every topic and glossary term…"
            className="w-full bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
          />
          <kbd className="border border-ink-700 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">Esc</kbd>
        </div>
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => (
              <li key={r.doc.id}>
                <button
                  onClick={() => go(r.doc.href)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={
                    'flex w-full items-start gap-2.5 px-4 py-2 text-left ' +
                    (i === activeIndex ? 'bg-brand-500/10' : '')
                  }
                >
                  {r.doc.kind === 'topic' ? (
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={1.8} />
                  ) : (
                    <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" strokeWidth={1.8} />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink-100">{r.doc.title}</span>
                    <span className="block truncate text-xs text-ink-500">
                      {r.doc.chapterTitle ?? r.doc.subtitle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim().length >= 2 && results.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-ink-500">No matches for "{query}".</p>
        )}
        {query.trim().length < 2 && (
          <p className="px-4 py-6 text-center text-xs text-ink-600">Keep typing to search the library…</p>
        )}
      </div>
    </div>
  )
}
