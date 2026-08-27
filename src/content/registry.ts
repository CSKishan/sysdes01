// Aggregates every authored chapter and level into lookup structures the
// campaign shell can render generically, without hardcoding chapter names.

import type { Chapter, Level } from './types'
import { CHAPTER_0, CHAPTER_0_LEVELS } from './chapter0'
import { CHAPTER_1, CHAPTER_1_LEVELS } from './chapter1'
import { CHAPTER_2, CHAPTER_2_LEVELS } from './chapter2'
import { CHAPTER_3, CHAPTER_3_LEVELS } from './chapter3'
import { CHAPTER_4, CHAPTER_4_LEVELS } from './chapter4'
import { CHAPTER_5, CHAPTER_5_LEVELS } from './chapter5'

export const CHAPTERS: Chapter[] = [CHAPTER_0, CHAPTER_1, CHAPTER_2, CHAPTER_3, CHAPTER_4, CHAPTER_5].sort(
  (a, b) => a.order - b.order,
)

export const ALL_LEVELS: Level[] = [
  ...CHAPTER_0_LEVELS,
  ...CHAPTER_1_LEVELS,
  ...CHAPTER_2_LEVELS,
  ...CHAPTER_3_LEVELS,
  ...CHAPTER_4_LEVELS,
  ...CHAPTER_5_LEVELS,
]

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

export interface TopicNeighbors {
  before?: Level
  after?: Level
  seeAlso: Level[]
}

/** Derived "before this / next / see also" for a Library topic page --
 * from chapter order rather than a hand-authored graph, since every level
 * already carries a chapter and a position within it. `seeAlso` is capped
 * at 4 so it stays a quick glance, not a second nav menu. */
export function getTopicNeighbors(levelId: string): TopicNeighbors {
  const level = getLevel(levelId)
  if (!level) return { seeAlso: [] }
  const siblings = getLevelsForChapter(level.chapterId)
  const index = siblings.findIndex((l) => l.id === levelId)
  const seeAlso = siblings.filter((l, i) => l.id !== levelId && Math.abs(i - index) <= 2).slice(0, 4)
  return {
    before: index > 0 ? siblings[index - 1] : undefined,
    after: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined,
    seeAlso,
  }
}
