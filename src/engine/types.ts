// Pure data types for the simulation engine. No React, no UI concerns.
// This file is the contract between level content, the canvas, and the simulator.

export type ComponentKind =
  | 'client'
  | 'server'
  | 'loadBalancer'
  | 'cache'
  | 'database'
  | 'replica'
  | 'shardRouter'

export type LbAlgorithm = 'roundRobin' | 'leastConnections' | 'hash'
export type CachePolicy = 'writeThrough' | 'writeAround' | 'writeBack'
export type DatabaseEngine = 'sql' | 'nosql'
export type ReplicationMode = 'sync' | 'async'
export type ShardStrategy = 'modulo' | 'consistentHash'

/** Whether a traffic segment represents a read or a write. Every existing
 * component from Chapter I is opType-agnostic (a "depot" doesn't care) --
 * this only starts to matter once `database`/`replica`/`cache` are in the
 * graph, since those treat the two differently. */
export type OpType = 'read' | 'write'

export interface ClientConfig {
  kind: 'client'
}

export interface ServerConfig {
  kind: 'server'
  /** Max requests/sec this node can serve before queueing/dropping. */
  capacityRps: number
  /** Service time at near-zero utilization, in ms. */
  baseMs: number
  costPerHour: number
  /** This node's own uptime, 0..1 (e.g. 0.99 = "two nines"). Used only for
   * system availability calculations, independent of the traffic sim. */
  availability?: number
}

export interface LoadBalancerConfig {
  kind: 'loadBalancer'
  algorithm: LbAlgorithm
  costPerHour: number
  /** This node's own uptime, 0..1. A single dispatcher is a single point of
   * failure no matter how many redundant servers sit behind it. */
  availability?: number
}

export interface CacheConfig {
  kind: 'cache'
  /** How many distinct items the cache can hold. */
  capacitySlots: number
  /** Latency of a cache hit, in ms. */
  hitMs: number
  /** Extra latency added on a miss before forwarding downstream, in ms. */
  missOverheadMs: number
  /** Size of the total key space requests are drawn from (models real-world variety). */
  keyspaceSize: number
  /** Zipf skew of key popularity. Higher = more concentrated on a few hot keys. */
  zipfS: number
  costPerHour: number
  policy: CachePolicy
  /**
   * When true, the cache is serving stale data for a fraction of hits
   * (used by the cache-invalidation twist). 0 = fully fresh, 1 = fully stale.
   */
  staleFraction?: number
}

/** How much index maintenance slows a write down, and how much it speeds a
 * read up -- one fixed, documented pair of multipliers so toggling
 * DatabaseConfig.indexed produces a real, live-recomputed number instead of
 * two independently hand-authored "before/after" graphs. Illustrative, in
 * the same spirit as serviceTimeMs's M/M/1-flavored blowup -- not literal
 * production numbers, but the right shape of trade-off. */
export const INDEX_READ_SPEEDUP = 4
export const INDEX_WRITE_OVERHEAD = 1.5

export interface DatabaseConfig {
  kind: 'database'
  engine: DatabaseEngine
  /** Max reads/sec before queueing/dropping. */
  capacityRps: number
  /** Read service time at near-zero utilization, in ms (pre-index effect). */
  baseMs: number
  /** Max writes/sec before queueing/dropping -- almost always lower than
   * read capacity, since a write has to actually persist, not just look up. */
  writeCapacityRps: number
  /** Write service time at near-zero utilization, in ms (pre-index effect). */
  writeBaseMs: number
  /** An index trades slower writes (every write also updates the index)
   * for much faster reads (no full scan) -- see INDEX_READ_SPEEDUP/
   * INDEX_WRITE_OVERHEAD. */
  indexed: boolean
  costPerHour: number
  availability?: number
}

export interface ReplicaConfig {
  kind: 'replica'
  /** Read-only: a replica serves reads from its own copy. Writes routed to
   * one pass straight through to whatever it's wired to next (the primary). */
  capacityRps: number
  baseMs: number
  costPerHour: number
  availability?: number
  replicationMode: ReplicationMode
  /** Async only: the fraction of reads served here that reflect a write
   * that hasn't propagated yet (0..1). Forced to 0 under 'sync'. Reuses the
   * exact staleFraction/staleReadRate mechanic CacheConfig already has. */
  staleReadFraction: number
  /** Async only: authored/displayed lag behind the primary, in ms. Doesn't
   * affect service time -- it feeds the maxReplicationLagMs SLO. Forced to
   * 0 under 'sync' (a sync replica is, by definition, caught up). */
  replicationLagMs: number
  /** Sync only: how long a write has to wait for this replica to
   * acknowledge it before it's considered done -- the real cost traded for
   * never serving a stale read. Author-tunable like every other latency
   * knob in the engine, so e.g. a cross-region sync replica can be given a
   * much higher round-trip cost than a same-region one. Ignored under
   * 'async' (nothing to wait for). */
  syncAckWaitMs: number
}

