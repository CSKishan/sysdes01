// The build surface: a React Flow canvas the player drags components onto
// and wires together. Renders as a controlled component from the outside
// (parent passes `graph`, receives `onGraphChange`), but React Flow keeps
// its own node/edge state internally for smooth dragging -- give this
// component a fresh `key` from the parent whenever the level stage changes
// so it re-seeds from the new starting graph instead of trying to diff.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ComponentKind, SimGraph } from '@/engine/types'
import { createDefaultNodeConfig } from '@/engine/components'
import { NODE_TYPES } from './ComponentNode'
import { NodeMetricsProvider, type LiveMetricsMap } from './NodeMetricsContext'
import { Palette, PALETTE_DRAG_MIME } from './Palette'
import { NodeInspector } from './NodeInspector'
import { fromSimGraph, nextEdgeId, nextNodeId, toSimGraph, type FlowNode } from './flowAdapters'
import { useSettingsStore } from '@/game/settingsStore'
import { useThemeColor } from '@/ui/shared/useThemeColor'

interface CanvasEditorProps {
  graph: SimGraph
  onGraphChange: (graph: SimGraph) => void
  unlockedKinds: ComponentKind[]
  liveMetrics?: LiveMetricsMap
  showPalette?: boolean
  hint?: string
  /** Node ids (besides the client, always locked) that can't be deleted. */
  lockedNodeIds?: string[]
}

export function CanvasEditor(props: CanvasEditorProps) {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner {...props} />
    </ReactFlowProvider>
  )
}

function CanvasEditorInner({
  graph,
  onGraphChange,
  unlockedKinds,
  liveMetrics = {},
  showPalette = true,
  hint,
  lockedNodeIds = [],
}: CanvasEditorProps) {
  const initial = fromSimGraph(graph)
  for (const node of initial.nodes) {
    if (lockedNodeIds.includes(node.id)) node.data.locked = true
  }
  const [nodes, setNodes] = useState<FlowNode[]>(initial.nodes)
  const [edges, setEdges] = useState(initial.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const theme = useSettingsStore((s) => s.theme)
  // React Flow's own Controls/MiniMap chrome and this dot grid render as
  // literal SVG/CSS attributes, not Tailwind classes, so they need the
  // theme wired in directly instead of picking it up from the cascade.
  const backgroundDotColor = useThemeColor('--color-ink-700')

  // Report graph changes to the parent from an effect, not from inside a
  // setState updater -- calling another component's setState synchronously
  // during this component's own state update triggers React's
  // "Cannot update a component while rendering a different component"
  // warning, since it can happen mid-render rather than after commit.
  useEffect(() => {
    onGraphChange(toSimGraph(nodes, edges))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  const onNodesChange: OnNodesChange<FlowNode> = useCallback((changes) => {
    setNodes((prev) => applyNodeChanges(changes, prev))
  }, [])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((prev) => applyEdgeChanges(changes, prev))
  }, [])

  const onConnect: OnConnect = useCallback((connection) => {
    setEdges((prev) => addEdge({ ...connection, id: nextEdgeId(connection.source, connection.target) }, prev))
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const kind = event.dataTransfer.getData(PALETTE_DRAG_MIME) as ComponentKind
      if (!kind) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const id = nextNodeId(kind)
      const newNode: FlowNode = {
        id,
        type: 'component',
        position,
        data: { label: labelFor(kind), config: createDefaultNodeConfig(kind) },
      }
      setNodes((prev) => [...prev, newNode])
    },
    [screenToFlowPosition],
  )

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  return (
    <div className="flex h-full gap-3">
      {showPalette && <Palette unlockedKinds={unlockedKinds} />}

      <div
        ref={wrapperRef}
        className="corner-marks relative min-w-0 flex-1 overflow-hidden border border-ink-700 bg-ink-950"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <span className="corner-mark-tr" />
        <span className="corner-mark-bl" />
        {hint && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 border border-brand-500 bg-brand-500/90 px-4 py-1.5 font-mono text-xs font-medium text-ink-950">
            {hint}
          </div>
        )}
        <NodeMetricsProvider value={liveMetrics}>
          <ReactFlow<FlowNode>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={NODE_TYPES}
            colorMode={theme}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} color={backgroundDotColor} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </NodeMetricsProvider>
      </div>

      {selectedNode && (
        <NodeInspector
          nodeId={selectedNode.id}
          label={selectedNode.data.label}
          config={selectedNode.data.config}
          locked={selectedNode.data.locked}
          onChange={(config) => {
            setNodes((prev) =>
              prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, config } } : n)),
            )
          }}
          onDelete={() => {
            setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id))
            setEdges((prev) => prev.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
            setSelectedNodeId(null)
          }}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  )
}

function labelFor(kind: ComponentKind): string {
  switch (kind) {
    case 'server':
      return 'Depot'
    case 'loadBalancer':
      return 'Dispatcher'
    case 'cache':
      return 'Shelf'
    case 'client':
      return 'Customers'
    case 'database':
      return 'Ledger'
    case 'replica':
      return 'Ledger copy'
    case 'shardRouter':
      return 'Sorting desk'
    case 'queue':
      return 'Holding bay'
    case 'broker':
      return 'Dispatch board'
    case 'apiGateway':
      return 'Reception desk'
    case 'service':
      return 'Courier team'
    case 'rateLimiter':
      return 'Intake window'
    case 'circuitBreaker':
      return 'Trip switch'
  }
}
