import { describe, expect, it } from 'vitest'
import { availableChapterOptions, buildQuizBank, quizCardId, shuffle } from '../quizBank'
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

describe('quizCardId', () => {
  it('is globally unique across the whole question bank, unlike the raw QuizQuestion id alone', () => {
    // Every level's own quizQuestions reuse the same local ids (q1, q2, ...)
    // -- quizCardId exists specifically because bare `entry.id` collides
    // across levels and can't be used as a spaced-repetition card key.
    const allIds = ALL_LEVELS.map((l) => l.id)
    const bank = buildQuizBank(allIds)
    const rawIds = new Set(bank.map((q) => q.id))
    expect(rawIds.size, 'expected raw ids to actually collide across levels (sanity check)').toBeLessThan(bank.length)

    const cardIds = bank.map((q) => quizCardId(q))
    expect(new Set(cardIds).size).toBe(bank.length)
  })

  it('two different levels sharing a raw question id get different card ids', () => {
    const allIds = ALL_LEVELS.map((l) => l.id)
    const bank = buildQuizBank(allIds)
    const q1s = bank.filter((q) => q.id === 'q1')
    expect(q1s.length).toBeGreaterThan(1) // sanity check the collision exists at all
    const [a, b] = q1s
    expect(quizCardId(a)).not.toBe(quizCardId(b))
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
