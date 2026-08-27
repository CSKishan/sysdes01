// Shared graph-node builders for component/hook tests that need a minimal
// real SimGraph -- client()/server() were independently copy-pasted into
// BuildStagePlayer.test.tsx and useSimulationPlayback.test.ts; this is the
// one place new component tests should import them from instead of adding
// a fourth copy. (The engine's own __tests__ have a longer-standing,
// slightly different-shaped local copy of the same idea -- left alone
// here since consolidating the whole engine test suite's fixtures is a
// separate, larger change than what a component-test file needs.)

import type { GraphNode, ServerConfig } from '@/engine/types'

export function client(id = 'client'): GraphNode {
  return { id, label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } }
}

export function server(id = 's', overrides: Partial<ServerConfig> = {}): GraphNode {
  const config: ServerConfig = { kind: 'server', capacityRps: 1000, baseMs: 10, costPerHour: 8, ...overrides }
  return { id, label: 'Depot', config, position: { x: 0, y: 0 } }
}
