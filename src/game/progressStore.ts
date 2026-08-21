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

const initialState = {
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
    { name: 'packet-and-post.progress' },
  ),
)
