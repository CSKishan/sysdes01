// The back-of-the-envelope calculator (Phase 8.2). Real arithmetic, not
// canned numbers -- the outputs feed the design stage's actual traffic
// curve (EstimationStage.deriveWorkload), so a player's own assumptions are
// what their design gets tested against, not a fixed pre-authored curve.

import { useMemo, useState } from 'react'
import type { EstimationStage as EstimationStageContent } from '@/content/caseStudies/types'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { RichParagraphs, RichText } from '@/ui/shared/RichText'

export function EstimationStage({
  stage,
  onContinue,
}: {
  stage: EstimationStageContent
  onContinue: (outputs: Record<string, number>) => void
}) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(stage.inputs.map((i) => [i.id, i.defaultValue])),
  )

  const computedOutputs = useMemo(
    () => Object.fromEntries(stage.outputs.map((o) => [o.id, o.compute(values)])),
    [stage.outputs, values],
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <Panel className="p-8">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          Estimation and constraints
        </p>
        <RichParagraphs paragraphs={stage.intro} />

        <div className="mt-6 grid grid-cols-2 gap-4">
          {stage.inputs.map((input) => (
            <label key={input.id} className="flex flex-col gap-1.5 text-xs text-ink-300">
              <span className="font-mono text-[10px] uppercase tracking-wide text-ink-400">
                {input.label}: {values[input.id].toLocaleString()} {input.unit}
              </span>
              <input
                type="range"
                min={input.min}
                max={input.max}
                step={input.step}
                value={values[input.id]}
                onChange={(e) => setValues((prev) => ({ ...prev, [input.id]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>

        <div className="mt-6 border border-ink-700 bg-ink-950/50 p-4">
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            Your numbers
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {stage.outputs.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-ink-800 py-1">
                <span className="text-ink-400">{o.label}</span>
                <span className="font-mono text-ink-100">{o.formatValue(computedOutputs[o.id])}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 border border-ink-700 bg-ink-950/50 p-4">
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            The README's own estimate, for comparison
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {stage.canonicalEstimate.map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-ink-800 py-1">
                <span className="text-ink-400">{row.label}</span>
                <span className="font-mono text-ink-200">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <blockquote className="mt-5 border-l-4 border-brand-500 bg-ink-950/50 py-3 pl-4 pr-3">
          <p className="text-sm italic text-ink-300">
            <RichText text={`"${stage.readmeQuote.text}"`} />
          </p>
          <cite className="mt-1 block text-xs not-italic text-ink-500">— {stage.readmeQuote.source}</cite>
        </blockquote>

        <Button className="mt-6" onClick={() => onContinue(computedOutputs)}>
          Continue to design
        </Button>
      </Panel>
    </div>
  )
}
