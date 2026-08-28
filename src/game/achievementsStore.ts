// Tracks which achievements (content/achievements.ts) are unlocked, plus a
// running count of completed simulation runs (several achievements are
// milestone-based, e.g. "ran 10 simulations") and a small transient queue
// of just-unlocked ids for the toast banner to drain.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACHIEVEMENTS, type AchievementContext } from '@/content/achievements'

export interface AchievementsState {
  unlockedIds: string[]
  unlockedAtById: Record<string, number>
  totalRunsCompleted: number
  /** Ids unlocked since AchievementToast last popped one off -- shown one
   * at a time, oldest first, then removed. Never persisted across a reload
   * (see `partialize` below), so a freshly-unlocked achievement shows at
   * most once. */
  justUnlocked: string[]
  /** Bumps totalRunsCompleted, checks every achievement against the run
   * that just finished, and unlocks any newly-met ones. Call once per
   * completed simulation run, from wherever runSimulation is actually
   * invoked (useSimulationPlayback), so every screen that can run a
   * simulation shares the same detection point instead of each
   * reimplementing it. */
  checkAfterRun: (ctx: Omit<AchievementContext, 'totalRunsCompleted'>) => void
  clear: () => void
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlockedIds: [],
      unlockedAtById: {},
      totalRunsCompleted: 0,
      justUnlocked: [],

      checkAfterRun: (ctxWithoutCount) => {
        const totalRunsCompleted = get().totalRunsCompleted + 1
        const ctx: AchievementContext = { ...ctxWithoutCount, totalRunsCompleted }
        const alreadyUnlocked = new Set(get().unlockedIds)
        const newlyUnlocked = ACHIEVEMENTS.filter((a) => !alreadyUnlocked.has(a.id) && a.check(ctx)).map((a) => a.id)

        if (newlyUnlocked.length === 0) {
          set({ totalRunsCompleted })
          return
        }
        const now = Date.now()
        set((state) => ({
          totalRunsCompleted,
          unlockedIds: [...state.unlockedIds, ...newlyUnlocked],
          unlockedAtById: {
            ...state.unlockedAtById,
            ...Object.fromEntries(newlyUnlocked.map((id) => [id, now])),
          },
          justUnlocked: [...state.justUnlocked, ...newlyUnlocked],
        }))
      },

      clear: () => set({ unlockedIds: [], unlockedAtById: {}, totalRunsCompleted: 0, justUnlocked: [] }),
    }),
    {
      name: 'packet-and-post.achievements',
      // See progressStore.ts for why both `version` and `migrate` are
      // required together -- without `migrate`, this discards every
      // existing player's unlocked achievements instead of preserving them.
      version: 1,
      migrate: (persisted) => persisted as AchievementsState,
      // justUnlocked is a transient UI signal, not something that should
      // survive a reload as if it just happened again -- a player reopening
      // the tab shouldn't see a stale toast for something they already saw.
      partialize: (state) => ({ ...state, justUnlocked: [] }),
    },
  ),
)
