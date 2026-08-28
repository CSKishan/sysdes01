// Phase 10.1: component test coverage for one of the plan's named
// load-bearing components. Uses a real authored stage (ch1-l1) to prove
// the "nothing built yet" pre-run render, and a synthetic-but-real-shaped
// stage (a trivially-passing client->server graph, same pattern the
// engine's own test suite uses) to reliably exercise the passing-run path
// without depending on which authored level's *starting* graph happens to
// already pass -- most guided stages deliberately start empty, since
// placing the first node is the exercise.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BuildStagePlayer } from '../BuildStagePlayer'
import { getLevel } from '@/content/registry'
import { constantTraffic } from '@/engine/traffic'
import { client, server } from '@/test/fixtures'
import type { BuildStage, DebriefContent } from '@/content/types'

function firstBuildStage(levelId: string): BuildStage {
  const level = getLevel(levelId)
  const stage = level?.stages.find((s): s is BuildStage => s.kind === 'build')
  if (!stage) throw new Error(`${levelId} has no build stage`)
  return stage
}

const FAKE_DEBRIEF: DebriefContent = {
  successBody: ['Nice work.'],
  failureBody: ['Try again.'],
  readmeQuote: { text: 'A test quote.', source: 'Test · Fixture' },
  realWorldExamples: ['A test system'],
  interviewPhrase: '"A test phrase."',
  ruleOfThumb: 'A test rule.',
}

// A stage whose *starting* graph already clears its own SLO -- unlike most
// authored guided stages (which deliberately start empty, since placing
// the first node is the exercise), this lets the passing-run path be
// tested without also having to simulate drag-and-drop canvas interactions.
function passingStage(): BuildStage {
  return {
    kind: 'build',
    mode: 'solo',
    title: 'Test stage',
    brief: ['Test brief.'],
    startingGraph: { nodes: [client(), server()], edges: [{ id: 'client=>s', source: 'client', target: 's' }] },
    unlockedKinds: ['client', 'server'],
    workload: { durationMs: 1000, tickMs: 250, trafficCurve: constantTraffic(10) },
    slo: { maxP99Ms: 500, maxErrorRate: 0.5, minThroughputRps: 1 },
    debrief: FAKE_DEBRIEF,
  }
}

describe('BuildStagePlayer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders the stage title and brief before any run', () => {
    const stage = firstBuildStage('ch1-l1')
    render(<BuildStagePlayer stage={stage} onStageComplete={() => {}} />)
    expect(screen.getByText(stage.title)).toBeInTheDocument()
  })

  it('running the stage transitions the control to "Running…"', () => {
    const stage = firstBuildStage('ch1-l1')
    render(<BuildStagePlayer stage={stage} onStageComplete={() => {}} />)
    fireEvent.click(screen.getByText('▶ Run'))
    expect(screen.getByText('Running…')).toBeInTheDocument()
  })

  it('a passing run reaches the debrief screen and calls onStageComplete on Continue', () => {
    const onStageComplete = vi.fn()
    render(<BuildStagePlayer stage={passingStage()} onStageComplete={onStageComplete} />)

    fireEvent.click(screen.getByText('▶ Run'))
    act(() => {
      vi.runAllTimers()
    })

    expect(screen.getByText('SLO met')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Continue'))
    expect(onStageComplete).toHaveBeenCalledTimes(1)
    expect(onStageComplete.mock.calls[0][0].passed).toBe(true)
  })

  it("challenge mode reports a passing run's cost via onChallengeComplete, once", () => {
    const onChallengeComplete = vi.fn()
    render(
      <BuildStagePlayer stage={passingStage()} onStageComplete={() => {}} hideGuidance onChallengeComplete={onChallengeComplete} />,
    )

    fireEvent.click(screen.getByText('▶ Run'))
    act(() => {
      vi.runAllTimers()
    })

    expect(onChallengeComplete).toHaveBeenCalledTimes(1)
    expect(onChallengeComplete.mock.calls[0][0].costPerHour).toBeGreaterThan(0)
  })
})
