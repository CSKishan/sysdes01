// Free build: whatever you've unlocked so far, an adjustable traffic level,
// no objectives, no scoring. For poking at "what if" once a level's SLO
// isn't the question anymore. Also the only place a player can inject an
// IncidentWindow (spike / node kill / network partition) outside of an
// authored level, and the only place to dial in a write-traffic mix to
// actually exercise a database/replica's write path.

import { useMemo, useState } from 'react'
import { FlaskConical, ArrowLeft, Zap } from 'lucide-react'
import type { IncidentWindow, SimGraph } from '@/engine/types'
import { constantTraffic } from '@/engine/traffic'
import { useProgressStore } from '@/game/progressStore'
import { CanvasEditor } from '@/ui/canvas/CanvasEditor'
import { RunControls } from '@/ui/dashboard/RunControls'
import { ALL_METRICS } from '@/ui/dashboard/MetricsPanel'
import { SimulationDashboardSidebar } from '@/ui/dashboard/SimulationDashboardSidebar'
import { useSimulationPlayback } from '@/ui/dashboard/useSimulationPlayback'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

const EMPTY_GRAPH: SimGraph = {
  nodes: [{ id: 'client', label: 'Customers', config: { kind: 'client' }, position: { x: 60, y: 160 } }],
  edges: [],
}

const DURATION_MS = 6000

type ChaosMode = 'none' | 'spike' | 'kill' | 'partition'

export function SandboxView({ onBack }: { onBack: () => void }) {
  const unlockedKinds = useProgressStore((s) => s.unlockedComponentKinds)
  const [graph, setGraph] = useState<SimGraph>(EMPTY_GRAPH)
  const [rps, setRps] = useState(40)
  const [writePercent, setWritePercent] = useState(0)
  const [chaosMode, setChaosMode] = useState<ChaosMode>('none')
  const [chaosTargetId, setChaosTargetId] = useState<string>('')
  const playback = useSimulationPlayback()

  const killableNodes = useMemo(() => graph.nodes.filter((n) => n.config.kind !== 'client'), [graph.nodes])

  function buildIncidents(): IncidentWindow[] {
    // Fires during the middle third of the run, so a player watching
    // playback sees a clear before / during / after.
    const startMs = Math.round(DURATION_MS / 3)
    const endMs = Math.round((DURATION_MS * 2) / 3)
    if (chaosMode === 'spike') {
      return [{ id: 'chaos', label: 'Traffic spike', startMs, endMs, trafficMultiplier: 3 }]
    }
    if (chaosMode === 'kill' && chaosTargetId) {
      return [{ id: 'chaos', label: 'Node outage', startMs, endMs, killNodeIds: [chaosTargetId] }]
    }
    if (chaosMode === 'partition' && chaosTargetId) {
      return [{ id: 'chaos', label: 'Network partition', startMs, endMs, severedEdgeIds: [chaosTargetId] }]
    }
    return []
  }

  function handleRun() {
    playback.run(
      graph,
      {
        durationMs: DURATION_MS,
        tickMs: 250,
        trafficCurve: constantTraffic(rps),
        writeFraction: writePercent / 100,
      },
      buildIncidents(),
    )
  }

  return (
    <div className="flex h-screen flex-col gap-3 p-4">
      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-ink-100">
              <FlaskConical className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
              Sandbox
            </h1>
            <p className="text-sm text-ink-400">Build anything you've unlocked. No SLO, no scoring.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-300">
              Traffic
              <input
                type="range"
                min={5}
                max={400}
                step={5}
                value={rps}
                onChange={(e) => setRps(Number(e.target.value))}
              />
              <span className="w-16 font-mono tabular-nums">{rps} rps</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-300">
              Writes
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={writePercent}
                onChange={(e) => setWritePercent(Number(e.target.value))}
              />
              <span className="w-10 font-mono tabular-nums">{writePercent}%</span>
            </label>
            <RunControls status={playback.status} onRun={handleRun} onReset={playback.reset} />
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              Map
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink-800 pt-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-400">
            <Zap className="h-3 w-3" strokeWidth={1.8} />
            Chaos
          </span>
          <select
            className="border border-ink-600 bg-ink-950 px-2 py-1 text-xs text-ink-100 outline-none focus:border-brand-500"
            value={chaosMode}
            onChange={(e) => {
              setChaosMode(e.target.value as ChaosMode)
              setChaosTargetId('')
            }}
          >
            <option value="none">None</option>
            <option value="spike">Traffic spike (3x)</option>
            <option value="kill">Node outage</option>
            <option value="partition">Network partition</option>
          </select>
          {chaosMode === 'kill' && (
            <select
              className="border border-ink-600 bg-ink-950 px-2 py-1 text-xs text-ink-100 outline-none focus:border-brand-500"
              value={chaosTargetId}
              onChange={(e) => setChaosTargetId(e.target.value)}
            >
              <option value="">Choose a node…</option>
              {killableNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          )}
          {chaosMode === 'partition' && (
            <select
              className="border border-ink-600 bg-ink-950 px-2 py-1 text-xs text-ink-100 outline-none focus:border-brand-500"
              value={chaosTargetId}
              onChange={(e) => setChaosTargetId(e.target.value)}
            >
              <option value="">Choose a wire…</option>
              {graph.edges.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id}
                </option>
              ))}
            </select>
          )}
          {chaosMode !== 'none' && (
            <span className="text-[11px] text-ink-500">
              Hits during the middle third of the run — watch the dashboard live.
            </span>
          )}
        </div>

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
            onGraphChange={setGraph}
            unlockedKinds={unlockedKinds}
            liveMetrics={playback.liveMetrics}
          />
        </div>
        <SimulationDashboardSidebar
          result={playback.result}
          tickIndex={playback.tickIndex}
          visibleMetrics={ALL_METRICS}
          showQueueDepth
        />
      </div>
    </div>
  )
}
