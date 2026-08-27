// Scores a case study's open-ended design against a checklist, instead of
// scoring.ts's binary SLO pass/fail -- a rubric criterion is "did the design
// address this concern," not "is this measured number on the right side of
// a target." Kept separate from scoring.ts rather than folding in: SloCheck
// is built entirely around a continuous ratio against one authored
// threshold, which doesn't represent "checked this box or didn't."

import type { SimGraph, SimResult } from '@/engine/types'
import type { RubricCriterion } from '@/content/caseStudies/types'

export interface RubricItemResult {
  id: string
  label: string
  whyItMatters: string
  met: boolean
}

export interface RubricResult {
  items: RubricItemResult[]
  metCount: number
  totalCount: number
  scorePercent: number
  tier: 'strong' | 'solid' | 'needsWork'
}

export function scoreRubric(graph: SimGraph, result: SimResult | null, criteria: RubricCriterion[]): RubricResult {
  const items = criteria.map((c) => ({
    id: c.id,
    label: c.label,
    whyItMatters: c.whyItMatters,
    met: c.check(graph, result),
  }))
  const metCount = items.filter((i) => i.met).length
  const totalCount = items.length
  const scorePercent = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0
  const tier: RubricResult['tier'] = scorePercent >= 80 ? 'strong' : scorePercent >= 50 ? 'solid' : 'needsWork'
  return { items, metCount, totalCount, scorePercent, tier }
}

/** Shared helper for rubric checks: does the graph contain a node of this kind.
 * Presence-only -- doesn't require the node to be wired to anything. Prefer
 * `hasConnectedNodeKind` for rubric criteria that are meant to reward an
 * actually-integrated component, not a decoration dropped on the canvas. */
export function hasNodeKind(graph: SimGraph, kind: string): boolean {
  return graph.nodes.some((n) => n.config.kind === kind)
}

/** Shared helper: does the graph contain at least `count` nodes of this kind
 * (e.g. "more than one database" as a sharding/redundancy signal).
 * Presence-only, same caveat as `hasNodeKind` -- prefer
 * `countConnectedNodeKind` when wiring matters. */
export function countNodeKind(graph: SimGraph, kind: string): number {
  return graph.nodes.filter((n) => n.config.kind === kind).length
}

/** Every node reachable from a client node by following edges in their
 * request-flow direction (source -> target). The basis for the "connected"
 * rubric helpers below -- a node dropped on the canvas with no edges to it
 * is never in this set, regardless of its kind. */
function reachableNodeIds(graph: SimGraph): Set<string> {
  const clientIds = graph.nodes.filter((n) => n.config.kind === 'client').map((n) => n.id)
  const visited = new Set<string>(clientIds)
  const queue = [...clientIds]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of graph.edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target)
        queue.push(edge.target)
      }
    }
  }
  return visited
}

/** Like `hasNodeKind`, but only counts a node if it's actually reachable
 * from a client via wired edges -- an unconnected cache/rate-limiter/etc.
 * dropped on the canvas for decoration doesn't satisfy this. */
export function hasConnectedNodeKind(graph: SimGraph, kind: string): boolean {
  const reachable = reachableNodeIds(graph)
  return graph.nodes.some((n) => n.config.kind === kind && reachable.has(n.id))
}

/** Like `countNodeKind`, but only counts reachable (wired-in) nodes. */
export function countConnectedNodeKind(graph: SimGraph, kind: string): number {
  const reachable = reachableNodeIds(graph)
  return graph.nodes.filter((n) => n.config.kind === kind && reachable.has(n.id)).length
}

/** A low error rate alone is a trap: a completely disconnected graph (no
 * edges out of the client) also reports 0% error, since nothing was ever
 * attempted downstream -- the same trivially-passing-when-empty failure
 * mode SloTarget.minThroughputRps's own doc comment warns about. Pairs a
 * low error rate with actually completing a meaningful share of what was
 * offered, so an empty or disconnected design can't pass by doing nothing.
 *
 * Uses the mean offered rps across every tick, not just tick 0 -- every
 * shipped case study's workload is a constant curve today (tick 0 already
 * equals the mean), but a mean is correct regardless of curve shape, so a
 * future ramp/spike-based workload can't silently mis-score against
 * whatever rps happened to be offered at the very first tick. */
export function meetsLoad(result: SimResult | null, maxErrorRate = 0.1, minThroughputFraction = 0.5): boolean {
  if (!result || result.ticks.length === 0) return false
  const offeredRps = result.ticks.reduce((sum, t) => sum + t.offeredRps, 0) / result.ticks.length
  if (offeredRps <= 0) return false
  return result.aggregate.errorRate < maxErrorRate && result.aggregate.throughputRps >= offeredRps * minThroughputFraction
}
