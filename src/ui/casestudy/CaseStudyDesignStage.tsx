// The open-canvas design step (Phase 8.3): no target graph, every kind the
// player has unlocked so far is available. Forked from BuildStagePlayer's
// shell (CanvasEditor + RunControls + dashboard) rather than reusing it
// directly -- BuildStagePlayer hard-requires stage.startingGraph/slo and
// always ends in scoreRun, neither of which applies here. The player can
// run as many times as they like; "Review my design" (not a passing run)
// is what advances to the rubric.

import { useState } from 'react'
import type { SimGraph, Workload } from '@/engine/types'
import type { DesignStage as DesignStageContent } from '@/content/caseStudies/types'
import { useProgressStore } from '@/game/progressStore'
import { CanvasEditor } from '@/ui/canvas/CanvasEditor'
import { RunControls } from '@/ui/dashboard/RunControls'
import { SimulationDashboardSidebar } from '@/ui/dashboard/SimulationDashboardSidebar'
import { useSimulationPlayback } from '@/ui/dashboard/useSimulationPlayback'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'
import { RichParagraphs } from '@/ui/shared/RichText'

const EMPTY_GRAPH: SimGraph = { nodes: [{ id: 'client', label: 'Customers', config: { kind: 'client' }, position: { x: 60, y: 160 } }], edges: [] }

export function CaseStudyDesignStage({
  stage,
  workload,
  initialGraph,
  onReview,
}: {
  stage: DesignStageContent
  workload: Workload
  /** The graph the player last submitted for review, if they're coming back
   * via "Back to design" -- picks up where they left off instead of
   * resetting to an empty canvas. */
  initialGraph?: SimGraph | null
  onReview: (graph: SimGraph, result: ReturnType<typeof useSimulationPlayback>['result']) => void
}) {
  const [graph, setGraph] = useState<SimGraph>(initialGraph ?? EMPTY_GRAPH)
  // Tracks whether `graph` has changed since the run that produced
  // `playback.result`, so a stale result from before an edit can't be
  // submitted for review alongside the (now different) live graph.
  const [resultIsStale, setResultIsStale] = useState(false)
  const playback = useSimulationPlayback()
  const unlockedKinds = useProgressStore((s) => s.unlockedComponentKinds)

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3 p-4">
      <Panel className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-100">Design</h2>
            <RichParagraphs paragraphs={stage.brief} className="mt-1 max-w-2xl text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <RunControls
              status={playback.status}
              onRun={() => {
                setResultIsStale(false)
                playback.run(graph, workload, stage.incidents)
              }}
              onReset={playback.reset}
            />
            <Button onClick={() => onReview(graph, resultIsStale ? null : playback.result)}>
              Review my design
            </Button>
          </div>
        </div>
        {resultIsStale && playback.result && (
          <p className="mt-2 border border-warn-500/40 bg-warn-500/10 px-3 py-2 text-sm text-warn-500">
            You've changed the design since the last run — run it again before reviewing, or the
            "clears the estimated load" check won't count.
          </p>
        )}
        {playback.errorMessage && (
          <p className="mt-2 border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-sm text-bad-500">
            {playback.errorMessage}
          </p>
        )}
      </Panel>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <CanvasEditor
            graph={graph}
            onGraphChange={(g) => {
              setGraph(g)
              setResultIsStale(true)
            }}
            unlockedKinds={unlockedKinds}
            liveMetrics={playback.liveMetrics}
            lockedNodeIds={['client']}
          />
        </div>

        <SimulationDashboardSidebar result={playback.result} tickIndex={playback.tickIndex} />
      </div>
    </div>
  )
}
