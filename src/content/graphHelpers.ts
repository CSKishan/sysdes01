// Tiny graph-authoring helpers shared by every chapter's content file.
// Kept deliberately minimal: only the two shapes that are genuinely
// identical everywhere (a client node, an edge). Per-component-kind
// helpers (server/database/replica/cache/...) stay local to whichever
// chapter file introduces them, since their default overrides differ
// chapter to chapter.

import type { GraphEdge, GraphNode } from '@/engine/types'

export function client(id = 'client', x = 60, y = 160): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x, y } }
}

export function edge(source: string, target: string): GraphEdge {
  return { id: `${source}=>${target}`, source, target }
}
