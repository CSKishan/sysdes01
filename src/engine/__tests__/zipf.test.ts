import { describe, expect, it } from 'vitest'
import { predictedCacheHitRate, zipfProbabilities } from '../zipf'

describe('zipfProbabilities', () => {
  it('sums to 1', () => {
    const probs = zipfProbabilities(1000, 1.1)
    const total = probs.reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1, 6)
  })

  it('is monotonically decreasing (more popular keys rank first)', () => {
    const probs = zipfProbabilities(100, 1.2)
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]).toBeLessThanOrEqual(probs[i - 1])
    }
  })

  it('is uniform when s = 0', () => {
    const probs = zipfProbabilities(10, 0)
    for (const p of probs) expect(p).toBeCloseTo(0.1, 6)
  })

  it('returns an empty array for n <= 0', () => {
    expect(zipfProbabilities(0, 1)).toEqual([])
  })
})

describe('predictedCacheHitRate', () => {
  it('is 0 with no cache capacity', () => {
    expect(predictedCacheHitRate(1000, 1.1, 0)).toBe(0)
  })

  it('is 1 when the cache can hold the entire keyspace', () => {
    expect(predictedCacheHitRate(50, 1.1, 50)).toBeCloseTo(1, 6)
    expect(predictedCacheHitRate(50, 1.1, 1000)).toBeCloseTo(1, 6)
  })

  it('under uniform popularity (s=0), hit rate is exactly proportional to cache size', () => {
    // This is the case with zero locality of reference: caching only helps
    // exactly as much as the fraction of the keyspace you can hold.
    expect(predictedCacheHitRate(1000, 0, 100)).toBeCloseTo(0.1, 6)
    expect(predictedCacheHitRate(1000, 0, 500)).toBeCloseTo(0.5, 6)
  })

  it('higher skew gives a higher hit rate for the same cache size', () => {
    const lowSkew = predictedCacheHitRate(1000, 0.3, 50)
    const highSkew = predictedCacheHitRate(1000, 1.5, 50)
    expect(highSkew).toBeGreaterThan(lowSkew)
  })

  it('increases monotonically with cache size', () => {
    let prev = 0
    for (const size of [10, 50, 100, 500, 1000]) {
      const rate = predictedCacheHitRate(1000, 1.1, size)
      expect(rate).toBeGreaterThanOrEqual(prev)
      prev = rate
    }
  })
})
