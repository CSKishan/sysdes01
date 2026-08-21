// Models "some things get asked for way more than others" — the locality of
// reference a cache depends on. A Zipf distribution over a keyspace gives us
// a closed-form, testable prediction for cache hit rate under an LRU-like
// policy: the hit rate for a cache holding the C most popular keys is just
// the sum of the top-C probabilities (the IRM/LRU steady-state approximation).

/**
 * Returns the probability of each of `n` keys under a Zipf distribution with
 * skew `s`, sorted descending (index 0 = most popular key).
 *
 * s = 0   -> uniform (no locality at all, caching can't help)
 * s = 1   -> classic Zipf ("80/20"-ish)
 * s > 1.5 -> a handful of keys dominate almost all traffic
 */
export function zipfProbabilities(n: number, s: number): number[] {
  if (n <= 0) return []
  const weights = new Array<number>(n)
  let total = 0
  for (let rank = 1; rank <= n; rank++) {
    const w = 1 / Math.pow(rank, s)
    weights[rank - 1] = w
    total += w
  }
  return weights.map((w) => w / total)
}

/**
 * Predicted steady-state hit rate for a cache that can hold `cacheSize` of
 * the `n` keys, under Zipf skew `s`. This is what the engine uses each tick,
 * and what the Vitest suite checks the simulator's measured hit rate against.
 */
export function predictedCacheHitRate(n: number, s: number, cacheSize: number): number {
  if (n <= 0 || cacheSize <= 0) return 0
  const probs = zipfProbabilities(n, s)
  const held = Math.min(cacheSize, n)
  let hitRate = 0
  for (let i = 0; i < held; i++) hitRate += probs[i]
  return hitRate
}