export interface ShardRouterConfig {
  kind: 'shardRouter'
  strategy: ShardStrategy
  /** Size of the key space requests are drawn from -- reuses the same
   * Zipf-skew modeling the cache uses, so a shard router can show genuine
   * hot-shard imbalance instead of a synthetic "some shards get more" claim. */
  keyspaceSize: number
  zipfS: number
  costPerHour: number
  availability?: number
}

export type NodeConfig =
  | ClientConfig
  | ServerConfig
  | LoadBalancerConfig
  | CacheConfig
  | DatabaseConfig
  | ReplicaConfig
  | ShardRouterConfig

export interface GraphNode {
  id: string
  label: string
  config: NodeConfig
  /** Canvas position; irrelevant to simulation, kept here so layout survives saves. */
  position: { x: number; y: number }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
}

export interface SimGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** Traffic offered to the system at time t (ms since run start), in requests/sec. */
export type TrafficCurve = (tMs: number) => number

export interface Workload {
  durationMs: number
  tickMs: number
  trafficCurve: TrafficCurve
  /** Optional label shown on the dashboard, e.g. "Lunch rush". */
  label?: string
  /** Fraction of offered traffic that's a write, 0..1. Defaults to 0 (all
   * reads) when omitted, so every level authored before this field existed
   * behaves exactly as it did before. */
  writeFraction?: number
}

export interface IncidentWindow {
  id: string
  label: string
  startMs: number
  endMs: number
  /** Multiplies offered traffic while active. */
  trafficMultiplier?: number
  /** Node ids to treat as fully unavailable (capacity 0) while active. */
  killNodeIds?: string[]
  /** Edge ids to treat as severed (no traffic crosses them) while active --
   * a network partition, as opposed to a node outright dying. */
  severedEdgeIds?: string[]
}

export interface NodeTickMetric {
  nodeId: string
  tMs: number
  inboundRps: number
  utilization: number
  serviceMs: number
  errorRps: number
  cacheHitRate?: number
}

export interface TickSummary {
  tMs: number
  offeredRps: number
  completedRps: number
  errorRps: number
  p50Ms: number
  p99Ms: number
}

export interface SimAggregate {
  p50Ms: number
  p99Ms: number
  throughputRps: number
  /** Fraction of offered requests that errored (dropped/refused), 0..1. */
  errorRate: number
  costPerHour: number
  avgCacheHitRate: number | null
  /** Fraction of all completed requests that were answered from a cache or
   * replica serving stale data (see CacheConfig.staleFraction and
   * ReplicaConfig.staleReadFraction). 0 if nothing in the graph serves
   * stale data. */
  staleReadRate: number
  /** Estimated system uptime, 0..1, from the graph's static topology (not
   * traffic-dependent) -- see computeSystemAvailability in metrics.ts. */
  availability: number
  /** Estimated chance a write, once acknowledged, survives losing any one
   * node (0..1) -- see computeSystemDurability in metrics.ts. 1 when the
   * graph has no database/replica node at all (nothing to lose). */
  durability: number
  maxUtilization: number
  /** The node id that spent the most time at/above 100% utilization, if any. */
  bottleneckNodeId: string | null
  /** p50/p99 latency of write-opType traffic only. 0 when the workload has
   * no writeFraction (i.e. every existing pre-Chapter-II level). */
  writeP50Ms: number
  writeP99Ms: number
  /** How lopsided the busiest shard is vs. an even split, from the graph's
   * shardRouter node(s): 1 = perfectly even, 2 = the busiest shard gets 2x
   * an even share, etc. 1 (neutral/no-op) when the graph has no shardRouter. */
  maxShardImbalance: number
  /** The largest authored replicationLagMs among the graph's replica nodes,
   * ms. 0 when the graph has no async replica. */
  maxReplicationLagMs: number
}

export interface SimResult {
  ticks: TickSummary[]
  nodeTicks: NodeTickMetric[]
  aggregate: SimAggregate
}

export interface SimValidationError {
  type: 'cycle' | 'unreachable' | 'noClient' | 'danglingEdge'
  message: string
  nodeIds?: string[]
}
