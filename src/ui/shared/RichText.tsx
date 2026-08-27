import { Fragment } from 'react'
import { Link, useInRouterContext } from 'react-router-dom'
import { findGlossaryEntry } from '@/content/glossary'

/** Renders **bold** spans and [[glossary term]] links in otherwise-plain
 * text without pulling in a full markdown dependency -- level content only
 * ever needs emphasis and the occasional inline glossary hop. */
export function RichText({ text }: { text: string }) {
  // A [[term]] link needs react-router's Link, which throws outside a
  // Router. Every real render path is routed, but a component test
  // rendering e.g. TeachScreen in isolation (the exact thing Phase 10.1
  // plans) is not -- fall back to plain text there instead of crashing.
  const inRouter = useInRouterContext()
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-ink-100">
              {part.slice(2, -2)}
            </strong>
          )
        }
        if (part.startsWith('[[') && part.endsWith(']]')) {
          // Wiki-style alias syntax: [[glossary term|display text]] links to
          // the term but renders the text after the `|` -- e.g. a lesson
          // wants "replica" in running prose to link to the "replication"
          // entry. Plain [[term]] (no `|`) uses the term as both.
          const inner = part.slice(2, -2)
          const pipeIndex = inner.indexOf('|')
          const term = pipeIndex === -1 ? inner : inner.slice(0, pipeIndex)
          const display = pipeIndex === -1 ? inner : inner.slice(pipeIndex + 1)
          const entry = findGlossaryEntry(term)
          if (!entry || !inRouter) return <Fragment key={i}>{display}</Fragment>
          return (
            <Link
              key={i}
              to={entry.topicId ? `/library/topic/${entry.topicId}` : '/library/glossary'}
              title={entry.definition}
              className="text-brand-400 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-300"
            >
              {display}
            </Link>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

export function RichParagraphs({ paragraphs, className }: { paragraphs: string[]; className?: string }) {
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-ink-200 leading-relaxed [&:not(:first-child)]:mt-3">
          <RichText text={p} />
        </p>
      ))}
    </div>
  )
}
