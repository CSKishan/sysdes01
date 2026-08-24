// Validates the numbers hand-picked for each Chapter III anchor build
// actually produce the intended pass/fail through the real engine. Levels
// that start from an empty canvas (guided builds with no pre-wired
// starting graph) are tested against a hand-built "naive" graph (the
// failure the brief describes) and a hand-built "fixed" graph (the
// solution the guided steps walk the player to) -- same standard as
// chapter1.test.ts and chapter2.test.ts.

import { describe, expect, it } from 'vitest'
import { runSimulation } from '@/engine/simulate'
import { scoreRun } from '@/game/scoring'
import type { BrokerConfig, GraphEdge, GraphNode, SimGraph } from '@/engine/types'
import { CHAPTER_3_LEVELS } from '../chapter3'

function findLevel(id: string) {
  const level = CHAPTER_3_LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`level ${id} not found`)
  return level
}

function buildStage(levelId: string, stageIndex: number) {
  const level = findLevel(levelId)
  const stage = level.stages[stageIndex]
  if (stage.kind !== 'build') throw new Error(`stage ${stageIndex} of ${levelId} is not a build stage`)
  return stage
}

function client(id = 'client'): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } }
}
function server(id: string, overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number }> = {}): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: { kind: 'server', capacityRps: overrides.capacityRps ?? 50, baseMs: overrides.baseMs ?? 60, costPerHour: overrides.costPerHour ?? 8 },
  }
}
function service(id: string, overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number }> = {}): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: { kind: 'service', capacityRps: overrides.capacityRps ?? 50, baseMs: overrides.baseMs ?? 40, costPerHour: overrides.costPerHour ?? 9 },
  }
}
function loadBalancer(id: string): GraphNode {
  return { id, label: id, position: { x: 0, y: 0 }, config: { kind: 'loadBalancer', algorithm: 'roundRobin', costPerHour: 4 } }
}
function replica(id: string, overrides: Partial<{ capacityRps: number; baseMs: number }> = {}): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: {
      kind: 'replica',
      capacityRps: overrides.capacityRps ?? 50,
      baseMs: overrides.baseMs ?? 30,
      costPerHour: 10,
      replicationMode: 'async',
      staleReadFraction: 0.05,
      replicationLagMs: 100,
      syncAckWaitMs: 30,
    },
  }
}
function database(id: string, overrides: Partial<{ capacityRps: number; writeCapacityRps: number }> = {}): GraphNode {
  return {
    id,
    label: id,
    position: { x: 0, y: 0 },
    config: {
      kind: 'database',
      engine: 'sql',
      capacityRps: overrides.capacityRps ?? 60,
      baseMs: 40,
      writeCapacityRps: overrides.writeCapacityRps ?? 30,
      writeBaseMs: 50,
      indexed: false,
      costPerHour: 12,
    },
  }
}
function edge(source: string, target: string): GraphEdge {
  return { id: `${source}=>${target}`, source, target }
}

