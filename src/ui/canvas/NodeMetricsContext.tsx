// Live per-node metrics, read by the custom node renderer. Kept in a
// context (rather than baked into React Flow node data) so a metrics tick
// doesn't force React Flow to rebuild its entire node array 4x/second.

import { createContext, useContext } from 'react'

export interface LiveNodeMetric {
  utilization: number
  errorRps: number
  cacheHitRate?: number
  inboundRps: number
  queueDepth?: number
}

export type LiveMetricsMap = Record<string, LiveNodeMetric>

const NodeMetricsContext = createContext<LiveMetricsMap>({})

export const NodeMetricsProvider = NodeMetricsContext.Provider

export function useNodeMetric(nodeId: string): LiveNodeMetric | undefined {
  const map = useContext(NodeMetricsContext)
  return map[nodeId]
}
