// Level content schema. Levels are authored as plain TypeScript data (not
// JSON), so `workload.trafficCurve` and similar fields can just be functions.

import type { ComponentKind, IncidentWindow, SimGraph, Workload } from '@/engine/types'

export interface ReadmeQuote {
  /** Verbatim text from the source README. Never paraphrased. */
  text: string
  /** e.g. "Chapter I · Caching" */
  source: string
}

export interface ComprehensionOption {
  id: string
  label: string
  correct: boolean
  feedback: string
}

export interface ComprehensionCheck {
  question: string
  options: ComprehensionOption[]
}

export interface SituationStage {
  kind: 'situation'
  title: string
  body: string[]
}

export interface DiagramStep {
  icon: string
  label: string
}

/** A tiny animated flow diagram: a dot travels through the labeled steps in
 * a loop. Reused across every Teach stage instead of authoring bespoke
 * animation per concept -- keeps lessons fast to write and fast to revise. */
export interface Diagram {
  steps: DiagramStep[]
  caption?: string
}

export interface TeachStage {
  kind: 'teach'
  title: string
  body: string[]
  diagram?: Diagram
  readmeQuote: ReadmeQuote
  realWorldExamples: string[]
  check: ComprehensionCheck
}

export interface GuidedStep {
  instruction: string
}

export interface SloTarget {
  maxP99Ms?: number
  maxErrorRate?: number
  maxCostPerHour?: number
  minAvgCacheHitRate?: number
  maxStaleReadRate?: number
  /** Guards against trivially "passing" by leaving the graph disconnected
   * (0 throughput often means 0 errors and 0 latency too). Set this to
   * comfortably below the workload's offered rps on every real level. */
  minThroughputRps?: number
  /** Minimum estimated system uptime, 0..1 (see computeSystemAvailability). */
  minAvailability?: number
  /** Minimum estimated write durability, 0..1 (see computeSystemDurability). */
  minDurability?: number
  /** p99 latency of write-opType traffic only -- only meaningful once
   * Workload.writeFraction > 0. */
  maxWriteP99Ms?: number
  /** Max authored replicationLagMs among the graph's async replica nodes. */
  maxReplicationLagMs?: number
  /** How lopsided the busiest shard's traffic is vs. an even split (1 =
   * perfectly even). Only meaningful once the graph has a shardRouter. */
  maxShardImbalance?: number
}

export interface DebriefContent {
  successBody: string[]
  failureBody: string[]
  readmeQuote: ReadmeQuote
  realWorldExamples: string[]
  interviewPhrase: string
  /** A one-line takeaway, written for the player's own decision journal. */
  ruleOfThumb: string
}

export interface DecisionOption {
  id: string
  label: string
  description: string
  /** Mutates the level's starting graph to reflect this choice's
   * consequences (e.g. picking "write-around" sets the cache's
   * staleFraction) before the player enters the build/run UI. */
  applyToGraph?: (graph: SimGraph) => SimGraph
}

export interface DecisionCard {
  prompt: string
  options: DecisionOption[]
}

export interface BuildStage {
  kind: 'build'
  mode: 'guided' | 'solo' | 'twist'
  title: string
  brief: string[]
  startingGraph: SimGraph
  unlockedKinds: ComponentKind[]
  workload: Workload
  incidents?: IncidentWindow[]
  slo: SloTarget
  guidedSteps?: GuidedStep[]
  decisionCard?: DecisionCard
  debrief: DebriefContent
  /** Pre-placed nodes (besides the client, which is always locked) that the
   * player can reconfigure but not delete -- e.g. the one depot in the
   * overload level, where the lesson is "turn its capacity up", not
   * "delete it and trivially pass with zero traffic". */
  lockedNodeIds?: string[]
}

export type LevelStage = SituationStage | TeachStage | BuildStage

export interface QuizOption {
  id: string
  label: string
  correct: boolean
  feedback: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
}

export interface Level {
  id: string
  chapterId: string
  order: number
  title: string
  realConcept: string
  analogyName: string
  stages: LevelStage[]
  /** Extra practice questions for Quiz mode, beyond the one comprehension
   * check seen while teaching. Only surfaced once the level is completed. */
  quizQuestions?: QuizQuestion[]
}

export interface Chapter {
  id: string
  order: number
  title: string
  subtitle: string
  levelIds: string[]
}

export interface JournalEntry {
  id: string
  levelId: string
  levelTitle: string
  timestamp: number
  situation: string
  choiceLabel: string
  outcomeSummary: string
  ruleDerived: string
}