describe('ch3-message-queues: The Gift-Wrap Rush', () => {
  const stage = buildStage('ch3-message-queues', 2)

  it('a bare Gift Wrap Station errors during the spike with no queue in front', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('a queue with drainRps at or below the station capacity absorbs the same spike', () => {
    const graph: SimGraph = {
      nodes: [client(), { id: 'queue', label: 'Holding Bay', position: { x: 0, y: 0 }, config: { kind: 'queue', capacity: 200, drainRps: 40, costPerHour: 5 } }, server('gift-wrap', { capacityRps: 50, baseMs: 60 })],
      edges: [edge('client', 'queue'), edge('queue', 'gift-wrap')],
    }
    const result = runSimulation({ graph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch3-pubsub: The Price Just Changed, Everywhere', () => {
  const stage = buildStage('ch3-pubsub', 2)

  it('a load balancer splits traffic between the two boards and misses the throughput target', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('a broker copies the full stream to both boards and clears the throughput target', () => {
    const brokerConfig: BrokerConfig = { kind: 'broker', capacityRps: 100, baseMs: 15, costPerHour: 6, deliverySemantics: 'atMostOnce', retryBufferCapacity: 100 }
    const graph: SimGraph = {
      ...stage.startingGraph,
      nodes: stage.startingGraph.nodes.map((n) => (n.id === 'router' ? { ...n, config: brokerConfig } : n)),
    }
    const result = runSimulation({ graph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch3-monoliths-microservices: One Team\'s Bad Morning', () => {
  const stage = buildStage('ch3-monoliths-microservices', 2)

  it('a single Inventory instance with no backup fails the whole chain when killed', () => {
    const graph: SimGraph = {
      nodes: [client(), service('pricing', { capacityRps: 100, baseMs: 30 }), service('inventory-1', { capacityRps: 100, baseMs: 40 })],
      edges: [edge('client', 'pricing'), edge('pricing', 'inventory-1')],
    }
    const result = runSimulation({ graph, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('three more Inventory instances behind a dispatcher shrink the blast radius to roughly 1/4, even though the dead one still eats its fair share', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        service('pricing', { capacityRps: 100, baseMs: 30 }),
        loadBalancer('dispatcher'),
        service('inventory-1', { capacityRps: 100, baseMs: 40 }),
        service('inventory-2', { capacityRps: 100, baseMs: 40 }),
        service('inventory-3', { capacityRps: 100, baseMs: 40 }),
        service('inventory-4', { capacityRps: 100, baseMs: 40 }),
      ],
      edges: [
        edge('client', 'pricing'),
        edge('pricing', 'dispatcher'),
        edge('dispatcher', 'inventory-1'),
        edge('dispatcher', 'inventory-2'),
        edge('dispatcher', 'inventory-3'),
        edge('dispatcher', 'inventory-4'),
      ],
    }
    const result = runSimulation({ graph, workload: stage.workload, incidents: stage.incidents })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
    // Cascading failure specifically: pricing's own errorRps should stay
    // near zero even though the system-wide run still shows some error --
    // the failure comes from the dependency, not from pricing itself.
    const pricingTicks = result.nodeTicks.filter((n) => n.nodeId === 'pricing')
    expect(pricingTicks.every((n) => n.errorRps < 1)).toBe(true)
    // And it's a real, non-zero improvement over the single-instance case,
    // not a full fix -- round robin has no idea inventory-1 is dead.
    expect(result.aggregate.errorRate).toBeGreaterThan(0)
    expect(result.aggregate.errorRate).toBeLessThan(0.5)
  })
})

describe('ch3-cqrs: Browsing Outgrew Buying', () => {
  const stage = buildStage('ch3-cqrs', 2)

  it('one replica alone cannot keep up with the browsing traffic', () => {
    const graph: SimGraph = {
      nodes: [client(), replica('replica-1', { capacityRps: 50, baseMs: 30 }), database('ledger', { capacityRps: 60, writeCapacityRps: 30 })],
      edges: [edge('client', 'replica-1'), edge('replica-1', 'ledger')],
    }
    const result = runSimulation({ graph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('three replicas behind a dispatcher clear the same read load, writes still land on the one ledger', () => {
    const graph: SimGraph = {
      nodes: [
        client(),
        loadBalancer('dispatcher'),
        replica('replica-1', { capacityRps: 50, baseMs: 30 }),
        replica('replica-2', { capacityRps: 50, baseMs: 30 }),
        replica('replica-3', { capacityRps: 50, baseMs: 30 }),
        database('ledger', { capacityRps: 60, writeCapacityRps: 30 }),
      ],
      edges: [
        edge('client', 'dispatcher'),
        edge('dispatcher', 'replica-1'),
        edge('dispatcher', 'replica-2'),
        edge('dispatcher', 'replica-3'),
        edge('replica-1', 'ledger'),
        edge('replica-2', 'ledger'),
        edge('replica-3', 'ledger'),
      ],
    }
    const result = runSimulation({ graph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('ch3-api-gateway: One Door, Every Order', () => {
  const stage = buildStage('ch3-api-gateway', 2)

  it('an undersized gateway errors even though Checkout itself has spare capacity', () => {
    const result = runSimulation({ graph: stage.startingGraph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(false)
  })

  it('sizing the gateway for the full offered load clears the SLO', () => {
    const graph: SimGraph = {
      ...stage.startingGraph,
      nodes: stage.startingGraph.nodes.map((n) =>
        n.id === 'gateway' && n.config.kind === 'apiGateway' ? { ...n, config: { ...n.config, capacityRps: 120 } } : n,
      ),
    }
    const result = runSimulation({ graph, workload: stage.workload })
    const score = scoreRun(result, stage.slo)
    expect(score.passed).toBe(true)
  })
})

describe('sequence diagrams', () => {
  it('every SequenceDiagram step has a non-empty label', () => {
    for (const level of CHAPTER_3_LEVELS) {
      for (const stage of level.stages) {
        if (stage.kind === 'teach' && stage.sequenceDiagram) {
          for (const step of stage.sequenceDiagram.steps) {
            expect(step.label.length, `${level.id}: empty sequence step label`).toBeGreaterThan(0)
          }
        }
      }
    }
  })
})
