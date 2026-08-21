// The tick loop. This is the part of the game that has to be right: every
// number a player sees is produced here, not scripted per-level.
//
// Model: at each tick, offered traffic starts as one or two "segments" at
// the client node (split into read/write by Workload.writeFraction) and
// flows through the graph in topological order. Nodes that split traffic
// (load balancer: routes to many servers; cache/replica: resolves some
// fraction locally; shard router: routes by key) turn one segment into
// several. A segment "terminates" when it reaches a node with nowhere
// further to go (a server/database that answers the request) or is
// resolved early (a cache hit, a replica read). Terminated segments,
// weighted by their share of rps, become the tick's latency distribution.

import { predictedCacheHitRate, zipfProbabilities } from './zipf'
import { buildRing, keyPosition, moduloOwner, ownerOnRing } from './consistentHash'
import {
  computeSystemAvailability,
  computeSystemDurability,
  serviceTimeMs,
  weightedPercentile,
  type WeightedSample,
} from './metrics'
import type {
  CacheConfig,
  DatabaseConfig,
  GraphEdge,
  GraphNode,
  IncidentWindow,
  LoadBalancerConfig,
  NodeTickMetric,
  OpType,
  ReplicaConfig,
  ServerConfig,
  ShardRouterConfig,
  SimAggregate,
  SimGraph,
  SimResult,
  SimValidationError,
  TickSummary,
  Workload,
} from './types'
import { INDEX_READ_SPEEDUP, INDEX_WRITE_OVERHEAD } from './types'
import { hashStringToSeed } from './rng'

interface Segment {
  rps: number
  latencyMs: number
  opType: OpType
}

const EPS = 1e-9
/** Small fixed cost for a pure pass-through hop (a load balancer dispatch,
 * a cache/replica forwarding a write past itself) -- every hop costs
 * something, consistent with the load balancer's existing dispatchMs. */
const PASS_THROUGH_MS = 1

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

/** Outgoing edges of a node, minus any severed by an active network-
 * partition incident this tick. */
function activeOutgoingEdges(graph: SimGraph, nodeId: string, severedEdgeIds: Set<string>) {
  return graph.edges.filter((e) => e.source === nodeId && !severedEdgeIds.has(e.id))
}

function incomingRps(segments: Segment[] | undefined): number {
  if (!segments) return 0
  return segments.reduce((acc, s) => acc + s.rps, 0)
}

/** The one shared shape behind every node kind that can terminate or
 * forward a segment (server, database, replica, cache, shard router dead-
 * ends): apply survival/latency, then either land it in this tick's
 * terminated set (recording it as a completed write too, if it is one) or
 * fan it out across whatever it's wired to next. Pulled out once these
 * five near-identical copies started needing independent auditing to
 * confirm each one was still correct. */
