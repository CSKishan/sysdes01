// Pure data types for the simulation engine. No React, no UI concerns.
// This file is the contract between level content, the canvas, and the simulator.

export type ComponentKind = 'client' | 'server' | 'loadBalancer' | 'cache'

export type LbAlgorithm = 'roundRobin' | 'leastConnections' | 'hash'
export type CachePolicy = 'writeThrough' | 'writeAround' | 'writeBack'

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

export type NodeConfig = ClientConfig | ServerConfig | LoadBalancerConfig | CacheConfig

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
  /** Fraction of all completed requests that were answered from a cache
   * serving stale data (see CacheConfig.staleFraction). 0 if no cache is
   * configured to serve stale data. */
  staleReadRate: number
  /** Estimated system uptime, 0..1, from the graph's static topology (not
   * traffic-dependent) -- see computeSystemAvailability in metrics.ts. */
  availability: number
  maxUtilization: number
  /** The node id that spent the most time at/above 100% utilization, if any. */
  bottleneckNodeId: string | null
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
