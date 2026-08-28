import { describe, expect, it } from 'vitest'
import { QUALITY, sm2, type CardState } from '../spacedRepetitionStore'

const DAY_MS = 24 * 60 * 60 * 1000

function newCard(now: number): CardState {
  return { repetitions: 0, easeFactor: 2.5, intervalDays: 0, dueAt: now, lastReviewedAt: null }
}

describe('sm2', () => {
  it('schedules a brand-new card 1 day out on its first GOOD review', () => {
    const now = 1_000_000
    const next = sm2(newCard(now), QUALITY.GOOD, now)
    expect(next.repetitions).toBe(1)
    expect(next.intervalDays).toBe(1)
    expect(next.dueAt).toBe(now + DAY_MS)
  })

  it('schedules the second consecutive good review 6 days out, per the SM-2 spec', () => {
    const now = 1_000_000
    const first = sm2(newCard(now), QUALITY.GOOD, now)
    const second = sm2(first, QUALITY.GOOD, now + DAY_MS)
    expect(second.repetitions).toBe(2)
    expect(second.intervalDays).toBe(6)
  })

  it('grows the interval by the ease factor from the third review onward', () => {
    const now = 1_000_000
    let card = newCard(now)
    card = sm2(card, QUALITY.GOOD, now)
    card = sm2(card, QUALITY.GOOD, now)
    const third = sm2(card, QUALITY.GOOD, now)
    expect(third.repetitions).toBe(3)
    expect(third.intervalDays).toBe(Math.round(6 * card.easeFactor))
  })

  it('a lapse (AGAIN) resets repetitions and interval to "review tomorrow", regardless of prior progress', () => {
    const now = 1_000_000
    let card = newCard(now)
    card = sm2(card, QUALITY.GOOD, now)
    card = sm2(card, QUALITY.GOOD, now)
    card = sm2(card, QUALITY.EASY, now) // several good reviews deep, a long interval by now
    expect(card.intervalDays).toBeGreaterThan(6)

    const lapsed = sm2(card, QUALITY.AGAIN, now)
    expect(lapsed.repetitions).toBe(0)
    expect(lapsed.intervalDays).toBe(1)
    expect(lapsed.dueAt).toBe(now + DAY_MS)
  })

  it('ease factor rises on EASY and falls on HARD, and never drops below the SM-2 floor of 1.3', () => {
    const now = 1_000_000
    const afterEasy = sm2(newCard(now), QUALITY.EASY, now)
    const afterHard = sm2(newCard(now), QUALITY.HARD, now)
    expect(afterEasy.easeFactor).toBeGreaterThan(2.5)
    expect(afterHard.easeFactor).toBeLessThan(2.5)

    // Repeated HARD/AGAIN reviews should erode ease toward the floor, never past it.
    let card = newCard(now)
    for (let i = 0; i < 20; i++) card = sm2(card, QUALITY.AGAIN, now)
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3)
  })
})
