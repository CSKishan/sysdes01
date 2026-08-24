// A small, deterministic hash-ring implementation used for exactly one
// number: what fraction of keys have to move when the shard count changes.
// That's the real, textbook distinction between naive modulo routing and
// consistent hashing -- consistent hashing does NOT balance load any
// better than modulo (a hot key is still pinned to one shard either way;
// see shardRouter's routing in simulate.ts for the hot-shard-imbalance
// lesson instead). Its actual benefit is that adding or removing a shard
// only reshuffles ~1/N of keys instead of nearly all of them.

import { hashStringToSeed, mulberry32 } from './rng'

const RING_SIZE = 2 ** 32
const VIRTUAL_NODES_PER_SHARD = 100

interface RingEntry {
  position: number
  shardIndex: number
}

/** hashStringToSeed alone is a simple djb2-style hash, good enough for
 * seeding but NOT well-distributed enough to place ~100 ring positions per
 * shard uniformly -- measured: with positions taken directly from it, one
 * shard's 100 virtual nodes could cluster into <1% of the ring while
 * another's covered 35%, wrecking the entire "resize moves few keys"
 * property this module exists to demonstrate. Seeding mulberry32 (a real
 * PRNG) from the hash and drawing from that instead fixes it: measured
 * per-shard coverage lands within a few percent of the ideal 1/shardCount.
 *
 * Exported so a caller doing many lookups against the same shard count
 * (e.g. simulate.ts routing a whole keyspace through one shardRouter) can
 * build the ring once and reuse it, instead of paying shardCount*100 RNG
 * draws + a sort on every single lookup via consistentHashOwner. */
export function buildRing(shardCount: number): RingEntry[] {
  const ring: RingEntry[] = []
  for (let shardIndex = 0; shardIndex < shardCount; shardIndex++) {
    const rng = mulberry32(hashStringToSeed(`shard-${shardIndex}`))
    for (let replica = 0; replica < VIRTUAL_NODES_PER_SHARD; replica++) {
      ring.push({ position: Math.floor(rng() * RING_SIZE), shardIndex })
    }
  }
  ring.sort((a, b) => a.position - b.position)
  return ring
}

/** The shard owning `keyPosition`: the first virtual node clockwise from
 * it, wrapping around to the first entry if none is further clockwise.
 * Throws on an empty ring (shardCount 0) rather than crashing on
 * `ring[0]` being undefined -- there is no valid owner to return, and a
 * clear error is easier to diagnose than "Cannot read properties of
 * undefined". */
export function ownerOnRing(ring: RingEntry[], keyPosition: number): number {
  if (ring.length === 0) {
    throw new Error('ownerOnRing: empty ring -- shardCount must be >= 1')
  }
  for (const entry of ring) {
    if (entry.position >= keyPosition) return entry.shardIndex
  }
  return ring[0].shardIndex
}

export function keyPosition(key: number): number {
  return Math.floor(mulberry32(hashStringToSeed(`key-${key}`))() * RING_SIZE)
}

export function moduloOwner(shardCount: number, key: number): number {
  if (shardCount <= 0) {
    throw new Error('moduloOwner: shardCount must be >= 1')
  }
  return key % shardCount
}

/** Convenience single-lookup API. For repeated lookups against the same
 * shardCount (a whole keyspace, a whole simulation run), call `buildRing`
 * once and use `ownerOnRing` directly instead -- see its doc comment. */
export function consistentHashOwner(shardCount: number, key: number): number {
  return ownerOnRing(buildRing(shardCount), keyPosition(key))
}

export interface RebalanceResult {
  strategy: 'modulo' | 'consistentHash'
  /** Fraction of the sampled keyspace whose owning shard changed, 0..1. */
  movedFraction: number
}

/**
 * Compares how many of `sampleSize` synthetic keys change owning shard when
 * the cluster is resized from `oldShardCount` to `newShardCount`, under
 * each strategy. Deterministic (same inputs -> same output every time).
 */
export function compareRebalanceOnResize(
  oldShardCount: number,
  newShardCount: number,
  sampleSize = 2000,
): { modulo: RebalanceResult; consistentHash: RebalanceResult } {
  const oldRing = buildRing(oldShardCount)
  const newRing = buildRing(newShardCount)

  let moduloMoved = 0
  let hashMoved = 0
  for (let key = 0; key < sampleSize; key++) {
    if (moduloOwner(oldShardCount, key) !== moduloOwner(newShardCount, key)) moduloMoved++
    const pos = keyPosition(key)
    if (ownerOnRing(oldRing, pos) !== ownerOnRing(newRing, pos)) hashMoved++
  }

  return {
    modulo: { strategy: 'modulo', movedFraction: moduloMoved / sampleSize },
    consistentHash: { strategy: 'consistentHash', movedFraction: hashMoved / sampleSize },
  }
}
