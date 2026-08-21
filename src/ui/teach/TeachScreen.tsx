import type { TeachStage } from '@/content/types'
import { Panel } from '@/ui/shared/Panel'
import { RichParagraphs, RichText } from '@/ui/shared/RichText'
import { MiniDiagram } from './MiniDiagram'
import { ComprehensionCheck } from './ComprehensionCheck'

export function TeachScreen({
  stage,
  onContinue,
}: {
  stage: TeachStage
  onContinue: () => void
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <Panel className="p-8">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          What you need to know
        </p>
        <h2 className="mb-4 text-2xl font-semibold text-ink-100">{stage.title}</h2>
        <RichParagraphs paragraphs={stage.body} />

        {stage.diagram && <MiniDiagram diagram={stage.diagram} />}

        <blockquote className="mt-5 border-l-4 border-brand-500 bg-ink-950/50 py-3 pl-4 pr-3">
          <p className="text-sm italic text-ink-300">
            <RichText text={`"${stage.readmeQuote.text}"`} />
          </p>
          <cite className="mt-1 block text-xs not-italic text-ink-500">
            — {stage.readmeQuote.source}
          </cite>
        </blockquote>

        {stage.realWorldExamples.length > 0 && (
          <p className="mt-4 text-xs text-ink-400">
            <span className="font-semibold text-ink-300">Real systems that do this: </span>
            {stage.realWorldExamples.join(' · ')}
          </p>
        )}

        <ComprehensionCheck check={stage.check} onPassed={onContinue} />
      </Panel>
    </div>
  )
}
