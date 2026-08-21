// Assembles the practice-question pool from every level's authored
// quizQuestions, filtered to only topics the player has actually
// completed -- so Quiz mode stays an honest study tool, not a spoiler.

import type { QuizQuestion } from './types'
import { ALL_LEVELS, CHAPTERS } from './registry'

export interface QuizBankEntry extends QuizQuestion {
  levelId: string
  levelTitle: string
  chapterId: string
}

export function buildQuizBank(completedLevelIds: string[]): QuizBankEntry[] {
  const completed = new Set(completedLevelIds)
  return ALL_LEVELS.filter((l) => completed.has(l.id) && l.quizQuestions?.length).flatMap((l) =>
    (l.quizQuestions ?? []).map((q) => ({
      ...q,
      levelId: l.id,
      levelTitle: l.title,
      chapterId: l.chapterId,
    })),
  )
}

export interface QuizChapterOption {
  chapterId: string
  title: string
  questionCount: number
}

export function availableChapterOptions(completedLevelIds: string[]): QuizChapterOption[] {
  const bank = buildQuizBank(completedLevelIds)
  return CHAPTERS.map((c) => ({
    chapterId: c.id,
    title: c.title,
    questionCount: bank.filter((q) => q.chapterId === c.id).length,
  })).filter((c) => c.questionCount > 0)
}

/** Fisher-Yates, using the engine's own PRNG so quiz order stays testable. */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
