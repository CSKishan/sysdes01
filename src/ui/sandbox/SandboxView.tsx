// Free build: whatever you've unlocked so far, an adjustable traffic level,
// no objectives, no scoring. For poking at "what if" once a level's SLO
// isn't the question anymore.

import { useState } from 'react'
import { FlaskConical, ArrowLeft } from 'lucide-react'
import type { SimGraph } from '@/engine/types'
import { constantTraffic } from '@/engine/traffic'
import { useProgressStore } from '@/game/progressStore'
import { CanvasEditor } from '@/ui/canvas/CanvasEditor'
import { RunControls } from '@/ui/dashboard/RunControls'
import { MetricsPanel } from '@/ui/dashboard/MetricsPanel'
import { LatencyChart } from '@/ui/dashboard/LatencyChart'
import { useSimulationPlayback } from '@/ui/dashboard/useSimulationPlayback'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

const EMPTY_GRAPH: SimGraph = {
  nodes: [{ id: 'client', label: 'Customers', config: { kind: 'client' }, position: { x: 60, y: 160 } }],
  edges: [],
}

export function SandboxView({ onBack }: { onBack: () => void }) {
  const unlockedKinds = useProgressStore((s) => s.unlockedComponentKinds)
  const [graph, setGraph] = useState<SimGraph>(EMPTY_GRAPH)
  const [rps, setRps] = useState(40)
  const playback = useSimulationPlayback()

  return (
    <div className="flex h-screen flex-col gap-3 p-4">
      <Panel className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-ink-100">
              <FlaskConical className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
              Sandbox
            </h1>
            <p className="text-sm text-ink-400">Build anything you've unlocked. No SLO, no scoring.</p>
          </div>
          <div className="flex items-center gap-4">
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
            <RunControls
              status={playback.status}
              onRun={() =>
                playback.run(graph, { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(rps) })
              }
              onReset={playback.reset}
            />
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              Map
            </Button>
          </div>
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
        <div className="flex w-64 shrink-0 flex-col gap-3">
          <Panel className="p-3">
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
              Dashboard
            </p>
            <MetricsPanel result={playback.result} tickIndex={playback.tickIndex} />
          </Panel>
          {playback.result && (
            <Panel className="p-3">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                Latency over time
              </p>
              <LatencyChart result={playback.result} tickIndex={playback.tickIndex} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
