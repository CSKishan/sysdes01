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
  | 'queue'
  | 'broker'
  | 'apiGateway'
  | 'service'
  | 'rateLimiter'
  | 'circuitBreaker'

export type LbAlgorithm = 'roundRobin' | 'leastConnections' | 'hash'
export type CachePolicy = 'writeThrough' | 'writeAround' | 'writeBack'
export type DatabaseEngine = 'sql' | 'nosql'
export type ReplicationMode = 'sync' | 'async'
export type ShardStrategy = 'modulo' | 'consistentHash'
export type DeliverySemantics = 'atMostOnce' | 'atLeastOnce'
export type RateLimiterAlgorithm = 'tokenBucket' | 'leakyBucket' | 'slidingWindow'
export type CircuitState = 'closed' | 'open' | 'halfOpen'

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
  /** When true, targets killed by an active incident are excluded from
   * routing weights entirely -- service discovery: the dispatcher only
   * sends traffic to targets it currently believes are healthy, instead of
   * blindly trusting static wiring. Defaults to false/undefined so every
   * load balancer authored before this field existed keeps routing evenly
   * across a killed target's "share" exactly as it always did (redundancy
   * alone shrinks the blast radius but doesn't remove it -- the honest
   * lesson Chapter III's own microservices level teaches). */
  healthAware?: boolean
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

export interface QueueConfig {
  kind: 'queue'
  /** Max items the backlog can hold before new arrivals are rejected
   * outright (backpressure) instead of queueing. */
  capacity: number
  /** Max items/sec the queue can drain to whatever it's wired to next --
   * independent of how fast items arrive, which is the whole point: a
   * burst can arrive faster than this and still not error, as long as it
   * fits under `capacity` and the average settles back under drainRps. */
  drainRps: number
  costPerHour: number
  availability?: number
}

export interface BrokerConfig {
  kind: 'broker'
  /** Max messages/sec the broker itself can dispatch -- its own throughput
   * ceiling, separate from whatever capacity each subscriber has. Every
   * outgoing edge gets a full copy of surviving traffic (pub-sub fan-out),
   * not a split the way a load balancer divides traffic across targets. */
  capacityRps: number
  baseMs: number
  costPerHour: number
  availability?: number
  deliverySemantics: DeliverySemantics
  /** atLeastOnce only: max messages the broker will hold and retry-dispatch
   * when it's momentarily over its own capacity, instead of dropping them
   * outright the way atMostOnce does -- the actual distinguishing trait of
   * "at least once" delivery. Ignored under atMostOnce. */
  retryBufferCapacity: number
}

export interface ApiGatewayConfig {
  kind: 'apiGateway'
  capacityRps: number
  /** The added hop's own latency at near-zero utilization, in ms -- auth
   * check, rate-limit check, routing lookup. */
  baseMs: number
  costPerHour: number
  availability?: number
}

export interface ServiceConfig {
  kind: 'service'
  /** Same shape as ServerConfig -- a `service` is a server that's meant to
   * be chained to other services/databases via ordinary graph edges. That
   * chaining is what a "microservice" is, engine-wise: cascading failure
   * and monolith-vs-microservices cost/latency/availability comparisons
   * fall out of the existing segment-flow and availability-composition
   * machinery for free, with no new mechanic needed for "depends on." */
  capacityRps: number
  baseMs: number
  costPerHour: number
  availability?: number
}

export interface RateLimiterConfig {
  kind: 'rateLimiter'
  algorithm: RateLimiterAlgorithm
  /** The steady-state throughput every algorithm converges to once a burst
   * is absorbed: tokens refill at this rate, the leaky bucket drains at
   * this rate, the sliding window's own budget is this rate * windowMs. */
  sustainedRps: number
  /** tokenBucket: how many tokens the bucket can hold -- how big a burst
   * gets let through instantly, at full speed, before throttling down to
   * sustainedRps. leakyBucket: how many items the bucket can hold before
   * it overflows (rejects) instead of smoothing them into added latency --
   * same shape as QueueConfig.capacity, since a leaky bucket *is* a queue
   * with a fixed drain rate. Ignored under slidingWindow. */
  burstCapacity: number
  /** slidingWindow only: how far back the rolling request count looks, ms. */
  windowMs: number
  costPerHour: number
  availability?: number
}

