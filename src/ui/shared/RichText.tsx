import { Fragment } from 'react'

/** Renders **bold** spans in otherwise-plain text without pulling in a full
 * markdown dependency — level content only ever needs emphasis. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
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
