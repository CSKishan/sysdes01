// Collects every completed level's + case study's interview phrase into one
// reviewable deck (Phase 9.3). Every debrief already produces one; this
// just gathers what's already authored rather than storing a separate copy.

import type { BuildStage } from './types'
import { ALL_LEVELS, CHAPTERS } from './registry'
import { CASE_STUDIES } from './caseStudies/registry'

export interface InterviewPhraseCard {
  id: string
  title: string
  chapterTitle: string
  phrase: string
}

/** A level can carry more than one build stage (guided -> solo -> twist);
 * they share one topic, so the last stage's debrief is treated as that
 * topic's definitive phrasing rather than collecting one card per stage. */
function lastBuildStage(stages: (typeof ALL_LEVELS)[number]['stages']): BuildStage | undefined {
  const buildStages = stages.filter((s): s is BuildStage => s.kind === 'build')
  return buildStages.at(-1)
}

export function buildInterviewPhraseDeck(completedLevelIds: string[], completedCaseStudyIds: string[]): InterviewPhraseCard[] {
  const completedLevels = new Set(completedLevelIds)
  const completedCaseStudies = new Set(completedCaseStudyIds)
  const chapterTitleById = new Map(CHAPTERS.map((c) => [c.id, c.title]))

  const levelCards: InterviewPhraseCard[] = ALL_LEVELS.filter((l) => completedLevels.has(l.id))
    .map((l) => {
      const stage = lastBuildStage(l.stages)
      if (!stage) return null
      return {
        id: l.id,
        title: l.title,
        chapterTitle: chapterTitleById.get(l.chapterId) ?? l.chapterId,
        phrase: stage.debrief.interviewPhrase,
      }
    })
    .filter((c): c is InterviewPhraseCard => c !== null)

  const caseStudyCards: InterviewPhraseCard[] = CASE_STUDIES.filter((cs) => completedCaseStudies.has(cs.id)).map((cs) => ({
    id: cs.id,
    title: cs.title,
    chapterTitle: 'Chapter V · Case Studies',
    phrase: cs.interviewPhrase,
  }))

  return [...levelCards, ...caseStudyCards]
}