export interface CircuitBreakerConfig {
  kind: 'circuitBreaker'
  capacityRps: number
  baseMs: number
  costPerHour: number
  availability?: number
  /** Fraction (0..1) of the downstream's own recent error rate, averaged
   * over `windowMs`, that trips the breaker open. */
  errorThreshold: number
  /** How far back to look when judging the downstream's recent health. */
  windowMs: number
  /** How long the breaker stays open (rejecting every request immediately,
   * without even attempting the downstream call) before it lets a trial
   * trickle through to test recovery. */
  openDurationMs: number
  /** Fraction (0..1) of traffic let through as a trial once half-open. */
  halfOpenTrialFraction: number
}

export type NodeConfig =
  | ClientConfig
  | ServerConfig
  | LoadBalancerConfig
  | CacheConfig
  | DatabaseConfig
  | ReplicaConfig
  | ShardRouterConfig
  | QueueConfig
  | BrokerConfig
  | ApiGatewayConfig
  | ServiceConfig
  | RateLimiterConfig
  | CircuitBreakerConfig

export interface GraphNode {
  id: string
  label: string
  config: NodeConfig
  /** Canvas position; irrelevant to simulation, kept here so layout survives saves. */
  position: { x: number; y: number }
  /** Optional region tag (e.g. 'us-east', 'eu-west') for cross-region
   * latency (GraphEdge.crossRegionLatencyMs) and regional-failover
   * incidents (IncidentWindow.killRegionIds). Untagged nodes aren't part
   * of any region-based mechanic. */
  region?: string
}

export interface EdgeRetryConfig {
  /** How many additional attempts to make after the first failure, before
   * giving up and letting the error stand as final. */
  maxAttempts: number
  /** How long to wait before each retry attempt, ms. */
  backoffMs: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  /** Extra one-way latency for this specific hop, ms -- authored explicitly
   * on edges that cross regions, rather than auto-derived from node region
   * tags, so it stays an honest, visible number instead of implicit magic. */
  crossRegionLatencyMs?: number
  /** Retries a portion of this edge's traffic that errored at its target,
   * after a backoff, up to maxAttempts times. Modeled as a one-tick-lagged
   * approximation -- this tick's retry load is sized from the target's
   * *last* tick's observed error rate, since the engine can't know this
   * tick's outcome before it happens. Retried load stacks on top of new
   * arrivals at the target; if that pushes it over capacity, more errors,
   * which schedules an even bigger retry next backoff -- the retry storm.
   * Retries are treated as idempotent (opType 'read') -- retrying a write
   * safely needs an idempotency key, a real distinction this doesn't model. */
  retry?: EdgeRetryConfig
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
  /** Kills every node tagged with any of these regions (GraphNode.region)
   * while active -- a whole-region outage, for testing regional failover,
   * without having to enumerate every node id in that region by hand. */
  killRegionIds?: string[]
}

export interface NodeTickMetric {
  nodeId: string
  tMs: number
  inboundRps: number
  utilization: number
  serviceMs: number
  errorRps: number
  cacheHitRate?: number
  /** Current backlog size (items), for a queue, an at-least-once broker's
   * retry buffer, or a leaky-bucket rate limiter. Undefined otherwise. */
  queueDepth?: number
  /** Current state, for a circuit breaker. Undefined for every other kind. */
  circuitState?: CircuitState
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
  /** The largest backlog (items) any queue or at-least-once broker's retry
   * buffer ever held during the run. 0 when the graph has neither. */
  maxQueueDepth: number
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