function settleSegment(
  seg: Segment,
  survivingFraction: number,
  addedLatencyMs: number,
  outEdges: GraphEdge[],
  arrivals: Map<string, Segment[]>,
  terminatedThisTick: WeightedSample[],
  allTerminatedWrites: WeightedSample[],
): void {
  const survivingRps = seg.rps * survivingFraction
  if (survivingRps <= EPS) return
  const newSeg: Segment = { ...seg, rps: survivingRps, latencyMs: seg.latencyMs + addedLatencyMs }
  if (outEdges.length === 0) {
    terminatedThisTick.push({ value: newSeg.latencyMs, weight: newSeg.rps })
    if (newSeg.opType === 'write') allTerminatedWrites.push({ value: newSeg.latencyMs, weight: newSeg.rps })
  } else {
    for (const edge of outEdges) {
      const list = arrivals.get(edge.target) ?? []
      list.push(newSeg)
      arrivals.set(edge.target, list)
    }
  }
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

/** Per-child traffic-share weights for a shard router: buckets each rank of
 * a Zipf-skewed keyspace onto a child by strategy, then sums each child's
 * probability mass. Reusing the cache's Zipf machinery this way is what
 * makes a hot key concentrate deterministically on ONE shard instead of
 * spreading evenly -- the actual "hot shard" failure mode, not a synthetic
 * unevenness. Note this does NOT model consistent hashing's real benefit
 * (cheap rebalancing on resize) -- see consistentHash.ts for that. */
function shardRoutingWeights(cfg: ShardRouterConfig, childCount: number): number[] {
  if (childCount === 0) return []
  const probs = zipfProbabilities(cfg.keyspaceSize, cfg.zipfS)
  if (probs.length === 0) {
    // No usable keyspace (e.g. an authoring mistake: keyspaceSize <= 0) --
    // fall back to an even split rather than silently routing 0% of
    // traffic everywhere, which would vanish from the tick's accounting
    // instead of registering as either completed or errored.
    return new Array<number>(childCount).fill(1 / childCount)
  }
  const weights = new Array<number>(childCount).fill(0)
  // Build the consistent-hash ring once per call (it only depends on
  // childCount, fixed for this call) instead of once per rank -- was
  // rebuilding it up to `keyspaceSize` times here before this fix.
  const ring = cfg.strategy === 'consistentHash' ? buildRing(childCount) : null
  for (let rank = 0; rank < probs.length; rank++) {
    const owner =
      cfg.strategy === 'consistentHash' ? ownerOnRing(ring!, keyPosition(rank)) : moduloOwner(childCount, rank)
    weights[owner] += probs[rank]
  }
  return weights
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
  const allTerminatedWrites: WeightedSample[] = []
  let totalOffered = 0
  let totalErrors = 0
  let totalCompleted = 0
  let totalStale = 0
  const cacheHitSamples: WeightedSample[] = []
  const utilizationByNode = new Map<string, { sum: number; max: number; count: number }>()
  // routerId -> childId -> running inbound stats, used for maxShardImbalance.
  const shardChildStats = new Map<string, Map<string, { sum: number; count: number }>>()

  const clientNode = graph.nodes.find((n) => n.config.kind === 'client')!
  const writeFraction = Math.min(Math.max(workload.writeFraction ?? 0, 0), 1)

  for (let tMs = 0; tMs < workload.durationMs; tMs += workload.tickMs) {
    const incidentsNow = activeIncidents(incidents, tMs)
    const trafficMultiplier = incidentsNow.reduce(
      (acc, i) => acc * (i.trafficMultiplier ?? 1),
      1,
    )
    const killedNodeIds = new Set(incidentsNow.flatMap((i) => i.killNodeIds ?? []))
    const severedEdgeIds = new Set(incidentsNow.flatMap((i) => i.severedEdgeIds ?? []))
    const offeredRps = Math.max(0, workload.trafficCurve(tMs) * trafficMultiplier)

    const arrivals = new Map<string, Segment[]>()
    const readRps = offeredRps * (1 - writeFraction)
    const writeRps = offeredRps * writeFraction
    const initialSegments: Segment[] = []
    if (readRps > EPS) initialSegments.push({ rps: readRps, latencyMs: 0, opType: 'read' })
    if (writeRps > EPS) initialSegments.push({ rps: writeRps, latencyMs: 0, opType: 'write' })
    arrivals.set(clientNode.id, initialSegments)

    const terminatedThisTick: WeightedSample[] = []
    let errorRpsThisTick = 0

    for (const nodeId of topo.order) {
      const node = nodeById.get(nodeId)!
      const incoming = arrivals.get(nodeId)
      const totalInbound = incomingRps(incoming)
      const outEdges = activeOutgoingEdges(graph, nodeId, severedEdgeIds)

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
          settleSegment(seg, survivingFraction, serviceMs, outEdges, arrivals, terminatedThisTick, allTerminatedWrites)
        }

        const stats = utilizationByNode.get(nodeId) ?? { sum: 0, max: 0, count: 0 }
        stats.sum += utilization
        stats.max = Math.max(stats.max, utilization)
        stats.count += 1
        utilizationByNode.set(nodeId, stats)

        nodeTicks.push({ nodeId, tMs, inboundRps: totalInbound, utilization, serviceMs, errorRps })
        continue
      }

      if (node.config.kind === 'database') {
        const cfg = node.config as DatabaseConfig
        const killed = killedNodeIds.has(nodeId)
        const readCapacity = killed ? 0 : cfg.capacityRps
        const writeCapacity = killed ? 0 : cfg.writeCapacityRps
        const readBaseMs = cfg.indexed ? cfg.baseMs / INDEX_READ_SPEEDUP : cfg.baseMs
        const writeBaseMs = cfg.indexed ? cfg.writeBaseMs * INDEX_WRITE_OVERHEAD : cfg.writeBaseMs

        const reads = (incoming ?? []).filter((s) => s.opType === 'read')
        const writes = (incoming ?? []).filter((s) => s.opType === 'write')
        const readInbound = incomingRps(reads)
        const writeInbound = incomingRps(writes)

        const readUtilization = readCapacity > 0 ? readInbound / readCapacity : readInbound > 0 ? 1 : 0
        const writeUtilization = writeCapacity > 0 ? writeInbound / writeCapacity : writeInbound > 0 ? 1 : 0
        const readServiceMs = readCapacity > 0 ? serviceTimeMs(readBaseMs, readUtilization) : readBaseMs
        const writeServiceMs = writeCapacity > 0 ? serviceTimeMs(writeBaseMs, writeUtilization) : writeBaseMs
        const readErrorRps = Math.max(0, readInbound - readCapacity)
        const writeErrorRps = Math.max(0, writeInbound - writeCapacity)
        const readSurviving = readInbound > EPS ? Math.max(0, 1 - readErrorRps / readInbound) : 1
        const writeSurviving = writeInbound > EPS ? Math.max(0, 1 - writeErrorRps / writeInbound) : 1

        errorRpsThisTick += readErrorRps + writeErrorRps

        for (const seg of reads) {
          settleSegment(seg, readSurviving, readServiceMs, outEdges, arrivals, terminatedThisTick, allTerminatedWrites)
        }
        for (const seg of writes) {
          settleSegment(seg, writeSurviving, writeServiceMs, outEdges, arrivals, terminatedThisTick, allTerminatedWrites)
        }

        const utilization = Math.max(readUtilization, writeUtilization)
        const stats = utilizationByNode.get(nodeId) ?? { sum: 0, max: 0, count: 0 }
        stats.sum += utilization
        stats.max = Math.max(stats.max, utilization)
        stats.count += 1
        utilizationByNode.set(nodeId, stats)

        nodeTicks.push({
          nodeId,
          tMs,
          inboundRps: totalInbound,
          utilization,
          serviceMs: Math.max(readServiceMs, writeServiceMs),
          errorRps: readErrorRps + writeErrorRps,
        })
        continue
      }

      if (node.config.kind === 'replica') {
        const cfg = node.config as ReplicaConfig
        const killed = killedNodeIds.has(nodeId)
        const effectiveCapacity = killed ? 0 : cfg.capacityRps
        const staleReadFraction = cfg.replicationMode === 'sync' ? 0 : Math.min(Math.max(cfg.staleReadFraction, 0), 1)

        const reads = (incoming ?? []).filter((s) => s.opType === 'read')
        const writes = (incoming ?? []).filter((s) => s.opType === 'write')
        const readInbound = incomingRps(reads)
        const writeInbound = incomingRps(writes)
        const utilization = effectiveCapacity > 0 ? readInbound / effectiveCapacity : readInbound > 0 ? 1 : 0
        const serviceMs = effectiveCapacity > 0 ? serviceTimeMs(cfg.baseMs, utilization) : cfg.baseMs
        const errorRps = Math.max(0, readInbound - effectiveCapacity)
        const survivingFraction = readInbound > EPS ? Math.max(0, 1 - errorRps / readInbound) : 1
        // A killed replica can't forward writes either -- a dead node
        // drops everything routed through it, not just the reads it would
        // have served locally.
        const writeErrorRps = killed ? writeInbound : 0

        errorRpsThisTick += errorRps + writeErrorRps

        // Reads resolve locally (a replica always has *a* copy, just maybe
        // a stale one under async replication).
        for (const seg of reads) {
          const survivingRps = seg.rps * survivingFraction
          if (survivingRps <= EPS) continue
          const latencyMs = seg.latencyMs + serviceMs
          terminatedThisTick.push({ value: latencyMs, weight: survivingRps })
          if (staleReadFraction > 0) totalStale += survivingRps * staleReadFraction
        }
        // Writes don't belong on a read replica -- pass straight through to
        // whatever it's wired to next (the primary) -- unless the replica
        // itself is down, in which case there's nothing to pass through.
        for (const seg of killed ? [] : writes) {
          settleSegment(seg, 1, PASS_THROUGH_MS, outEdges, arrivals, terminatedThisTick, allTerminatedWrites)
        }

        const stats = utilizationByNode.get(nodeId) ?? { sum: 0, max: 0, count: 0 }
        stats.sum += utilization
        stats.max = Math.max(stats.max, utilization)
        stats.count += 1
        utilizationByNode.set(nodeId, stats)

        nodeTicks.push({
          nodeId,
          tMs,
          inboundRps: totalInbound,
          utilization,
          serviceMs,
          errorRps: errorRps + writeErrorRps,
        })
        continue
      }

      if (node.config.kind === 'loadBalancer') {
        const cfg = node.config as LoadBalancerConfig
        const targets = outEdges.map((e) => nodeById.get(e.target)!).filter(Boolean)
        const weights = loadBalancerWeights(cfg.algorithm, targets)

        outEdges.forEach((edge, i) => {
          const weight = weights[i] ?? 0
          for (const seg of incoming ?? []) {
            const list = arrivals.get(edge.target) ?? []
            list.push({ ...seg, rps: seg.rps * weight, latencyMs: seg.latencyMs + PASS_THROUGH_MS })
            arrivals.set(edge.target, list)
          }
        })

        nodeTicks.push({
          nodeId,
          tMs,
          inboundRps: totalInbound,
          utilization: 0,
          serviceMs: PASS_THROUGH_MS,
          errorRps: 0,
        })
        continue
      }

      if (node.config.kind === 'shardRouter') {
        const cfg = node.config as ShardRouterConfig
        const killed = killedNodeIds.has(nodeId)

        if (killed) {
          // A dead router can't dispatch to anything it owns -- all
          // traffic through it errors out, same as a killed server/
          // database dropping to 0 capacity.
          errorRpsThisTick += totalInbound
          nodeTicks.push({
            nodeId,
            tMs,
            inboundRps: totalInbound,
            utilization: 1,
            serviceMs: PASS_THROUGH_MS,
            errorRps: totalInbound,
          })
          continue
        }

        if (outEdges.length === 0) {
          // No shards wired yet (e.g. mid-build): terminate here rather
          // than silently dropping the traffic from the tick's accounting,
          // matching every other node kind's dead-end behavior.
          for (const seg of incoming ?? []) {
            settleSegment(seg, 1, PASS_THROUGH_MS, outEdges, arrivals, terminatedThisTick, allTerminatedWrites)
          }
          nodeTicks.push({
            nodeId,
            tMs,
            inboundRps: totalInbound,
            utilization: 0,
            serviceMs: PASS_THROUGH_MS,
            errorRps: 0,
          })
          continue
        }

        const targets = outEdges.map((e) => nodeById.get(e.target)!).filter(Boolean)
        const weights = shardRoutingWeights(cfg, targets.length)

        const childStats = shardChildStats.get(nodeId) ?? new Map<string, { sum: number; count: number }>()
        outEdges.forEach((edge, i) => {
          const weight = weights[i] ?? 0
          const childInbound = totalInbound * weight
          for (const seg of incoming ?? []) {
            const list = arrivals.get(edge.target) ?? []
            list.push({ ...seg, rps: seg.rps * weight, latencyMs: seg.latencyMs + PASS_THROUGH_MS })
            arrivals.set(edge.target, list)
          }
          const entry = childStats.get(edge.target) ?? { sum: 0, count: 0 }
          entry.sum += childInbound
          entry.count += 1
          childStats.set(edge.target, entry)
        })
        shardChildStats.set(nodeId, childStats)

        nodeTicks.push({
          nodeId,
          tMs,
          inboundRps: totalInbound,
          utilization: 0,
          serviceMs: PASS_THROUGH_MS,
          errorRps: 0,
        })
        continue
      }

      if (node.config.kind === 'cache') {
        const cfg = node.config as CacheConfig
        const hitRate = predictedCacheHitRate(cfg.keyspaceSize, cfg.zipfS, cfg.capacitySlots)
        const staleFraction = cfg.staleFraction ?? 0

        const reads = (incoming ?? []).filter((s) => s.opType === 'read')
        const writes = (incoming ?? []).filter((s) => s.opType === 'write')

        for (const seg of reads) {
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
            settleSegment(
              { ...seg, rps: missRps },
              1,
              cfg.missOverheadMs,
              outEdges,
              arrivals,
              terminatedThisTick,
              allTerminatedWrites,
            )
          }
        }

        // A cache is never the source of truth: writes always pass through
        // to whatever's wired next, never resolved as a "hit" here.
        for (const seg of writes) {
          settleSegment(seg, 1, cfg.missOverheadMs, outEdges, arrivals, terminatedThisTick, allTerminatedWrites)
        }

        if (incomingRps(reads) > EPS) {
          cacheHitSamples.push({ value: hitRate, weight: incomingRps(reads) })
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
    if (
      n.config.kind === 'server' ||
      n.config.kind === 'loadBalancer' ||
      n.config.kind === 'cache' ||
      n.config.kind === 'database' ||
      n.config.kind === 'replica' ||
      n.config.kind === 'shardRouter'
    ) {
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

  let maxShardImbalance = 1
  for (const childStats of shardChildStats.values()) {
    const childAvgs = Array.from(childStats.values()).map((s) => (s.count > 0 ? s.sum / s.count : 0))
    if (childAvgs.length === 0) continue
    const total = childAvgs.reduce((a, b) => a + b, 0)
    const evenShare = total / childAvgs.length
    if (evenShare <= EPS) continue
    const maxChild = Math.max(...childAvgs)
    maxShardImbalance = Math.max(maxShardImbalance, maxChild / evenShare)
  }

  const maxReplicationLagMs = graph.nodes.reduce((acc, n) => {
    if (n.config.kind === 'replica' && n.config.replicationMode === 'async') {
      return Math.max(acc, n.config.replicationLagMs)
    }
    return acc
  }, 0)

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
    durability: computeSystemDurability(graph),
    maxUtilization,
    bottleneckNodeId,
    writeP50Ms: weightedPercentile(allTerminatedWrites, 0.5),
    writeP99Ms: weightedPercentile(allTerminatedWrites, 0.99),
    maxShardImbalance,
    maxReplicationLagMs,
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
