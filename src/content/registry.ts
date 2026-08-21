// Aggregates every authored chapter and level into lookup structures the
// campaign shell can render generically, without hardcoding chapter names.

import type { Chapter, Level } from './types'
import { CHAPTER_0, CHAPTER_0_LEVELS } from './chapter0'
import { CHAPTER_1, CHAPTER_1_LEVELS } from './chapter1'

export const CHAPTERS: Chapter[] = [CHAPTER_0, CHAPTER_1].sort((a, b) => a.order - b.order)

export const ALL_LEVELS: Level[] = [...CHAPTER_0_LEVELS, ...CHAPTER_1_LEVELS]

const LEVEL_BY_ID = new Map(ALL_LEVELS.map((l) => [l.id, l]))

export function getLevel(id: string): Level | undefined {
  return LEVEL_BY_ID.get(id)
}

export function getLevelsForChapter(chapterId: string): Level[] {
  const chapter = CHAPTERS.find((c) => c.id === chapterId)
  if (!chapter) return []
  return chapter.levelIds.map((id) => LEVEL_BY_ID.get(id)).filter((l): l is Level => Boolean(l))
}

/** The full campaign in play order, flattened across chapters -- used to
 * decide which level unlocks next. */
export const LEVEL_SEQUENCE: string[] = CHAPTERS.flatMap((c) => c.levelIds)

export function isLevelUnlocked(levelId: string, completedLevelIds: string[]): boolean {
  const index = LEVEL_SEQUENCE.indexOf(levelId)
  if (index <= 0) return true
  const previousLevelId = LEVEL_SEQUENCE[index - 1]
  return completedLevelIds.includes(previousLevelId)
}
