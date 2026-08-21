import { describe, expect, it } from 'vitest'
import { availabilityParallel, availabilitySeries, serviceTimeMs, weightedPercentile } from '../metrics'

describe('availabilitySeries', () => {
  it('matches the README worked example: two 99.9% components in series -> 99.8%', () => {
    const result = availabilitySeries(0.999, 0.999)
    expect(result).toBeCloseTo(0.998, 3)
  })

  it('is the product of all inputs', () => {
    expect(availabilitySeries(0.99, 0.99, 0.99)).toBeCloseTo(0.970299, 6)
  })
})

describe('availabilityParallel', () => {
  it('matches the README worked example: two 99.9% components in parallel -> 99.9999%', () => {
    const result = availabilityParallel(0.999, 0.999)
    expect(result).toBeCloseTo(0.999999, 6)
  })

  it('is higher than either individual availability (redundancy helps)', () => {
    const result = availabilityParallel(0.9, 0.9)
    expect(result).toBeGreaterThan(0.9)
    expect(result).toBeCloseTo(0.99, 5)
  })
})

describe('serviceTimeMs', () => {
  it('returns roughly baseMs at low utilization', () => {
    expect(serviceTimeMs(100, 0.1)).toBeCloseTo(111.1, 0)
  })

  it('blows up as utilization approaches capacity', () => {
    const at50 = serviceTimeMs(100, 0.5)
    const at90 = serviceTimeMs(100, 0.9)
    const at99 = serviceTimeMs(100, 0.99)
    expect(at90).toBeGreaterThan(at50)
    expect(at99).toBeGreaterThan(at90)
    // The whole pedagogical point: crossing from 90% to 99% hurts far more
    // than crossing from 50% to 90% did.
    expect(at99 - at90).toBeGreaterThan(at90 - at50)
  })

  it('is monotonically increasing with utilization', () => {
    let prev = 0
    for (let u = 0; u <= 0.99; u += 0.05) {
      const ms = serviceTimeMs(100, u)
      expect(ms).toBeGreaterThanOrEqual(prev)
      prev = ms
    }
  })

  it('stays finite even at/above 100% utilization', () => {
    expect(Number.isFinite(serviceTimeMs(100, 1))).toBe(true)
    expect(Number.isFinite(serviceTimeMs(100, 5))).toBe(true)
  })
})

describe('weightedPercentile', () => {
  it('returns the value itself for a single sample', () => {
    expect(weightedPercentile([{ value: 42, weight: 10 }], 0.5)).toBe(42)
  })

  it('p50 of two equal-weight samples returns the lower value at the boundary', () => {
    const samples = [
      { value: 10, weight: 1 },
      { value: 20, weight: 1 },
    ]
    // cumulative weight reaches the 50% mark exactly at the first (lower) sample
    expect(weightedPercentile(samples, 0.5)).toBe(10)
  })

  it('p99 is pulled toward the heavily-weighted tail', () => {
    // 90% of requests are fast (10ms), 10% are slow (1000ms) -- the classic
    // "p50 looks fine, p99 tells the real story" shape.
    const samples = [
      { value: 10, weight: 90 },
      { value: 1000, weight: 10 },
    ]
    expect(weightedPercentile(samples, 0.99)).toBe(1000)
    expect(weightedPercentile(samples, 0.5)).toBe(10)
  })

  it('ignores zero-weight samples', () => {
    const samples = [
      { value: 10, weight: 0 },
      { value: 20, weight: 5 },
    ]
    expect(weightedPercentile(samples, 0.99)).toBe(20)
  })

  it('returns 0 for an empty or all-zero-weight set', () => {
    expect(weightedPercentile([], 0.5)).toBe(0)
    expect(weightedPercentile([{ value: 5, weight: 0 }], 0.5)).toBe(0)
  })
})
