// Case study completion: kept as its own store rather than folded into
// progressStore -- a rubric score isn't a star rating, case studies don't
// gate each other via a linear unlock chain the way levels do, and
// completing one shouldn't write into unlockedComponentKinds (case studies
// read that array, they don't grant new kinds). Mirrors progressStore's
// persist/migrate pattern.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CaseStudyProgressState {
  completedCaseStudyIds: string[]
  bestScorePercentByCaseStudyId: Record<string, number>

  isCaseStudyCompleted: (caseStudyId: string) => boolean
  completeCaseStudy: (caseStudyId: string, scorePercent: number) => void
  resetCaseStudyProgress: () => void
}

export const initialCaseStudyState = {
  completedCaseStudyIds: [] as string[],
  bestScorePercentByCaseStudyId: {} as Record<string, number>,
}

export const useCaseStudyProgressStore = create<CaseStudyProgressState>()(
  persist(
    (set, get) => ({
      ...initialCaseStudyState,

      isCaseStudyCompleted: (caseStudyId) => get().completedCaseStudyIds.includes(caseStudyId),

      completeCaseStudy: (caseStudyId, scorePercent) => {
        set((state) => {
          const alreadyDone = state.completedCaseStudyIds.includes(caseStudyId)
          const prevBest = state.bestScorePercentByCaseStudyId[caseStudyId] ?? 0
          return {
            completedCaseStudyIds: alreadyDone
              ? state.completedCaseStudyIds
              : [...state.completedCaseStudyIds, caseStudyId],
            bestScorePercentByCaseStudyId: {
              ...state.bestScorePercentByCaseStudyId,
              [caseStudyId]: Math.max(prevBest, scorePercent),
            },
          }
        })
      },

      resetCaseStudyProgress: () => set(initialCaseStudyState),
    }),
    {
      name: 'packet-and-post.case-studies',
      version: 1,
      migrate: (persisted) => persisted as CaseStudyProgressState,
    },
  ),
)
