import clsx from 'clsx'
import type { SequenceDiagram } from '@/content/types'

/** A client/server sequence-timeline diagram -- the counterpart to
 * MiniDiagram for lessons that are about *request pattern over time*
 * (REST vs GraphQL vs gRPC, long polling vs WebSockets vs SSE) rather than
 * topology. Client and server stay in fixed lanes; each message is a line
 * between them with an arrowhead on the receiving end, in order top to
 * bottom -- the same convention as a real sequence diagram, just built
 * from flexbox instead of SVG to match MiniDiagram's approach. */
export function SequenceDiagramView({ diagram }: { diagram: SequenceDiagram }) {
  return (
    <div className="corner-marks my-4 border border-ink-700 bg-ink-950/60 px-5 py-5">
      <div className="mb-4 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          Client
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          Server
        </span>
      </div>
      <div className="relative flex flex-col gap-4">
        <div className="pointer-events-none absolute inset-y-0 left-1 w-px bg-ink-700" />
        <div className="pointer-events-none absolute inset-y-0 right-1 w-px bg-ink-700" />
        {diagram.steps.map((step, i) => {
          const toServer = step.direction === 'clientToServer'
          return (
            <div key={i}>
              {step.wait && (
                <p className="mb-1.5 text-center font-mono text-[9px] uppercase tracking-wide text-ink-600">
                  ⋯ waiting ⋯
                </p>
              )}
              <p className="mb-1 text-center text-[11px] text-ink-200">{step.label}</p>
              <div className="flex items-center px-1">
                <span className="h-px flex-1 bg-brand-500/50" />
                <span className={clsx('text-xs text-brand-400', toServer ? 'order-last' : 'order-first')}>
                  {toServer ? '▶' : '◀'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {diagram.caption && <p className="mt-5 text-center text-xs italic text-ink-400">{diagram.caption}</p>}
    </div>
  )
}
