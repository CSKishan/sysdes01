// Covers Phase 6 (Engine v3: resilience & operations): rate limiter
// algorithms (token bucket, leaky bucket, sliding window), circuit breaker
// state machine (closed -> open -> half-open -> closed/open), retries with
// backoff (helps a transient spike, backfires into a storm under sustained
// overload), health-aware load balancing (service discovery), and
// cross-region latency/regional failover. Chapter 0-3's existing tests are
// untouched -- these are additive.

import { describe, expect, it } from 'vitest'
import { runSimulation } from '../simulate'
import { constantTraffic, spikeTraffic } from '../traffic'
import type {
  CircuitBreakerConfig,
  GraphEdge,
  GraphNode,
  LoadBalancerConfig,
  RateLimiterConfig,
  SimGraph,
  Workload,
} from '../types'

function client(id = 'client'): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } }
}
function server(id: string, overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number }> = {}, region?: string): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    region,
    config: { kind: 'server', capacityRps: overrides.capacityRps ?? 50, baseMs: overrides.baseMs ?? 20, costPerHour: overrides.costPerHour ?? 8 },
  }
}
function loadBalancer(id: string, overrides: Partial<LoadBalancerConfig> = {}): GraphNode {
  return { id, label: id, position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4, ...overrides } }
}
function rateLimiter(id: string, overrides: Partial<RateLimiterConfig> = {}): GraphNode {
  const config: RateLimiterConfig = {
    kind: 'rateLimiter',
    algorithm: 'tokenBucket',
    sustainedRps: 30,
    burstCapacity: 60,
    windowMs: 1000,
    costPerHour: 4,
    ...overrides,
  }
  return { id, label: id, position: { x: 0, y: 0 }, config }
}
function circuitBreaker(id: string, overrides: Partial<CircuitBreakerConfig> = {}): GraphNode {
  const config: CircuitBreakerConfig = {
    kind: 'circuitBreaker',
    capacityRps: 1000,
    baseMs: 10,
    costPerHour: 5,
    errorThreshold: 0.3,
    windowMs: 500,
    openDurationMs: 1000,
    halfOpenTrialFraction: 0.1,
    ...overrides,
  }
  return { id, label: id, position: { x: 0, y: 0 }, config }
}
function edge(source: string, target: string, overrides: Partial<GraphEdge> = {}): GraphEdge {
  return { id: `${source}=>${target}`, source, target, ...overrides }
}
function workload(rps: number, overrides: Partial<Workload> = {}): Workload {
  return { durationMs: 3000, tickMs: 250, trafficCurve: constantTraffic(rps), ...overrides }
}

describe('rate limiter', () => {
  it('token bucket lets a burst through instantly, then throttles once tokens run out', () => {
    const graph: SimGraph = {
      nodes: [client(), rateLimiter('rl', { algorithm: 'tokenBucket', sustainedRps: 20, burstCapacity: 100 }), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'rl'), edge('rl', 's')],
    }
    // A one-shot burst of 80 items, well under the 100-token bucket.
    const result = runSimulation({ graph, workload: { durationMs: 250, tickMs: 250, trafficCurve: constantTraffic(320) } })
    expect(result.aggregate.errorRate).toBe(0)
  })

  it('token bucket rejects a sustained rate above sustainedRps once the burst allowance is spent', () => {
    const graph: SimGraph = {
      nodes: [client(), rateLimiter('rl', { algorithm: 'tokenBucket', sustainedRps: 20, burstCapacity: 40 }), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'rl'), edge('rl', 's')],
    }
    const result = runSimulation({ graph, workload: workload(60, { durationMs: 3000 }) })
    expect(result.aggregate.errorRate).toBeGreaterThan(0)
  })

  it('leaky bucket smooths the same burst into added wait time instead of passing it through instantly', () => {
    const graph: SimGraph = {
      nodes: [client(), rateLimiter('rl', { algorithm: 'leakyBucket', sustainedRps: 20, burstCapacity: 500 }), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'rl'), edge('rl', 's')],
    }
    // A single one-tick burst, then nothing -- a long enough run afterward
    // for the whole backlog to actually drain and produce real "this item
    // waited N ms" latency samples (a run that ends before draining
    // finishes would only ever sample the same-tick, ~0-wait portion).
    const result = runSimulation({ graph, workload: { durationMs: 2000, tickMs: 250, trafficCurve: spikeTraffic(0, 320, 0, 250) } })
    // No backpressure (bucket is large enough), but the burst had to queue
    // and drain at sustainedRps rather than passing through immediately --
    // unlike token bucket's instant pass-through for the same burst above.
    expect(result.aggregate.errorRate).toBe(0)
    expect(result.aggregate.maxQueueDepth).toBeGreaterThan(0)
    expect(result.aggregate.p99Ms).toBeGreaterThan(50)
  })

  it('sliding window rejects once the rolling budget for the window is spent', () => {
    const graph: SimGraph = {
      nodes: [client(), rateLimiter('rl', { algorithm: 'slidingWindow', sustainedRps: 20, windowMs: 1000 }), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'rl'), edge('rl', 's')],
    }
    const result = runSimulation({ graph, workload: workload(60, { durationMs: 3000 }) })
    expect(result.aggregate.errorRate).toBeGreaterThan(0)
    // Confirms it's throttling, not just passing everything -- completed
    // throughput should land near sustainedRps, not near offered.
    expect(result.aggregate.throughputRps).toBeLessThan(40)
  })
})

