// Orchestrates one case study's full flow: scenario -> requirements ->
// estimation -> design -> rubric review. Mirrors LevelPlayer's role for the
// existing level shape, but case studies aren't levels (see
// content/caseStudies/types.ts), so this is a sibling orchestrator, not an
// extension of LevelPlayer's stage switch.
//
// Timed Drill mode (Phase 8.5): an optional 45-minute countdown started at
// the scenario screen. Every stage transition gets timestamped into a
// transcript, written to the journal on finish -- reusing JournalEntry's
// existing levelId/levelTitle fields to hold the case study's id/title
// rather than adding a new field, since the shape already fits without
// changes.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Clock } from 'lucide-react'
import type { SimGraph, SimResult } from '@/engine/types'
import type { CaseStudy } from '@/content/caseStudies/types'
import { useJournalStore } from '@/game/journalStore'
import { useCaseStudyProgressStore } from '@/game/caseStudyProgressStore'
import { scoreRubric } from '@/game/rubricScoring'
import { RequirementsStage } from './RequirementsStage'
import { EstimationStage } from './EstimationStage'
import { CaseStudyDesignStage } from './CaseStudyDesignStage'
import { RubricReview } from './RubricReview'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { RichParagraphs } from '@/ui/shared/RichText'

const DRILL_DURATION_MS = 45 * 60 * 1000

type Step = 'intro' | 'requirements' | 'estimation' | 'design' | 'rubric'

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function CaseStudyPlayer({ caseStudy, onExit }: { caseStudy: CaseStudy; onExit: () => void }) {
  const [step, setStep] = useState<Step>('intro')
  const [drillMode, setDrillMode] = useState(false)
  const [drillStartedAt, setDrillStartedAt] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(DRILL_DURATION_MS)
  const [estimationOutputs, setEstimationOutputs] = useState<Record<string, number> | null>(null)
  const [finalGraph, setFinalGraph] = useState<SimGraph | null>(null)
  const [finalResult, setFinalResult] = useState<SimResult | null>(null)
  const transcript = useRef<{ stage: string; elapsedMs: number }[]>([])

  const addJournalEntry = useJournalStore((s) => s.addEntry)
  const completeCaseStudy = useCaseStudyProgressStore((s) => s.completeCaseStudy)

  useEffect(() => {
    if (!drillMode || drillStartedAt === null) return
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, DRILL_DURATION_MS - (Date.now() - drillStartedAt)))
    }, 1000)
    return () => clearInterval(id)
  }, [drillMode, drillStartedAt])

  function logTranscript(stageName: string) {
    if (!drillMode || drillStartedAt === null) return
    transcript.current.push({ stage: stageName, elapsedMs: Date.now() - drillStartedAt })
  }

  function startCaseStudy(withDrill: boolean) {
    setDrillMode(withDrill)
    if (withDrill) {
      setDrillStartedAt(Date.now())
      setRemainingMs(DRILL_DURATION_MS)
    }
    setStep('requirements')
  }

  const rubric = useMemo(
    () => (finalGraph ? scoreRubric(finalGraph, finalResult, caseStudy.design.rubric) : null),
    [finalGraph, finalResult, caseStudy.design.rubric],
  )

  function finish() {
    if (!rubric) return
    completeCaseStudy(caseStudy.id, rubric.scorePercent)
    if (drillMode) {
      logTranscript('Finished')
      for (const entry of transcript.current) {
        addJournalEntry({
          levelId: caseStudy.id,
          levelTitle: caseStudy.title,
          situation: caseStudy.scenario[0] ?? caseStudy.title,
          choiceLabel: `${entry.stage} (timed drill)`,
          outcomeSummary: `At ${formatClock(entry.elapsedMs)} elapsed — final rubric ${rubric.metCount}/${rubric.totalCount} (${rubric.tier}).`,
          ruleDerived: caseStudy.interviewPhrase,
        })
      }
    }
    onExit()
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="flex items-center justify-between border-b border-ink-800 px-4 py-2">
        <Button variant="ghost" onClick={onExit}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Case studies
        </Button>
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-500">{caseStudy.title}</p>
        {drillMode ? (
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-brand-400">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
            {formatClock(remainingMs)}
          </span>
        ) : (
          <span className="w-24" />
        )}
      </header>

      {step === 'intro' && (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
          <Panel className="w-full p-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-400">Case study</p>
            <h2 className="mb-4 text-2xl font-semibold text-ink-100">{caseStudy.title}</h2>
            <RichParagraphs paragraphs={caseStudy.scenario} className="text-left" />
          </Panel>
          <div className="flex gap-3">
            <Button onClick={() => startCaseStudy(false)} className="min-w-40">
              Practice (untimed)
            </Button>
            <Button variant="secondary" onClick={() => startCaseStudy(true)} className="min-w-40">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
              Timed drill (45 min)
            </Button>
          </div>
        </div>
      )}

      {step === 'requirements' && (
        <RequirementsStage
          stage={caseStudy.requirements}
          onContinue={() => {
            logTranscript('Requirements clarified')
            setStep('estimation')
          }}
        />
      )}

      {step === 'estimation' && (
        <EstimationStage
          stage={caseStudy.estimation}
          onContinue={(outputs) => {
            setEstimationOutputs(outputs)
            logTranscript('Estimation complete')
            setStep('design')
          }}
        />
      )}

      {step === 'design' && estimationOutputs && (
        <CaseStudyDesignStage
          stage={caseStudy.design}
          workload={caseStudy.estimation.deriveWorkload(estimationOutputs)}
          initialGraph={finalGraph}
          onReview={(graph, result) => {
            setFinalGraph(graph)
            setFinalResult(result)
            logTranscript('Design submitted for review')
            setStep('rubric')
          }}
        />
      )}

      {step === 'rubric' && rubric && (
        <RubricReview
          rubric={rubric}
          referenceArchitecture={caseStudy.design.referenceArchitecture}
          interviewPhrase={caseStudy.interviewPhrase}
          onBackToDesign={() => setStep('design')}
          onFinish={finish}
        />
      )}
    </div>
  )
}
