import { describe, expect, it } from 'vitest'
import { buildInterviewPhraseDeck } from '../interviewPhrases'
import { ALL_LEVELS } from '../registry'
import { CASE_STUDIES } from '../caseStudies/registry'
import type { BuildStage } from '../types'

describe('buildInterviewPhraseDeck', () => {
  it('is empty when nothing is completed', () => {
    expect(buildInterviewPhraseDeck([], [])).toEqual([])
  })

  it('only includes completed levels and case studies, never spoiling ones still locked', () => {
    const someLevel = ALL_LEVELS.find((l) => l.stages.some((s) => s.kind === 'build'))!
    const deck = buildInterviewPhraseDeck([someLevel.id], [])
    expect(deck).toHaveLength(1)
    expect(deck[0].id).toBe(someLevel.id)
    expect(deck[0].title).toBe(someLevel.title)
  })

  it("a completed level's card carries its last build stage's actual interview phrase", () => {
    const someLevel = ALL_LEVELS.find((l) => l.stages.some((s) => s.kind === 'build'))!
    const buildStages = someLevel.stages.filter((s): s is BuildStage => s.kind === 'build')
    const expectedPhrase = buildStages.at(-1)!.debrief.interviewPhrase

    const deck = buildInterviewPhraseDeck([someLevel.id], [])
    expect(deck[0].phrase).toBe(expectedPhrase)
  })

  it('a teach-only level (no build stage) contributes no card, instead of crashing', () => {
    const teachOnlyLevel = ALL_LEVELS.find((l) => !l.stages.some((s) => s.kind === 'build'))
    if (!teachOnlyLevel) return // every level currently has a build stage -- fine, nothing to assert
    const deck = buildInterviewPhraseDeck([teachOnlyLevel.id], [])
    expect(deck).toHaveLength(0)
  })

  it('includes completed case studies alongside levels', () => {
    const cs = CASE_STUDIES[0]
    const deck = buildInterviewPhraseDeck([], [cs.id])
    expect(deck).toHaveLength(1)
    expect(deck[0].phrase).toBe(cs.interviewPhrase)
  })

  it('every level with a build stage has a non-empty interview phrase to collect', () => {
    for (const level of ALL_LEVELS) {
      const buildStages = level.stages.filter((s): s is BuildStage => s.kind === 'build')
      const last = buildStages.at(-1)
      if (!last) continue
      expect(last.debrief.interviewPhrase.length, `${level.id} has an empty interview phrase`).toBeGreaterThan(0)
    }
  })
})
