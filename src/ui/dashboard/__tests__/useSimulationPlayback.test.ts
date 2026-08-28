// Phase 10.1: component test coverage for one of the plan's named
// load-bearing components -- the shared hook every screen that can run a
// simulation (guided levels, Sandbox, case-study design) goes through.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSimulationPlayback } from '../useSimulationPlayback'
import { useAchievementsStore } from '@/game/achievementsStore'
import { constantTraffic } from '@/engine/traffic'
import { client, server } from '@/test/fixtures'
import type { SimGraph, Workload } from '@/engine/types'

const WORKING_GRAPH: SimGraph = { nodes: [client(), server()], edges: [{ id: 'client=>s', source: 'client', target: 's' }] }
const DISCONNECTED_GRAPH: SimGraph = { nodes: [client(), server()], edges: [] }
const WORKLOAD: Workload = { durationMs: 1000, tickMs: 250, trafficCurve: constantTraffic(10) }

describe('useSimulationPlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAchievementsStore.getState().clear()
  })
  afterEach(() => vi.useRealTimers())

  it('starts idle, with no result', () => {
    const { result } = renderHook(() => useSimulationPlayback())
    expect(result.current.status).toBe('idle')
    expect(result.current.result).toBeNull()
  })

  it('run() computes a result immediately and reaches "done" once playback catches up', () => {
    const { result } = renderHook(() => useSimulationPlayback())
    act(() => {
      result.current.run(WORKING_GRAPH, WORKLOAD)
    })
    // The full SimResult is computed synchronously inside run() -- only the
    // tick-by-tick *playback* of it is animated on a timer.
    expect(result.current.result).not.toBeNull()
    expect(result.current.status).toBe('running')

    act(() => {
      vi.runAllTimers()
    })
    expect(result.current.status).toBe('done')
    expect(result.current.tickIndex).toBeGreaterThan(0)
  })

  it('an unrunnable graph reports a validation error instead of throwing', () => {
    const { result } = renderHook(() => useSimulationPlayback())
    act(() => {
      // No client node at all -- runSimulation's own validateGraph rejects this.
      result.current.run({ nodes: [server()], edges: [] }, WORKLOAD)
    })
    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).not.toBeNull()
  })

  it('reset() returns to idle and clears the result', () => {
    const { result } = renderHook(() => useSimulationPlayback())
    act(() => {
      result.current.run(WORKING_GRAPH, WORKLOAD)
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.result).toBeNull()
  })

  it('a completed run is checked against achievements, exactly once per run', () => {
    renderHook(() => useSimulationPlayback()).result.current.run(WORKING_GRAPH, WORKLOAD)
    expect(useAchievementsStore.getState().totalRunsCompleted).toBe(1)
  })

  it('a disconnected graph (0 throughput) still runs cleanly -- no achievements assume otherwise', () => {
    const { result } = renderHook(() => useSimulationPlayback())
    act(() => {
      result.current.run(DISCONNECTED_GRAPH, WORKLOAD)
    })
    expect(result.current.status).toBe('running')
    expect(result.current.result?.aggregate.throughputRps).toBe(0)
  })
})
