// The component registry: one definition per placeable thing, shared by the
// canvas palette (task #6) and the engine's default configs. Keeping this in
// one file means the UI can never drift from what the simulator understands.

import type { CacheConfig, ComponentKind, LoadBalancerConfig, ServerConfig } from './types'

export interface ComponentDefinition {
  kind: ComponentKind
  /** The real-world system design term, always shown alongside the analogy. */
  realName: string
  /** The Packet & Post story name. */
  analogyName: string
  shortDescription: string
  defaultConfig: () => Exclude<
    ServerConfig | LoadBalancerConfig | CacheConfig | { kind: 'client' },
    never
  >
}

export const COMPONENT_REGISTRY: Record<ComponentKind, ComponentDefinition> = {
  client: {
    kind: 'client',
    realName: 'Traffic source',
    analogyName: 'Customers',
    shortDescription: 'Where requests come from.',
    defaultConfig: () => ({ kind: 'client' }),
  },
  server: {
    kind: 'server',
    realName: 'Server',
    analogyName: 'Depot',
    shortDescription: 'Does the actual work of handling a request.',
    defaultConfig: (): ServerConfig => ({
      kind: 'server',
      capacityRps: 50,
      baseMs: 80,
      costPerHour: 8,
    }),
  },
  loadBalancer: {
    kind: 'loadBalancer',
    realName: 'Load balancer',
    analogyName: 'Dispatcher',
    shortDescription: 'Splits incoming requests across multiple depots.',
    defaultConfig: (): LoadBalancerConfig => ({
      kind: 'loadBalancer',
      algorithm: 'roundRobin',
      costPerHour: 4,
    }),
  },
  cache: {
    kind: 'cache',
    realName: 'Cache',
    analogyName: 'Front-counter shelf',
    shortDescription: 'Keeps copies of popular answers close at hand.',
    defaultConfig: (): CacheConfig => ({
      kind: 'cache',
      capacitySlots: 50,
      hitMs: 5,
      missOverheadMs: 2,
      keyspaceSize: 500,
      zipfS: 1.1,
      costPerHour: 3,
      policy: 'writeThrough',
      staleFraction: 0,
    }),
  },
}

export function createDefaultNodeConfig(kind: ComponentKind) {
  return COMPONENT_REGISTRY[kind].defaultConfig()
}
