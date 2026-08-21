import type { SituationStage } from '@/content/types'
import { Button } from '@/ui/shared/Button'
import { Panel } from '@/ui/shared/Panel'
import { RichParagraphs } from '@/ui/shared/RichText'

export function SituationScreen({
  stage,
  onContinue,
}: {
  stage: SituationStage
  onContinue: () => void
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
      <Panel className="w-full p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-400">
          The situation
        </p>
        <h2 className="mb-4 text-2xl font-semibold text-ink-100">{stage.title}</h2>
        <RichParagraphs paragraphs={stage.body} className="text-left" />
      </Panel>
      <Button onClick={onContinue} className="min-w-40">
        Continue
      </Button>
    </div>
  )
}
