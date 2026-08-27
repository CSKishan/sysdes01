// Case Study content schema (Phase 8 / Chapter V). Deliberately a sibling
// type family to Level/LevelStage/BuildStage, not an extension of them --
// a case study has no fixed startingGraph and no binary SLO, so forcing it
// through BuildStage's contract would mean every field on that type going
// optional just for this one mode. What *is* shared: ComponentKind,
// SimGraph, Workload, IncidentWindow (engine-level, mode-agnostic) and
// ReadmeQuote (a trivial, uncoupled interface).

import type { IncidentWindow, SimGraph, SimResult, Workload } from '@/engine/types'
import type { ReadmeQuote } from '../types'

export interface RequirementOption {
  id: string
  label: string
  /** Shown after the player submits, alongside whether the README's own
   * canonical design includes this requirement -- informative, not gating,
   * matching the real interview's collaborative, no-single-answer nature. */
  inCanonicalDesign: boolean
}

export interface RequirementQuestion {
  id: string
  category: 'functional' | 'nonFunctional' | 'extended'
  question: string
  options: RequirementOption[]
}

export interface RequirementsStage {
  intro: string[]
  questions: RequirementQuestion[]
}

export interface EstimationInput {
  id: string
  label: string
  unit: string
  defaultValue: number
  min: number
  max: number
  step: number
}

export interface EstimationOutput {
  id: string
  label: string
  /** Computed from the current input values, keyed by EstimationInput.id. */
  compute: (values: Record<string, number>) => number
  formatValue: (n: number) => string
}

export interface EstimationStage {
  intro: string[]
  inputs: EstimationInput[]
  outputs: EstimationOutput[]
  /** The README's own canonical numbers, shown alongside the player's for
   * comparison once they've computed their own. */
  canonicalEstimate: { label: string; value: string }[]
  readmeQuote: ReadmeQuote
  /** Turns the estimation outputs into the design stage's actual traffic
   * curve -- the numbers a player derives here are what their design gets
   * tested against, not a fixed pre-authored curve. */
  deriveWorkload: (outputs: Record<string, number>) => Workload
}

export interface RubricCriterion {
  id: string
  label: string
  whyItMatters: string
  /** Evaluates the player's final graph (and, if they ran it, the sim
   * result) to decide whether this criterion is met -- grounded in the
   * actual design, not a self-assessment checkbox. */
  check: (graph: SimGraph, result: SimResult | null) => boolean
}

export interface ReferenceArchitecture {
  summary: string[]
  keyDecisions: string[]
}

export interface DesignStage {
  brief: string[]
  /** No target graph and no fixed kind list here (unlike BuildStage) --
   * every case study gives the player whatever they've unlocked so far via
   * progressStore, same as Sandbox. */
  incidents?: IncidentWindow[]
  rubric: RubricCriterion[]
  referenceArchitecture: ReferenceArchitecture
}

export interface CaseStudy {
  id: string
  order: number
  title: string
  realConcept: string
  scenario: string[]
  requirements: RequirementsStage
  estimation: EstimationStage
  design: DesignStage
  interviewPhrase: string
}
