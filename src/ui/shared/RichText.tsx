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
          const term = part.slice(2, -2)
          const entry = findGlossaryEntry(term)
          if (!entry || !inRouter) return <Fragment key={i}>{term}</Fragment>
          return (
            <Link
              key={i}
              to={entry.topicId ? `/library/topic/${entry.topicId}` : '/library/glossary'}
              title={entry.definition}
              className="text-brand-400 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-300"
            >
              {term}
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
