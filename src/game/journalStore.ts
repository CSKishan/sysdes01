// The decision journal: an auto-accumulating log of the trade-off choices
// the player has made, in their own play history. By the later chapters
// this becomes a personal reference the player can browse and revise from.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JournalEntry } from '@/content/types'

export interface JournalState {
  entries: JournalEntry[]
  addEntry: (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => void
  clear: () => void
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
          ],
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'packet-and-post.journal',
      // See progressStore.ts for why both `version` and `migrate` are
      // required together -- without `migrate`, this discards every
      // existing player's journal instead of preserving it.
      version: 1,
      migrate: (persisted) => persisted as JournalState,
    },
  ),
)
