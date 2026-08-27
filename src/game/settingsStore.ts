// Small persisted user preferences that aren't campaign progress -- the
// reduced-motion toggle and the light/dark theme. Kept separate from
// progressStore since resetting progress should never reset a display
// preference.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

export interface SettingsState {
  reducedMotion: boolean
  setReducedMotion: (value: boolean) => void
  // Defaults to 'dark' -- the app's original, only look -- so upgrading
  // an existing browser to this version never changes anyone's rendered
  // colors without them opting in via Settings.
  theme: Theme
  setTheme: (value: Theme) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      reducedMotion: false,
      setReducedMotion: (value) => set({ reducedMotion: value }),
      theme: 'dark',
      setTheme: (value) => set({ theme: value }),
    }),
    {
      name: 'packet-and-post.settings',
      // Bump this and extend `migrate` whenever the persisted shape
      // changes, so an existing player's preferences survive an update
      // instead of silently resetting -- see progressStore.ts's identical
      // comment. zustand's persist middleware discards any mismatched
      // version with NO migrate function at all, so this passthrough is
      // required from the first bump onward, not just once a real shape
      // change happens.
      version: 1,
      migrate: (persisted) => persisted as SettingsState,
    },
  ),
)
