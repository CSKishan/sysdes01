// Converts between the engine's plain SimGraph and React Flow's node/edge
// shape. Kept as pure functions so the canvas component doesn't need to
// know engine internals and the engine never imports React Flow types.

import type { Edge, Node } from '@xyflow/react'
import type { EdgeRetryConfig, NodeConfig, SimGraph } from '@/engine/types'

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  config: NodeConfig
  /** Nodes placed by guided-mode steps or level setup that the player
   * shouldn't be able to delete (e.g. the client). */
  locked?: boolean
  /** See GraphNode.region -- carried through so a canvas round-trip doesn't
   * silently drop it (there's no interactive editor for it yet; it's only
   * ever set by content authors on a stage's startingGraph). */
  region?: string
}

export interface FlowEdgeData extends Record<string, unknown> {
  /** See GraphEdge.crossRegionLatencyMs / GraphEdge.retry -- carried through
   * so a canvas round-trip doesn't silently drop them (no interactive editor
   * for either yet; author-only content properties). */
  crossRegionLatencyMs?: number
  retry?: EdgeRetryConfig
}

export type FlowNode = Node<FlowNodeData, 'component'>
export type FlowEdge = Edge<FlowEdgeData>

export function toSimGraph(nodes: FlowNode[], edges: FlowEdge[]): SimGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      config: n.data.config,
      position: n.position,
      region: n.data.region,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      crossRegionLatencyMs: e.data?.crossRegionLatencyMs,
      retry: e.data?.retry,
    })),
  }
}

export function fromSimGraph(graph: SimGraph): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: 'component',
      position: n.position,
      data: { label: n.label, config: n.config, locked: n.config.kind === 'client', region: n.region },
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      data: { crossRegionLatencyMs: e.crossRegionLatencyMs, retry: e.retry },
    })),
  }
}

let idCounter = 0
export function nextNodeId(kind: string): string {
  idCounter += 1
  return `${kind}-${idCounter}-${Date.now().toString(36)}`
}

export function nextEdgeId(source: string, target: string): string {
  return `${source}=>${target}`
}
