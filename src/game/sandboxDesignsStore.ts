// Named Sandbox designs (Phase 10.6) -- save the current canvas under a
// name, reload it later. Local-only, same as every other store here.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimGraph } from '@/engine/types'

export interface SavedDesign {
  id: string
  name: string
  graph: SimGraph
  savedAt: number
}

/** Shared by both places an externally-sourced graph can enter the app
 * (Sandbox's own "Import JSON", and a Settings backup restore): checks
 * enough of the shape that `flowAdapters.ts`'s `fromSimGraph` -- which
 * dereferences `n.config.kind` and `n.position` unconditionally, no
 * optional chaining -- won't throw and crash the canvas on a malformed
 * file. Not a full SimGraph validation (that's `runSimulation`'s own
 * validateGraph's job, surfaced as a real error message once the player
 * hits Run) -- just enough to survive being *rendered*. */
export function isValidSimGraph(value: unknown): value is SimGraph {
  if (!value || typeof value !== 'object') return false
  const graph = value as Record<string, unknown>
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return false
  for (const node of graph.nodes) {
    if (!node || typeof node !== 'object') return false
    const n = node as Record<string, unknown>
    const position = n.position as Record<string, unknown> | undefined
    const config = n.config as Record<string, unknown> | undefined
    if (typeof n.id !== 'string') return false
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') return false
    if (!config || typeof config.kind !== 'string') return false
  }
  for (const edge of graph.edges) {
    if (!edge || typeof edge !== 'object') return false
    const e = edge as Record<string, unknown>
    if (typeof e.id !== 'string' || typeof e.source !== 'string' || typeof e.target !== 'string') return false
  }
  return true
}

export interface SandboxDesignsState {
  designs: SavedDesign[]
  /** Overwrites an existing design with the same name if one exists,
   * rather than accumulating duplicates every time a player re-saves the
   * same in-progress idea under its working title. */
  saveDesign: (name: string, graph: SimGraph) => void
  deleteDesign: (id: string) => void
  /** Deliberately NOT called by Settings' "reset all progress" -- saved
   * designs are the player's own authored content, not progress. Kept
   * here (matching every other store's own `clear`) for the individual
   * "delete all my saved designs" affordance this doesn't have a UI for
   * yet, and so tests can reset state between cases the same way they do
   * for every other store. */
  clear: () => void
}

export const useSandboxDesignsStore = create<SandboxDesignsState>()(
  persist(
    (set) => ({
      designs: [],

      saveDesign: (name, graph) => {
        set((state) => {
          const existing = state.designs.find((d) => d.name === name)
          const saved: SavedDesign = { id: existing?.id ?? crypto.randomUUID(), name, graph, savedAt: Date.now() }
          return {
            designs: existing ? state.designs.map((d) => (d.id === saved.id ? saved : d)) : [...state.designs, saved],
          }
        })
      },

      deleteDesign: (id) => set((state) => ({ designs: state.designs.filter((d) => d.id !== id) })),

      clear: () => set({ designs: [] }),
    }),
    {
      name: 'packet-and-post.sandbox-designs',
      // See progressStore.ts for why both `version` and `migrate` are
      // required together -- without `migrate`, this discards every
      // existing player's saved designs instead of preserving them.
      version: 1,
      migrate: (persisted) => persisted as SandboxDesignsState,
    },
  ),
)
