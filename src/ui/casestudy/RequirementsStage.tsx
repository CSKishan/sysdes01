// The requirements-gathering step (Phase 8.1) -- functional/non-functional/
// extended requirements presented as multi-select checklists, mirroring the
// real interview opening. There's no single correct answer (the README says
// so explicitly), so this doesn't gate progress -- it just shows, after
// submitting, which of the README's own canonical picks the player made.

import { useState } from 'react'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import type { RequirementQuestion, RequirementsStage as RequirementsStageContent } from '@/content/caseStudies/types'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { RichParagraphs } from '@/ui/shared/RichText'

const CATEGORY_LABEL: Record<RequirementQuestion['category'], string> = {
  functional: 'Functional requirements',
  nonFunctional: 'Non-functional requirements',
  extended: 'Extended requirements',
}

export function RequirementsStage({
  stage,
  onContinue,
}: {
  stage: RequirementsStageContent
  onContinue: () => void
}) {
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})
  const [submitted, setSubmitted] = useState(false)

  function toggle(questionId: string, optionId: string) {
    setSelected((prev) => {
      const current = new Set(prev[questionId] ?? [])
      if (current.has(optionId)) current.delete(optionId)
      else current.add(optionId)
      return { ...prev, [questionId]: current }
    })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <Panel className="p-8">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          Requirements clarification
        </p>
        <RichParagraphs paragraphs={stage.intro} />

        <div className="mt-6 flex flex-col gap-6">
          {stage.questions.map((q) => {
            const picked = selected[q.id] ?? new Set<string>()
            return (
              <div key={q.id}>
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  {CATEGORY_LABEL[q.category]}
                </p>
                <p className="mb-2 text-sm font-medium text-ink-100">{q.question}</p>
                <div className="flex flex-col gap-1.5">
                  {q.options.map((opt) => {
                    const isPicked = picked.has(opt.id)
                    const showFeedback = submitted
                    return (
                      <button
                        key={opt.id}
                        onClick={() => !submitted && toggle(q.id, opt.id)}
                        disabled={submitted}
                        className={clsx(
                          'flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors',
                          !isPicked && !showFeedback && 'border-ink-700 bg-ink-900 text-ink-200 hover:border-ink-500',
                          isPicked && !showFeedback && 'border-brand-500 bg-brand-500/10 text-ink-100',
                          showFeedback && opt.inCanonicalDesign && 'border-ok-500/50 bg-ok-500/10 text-ink-100',
                          showFeedback && !opt.inCanonicalDesign && isPicked && 'border-warn-500/50 bg-warn-500/10 text-ink-100',
                          showFeedback && !opt.inCanonicalDesign && !isPicked && 'border-ink-700 bg-ink-900 text-ink-400',
                        )}
                      >
                        <span>{opt.label}</span>
                        {isPicked && <Check className="h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={2} />}
                        {showFeedback && (
                          <span className="ml-2 shrink-0 font-mono text-[9px] uppercase tracking-wide text-ink-500">
                            {opt.inCanonicalDesign ? "in the README's design" : 'optional here'}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {!submitted ? (
          <Button className="mt-6" onClick={() => setSubmitted(true)}>
            Lock in requirements
          </Button>
        ) : (
          <>
            <p className="mt-6 text-xs text-ink-400">
              There's no single right answer here — real interviews are a two-way conversation about
              scope. The highlights above show what the README's own reference design picked, for
              comparison.
            </p>
            <Button className="mt-3" onClick={onContinue}>
              Continue to estimation
            </Button>
          </>
        )}
      </Panel>
    </div>
  )
}
