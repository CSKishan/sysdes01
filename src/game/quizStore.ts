// Session-local quiz practice tracking. Deliberately lightweight: a running
// per-topic score and session history, no spaced-repetition/drill-deck
// logic -- that's an explicitly deferred idea, not built here.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QuizSessionSummary {
  timestamp: number
  correct: number
  total: number
  byChapter: Record<string, { correct: number; total: number }>
}

export interface QuizState {
  sessions: QuizSessionSummary[]
  recordSession: (summary: Omit<QuizSessionSummary, 'timestamp'>) => void
  totalCorrect: () => number
  totalAnswered: () => number
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      sessions: [],
      recordSession: (summary) =>
        set((state) => ({ sessions: [...state.sessions, { ...summary, timestamp: Date.now() }] })),
      totalCorrect: () => get().sessions.reduce((acc, s) => acc + s.correct, 0),
      totalAnswered: () => get().sessions.reduce((acc, s) => acc + s.total, 0),
    }),
    { name: 'packet-and-post.quiz' },
  ),
)
