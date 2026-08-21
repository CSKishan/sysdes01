// Deterministic PRNG so a given seed always produces the same run.
// This matters pedagogically: a player should be able to compare "before"
// and "after" designs against the exact same traffic pattern.

export type RNG = () => number

/** mulberry32 — small, fast, good-enough statistical quality for simulation. */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Turns a human-readable level id like "ch1-l2-overload" into a stable numeric seed. */
export function hashStringToSeed(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return hash >>> 0
}

export function createSeededRng(seedInput: number | string): RNG {
  const seed = typeof seedInput === 'string' ? hashStringToSeed(seedInput) : seedInput
  return mulberry32(seed)
}