describe('circuit breaker', () => {
  it('stays closed with near-zero own error when the downstream is healthy', () => {
    const graph: SimGraph = {
      nodes: [client(), circuitBreaker('cb'), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'cb'), edge('cb', 's')],
    }
    const result = runSimulation({ graph, workload: workload(50, { durationMs: 3000 }) })
    expect(result.aggregate.errorRate).toBeLessThan(0.01)
    const lastTick = result.nodeTicks.filter((n) => n.nodeId === 'cb').at(-1)
    expect(lastTick?.circuitState).toBe('closed')
  })

  it('trips open (fails fast) when the downstream is chronically overloaded, and never fully recovers while it stays that way', () => {
    const graph: SimGraph = {
      nodes: [client(), circuitBreaker('cb'), server('s', { capacityRps: 2 })],
      edges: [edge('client', 'cb'), edge('cb', 's')],
    }
    const result = runSimulation({ graph, workload: workload(50, { durationMs: 5000 }) })
    const cbTicks = result.nodeTicks.filter((n) => n.nodeId === 'cb')
    expect(cbTicks.some((n) => n.circuitState === 'open')).toBe(true)
    expect(cbTicks.at(-1)?.circuitState).not.toBe('closed')
  })

  it('recovers to closed once a killed downstream comes back within the run', () => {
    const graph: SimGraph = {
      nodes: [client(), circuitBreaker('cb'), server('s', { capacityRps: 1000 })],
      edges: [edge('client', 'cb'), edge('cb', 's')],
    }
    const result = runSimulation({
      graph,
      workload: workload(50, { durationMs: 5000 }),
      incidents: [{ id: 'outage', label: 'outage', startMs: 0, endMs: 1500, killNodeIds: ['s'] }],
    })
    const cbTicks = result.nodeTicks.filter((n) => n.nodeId === 'cb')
    expect(cbTicks.some((n) => n.circuitState === 'open')).toBe(true)
    expect(cbTicks.at(-1)?.circuitState).toBe('closed')
  })
})

describe('retries with backoff', () => {
  it('helps a transient spike: retried load succeeds once the spike passes, lowering total error vs no retry', () => {
    const spikeWorkload: Workload = { durationMs: 3000, tickMs: 250, trafficCurve: spikeTraffic(20, 50, 1000, 1500) }
    const noRetryGraph: SimGraph = {
      nodes: [client(), server('s', { capacityRps: 30 })],
      edges: [edge('client', 's')],
    }
    const withRetryGraph: SimGraph = {
      nodes: [client(), server('s', { capacityRps: 30 })],
      edges: [edge('client', 's', { retry: { maxAttempts: 3, backoffMs: 250 } })],
    }
    const noRetryResult = runSimulation({ graph: noRetryGraph, workload: spikeWorkload })
    const withRetryResult = runSimulation({ graph: withRetryGraph, workload: spikeWorkload })
    expect(withRetryResult.aggregate.errorRate).toBeLessThan(noRetryResult.aggregate.errorRate)
  })

  it('backfires by extending an outage: retries pile up during overload and keep arriving into what should have been a clean recovery', () => {
    // A permanently-flat overload (offered always > capacity) is actually
    // conservation-neutral for retries in this model -- completed
    // throughput is capped at `capacity` either way, so total error ends
    // up identical whether or not the excess also got retried. The real,
    // honest storm shows up when load *recovers*: a brief overload, then
    // offered drops back under capacity -- without retry, that recovery
    // is immediate (0 error the moment offered dips below capacity).
    // With retry, the backlog that piled up during the overload keeps
    // arriving on top of the new, otherwise-comfortable load, extending
    // the outage well past when it should have ended.
    const overloadThenRecoverWorkload: Workload = {
      durationMs: 3000,
      tickMs: 250,
      trafficCurve: (tMs) => (tMs < 1500 ? 40 : 25), // capacity is 30: overloaded, then comfortably under
    }
    const noRetryGraph: SimGraph = {
      nodes: [client(), server('s', { capacityRps: 30 })],
      edges: [edge('client', 's')],
    }
    const withRetryGraph: SimGraph = {
      nodes: [client(), server('s', { capacityRps: 30 })],
      edges: [edge('client', 's', { retry: { maxAttempts: 3, backoffMs: 250 } })],
    }
    const noRetryResult = runSimulation({ graph: noRetryGraph, workload: overloadThenRecoverWorkload })
    const withRetryResult = runSimulation({ graph: withRetryGraph, workload: overloadThenRecoverWorkload })
    // Without retry, error should vanish once offered drops to 25 (< 30).
    const noRetryRecoveryTicks = noRetryResult.ticks.filter((t) => t.tMs >= 1500)
    expect(noRetryRecoveryTicks.every((t) => t.errorRps < 1)).toBe(true)
    // With retry, the piled-up backlog keeps causing errors well into the
    // same window that recovered cleanly without retry -- a brief overload
    // becomes a longer one. (Not asserting the overall aggregate error
    // *total* is higher with retry: held-back load is only finalized once
    // when its attempts run out, so if the situation improves mid-chain
    // the one dumped total can land below what per-tick counting would
    // have shown -- a real property of this deferred-accounting model,
    // not the point this test is making.)
    const withRetryRecoveryTicks = withRetryResult.ticks.filter((t) => t.tMs >= 1500)
    expect(withRetryRecoveryTicks.some((t) => t.errorRps > 1)).toBe(true)
  })
})

