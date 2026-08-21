// The component registry: one definition per placeable thing, shared by the
// canvas palette (task #6) and the engine's default configs. Keeping this in
// one file means the UI can never drift from what the simulator understands.

import type {
  CacheConfig,
  ComponentKind,
  DatabaseConfig,
  LoadBalancerConfig,
  ReplicaConfig,
  ServerConfig,
  ShardRouterConfig,
} from './types'

export interface ComponentDefinition {
  kind: ComponentKind
  /** The real-world system design term, always shown alongside the analogy. */
  realName: string
  /** The Packet & Post story name. */
  analogyName: string
  shortDescription: string
  defaultConfig: () => Exclude<
    | ServerConfig
    | LoadBalancerConfig
    | CacheConfig
    | DatabaseConfig
    | ReplicaConfig
    | ShardRouterConfig
    | { kind: 'client' },
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
  database: {
    kind: 'database',
    realName: 'Database',
    analogyName: 'The ledger',
    shortDescription: 'Where orders are permanently recorded, not just answered.',
    defaultConfig: (): DatabaseConfig => ({
      kind: 'database',
      engine: 'sql',
      capacityRps: 60,
      baseMs: 40,
      writeCapacityRps: 25,
      writeBaseMs: 60,
      indexed: false,
      costPerHour: 12,
    }),
  },
  replica: {
    kind: 'replica',
    realName: 'Read replica',
    analogyName: 'A second copy of the ledger',
    shortDescription: 'A read-only copy of the ledger, kept close for reads.',
    defaultConfig: (): ReplicaConfig => ({
      kind: 'replica',
      capacityRps: 60,
      baseMs: 40,
      costPerHour: 10,
      replicationMode: 'async',
      staleReadFraction: 0.1,
      replicationLagMs: 150,
      syncAckWaitMs: 40,
    }),
  },
  shardRouter: {
    kind: 'shardRouter',
    realName: 'Shard router',
    analogyName: 'The regional sorting desk',
    shortDescription: 'Sends each order to the ledger that owns its key.',
    defaultConfig: (): ShardRouterConfig => ({
      kind: 'shardRouter',
      strategy: 'modulo',
      keyspaceSize: 1000,
      zipfS: 1.1,
      costPerHour: 4,
    }),
  },
}

export function createDefaultNodeConfig(kind: ComponentKind) {
  return COMPONENT_REGISTRY[kind].defaultConfig()
}
