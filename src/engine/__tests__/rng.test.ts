import { describe, expect, it } from 'vitest'
import { createSeededRng, hashStringToSeed, mulberry32 } from '../rng'

describe('mulberry32', () => {
  it('is deterministic: same seed produces the same sequence', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('hashStringToSeed', () => {
  it('is deterministic for the same string', () => {
    expect(hashStringToSeed('ch1-l2-overload')).toBe(hashStringToSeed('ch1-l2-overload'))
  })

  it('different level ids hash differently (no collisions for these cases)', () => {
    expect(hashStringToSeed('ch1-l2')).not.toBe(hashStringToSeed('ch1-l3'))
  })
})

describe('createSeededRng', () => {
  it('accepts a string level id and is reproducible', () => {
    const a = createSeededRng('ch1-l7-the-shelf')
    const b = createSeededRng('ch1-l7-the-shelf')
    expect(a()).toBe(b())
  })
})
