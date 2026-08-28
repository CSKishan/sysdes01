// Free build: whatever you've unlocked so far, an adjustable traffic level,
// no objectives, no scoring. For poking at "what if" once a level's SLO
// isn't the question anymore. Also the only place a player can inject an
// IncidentWindow (spike / node kill / network partition) outside of an
// authored level, and the only place to dial in a write-traffic mix to
// actually exercise a database/replica's write path.

import { useMemo, useRef, useState } from 'react'
import { FlaskConical, ArrowLeft, Zap, Save, FolderOpen, Trash2, Download, Upload, Image } from 'lucide-react'
import type { IncidentWindow, SimGraph } from '@/engine/types'
import { constantTraffic } from '@/engine/traffic'
import { useProgressStore } from '@/game/progressStore'
import { useSandboxDesignsStore, isValidSimGraph } from '@/game/sandboxDesignsStore'
import { CanvasEditor, type CanvasEditorHandle } from '@/ui/canvas/CanvasEditor'
import { downloadJson } from '@/ui/shared/downloadJson'
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
  const canvasRef = useRef<CanvasEditorHandle>(null)
  const jsonFileInputRef = useRef<HTMLInputElement>(null)
  const designs = useSandboxDesignsStore((s) => s.designs)
  const saveDesign = useSandboxDesignsStore((s) => s.saveDesign)
  const deleteDesign = useSandboxDesignsStore((s) => s.deleteDesign)
  const [designName, setDesignName] = useState('')
  const [designMessage, setDesignMessage] = useState<string | null>(null)
  // CanvasEditor only seeds its internal node/edge state from `graph` on
  // mount (see its own file-header comment: "give this component a fresh
  // `key`... whenever [the graph] changes so it re-seeds instead of trying
  // to diff") -- BuildStagePlayer already does this via `key={stage.title}`
  // for level-to-level graph swaps. Sandbox's canvas is otherwise a single
  // long-lived instance across the whole session, so it needs its own
  // explicit signal for the two places code *outside* CanvasEditor replaces
  // `graph` wholesale (Load, Import) -- without this, setGraph(...) updates
  // the prop but the mounted CanvasEditor never re-reads it, and the next
  // edit's onGraphChange then overwrites the freshly loaded design right
  // back with whatever was on screen before.
  const [canvasKey, setCanvasKey] = useState(0)

  const killableNodes = useMemo(() => graph.nodes.filter((n) => n.config.kind !== 'client'), [graph.nodes])

  function handleSaveDesign() {
    const name = designName.trim()
    if (!name) return
    saveDesign(name, graph)
    setDesignName('')
    setDesignMessage(`Saved "${name}".`)
  }

  function handleExportJson() {
    downloadJson(`packet-and-post-design-${new Date().toISOString().slice(0, 10)}.json`, graph)
  }

  async function handleImportJsonFile(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      // isValidSimGraph only checks enough shape to survive being
      // *rendered* -- runSimulation's own validateGraph catches semantic
      // problems (cycles, dangling edges, missing client) with a real
      // error message surfaced via playback.errorMessage the moment the
      // player hits Run.
      if (!isValidSimGraph(data)) {
        throw new Error('Not a valid design file.')
      }
      setGraph(data)
      setCanvasKey((k) => k + 1)
      setDesignMessage('Imported successfully.')
    } catch {
      setDesignMessage("Couldn't read that file — make sure it's a Packet & Post design export.")
    }
  }

  async function handleExportPng() {
    try {
      const dataUrl = await canvasRef.current?.exportPng()
      if (!dataUrl) return
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `packet-and-post-design-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    } catch {
      setDesignMessage("Couldn't export an image of the canvas.")
    }
  }

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

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink-800 pt-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-400">
            <Save className="h-3 w-3" strokeWidth={1.8} />
            Design
          </span>
          <input
            type="text"
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveDesign()}
            placeholder="Name this design…"
            className="w-40 border border-ink-600 bg-ink-950 px-2 py-1 text-xs text-ink-100 outline-none focus:border-brand-500"
          />
          <Button variant="secondary" onClick={handleSaveDesign} disabled={!designName.trim()}>
            <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
            Save
          </Button>
          {designs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {designs.map((d) => (
                <span key={d.id} className="flex items-center border border-ink-700 bg-ink-800">
                  <button
                    type="button"
                    onClick={() => {
                      setGraph(d.graph)
                      setCanvasKey((k) => k + 1)
                      setDesignMessage(`Loaded "${d.name}".`)
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-ink-200 hover:text-ink-100"
                    title={`Load "${d.name}"`}
                  >
                    <FolderOpen className="h-3 w-3 shrink-0 text-brand-400" strokeWidth={1.8} />
                    {d.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteDesign(d.id)
                      setDesignMessage(`Deleted "${d.name}".`)
                    }}
                    className="px-1.5 py-1 text-ink-500 hover:text-bad-500"
                    aria-label={`Delete "${d.name}"`}
                    title={`Delete "${d.name}"`}
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Button variant="ghost" onClick={handleExportJson}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
            Export JSON
          </Button>
          <Button variant="ghost" onClick={() => jsonFileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
            Import JSON
          </Button>
          <input
            ref={jsonFileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportJsonFile(file)
              e.target.value = ''
            }}
          />
          <Button variant="ghost" onClick={handleExportPng}>
            <Image className="h-3.5 w-3.5" strokeWidth={1.8} />
            Export PNG
          </Button>
          {designMessage && <span className="text-[11px] text-ink-500">{designMessage}</span>}
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
            key={canvasKey}
            ref={canvasRef}
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
