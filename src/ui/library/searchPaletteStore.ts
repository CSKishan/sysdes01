import { create } from 'zustand'

/** Open/closed state for the global SearchPalette, lifted out of the
 * component so a visible "Search" affordance anywhere in the app can open
 * it -- not just the Ctrl/Cmd-K shortcut, which a first-time user has no
 * way to discover. Not persisted: it's transient UI state. */
interface SearchPaletteState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useSearchPaletteStore = create<SearchPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
