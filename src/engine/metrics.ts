// Pure math used by the simulator and directly unit-tested against the
// source README's own worked examples, so "the number on screen" is always
// traceable back to a formula in the book, not a made-up constant.

import type { SimGraph } from './types'

/** Two components in sequence: both must be up. Availability(total) = A * B. */
export function availabilitySeries(...availabilities: number[]): number {
  return availabilities.reduce((acc, a) => acc * a, 1)
}

/** Two components in parallel (redundant): only one needs to be up. */
export function availabilityParallel(...availabilities: number[]): number {
  const productOfFailures = availabilities.reduce((acc, a) => acc * (1 - a), 1)
  return 1 - productOfFailures
}

export interface WeightedSample {
  value: number
  weight: number
}

/**
 * Weighted percentile over a small set of (value, weight) samples — used to
 * turn per-segment latencies (each segment carrying a share of total rps)
 * into a p50/p99 for the tick without materializing millions of samples.
 */
export function weightedPercentile(samples: WeightedSample[], p: number): number {
  const positive = samples.filter((s) => s.weight > 0)
  if (positive.length === 0) return 0
  const sorted = [...positive].sort((a, b) => a.value - b.value)
  const totalWeight = sorted.reduce((acc, s) => acc + s.weight, 0)
  if (totalWeight <= 0) return 0
  const target = p * totalWeight
  let cumulative = 0
  for (const sample of sorted) {
    cumulative += sample.weight
    if (cumulative >= target) return sample.value
  }
  return sorted[sorted.length - 1].value
}

/**
 * The M/M/1-flavored blowup that makes "just under capacity" feel very
 * different from "just over" it: service time rises steeply as utilization
 * approaches 1, and is capped so the number stays finite for display/testing.
 */
