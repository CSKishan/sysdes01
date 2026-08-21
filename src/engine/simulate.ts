// The tick loop. This is the part of the game that has to be right: every
// number a player sees is produced here, not scripted per-level.
//
// Model: at each tick, offered traffic starts as one "segment" at the client
// node and flows through the graph in topological order. Nodes that split
// traffic (load balancer: routes to many servers; cache: resolves some
// fraction locally) turn one segment into several. A segment "terminates"
// when it reaches a node with nowhere further to go (a server that answers
// the request) or is resolved early (a cache hit). Terminated segments,
// weighted by their share of rps, become the tick's latency distribution.

import { predictedCacheHitRate } from './zipf'
import { computeSystemAvailability, serviceTimeMs, weightedPercentile, type WeightedSample } from './metrics'
import type {
  CacheConfig,
  GraphNode,
  IncidentWindow,
  LoadBalancerConfig,
  NodeTickMetric,
  ServerConfig,
  SimAggregate,
  SimGraph,
  SimResult,
  SimValidationError,
  TickSummary,
  Workload,
} from './types'
import { hashStringToSeed } from './rng'

interface Segment {
  rps: number
  latencyMs: number
}

const EPS = 1e-9

export function validateGraph(graph: SimGraph): SimValidationError[] {
  const errors: SimValidationError[] = []
  const nodeIds = new Set(graph.nodes.map((n) => n.id))

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push({
        type: 'danglingEdge',
        message: `Edge ${edge.id} references a node that doesn't exist.`,
        nodeIds: [edge.source, edge.target].filter((id) => !nodeIds.has(id)),
      })
    }
  }

  const clientNodes = graph.nodes.filter((n) => n.config.kind === 'client')
  if (clientNodes.length !== 1) {
    errors.push({
      type: 'noClient',
      message:
        clientNodes.length === 0
          ? 'The graph needs exactly one traffic source (Customers) to know where requests come from.'
          : 'The graph has more than one traffic source; only one is supported.',
      nodeIds: clientNodes.map((n) => n.id),
    })
  }

  const topo = topoSort(graph)
  if ('cycleNodeIds' in topo) {
    errors.push({
      type: 'cycle',
      message: 'The graph has a loop — requests would circle forever.',
      nodeIds: topo.cycleNodeIds,
    })
  }

  return errors
}

function topoSort(graph: SimGraph): { order: string[] } | { cycleNodeIds: string[] } {
  const inDegree = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0)
    outgoing.set(node.id, [])
  }
  for (const edge of graph.edges) {
    if (!outgoing.has(edge.source) || !inDegree.has(edge.target)) continue
    outgoing.get(edge.source)!.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id)

  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of outgoing.get(id) ?? []) {
      const remaining = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, remaining)
      if (remaining === 0) queue.push(next)
    }
  }

  if (order.length !== graph.nodes.length) {
    const visited = new Set(order)
    const cycleNodeIds = graph.nodes.map((n) => n.id).filter((id) => !visited.has(id))
    return { cycleNodeIds }
  }
  return { order }
}

function outgoingEdgesOf(graph: SimGraph, nodeId: string) {
  return graph.edges.filter((e) => e.source === nodeId)
}

function incomingRps(segments: Segment[] | undefined): number {
  if (!segments) return 0
  return segments.reduce((acc, s) => acc + s.rps, 0)
}

/** Static per-target weights for hash-based routing: deterministic but not
 * perfectly even, so a hash router can be visibly lumpier than round robin
 * even before Chapter II introduces the fix (virtual nodes / consistent hashing). */
function hashRoutingWeights(targetIds: string[]): number[] {
  const raw = targetIds.map((id) => 1 + (hashStringToSeed(id) % 60))
  const total = raw.reduce((a, b) => a + b, 0)
  return raw.map((w) => w / total)
}

function loadBalancerWeights(
  algorithm: LoadBalancerConfig['algorithm'],
  targets: GraphNode[],
): number[] {
  if (targets.length === 0) return []
  if (algorithm === 'hash') {
    return hashRoutingWeights(targets.map((t) => t.id))
  }
  if (algorithm === 'leastConnections') {
    const capacities = targets.map((t) =>
      t.config.kind === 'server' ? Math.max(t.config.capacityRps, 1) : 1,
    )
    const total = capacities.reduce((a, b) => a + b, 0)
    return capacities.map((c) => c / total)
  }
  // roundRobin: even split
  return targets.map(() => 1 / targets.length)
}

