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

    return 1
  }

  return walk(clientNode.id, new Set())
}

