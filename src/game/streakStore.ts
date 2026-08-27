// Daily play streak (Phase 9.4). Recorded once per app load (App.tsx calls
// recordVisitToday on mount) -- "opened the app today" is the simplest
// honest proxy for "practiced today" this app can measure without a
// backend, and matches how most local-only streak trackers work.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function dayKey(ms: number): string {
  // A local-calendar-day key, not a UTC one -- so a streak doesn't break at
  // midnight UTC for a player nowhere near that timezone.
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** The calendar-day key for the day immediately after `ms`'s calendar day.
 * Built from year/month/date fields (which the Date constructor normalizes
 * correctly on overflow), not a flat +24h in epoch ms -- a fixed-ms
 * subtraction/addition is off by an hour on the two calendar days
 * straddling a DST transition (a 23h or 25h day), which can misjudge
 * "yesterday" right around the transition. */
function nextDayKey(ms: number): string {
  const d = new Date(ms)
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime())
}

export interface StreakState {
  currentStreakDays: number
  longestStreakDays: number
  lastVisitAt: number | null
  recordVisitToday: () => void
  clear: () => void
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastVisitAt: null,

      recordVisitToday: () => {
        const now = Date.now()
        const { lastVisitAt, currentStreakDays, longestStreakDays } = get()
        const today = dayKey(now)
        if (lastVisitAt !== null && dayKey(lastVisitAt) === today) return // already counted today

        // Yesterday, by calendar day rather than a flat 24h subtraction, so
        // a visit at 11pm followed by one at 1am the same "yesterday" ->
        // "today" transition still counts as consecutive, and a DST
        // transition day (23h or 25h long) doesn't misjudge the boundary.
        const wasYesterday = lastVisitAt !== null && nextDayKey(lastVisitAt) === today
        const nextStreak = wasYesterday ? currentStreakDays + 1 : 1
        set({
          currentStreakDays: nextStreak,
          longestStreakDays: Math.max(longestStreakDays, nextStreak),
          lastVisitAt: now,
        })
      },

      clear: () => set({ currentStreakDays: 0, longestStreakDays: 0, lastVisitAt: null }),
    }),
    {
      name: 'packet-and-post.streak',
      // See progressStore.ts for why both `version` and `migrate` are
      // required together -- without `migrate`, this discards every
      // existing player's streak instead of preserving it.
      version: 1,
      migrate: (persisted) => persisted as StreakState,
    },
  ),
)
