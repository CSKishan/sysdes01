// Campaign progress: which levels are done, how many stars, and which
// component kinds have been unlocked so far. Persisted to localStorage so
// progress survives a reload — there's no backend in this app.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ComponentKind } from '@/engine/types'

export type LevelStars = 0 | 1 | 2 | 3

export interface ProgressState {
  completedLevelIds: string[]
  starsByLevelId: Record<string, LevelStars>
  unlockedComponentKinds: ComponentKind[]
  /** Levels the player has finished at least once and can now replay Challenge-mode. */
  challengeUnlockedLevelIds: string[]

  isLevelCompleted: (levelId: string) => boolean
  isChallengeUnlocked: (levelId: string) => boolean
  completeLevel: (levelId: string, stars: LevelStars, newlyUnlocked: ComponentKind[]) => void
  resetProgress: () => void
}

// Exported so other code (e.g. Settings' import feature) can fall back to
// the same defaults a fresh install would have, instead of re-typing them.
export const initialState = {
  completedLevelIds: [] as string[],
  starsByLevelId: {} as Record<string, LevelStars>,
  unlockedComponentKinds: ['client'] as ComponentKind[],
  challengeUnlockedLevelIds: [] as string[],
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      isLevelCompleted: (levelId) => get().completedLevelIds.includes(levelId),
      isChallengeUnlocked: (levelId) => get().challengeUnlockedLevelIds.includes(levelId),

      completeLevel: (levelId, stars, newlyUnlocked) => {
        set((state) => {
          const alreadyDone = state.completedLevelIds.includes(levelId)
          const prevStars = state.starsByLevelId[levelId] ?? 0
          return {
            completedLevelIds: alreadyDone
              ? state.completedLevelIds
              : [...state.completedLevelIds, levelId],
            starsByLevelId: {
              ...state.starsByLevelId,
              [levelId]: (Math.max(prevStars, stars) as LevelStars),
            },
            unlockedComponentKinds: Array.from(
              new Set([...state.unlockedComponentKinds, ...newlyUnlocked]),
            ),
            challengeUnlockedLevelIds: state.challengeUnlockedLevelIds.includes(levelId)
              ? state.challengeUnlockedLevelIds
              : [...state.challengeUnlockedLevelIds, levelId],
          }
        })
      },

      resetProgress: () => set(initialState),
    }),
    {
      name: 'packet-and-post.progress',
      // Bump this and extend `migrate` whenever the persisted shape changes,
      // so existing players' progress survives an update instead of
      // silently resetting. Pre-v1 data (implicitly version 0, from before
      // this field existed) has the same shape as v1, so it just passes
      // through -- but zustand's persist middleware discards any mismatched
      // version with NO migrate function at all, so this passthrough is
      // required from the first bump onward, not just once a real shape
      // change happens.
      version: 1,
      migrate: (persisted) => persisted as ProgressState,
    },
  ),
)
