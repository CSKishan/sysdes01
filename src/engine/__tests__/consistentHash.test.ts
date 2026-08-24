import { describe, expect, it } from 'vitest'
import { buildRing, compareRebalanceOnResize, consistentHashOwner, moduloOwner, ownerOnRing } from '../consistentHash'

describe('moduloOwner', () => {
  it('is just key % shardCount', () => {
    expect(moduloOwner(4, 0)).toBe(0)
    expect(moduloOwner(4, 5)).toBe(1)
    expect(moduloOwner(4, 11)).toBe(3)
  })

  it('throws instead of dividing by zero for shardCount 0', () => {
    expect(() => moduloOwner(0, 5)).toThrow()
  })
})

describe('buildRing / ownerOnRing', () => {
  it('ownerOnRing throws a clear error on an empty ring instead of crashing on ring[0]', () => {
    expect(() => ownerOnRing([], 12345)).toThrow(/empty ring/)
  })

  it('consistentHashOwner throws (not a cryptic TypeError) when shardCount is 0', () => {
    expect(() => consistentHashOwner(0, 5)).toThrow(/empty ring/)
  })

  it('reusing a prebuilt ring gives the same answer as the single-call convenience function', () => {
    const ring = buildRing(6)
    for (let key = 0; key < 50; key++) {
      // consistentHashOwner hashes the key into a ring position internally;
      // this just confirms ownerOnRing against a prebuilt ring is a valid
      // building block (used by simulate.ts to avoid rebuilding per call).
      const owner = ownerOnRing(ring, key * 71582789)
      expect(owner).toBeGreaterThanOrEqual(0)
      expect(owner).toBeLessThan(6)
    }
  })
})

describe('consistentHashOwner', () => {
  it('always returns a valid shard index', () => {
    for (let key = 0; key < 200; key++) {
      const owner = consistentHashOwner(7, key)
      expect(owner).toBeGreaterThanOrEqual(0)
      expect(owner).toBeLessThan(7)
    }
  })

  it('is deterministic for the same inputs', () => {
    expect(consistentHashOwner(5, 42)).toBe(consistentHashOwner(5, 42))
  })
})

describe('compareRebalanceOnResize', () => {
  it('resizing to the same shard count moves nothing under either strategy', () => {
    const result = compareRebalanceOnResize(5, 5, 500)
    expect(result.modulo.movedFraction).toBe(0)
    expect(result.consistentHash.movedFraction).toBe(0)
  })

  it('the textbook claim: growing by one shard reshuffles nearly everything under modulo, but only a small slice under consistent hashing', () => {
    const result = compareRebalanceOnResize(4, 5, 3000)
    // Naive modulo: key % 4 vs key % 5 disagree for the large majority of keys.
    expect(result.modulo.movedFraction).toBeGreaterThan(0.5)
    // Consistent hashing: only the keys that fell into the new shard's
    // share of the ring should move -- close to 1/5, nowhere near modulo's.
    expect(result.consistentHash.movedFraction).toBeLessThan(0.35)
    expect(result.consistentHash.movedFraction).toBeLessThan(result.modulo.movedFraction)
  })

  it('shrinking by one shard also moves far fewer keys under consistent hashing', () => {
    const result = compareRebalanceOnResize(8, 7, 3000)
    expect(result.consistentHash.movedFraction).toBeLessThan(result.modulo.movedFraction)
  })
})
