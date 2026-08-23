import { Link, Navigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { BuildStage, ComprehensionCheck, QuizQuestion, SloTarget } from '@/content/types'
import { CHAPTERS, getLevel, getTopicNeighbors } from '@/content/registry'
import { SLO_FIELD_FORMATS } from '@/game/scoring'
import { Panel } from '@/ui/shared/Panel'
import { Badge } from '@/ui/shared/Badge'
import { MiniDiagram } from '@/ui/teach/MiniDiagram'
import { RichParagraphs, RichText } from '@/ui/shared/RichText'
import { LibraryLayout } from './LibraryLayout'

function QuoteBlock({ quote, source }: { quote: string; source: string }) {
  return (
    <blockquote className="mt-5 border-l-4 border-brand-500 bg-ink-950/50 py-3 pl-4 pr-3">
      <p className="text-sm italic text-ink-300">
        <RichText text={`"${quote}"`} />
      </p>
      <cite className="mt-1 block text-xs not-italic text-ink-500">— {source}</cite>
    </blockquote>
  )
}

function RealWorldExamples({ examples }: { examples: string[] }) {
  if (examples.length === 0) return null
  return (
    <p className="mt-4 text-xs text-ink-400">
      <span className="font-semibold text-ink-300">Real systems that do this: </span>
      {examples.join(' · ')}
    </p>
  )
}

/** A static, always-revealed rendering of a check -- Library is a reference,
 * not a scored interaction, so the answer is shown directly rather than
 * gated behind a click the way TeachScreen and QuizView gate it. */
function StaticCheck({ check }: { check: ComprehensionCheck | QuizQuestion }) {
  const correct = check.options.find((o) => o.correct)
  return (
    <div className="mt-4 border border-ink-700 bg-ink-950/40 p-3">
      <p className="text-xs font-semibold text-ink-300">{check.question}</p>
      {correct && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-ok-500">
          <Check className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
          <span>
            {correct.label}
            <span className="ml-1 text-ink-400">— {correct.feedback}</span>
          </span>
        </p>
      )}
    </div>
  )
}

function SloSummary({ slo }: { slo: SloTarget }) {
  const entries = Object.entries(slo) as [keyof SloTarget, number][]
  if (entries.length === 0) return null
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <Badge key={key} tone="brand">
          {SLO_FIELD_FORMATS[key].label} {SLO_FIELD_FORMATS[key].formatTarget(value)}
        </Badge>
      ))}
    </div>
  )
}

function BuildSection({ stage }: { stage: BuildStage }) {
  return (
    <div className="mt-6 border-t border-ink-800 pt-6">
      <div className="mb-3 flex items-center gap-2">
        <Badge tone="neutral">{stage.mode}</Badge>
        <h3 className="text-base font-semibold text-ink-100">{stage.title}</h3>
      </div>
      <RichParagraphs paragraphs={stage.brief} />
      <SloSummary slo={stage.slo} />

      {stage.decisionCard && (
        <div className="mt-4 border border-ink-700 bg-ink-950/40 p-3">
          <p className="mb-2 text-xs font-semibold text-ink-300">{stage.decisionCard.prompt}</p>
          <ul className="flex flex-col gap-1.5">
            {stage.decisionCard.options.map((option) => (
              <li key={option.id} className="text-xs text-ink-400">
                <span className="font-medium text-ink-200">{option.label}:</span> {option.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">On success</p>
        <RichParagraphs paragraphs={stage.debrief.successBody} />
      </div>

      <QuoteBlock quote={stage.debrief.readmeQuote.text} source={stage.debrief.readmeQuote.source} />
      <RealWorldExamples examples={stage.debrief.realWorldExamples} />

      <p className="mt-4 bg-ink-950/50 px-3 py-2 text-xs text-ink-300">
        <span className="font-semibold text-brand-400">Interview phrasing: </span>
        <RichText text={stage.debrief.interviewPhrase} />
      </p>
      <p className="mt-2 bg-ink-950/50 px-3 py-2 text-xs text-ink-300">
        <span className="font-semibold text-brand-400">Rule of thumb: </span>
        {stage.debrief.ruleOfThumb}
      </p>
    </div>
  )
}

export function TopicPage() {
  const { levelId } = useParams<{ levelId: string }>()
  const level = levelId ? getLevel(levelId) : undefined

  if (!level) return <Navigate to="/library" replace />

  const chapter = CHAPTERS.find((c) => c.id === level.chapterId)
  const neighbors = getTopicNeighbors(level.id)
  const situation = level.stages.find((s) => s.kind === 'situation')
  const teachStages = level.stages.filter((s) => s.kind === 'teach')
  const buildStages = level.stages.filter((s) => s.kind === 'build')

  return (
    <LibraryLayout>
      <Link
        to="/library"
        className="mb-4 inline-block font-mono text-[10px] uppercase tracking-wide text-ink-500 hover:text-ink-300"
      >
        {chapter?.title ?? 'Library'}
      </Link>

      <Panel className="p-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          {level.realConcept}
        </p>
        <h2 className="mb-1 text-2xl font-semibold text-ink-100">{level.title}</h2>
        <p className="mb-4 text-sm text-ink-500">{level.analogyName}</p>

        {situation && situation.kind === 'situation' && (
          <p className="mb-6 border-l-2 border-ink-700 pl-3 text-sm italic text-ink-400">
            {situation.body[0]}
          </p>
        )}

        {teachStages.map((stage, i) =>
          stage.kind === 'teach' ? (
            <div key={i} className={i > 0 ? 'mt-6 border-t border-ink-800 pt-6' : ''}>
              <RichParagraphs paragraphs={stage.body} />
              {stage.diagram && <MiniDiagram diagram={stage.diagram} />}
              <QuoteBlock quote={stage.readmeQuote.text} source={stage.readmeQuote.source} />
              <RealWorldExamples examples={stage.realWorldExamples} />
              <StaticCheck check={stage.check} />
            </div>
          ) : null,
        )}

        {buildStages.map((stage, i) => (stage.kind === 'build' ? <BuildSection key={i} stage={stage} /> : null))}

        {level.quizQuestions && level.quizQuestions.length > 0 && (
          <div className="mt-6 border-t border-ink-800 pt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Practice questions</p>
            <div className="flex flex-col gap-2">
              {level.quizQuestions.map((q) => (
                <StaticCheck key={q.id} check={q} />
              ))}
            </div>
          </div>
        )}
      </Panel>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex-1">
          {neighbors.before && (
            <Link
              to={`/library/topic/${neighbors.before.id}`}
              className="block border border-ink-700 bg-ink-900/60 px-4 py-2 text-xs text-ink-400 hover:border-brand-500/50 hover:text-ink-100"
            >
              ← Before: {neighbors.before.title}
            </Link>
          )}
        </div>
        <div className="flex-1 sm:text-right">
          {neighbors.after && (
            <Link
              to={`/library/topic/${neighbors.after.id}`}
              className="block border border-ink-700 bg-ink-900/60 px-4 py-2 text-xs text-ink-400 hover:border-brand-500/50 hover:text-ink-100"
            >
              Next: {neighbors.after.title} →
            </Link>
          )}
        </div>
      </div>

      {neighbors.seeAlso.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-ink-500">See also</p>
          <div className="flex flex-wrap gap-2">
            {neighbors.seeAlso.map((l) => (
              <Link
                key={l.id}
                to={`/library/topic/${l.id}`}
                className="border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-xs text-ink-300 hover:border-brand-500/50 hover:text-ink-100"
              >
                {l.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </LibraryLayout>
  )
}
