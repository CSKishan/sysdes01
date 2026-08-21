// Converts between the engine's plain SimGraph and React Flow's node/edge
// shape. Kept as pure functions so the canvas component doesn't need to
// know engine internals and the engine never imports React Flow types.

import type { Edge, Node } from '@xyflow/react'
import type { NodeConfig, SimGraph } from '@/engine/types'

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  config: NodeConfig
  /** Nodes placed by guided-mode steps or level setup that the player
   * shouldn't be able to delete (e.g. the client). */
  locked?: boolean
}

export type FlowNode = Node<FlowNodeData, 'component'>
export type FlowEdge = Edge

export function toSimGraph(nodes: FlowNode[], edges: FlowEdge[]): SimGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      config: n.data.config,
      position: n.position,
    })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }
}

export function fromSimGraph(graph: SimGraph): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: 'component',
      position: n.position,
      data: { label: n.label, config: n.config, locked: n.config.kind === 'client' },
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
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