export function serviceTimeMs(baseMs: number, utilization: number): number {
  const clamped = Math.min(Math.max(utilization, 0), 0.99)
  return baseMs / Math.max(0.05, 1 - clamped)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

const DEFAULT_SERVER_AVAILABILITY = 0.99
const DEFAULT_LB_AVAILABILITY = 0.999
const DEFAULT_DB_AVAILABILITY = 0.995

/**
 * Estimates whole-system uptime from the graph's static topology -- a
 * "reliability block diagram" walk, independent of any traffic run. A
 * fan-out from a load balancer to multiple servers is treated as a
 * redundant (parallel) block: any one surviving server can still serve
 * traffic. The load balancer's own availability then applies in series --
 * one dispatcher is a single point of failure no matter how many
 * redundant servers sit behind it. A plain chain (client -> single
 * server) is series composition throughout.
 */
export function computeSystemAvailability(graph: SimGraph): number {
  const outgoing = new Map<string, string[]>()
  for (const node of graph.nodes) outgoing.set(node.id, [])
  for (const edge of graph.edges) {
    if (outgoing.has(edge.source)) outgoing.get(edge.source)!.push(edge.target)
  }
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const clientNode = graph.nodes.find((n) => n.config.kind === 'client')
  if (!clientNode) return 1

  function walk(nodeId: string, visited: Set<string>): number {
    if (visited.has(nodeId)) return 1 // cycle guard; validateGraph rejects real cycles anyway
    const node = nodeById.get(nodeId)
    if (!node) return 1
    const nextVisited = new Set(visited).add(nodeId)
    const children = outgoing.get(nodeId) ?? []

    if (node.config.kind === 'client') {
      return children.length > 0 ? walk(children[0], nextVisited) : 1
    }

    if (node.config.kind === 'server') {
      const own = node.config.availability ?? DEFAULT_SERVER_AVAILABILITY
      // Servers are leaves in every v0.1 topology; series-compose forward
      // just in case content ever chains one server into another node.
      if (children.length === 0) return own
      return availabilitySeries(own, ...children.map((c) => walk(c, nextVisited)))
    }

    if (node.config.kind === 'loadBalancer') {
      const own = node.config.availability ?? DEFAULT_LB_AVAILABILITY
      if (children.length === 0) return own
      const branchAvailabilities = children.map((c) => walk(c, nextVisited))
      return availabilitySeries(own, availabilityParallel(...branchAvailabilities))
    }

    if (node.config.kind === 'cache') {
      // Not modeled for the Availability lesson's graphs (which use only
      // client/server/loadBalancer) -- treated as a pass-through so it
      // doesn't silently distort the number if ever mixed in.
      return children.length > 0 ? availabilitySeries(...children.map((c) => walk(c, nextVisited))) : 1
    }

    if (node.config.kind === 'database' || node.config.kind === 'replica') {
      const own = node.config.availability ?? DEFAULT_DB_AVAILABILITY
      if (children.length === 0) return own
      return availabilitySeries(own, ...children.map((c) => walk(c, nextVisited)))
    }

    if (node.config.kind === 'shardRouter') {
      // Approximation: modeled the same shape as a load balancer (its own
      // availability in series with a parallel composition of its shards),
      // even though in reality only the affected key range goes down if one
      // shard dies rather than the whole system -- this walk produces one
      // whole-system number, not a per-key-range one.
      const own = node.config.availability ?? DEFAULT_LB_AVAILABILITY
      if (children.length === 0) return own
      const branchAvailabilities = children.map((c) => walk(c, nextVisited))
      return availabilitySeries(own, availabilityParallel(...branchAvailabilities))
    }

    if (
      node.config.kind === 'queue' ||
      node.config.kind === 'service' ||
      node.config.kind === 'rateLimiter' ||
      node.config.kind === 'circuitBreaker'
    ) {
      // Same shape as `server`/`database`: a single chain, no fan-out
      // redundancy of its own. A circuit breaker's whole point is
      // resilience *behavior* (failing fast, recovering on its own
      // schedule), not redundancy -- it doesn't change how many
      // independent paths exist, so it composes the same way a plain
      // pass-through box would.
      const own = node.config.availability ?? DEFAULT_SERVER_AVAILABILITY
      if (children.length === 0) return own
      return availabilitySeries(own, ...children.map((c) => walk(c, nextVisited)))
    }

    if (node.config.kind === 'apiGateway') {
      // Approximation, same shape as shardRouter's: the gateway's own
      // availability in series with a parallel composition of what it
      // routes to.
      const own = node.config.availability ?? DEFAULT_LB_AVAILABILITY
      if (children.length === 0) return own
      const branchAvailabilities = children.map((c) => walk(c, nextVisited))
      return availabilitySeries(own, availabilityParallel(...branchAvailabilities))
    }

    if (node.config.kind === 'broker') {
      // NOT the shardRouter/gateway shape: a broker's subscribers each get
      // their own full copy to do their own distinct job (see Chapter III
      // · Publish-Subscribe) -- they aren't redundant replicas of each
      // other the way a load balancer's targets are, so losing one isn't
      // masked by the others surviving. Composed in series with every
      // subscriber instead, same shape as queue/service.
      const own = node.config.availability ?? DEFAULT_LB_AVAILABILITY
      if (children.length === 0) return own
      return availabilitySeries(own, ...children.map((c) => walk(c, nextVisited)))
    }

    return 1
  }

  return walk(clientNode.id, new Set())
}

/** Every node id reachable from the client by following edges forward.
 * Used so an unwired, decorative node (dropped on the canvas but never
 * connected to anything) can't count toward a topology-derived metric --
 * it was never part of the system a write would actually reach.
 *
 * A near-duplicate of this same BFS lives in game/rubricScoring.ts, kept
 * separate rather than shared across the engine/game boundary -- but the
 * two aren't quite identical: this one seeds from a single client node
 * (`.find`), rubricScoring's seeds from every client node (`.filter`).
 * They agree today because every graph has exactly one client, but this
 * engine already has region tags and multi-region incidents; if a
 * multi-client graph ever exists, update both or they'll silently
 * disagree on which nodes are reachable. */
function reachableNodeIds(graph: SimGraph): Set<string> {
  const clientNode = graph.nodes.find((n) => n.config.kind === 'client')
  if (!clientNode) return new Set()
  const outgoing = new Map<string, string[]>()
  for (const node of graph.nodes) outgoing.set(node.id, [])
  for (const edge of graph.edges) {
    if (outgoing.has(edge.source)) outgoing.get(edge.source)!.push(edge.target)
  }
  const visited = new Set<string>([clientNode.id])
  const queue = [clientNode.id]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const next of outgoing.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next)
        queue.push(next)
      }
    }
  }
  return visited
}

/**
 * Estimates the chance a write, once acknowledged, survives losing any one
 * node holding it (0..1) -- distinct from availability (can a READ be
 * served right now). A `database` node's own availability stands in for
 * "chance this copy exists after a crash." A **sync** `replica` counts as
 * an additional durable copy in parallel (the write reached it before being
 * acked); an **async** replica does not (it may not have the latest write
 * yet, so losing the primary can still lose data). Returns 1 (nothing to
 * lose) when the graph has no database/replica node at all.
 *
 * Only counts nodes actually reachable from the client -- an unwired
 * database dropped on the canvas but never connected to anything doesn't
 * count as a redundant copy just for existing (see reachableNodeIds).
 */
export function computeSystemDurability(graph: SimGraph): number {
  const reachable = reachableNodeIds(graph)
  const persistentNodes = graph.nodes.filter(
    (n) =>
      reachable.has(n.id) &&
      (n.config.kind === 'database' ||
        (n.config.kind === 'replica' && n.config.replicationMode === 'sync')),
  )
  if (persistentNodes.length === 0) return 1
  const survivalChances = persistentNodes.map(
    (n) => (n.config as { availability?: number }).availability ?? DEFAULT_DB_AVAILABILITY,
  )
  return availabilityParallel(...survivalChances)
}

