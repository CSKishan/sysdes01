// Shared formatting + workload-derivation helpers for every case study --
// factored out since all five need the identical "scale a huge real-world
// rps down to something the simulator/canvas sliders can actually be
// designed against, while preserving the read/write ratio" logic and the
// same byte/rps unit formatting.

import { constantTraffic } from '@/engine/traffic'
import type { Workload } from '@/engine/types'

/** The simulator's own node-capacity sliders top out in the low hundreds
 * (matching every other chapter's levels) -- a literal 4,000 rps design
 * would force nothing but shard-counting with no room to reason about
 * trade-offs. Scaling preserves the read:write ratio the player computed,
 * just at a size the canvas can be meaningfully designed against. */
const SIMULATED_RPS_CAP = 150

export function deriveScaledWorkload(readRps: number, writeRps: number): Workload {
  const total = readRps + writeRps
  const scale = total > SIMULATED_RPS_CAP ? SIMULATED_RPS_CAP / total : 1
  const scaledTotal = total * scale
  const writeFraction = total > 0 ? (writeRps * scale) / scaledTotal : 0
  return { durationMs: 3000, tickMs: 250, trafficCurve: constantTraffic(scaledTotal), writeFraction }
}

export function formatRps(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K/s` : `${Math.round(n)}/s`
}

export function formatBytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = n
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`
}

export function formatBytesPerSecond(n: number): string {
  return `${formatBytes(n)}/s`
}

export const SECONDS_PER_MONTH = 30 * 24 * 3600
export const SECONDS_PER_DAY = 24 * 3600
export const DAYS_PER_YEAR = 365
