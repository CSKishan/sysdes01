// The stage-3 "we do it together" driver: a narrated checklist next to the
// unlocked canvas. The player performs each action themselves (drag a
// component, set a value, connect an edge) and advances manually — this is
// a deliberately simple, reliable mechanic rather than trying to detect
// exact canvas actions, which would be far more fragile to get right.

import { useState } from 'react'
import clsx from 'clsx'
import type { GuidedStep } from '@/content/types'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

export function GuidedStepPanel({
  steps,
  onAllStepsDone,
}: {
  steps: GuidedStep[]
  onAllStepsDone: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const isLastStep = currentIndex === steps.length - 1

  function advance() {
    if (isLastStep) {
      onAllStepsDone()
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  return (
    <Panel className="w-72 shrink-0 p-4">
      <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
        Let's build it together
      </p>
      <div className="mb-4 flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={clsx(
              'h-1.5 flex-1',
              i < currentIndex && 'bg-ok-500',
              i === currentIndex && 'bg-brand-400',
              i > currentIndex && 'bg-ink-700',
            )}
          />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-ink-100">
        {steps[currentIndex].instruction}
      </p>
      <Button onClick={advance} className="mt-4 w-full">
        {isLastStep ? "Done — I've placed it" : 'Done, next step'}
      </Button>
      <p className="mt-2 text-center font-mono text-[10px] text-ink-500">
        Step {currentIndex + 1} of {steps.length}
      </p>
    </Panel>
  )
}
