// Local best-record tracking for Challenge mode (Phase 9.5). Challenge mode
// already existed (progressStore.challengeUnlockedLevelIds); this just adds
// scoring beyond stars -- how fast you solved it, and how cheaply.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChallengeRecord {
  levelId: string
  /** Wall-clock time from entering the build canvas to a passing run. */
  bestElapsedMs: number
  /** The passing run's own reported cost -- cheapest passing design seen. */
  bestCostPerHour: number
  attempts: number
  lastPlayedAt: number
}

export interface LeaderboardState {
  recordsByLevelId: Record<string, ChallengeRecord>
  /** Records a completed Challenge attempt, keeping whichever of
   * elapsed/cost is better than what's already on file for this level --
   * the two bests aren't required to come from the same run, same as any
   * personal-best board (your fastest clear and your cheapest clear don't
   * have to be the same attempt). */
  recordAttempt: (levelId: string, elapsedMs: number, costPerHour: number) => void
  clear: () => void
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set) => ({
      recordsByLevelId: {},

      recordAttempt: (levelId, elapsedMs, costPerHour) => {
        set((state) => {
          const existing = state.recordsByLevelId[levelId]
          const record: ChallengeRecord = {
            levelId,
            bestElapsedMs: existing ? Math.min(existing.bestElapsedMs, elapsedMs) : elapsedMs,
            bestCostPerHour: existing ? Math.min(existing.bestCostPerHour, costPerHour) : costPerHour,
            attempts: (existing?.attempts ?? 0) + 1,
            lastPlayedAt: Date.now(),
          }
          return { recordsByLevelId: { ...state.recordsByLevelId, [levelId]: record } }
        })
      },

      clear: () => set({ recordsByLevelId: {} }),
    }),
    {
      name: 'packet-and-post.leaderboard',
      // See progressStore.ts for why both `version` and `migrate` are
      // required together -- without `migrate`, this discards every
      // existing player's records instead of preserving them.
      version: 1,
      migrate: (persisted) => persisted as LeaderboardState,
    },
  ),
)
