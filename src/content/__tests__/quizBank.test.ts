import { describe, expect, it } from 'vitest'
import { availableChapterOptions, buildQuizBank, shuffle } from '../quizBank'
import { ALL_LEVELS } from '../registry'

describe('buildQuizBank', () => {
  it('returns nothing when no levels are completed', () => {
    expect(buildQuizBank([])).toEqual([])
  })

  it('only includes questions from completed levels', () => {
    const someLevel = ALL_LEVELS.find((l) => (l.quizQuestions?.length ?? 0) > 0)!
    const bank = buildQuizBank([someLevel.id])
    expect(bank.length).toBe(someLevel.quizQuestions!.length)
    expect(bank.every((q) => q.levelId === someLevel.id)).toBe(true)
  })

  it('every authored level with quiz questions is reachable once completed', () => {
    const levelsWithQuestions = ALL_LEVELS.filter((l) => (l.quizQuestions?.length ?? 0) > 0)
    const allIds = ALL_LEVELS.map((l) => l.id)
    const bank = buildQuizBank(allIds)
    const totalAuthored = levelsWithQuestions.reduce((acc, l) => acc + l.quizQuestions!.length, 0)
    expect(bank.length).toBe(totalAuthored)
  })

  it('every quiz option has exactly one correct answer', () => {
    const allIds = ALL_LEVELS.map((l) => l.id)
    const bank = buildQuizBank(allIds)
    for (const q of bank) {
      const correctCount = q.options.filter((o) => o.correct).length
      expect(correctCount).toBe(1)
    }
  })
})

describe('availableChapterOptions', () => {
  it('excludes chapters with zero available questions', () => {
    expect(availableChapterOptions([])).toEqual([])
  })

  it('counts match the actual bank once levels are completed', () => {
    const allIds = ALL_LEVELS.map((l) => l.id)
    const options = availableChapterOptions(allIds)
    const bank = buildQuizBank(allIds)
    for (const option of options) {
      const expected = bank.filter((q) => q.chapterId === option.chapterId).length
      expect(option.questionCount).toBe(expected)
    }
  })
})

describe('shuffle', () => {
  it('preserves all elements', () => {
    const rng = () => 0.5
    const result = shuffle([1, 2, 3, 4, 5], rng)
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('is deterministic for a fixed rng sequence', () => {
    function makeRng() {
      let s = 0
      return () => {
        s = (s + 0.37) % 1
        return s
      }
    }
    const a = shuffle([1, 2, 3, 4, 5], makeRng())
    const b = shuffle([1, 2, 3, 4, 5], makeRng())
    expect(a).toEqual(b)
  })
})
