// Runs the simulation synchronously (the engine is fast and deterministic),
// then plays the resulting ticks back on a timer so the dashboard and canvas
// animate as if traffic were flowing live, instead of just slamming the
// player with a final number.

import { useCallback, useEffect, useRef, useState } from 'react'
import { runSimulation, SimValidationException } from '@/engine/simulate'
import type { IncidentWindow, SimGraph, SimResult, Workload } from '@/engine/types'
import type { LiveMetricsMap } from '@/ui/canvas/NodeMetricsContext'

export type PlaybackStatus = 'idle' | 'running' | 'done' | 'error'

const MIN_TICK_INTERVAL_MS = 40
const MAX_TOTAL_PLAYBACK_MS = 4000

export function useSimulationPlayback() {
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [result, setResult] = useState<SimResult | null>(null)
  const [tickIndex, setTickIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => stop, [stop])

  const run = useCallback(
    (graph: SimGraph, workload: Workload, incidents: IncidentWindow[] = []) => {
      stop()
      setErrorMessage(null)
      setResult(null)
      setTickIndex(0)

      let simResult: SimResult
      try {
        simResult = runSimulation({ graph, workload, incidents })
      } catch (err) {
        if (err instanceof SimValidationException) {
          setErrorMessage(err.errors[0]?.message ?? 'This design isn’t simulatable yet.')
        } else {
          setErrorMessage('Something went wrong running this design.')
        }
        setStatus('error')
        return
      }

      setResult(simResult)
      const tickCount = Math.max(simResult.ticks.length, 1)
      const interval = Math.max(MIN_TICK_INTERVAL_MS, Math.min(200, MAX_TOTAL_PLAYBACK_MS / tickCount))

      setStatus('running')
      let i = 0
      timerRef.current = setInterval(() => {
        i += 1
        setTickIndex(i)
        if (i >= tickCount) {
          stop()
          setStatus('done')
        }
      }, interval)
    },
    [stop],
  )

  const reset = useCallback(() => {
    stop()
    setStatus('idle')
    setResult(null)
    setTickIndex(0)
    setErrorMessage(null)
  }, [stop])

  const liveMetrics: LiveMetricsMap = {}
  if (result) {
    const tick = result.ticks[Math.min(tickIndex, result.ticks.length - 1)]
    if (tick) {
      for (const nm of result.nodeTicks) {
        if (nm.tMs === tick.tMs) {
          liveMetrics[nm.nodeId] = {
            utilization: nm.utilization,
            errorRps: nm.errorRps,
            cacheHitRate: nm.cacheHitRate,
            inboundRps: nm.inboundRps,
          }
        }
      }
    }
  }

  return {
    status,
    result,
    tickIndex,
    liveMetrics,
    errorMessage,
    run,
    reset,
    isPlaybackComplete: status === 'done',
  }
}
