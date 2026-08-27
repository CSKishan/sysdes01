import { beforeEach, describe, expect, it } from 'vitest'
import { useStreakStore } from '../streakStore'
import { useLeaderboardStore } from '../leaderboardStore'

const DAY_MS = 24 * 60 * 60 * 1000

describe('streakStore', () => {
  beforeEach(() => useStreakStore.getState().clear())

  it('starts a streak at 1 on the first-ever visit', () => {
    useStreakStore.setState({ lastVisitAt: null, currentStreakDays: 0 })
    const now = Date.parse('2026-01-15T10:00:00')
    withFakeNow(now, () => useStreakStore.getState().recordVisitToday())
    expect(useStreakStore.getState().currentStreakDays).toBe(1)
  })

  it('does not double-count a second visit the same calendar day', () => {
    const firstVisit = Date.parse('2026-01-15T09:00:00')
    withFakeNow(firstVisit, () => useStreakStore.getState().recordVisitToday())
    const laterSameDay = Date.parse('2026-01-15T22:00:00')
    withFakeNow(laterSameDay, () => useStreakStore.getState().recordVisitToday())
    expect(useStreakStore.getState().currentStreakDays).toBe(1)
  })

  it('extends the streak on a visit the very next calendar day', () => {
    const day1 = Date.parse('2026-01-15T23:30:00') // late in the day
    withFakeNow(day1, () => useStreakStore.getState().recordVisitToday())
    const day2 = Date.parse('2026-01-16T00:30:00') // early the next day -- still "consecutive"
    withFakeNow(day2, () => useStreakStore.getState().recordVisitToday())
    expect(useStreakStore.getState().currentStreakDays).toBe(2)
  })

  it('resets to 1 (not 0) after skipping a day, and keeps the longest streak on record', () => {
    const day1 = Date.parse('2026-01-15T12:00:00')
    withFakeNow(day1, () => useStreakStore.getState().recordVisitToday())
    const day2 = day1 + DAY_MS
    withFakeNow(day2, () => useStreakStore.getState().recordVisitToday())
    expect(useStreakStore.getState().currentStreakDays).toBe(2)

    const dayAfterAGap = day1 + 5 * DAY_MS
    withFakeNow(dayAfterAGap, () => useStreakStore.getState().recordVisitToday())
    expect(useStreakStore.getState().currentStreakDays).toBe(1)
    expect(useStreakStore.getState().longestStreakDays).toBe(2)
  })
})

describe('leaderboardStore', () => {
  beforeEach(() => useLeaderboardStore.getState().clear())

  it('records a first attempt as both the best time and best cost', () => {
    useLeaderboardStore.getState().recordAttempt('ch1-l2', 90_000, 25)
    const record = useLeaderboardStore.getState().recordsByLevelId['ch1-l2']
    expect(record.bestElapsedMs).toBe(90_000)
    expect(record.bestCostPerHour).toBe(25)
    expect(record.attempts).toBe(1)
  })

  it("keeps each dimension's own best independently -- a slower-but-cheaper run still improves the cost record", () => {
    useLeaderboardStore.getState().recordAttempt('ch1-l2', 60_000, 40)
    useLeaderboardStore.getState().recordAttempt('ch1-l2', 120_000, 10)
    const record = useLeaderboardStore.getState().recordsByLevelId['ch1-l2']
    expect(record.bestElapsedMs).toBe(60_000) // from the first attempt
    expect(record.bestCostPerHour).toBe(10) // from the second attempt
    expect(record.attempts).toBe(2)
  })

  it('never regresses a record on a worse attempt', () => {
    useLeaderboardStore.getState().recordAttempt('ch1-l2', 60_000, 10)
    useLeaderboardStore.getState().recordAttempt('ch1-l2', 90_000, 20)
    const record = useLeaderboardStore.getState().recordsByLevelId['ch1-l2']
    expect(record.bestElapsedMs).toBe(60_000)
    expect(record.bestCostPerHour).toBe(10)
  })
})

/** Runs `fn` with Date.now() pinned to `now`, restoring it afterward --
 * lets these tests exercise streakStore's real calendar-day arithmetic
 * (dayKey) instead of the actual wall clock. */
function withFakeNow(now: number, fn: () => void) {
  const real = Date.now
  Date.now = () => now
  try {
    fn()
  } finally {
    Date.now = real
  }
}
