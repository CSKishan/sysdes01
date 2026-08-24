// Small persisted user preferences that aren't campaign progress -- right
// now just the reduced-motion toggle. Kept separate from progressStore
// since resetting progress should never reset a display preference.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingsState {
  reducedMotion: boolean
  setReducedMotion: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      reducedMotion: false,
      setReducedMotion: (value) => set({ reducedMotion: value }),
    }),
    { name: 'packet-and-post.settings', version: 1 },
  ),
)
