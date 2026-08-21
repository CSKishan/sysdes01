import { describe, expect, it } from 'vitest'
import { scoreRun } from '../scoring'
import type { SimResult } from '@/engine/types'

function fakeResult(overrides: Partial<SimResult['aggregate']>): SimResult {
  return {
    ticks: [],
    nodeTicks: [],
    aggregate: {
      p50Ms: 50,
      p99Ms: 100,
      throughputRps: 40,
      errorRate: 0,
      costPerHour: 10,
      avgCacheHitRate: null,
      staleReadRate: 0,
      availability: 1,
      durability: 1,
      maxUtilization: 0.5,
      bottleneckNodeId: null,
      writeP50Ms: 0,
      writeP99Ms: 0,
      maxShardImbalance: 1,
      maxReplicationLagMs: 0,
      ...overrides,
    },
  }
}

describe('scoreRun', () => {
  it('fails a disconnected/empty-throughput graph even if latency and errors look "fine"', () => {
    const result = fakeResult({ throughputRps: 0, p99Ms: 0, errorRate: 0 })
    const score = scoreRun(result, { maxP99Ms: 200, maxErrorRate: 0.01, minThroughputRps: 30 })
    expect(score.passed).toBe(false)
  })

  it('fails when p99 exceeds the SLO', () => {
    const result = fakeResult({ p99Ms: 500 })
    const score = scoreRun(result, { maxP99Ms: 200 })
    expect(score.passed).toBe(false)
    expect(score.stars).toBe(0)
  })

  it('gives 3 stars for comfortably clearing every check', () => {
    const result = fakeResult({ p99Ms: 50, errorRate: 0, costPerHour: 10 })
    const score = scoreRun(result, { maxP99Ms: 200, maxErrorRate: 0.01, maxCostPerHour: 50 })
    expect(score.passed).toBe(true)
    expect(score.stars).toBe(3)
  })

  it('gives 2 stars for passing with a moderate margin', () => {
    const result = fakeResult({ p99Ms: 160 })
    const score = scoreRun(result, { maxP99Ms: 200 })
    expect(score.passed).toBe(true)
    expect(score.stars).toBe(2)
  })

  it('gives 1 star for passing right at the edge of the SLO', () => {
    const result = fakeResult({ p99Ms: 195 })
    const score = scoreRun(result, { maxP99Ms: 200 })
    expect(score.passed).toBe(true)
    expect(score.stars).toBe(1)
  })

  it('checks cache hit rate as a minimum threshold', () => {
    const belowTarget = fakeResult({ avgCacheHitRate: 0.4 })
    const aboveTarget = fakeResult({ avgCacheHitRate: 0.9 })
    expect(scoreRun(belowTarget, { minAvgCacheHitRate: 0.7 }).passed).toBe(false)
    expect(scoreRun(aboveTarget, { minAvgCacheHitRate: 0.7 }).passed).toBe(true)
  })

  it('checks durability as a minimum threshold', () => {
    const belowTarget = fakeResult({ durability: 0.99 })
    const aboveTarget = fakeResult({ durability: 0.9999 })
    expect(scoreRun(belowTarget, { minDurability: 0.999 }).passed).toBe(false)
    expect(scoreRun(aboveTarget, { minDurability: 0.999 }).passed).toBe(true)
  })

  it('checks write p99 latency as a max threshold, independent of the combined p99', () => {
    const slowWrites = fakeResult({ p99Ms: 50, writeP99Ms: 900 })
    const fastWrites = fakeResult({ p99Ms: 50, writeP99Ms: 150 })
    expect(scoreRun(slowWrites, { maxWriteP99Ms: 300 }).passed).toBe(false)
    expect(scoreRun(fastWrites, { maxWriteP99Ms: 300 }).passed).toBe(true)
  })

  it('checks replication lag as a max threshold', () => {
    const laggy = fakeResult({ maxReplicationLagMs: 800 })
    const fresh = fakeResult({ maxReplicationLagMs: 50 })
    expect(scoreRun(laggy, { maxReplicationLagMs: 200 }).passed).toBe(false)
    expect(scoreRun(fresh, { maxReplicationLagMs: 200 }).passed).toBe(true)
  })

  it('checks shard imbalance as a max threshold', () => {
    const hotShard = fakeResult({ maxShardImbalance: 2.5 })
    const evenShards = fakeResult({ maxShardImbalance: 1.1 })
    expect(scoreRun(hotShard, { maxShardImbalance: 1.5 }).passed).toBe(false)
    expect(scoreRun(evenShards, { maxShardImbalance: 1.5 }).passed).toBe(true)
  })
})
