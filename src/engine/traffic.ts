// Small helpers for authoring level traffic curves in plain language.

import type { TrafficCurve } from './types'

export function constantTraffic(rps: number): TrafficCurve {
  return () => rps
}

/** Linearly ramps from `fromRps` to `toRps` over the whole run. */
export function rampTraffic(fromRps: number, toRps: number, durationMs: number): TrafficCurve {
  return (tMs: number) => {
    const progress = Math.min(Math.max(tMs / durationMs, 0), 1)
    return fromRps + (toRps - fromRps) * progress
  }
}

/** A base level of traffic with a spike during [spikeStartMs, spikeEndMs). */
export function spikeTraffic(
  baseRps: number,
  spikeRps: number,
  spikeStartMs: number,
  spikeEndMs: number,
): TrafficCurve {
  return (tMs: number) => (tMs >= spikeStartMs && tMs < spikeEndMs ? spikeRps : baseRps)
}