describe('health-aware load balancing (service discovery)', () => {
  it('a plain dispatcher keeps sending a killed target its static share (the pre-existing, honest limitation)', () => {
    const graph: SimGraph = {
      nodes: [client(), loadBalancer('lb'), server('s1', { capacityRps: 100 }), server('s2', { capacityRps: 100 })],
      edges: [edge('client', 'lb'), edge('lb', 's1'), edge('lb', 's2')],
    }
    const result = runSimulation({
      graph,
      workload: workload(40, { durationMs: 2000 }),
      incidents: [{ id: 'k', label: 'k', startMs: 0, endMs: 2000, killNodeIds: ['s1'] }],
    })
    expect(result.aggregate.errorRate).toBeCloseTo(0.5, 1)
  })

  it('a health-aware dispatcher routes entirely around the killed target instead', () => {
    const graph: SimGraph = {
      nodes: [client(), loadBalancer('lb', { healthAware: true }), server('s1', { capacityRps: 100 }), server('s2', { capacityRps: 100 })],
      edges: [edge('client', 'lb'), edge('lb', 's1'), edge('lb', 's2')],
    }
    const result = runSimulation({
      graph,
      workload: workload(40, { durationMs: 2000 }),
      incidents: [{ id: 'k', label: 'k', startMs: 0, endMs: 2000, killNodeIds: ['s1'] }],
    })
    expect(result.aggregate.errorRate).toBe(0)
  })
})

describe('multi-region', () => {
  it('a cross-region edge adds real latency on top of whatever is behind it', () => {
    const sameRegion: SimGraph = {
      nodes: [client(), server('s', { capacityRps: 1000, baseMs: 10 }, 'us-east')],
      edges: [edge('client', 's')],
    }
    const crossRegion: SimGraph = {
      nodes: [client(), server('s', { capacityRps: 1000, baseMs: 10 }, 'eu-west')],
      edges: [edge('client', 's', { crossRegionLatencyMs: 120 })],
    }
    const sameResult = runSimulation({ graph: sameRegion, workload: workload(10, { durationMs: 1000 }) })
    const crossResult = runSimulation({ graph: crossRegion, workload: workload(10, { durationMs: 1000 }) })
    expect(crossResult.aggregate.p50Ms).toBeGreaterThan(sameResult.aggregate.p50Ms + 100)
  })

  it('a regional-failover incident kills every node tagged with that region at once', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        loadBalancer('lb'),
        server('east-1', { capacityRps: 100 }, 'us-east'),
        server('west-1', { capacityRps: 100 }, 'us-west'),
      ],
      edges: [edge('client', 'lb'), edge('lb', 'east-1'), edge('lb', 'west-1')],
    }
    const result = runSimulation({
      graph,
      workload: workload(40, { durationMs: 2000 }),
      incidents: [{ id: 'regional', label: 'us-east down', startMs: 0, endMs: 2000, killRegionIds: ['us-east'] }],
    })
    // Same shape as killing east-1 by id directly -- half the traffic still
    // lands on the (regionally) dead target via plain round robin.
    expect(result.aggregate.errorRate).toBeCloseTo(0.5, 1)
  })
})
