import clsx from 'clsx'
import { Check, X } from 'lucide-react'
import type { DebriefContent } from '@/content/types'
import type { ScoreResult } from '@/game/scoring'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { RichParagraphs, RichText } from '@/ui/shared/RichText'
import { Badge } from '@/ui/shared/Badge'

export function DebriefScreen({
  score,
  content,
  onContinue,
  onRetry,
  continueLabel = 'Continue',
}: {
  score: ScoreResult
  content: DebriefContent
  onContinue: () => void
  onRetry: () => void
  continueLabel?: string
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <Panel className="p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                'flex h-7 w-7 items-center justify-center border',
                score.passed ? 'border-ok-500 text-ok-500' : 'border-bad-500 text-bad-500',
              )}
            >
              {score.passed ? <Check className="h-4 w-4" strokeWidth={2} /> : <X className="h-4 w-4" strokeWidth={2} />}
            </span>
            <p className="text-lg font-semibold text-ink-100">
              {score.passed ? 'SLO met' : 'SLO missed'}
            </p>
          </div>
          {score.passed && (
            <div className="font-mono text-xl" aria-label={`${score.stars} stars`}>
              {'★'.repeat(score.stars)}
              <span className="text-ink-700">{'★'.repeat(3 - score.stars)}</span>
            </div>
          )}
        </div>

        <div className="mb-5 flex flex-col gap-2">
          {score.checks.map((check) => (
            <div key={check.label} className="border border-ink-700 bg-ink-950/50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-300">{check.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-ink-100">{check.actual}</span>
                  <Badge tone={check.passed ? 'ok' : 'bad'}>{check.target}</Badge>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 flex-1 border border-ink-700 bg-ink-950">
                  <div
                    className={clsx('h-full', check.ratio <= 1 ? 'bg-ok-500' : 'bg-bad-500')}
                    style={{ width: `${Math.min(100, check.ratio * 100)}%` }}
                  />
                </div>
                <span className={clsx('font-mono text-[10px] tabular-nums', check.ratio <= 1 ? 'text-ink-500' : 'text-bad-500')}>
                  {check.ratio.toFixed(1)}x budget
                </span>
              </div>
            </div>
          ))}
        </div>

        <RichParagraphs paragraphs={score.passed ? content.successBody : content.failureBody} />

        <blockquote className="mt-5 border-l-4 border-brand-500 bg-ink-950/50 py-3 pl-4 pr-3">
          <p className="text-sm italic text-ink-300">
            <RichText text={`"${content.readmeQuote.text}"`} />
          </p>
          <cite className="mt-1 block text-xs not-italic text-ink-500">
            — {content.readmeQuote.source}
          </cite>
        </blockquote>

        {content.realWorldExamples.length > 0 && (
          <p className="mt-4 text-xs text-ink-400">
            <span className="font-semibold text-ink-300">Real systems that do this: </span>
            {content.realWorldExamples.join(' · ')}
          </p>
        )}

        <p className="mt-4 bg-ink-950/50 px-3 py-2 text-xs text-ink-300">
          <span className="font-semibold text-brand-400">Interview phrasing: </span>
          <RichText text={content.interviewPhrase} />
        </p>
      </Panel>

      <div className="flex justify-center gap-3">
        {!score.passed && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        {score.passed && (
          <Button onClick={onContinue} className="min-w-40">
            {continueLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