function activeIncidents(incidents: IncidentWindow[], tMs: number): IncidentWindow[] {
  return incidents.filter((i) => tMs >= i.startMs && tMs < i.endMs)
}

export interface RunOptions {
  graph: SimGraph
  workload: Workload
  incidents?: IncidentWindow[]
}

export function runSimulation({ graph, workload, incidents = [] }: RunOptions): SimResult {
  const errors = validateGraph(graph)
  const blocking = errors.filter((e) => e.type !== 'unreachable')
  if (blocking.length > 0) {
    throw new SimValidationException(blocking)
  }

  const topo = topoSort(graph) as { order: string[] }
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const ticks: TickSummary[] = []
  const nodeTicks: NodeTickMetric[] = []

  // Running accumulators for the final aggregate.
  const allTerminated: WeightedSample[] = []
  let totalOffered = 0
  let totalErrors = 0
  let totalCompleted = 0
  let totalStale = 0
  const cacheHitSamples: WeightedSample[] = []
  const utilizationByNode = new Map<string, { sum: number; max: number; count: number }>()

  const clientNode = graph.nodes.find((n) => n.config.kind === 'client')!

  for (let tMs = 0; tMs < workload.durationMs; tMs += workload.tickMs) {
    const incidentsNow = activeIncidents(incidents, tMs)
    const trafficMultiplier = incidentsNow.reduce(
      (acc, i) => acc * (i.trafficMultiplier ?? 1),
      1,
    )
    const killedNodeIds = new Set(incidentsNow.flatMap((i) => i.killNodeIds ?? []))
    const offeredRps = Math.max(0, workload.trafficCurve(tMs) * trafficMultiplier)

    const arrivals = new Map<string, Segment[]>()
    arrivals.set(clientNode.id, [{ rps: offeredRps, latencyMs: 0 }])

    const terminatedThisTick: WeightedSample[] = []
    let errorRpsThisTick = 0

    for (const nodeId of topo.order) {
      const node = nodeById.get(nodeId)!
      const incoming = arrivals.get(nodeId)
      const totalInbound = incomingRps(incoming)
      const outEdges = outgoingEdgesOf(graph, nodeId)

      if (node.config.kind === 'client') {
        for (const edge of outEdges) {
          const list = arrivals.get(edge.target) ?? []
          list.push(...(incoming ?? []))
          arrivals.set(edge.target, list)
        }
        nodeTicks.push({
          nodeId,
          tMs,
          inboundRps: totalInbound,
          utilization: 0,
          serviceMs: 0,
          errorRps: 0,
        })
        continue
      }

      if (node.config.kind === 'server') {
        const cfg = node.config as ServerConfig
        const effectiveCapacity = killedNodeIds.has(nodeId) ? 0 : cfg.capacityRps
        const utilization = effectiveCapacity > 0 ? totalInbound / effectiveCapacity : totalInbound > 0 ? 1 : 0
        const serviceMs = effectiveCapacity > 0 ? serviceTimeMs(cfg.baseMs, utilization) : cfg.baseMs
        const errorRps = Math.max(0, totalInbound - effectiveCapacity)
        const survivingFraction = totalInbound > EPS ? Math.max(0, 1 - errorRps / totalInbound) : 1

        errorRpsThisTick += errorRps

        for (const seg of incoming ?? []) {
          const survivingRps = seg.rps * survivingFraction
          if (survivingRps <= EPS) continue
          const newSeg: Segment = { rps: survivingRps, latencyMs: seg.latencyMs + serviceMs }
          if (outEdges.length === 0) {
            terminatedThisTick.push({ value: newSeg.latencyMs, weight: newSeg.rps })
          } else {
            for (const edge of outEdges) {
              const list = arrivals.get(edge.target) ?? []
              list.push(newSeg)
              arrivals.set(edge.target, list)
            }
          }
        }

        const stats = utilizationByNode.get(nodeId) ?? { sum: 0, max: 0, count: 0 }
        stats.sum += utilization
        stats.max = Math.max(stats.max, utilization)
        stats.count += 1
        utilizationByNode.set(nodeId, stats)

        nodeTicks.push({ nodeId, tMs, inboundRps: totalInbound, utilization, serviceMs, errorRps })
        continue
      }

      if (node.config.kind === 'loadBalancer') {
        const cfg = node.config as LoadBalancerConfig
        const targets = outEdges.map((e) => nodeById.get(e.target)!).filter(Boolean)
        const weights = loadBalancerWeights(cfg.algorithm, targets)
        const dispatchMs = 1

        outEdges.forEach((edge, i) => {
          const weight = weights[i] ?? 0
          for (const seg of incoming ?? []) {
            const list = arrivals.get(edge.target) ?? []
            list.push({ rps: seg.rps * weight, latencyMs: seg.latencyMs + dispatchMs })
            arrivals.set(edge.target, list)
          }
        })

        nodeTicks.push({
          nodeId,
          tMs,
          inboundRps: totalInbound,
          utilization: 0,
          serviceMs: dispatchMs,
          errorRps: 0,
        })
        continue
      }

      if (node.config.kind === 'cache') {
        const cfg = node.config as CacheConfig
        const hitRate = predictedCacheHitRate(cfg.keyspaceSize, cfg.zipfS, cfg.capacitySlots)

        const staleFraction = cfg.staleFraction ?? 0

        for (const seg of incoming ?? []) {
          const hitRps = seg.rps * hitRate
          const missRps = seg.rps - hitRps
          if (hitRps > EPS) {
            terminatedThisTick.push({
              value: seg.latencyMs + cfg.hitMs,
              weight: hitRps,
            })
            if (staleFraction > 0) {
              totalStale += hitRps * staleFraction
            }
          }
          if (missRps > EPS) {
            const missSeg: Segment = {
              rps: missRps,
              latencyMs: seg.latencyMs + cfg.missOverheadMs,
            }
            if (outEdges.length === 0) {
              terminatedThisTick.push({ value: missSeg.latencyMs, weight: missSeg.rps })
            } else {
              for (const edge of outEdges) {
                const list = arrivals.get(edge.target) ?? []
                list.push(missSeg)
                arrivals.set(edge.target, list)
              }
            }
          }
        }

        if (totalInbound > EPS) {
          cacheHitSamples.push({ value: hitRate, weight: totalInbound })
        }

        nodeTicks.push({
          nodeId,
          tMs,
          inboundRps: totalInbound,
          utilization: hitRate,
          serviceMs: cfg.hitMs,
          errorRps: 0,
          cacheHitRate: hitRate,
        })
        continue
      }
    }

    const completedRps = terminatedThisTick.reduce((acc, s) => acc + s.weight, 0)
    totalOffered += offeredRps
    totalErrors += errorRpsThisTick
    totalCompleted += completedRps
    allTerminated.push(...terminatedThisTick)

    ticks.push({
      tMs,
      offeredRps,
      completedRps,
      errorRps: errorRpsThisTick,
      p50Ms: weightedPercentile(terminatedThisTick, 0.5),
      p99Ms: weightedPercentile(terminatedThisTick, 0.99),
    })
  }

  const costPerHour = graph.nodes.reduce((acc, n) => {
    if (n.config.kind === 'server' || n.config.kind === 'loadBalancer' || n.config.kind === 'cache') {
      return acc + n.config.costPerHour
    }
    return acc
  }, 0)

  let bottleneckNodeId: string | null = null
  let bottleneckAvg = -1
  let maxUtilization = 0
  for (const [nodeId, stats] of utilizationByNode) {
    const avg = stats.count > 0 ? stats.sum / stats.count : 0
    if (avg > bottleneckAvg) {
      bottleneckAvg = avg
      bottleneckNodeId = nodeId
    }
    maxUtilization = Math.max(maxUtilization, stats.max)
  }

  const aggregate: SimAggregate = {
    p50Ms: weightedPercentile(allTerminated, 0.5),
    p99Ms: weightedPercentile(allTerminated, 0.99),
    throughputRps: ticks.length > 0 ? totalCompleted / ticks.length : 0,
    errorRate: totalOffered > EPS ? totalErrors / totalOffered : 0,
    costPerHour,
    avgCacheHitRate:
      cacheHitSamples.length > 0 ? weightedPercentile(cacheHitSamples, 0.5) : null,
    staleReadRate: totalCompleted > EPS ? totalStale / totalCompleted : 0,
    availability: computeSystemAvailability(graph),
    maxUtilization,
    bottleneckNodeId,
  }

  return { ticks, nodeTicks, aggregate }
}

export class SimValidationException extends Error {
  errors: SimValidationError[]
  constructor(errors: SimValidationError[]) {
    super(errors.map((e) => e.message).join(' '))
    this.errors = errors
  }
}
