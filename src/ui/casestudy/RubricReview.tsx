// Rubric-based review (Phase 8.4) -- a checklist scored against the
// player's actual graph, not a binary SLO pass/fail. Visually modeled on
// DebriefScreen's checks-list styling, but a separate component: the data
// shape (RubricResult) and framing (no pass/fail, no stars, a reference
// architecture instead of success/failure bodies) are different enough
// that widening DebriefScreen's props would cost more clarity than it saves.

import clsx from 'clsx'
import { Check, X } from 'lucide-react'
import type { RubricResult } from '@/game/rubricScoring'
import type { ReferenceArchitecture } from '@/content/caseStudies/types'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { Badge } from '@/ui/shared/Badge'

const TIER_LABEL: Record<RubricResult['tier'], string> = {
  strong: 'Strong design',
  solid: 'Solid start',
  needsWork: 'Needs work',
}

export function RubricReview({
  rubric,
  referenceArchitecture,
  interviewPhrase,
  onBackToDesign,
  onFinish,
}: {
  rubric: RubricResult
  referenceArchitecture: ReferenceArchitecture
  interviewPhrase: string
  onBackToDesign: () => void
  onFinish: () => void
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <Panel className="p-8">
        <div className="mb-5 flex items-center justify-between">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
            Rubric review
          </p>
          <Badge tone={rubric.tier === 'strong' ? 'ok' : rubric.tier === 'solid' ? 'warn' : 'bad'}>
            {TIER_LABEL[rubric.tier]} — {rubric.metCount}/{rubric.totalCount}
          </Badge>
        </div>

        <div className="mb-6 flex flex-col gap-2">
          {rubric.items.map((item) => (
            <div key={item.id} className="border border-ink-700 bg-ink-950/50 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'flex h-5 w-5 shrink-0 items-center justify-center border',
                    item.met ? 'border-ok-500 text-ok-500' : 'border-ink-600 text-ink-600',
                  )}
                >
                  {item.met ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <X className="h-3 w-3" strokeWidth={2} />}
                </span>
                <span className={item.met ? 'text-ink-100' : 'text-ink-400'}>{item.label}</span>
              </div>
              <p className="mt-1 pl-7 text-xs text-ink-500">{item.whyItMatters}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 border border-ink-700 bg-ink-950/50 p-4">
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            One reference architecture
          </p>
          <ul className="mb-3 list-inside list-disc text-sm text-ink-300">
            {referenceArchitecture.summary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-wide text-ink-500">Key decisions</p>
          <ul className="list-inside list-disc text-xs text-ink-400">
            {referenceArchitecture.keyDecisions.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <p className="mb-6 bg-ink-950/50 px-3 py-2 text-xs text-ink-300">
          <span className="font-semibold text-brand-400">Interview phrasing: </span>
          {interviewPhrase}
        </p>

        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onBackToDesign}>
            Back to design
          </Button>
          <Button onClick={onFinish}>Finish case study</Button>
        </div>
      </Panel>
    </div>
  )
}
