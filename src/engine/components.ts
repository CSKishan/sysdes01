// The component registry: one definition per placeable thing, shared by the
// canvas palette (task #6) and the engine's default configs. Keeping this in
// one file means the UI can never drift from what the simulator understands.

import type {
  ApiGatewayConfig,
  BrokerConfig,
  CacheConfig,
  CircuitBreakerConfig,
  ComponentKind,
  DatabaseConfig,
  LoadBalancerConfig,
  QueueConfig,
  RateLimiterConfig,
  ReplicaConfig,
  ServerConfig,
  ServiceConfig,
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
    | QueueConfig
    | BrokerConfig
    | ApiGatewayConfig
    | ServiceConfig
    | RateLimiterConfig
    | CircuitBreakerConfig
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
  queue: {
    kind: 'queue',
    realName: 'Message queue',
    analogyName: 'The holding bay',
    shortDescription: 'Holds a burst of orders instead of turning them away.',
    defaultConfig: (): QueueConfig => ({
      kind: 'queue',
      capacity: 200,
      drainRps: 40,
      costPerHour: 5,
    }),
  },
  broker: {
    kind: 'broker',
    realName: 'Message broker',
    analogyName: 'The dispatch board',
    shortDescription: 'Posts one notice that every subscribed depot gets its own copy of.',
    defaultConfig: (): BrokerConfig => ({
      kind: 'broker',
      capacityRps: 80,
      baseMs: 20,
      costPerHour: 6,
      deliverySemantics: 'atLeastOnce',
      retryBufferCapacity: 100,
    }),
  },
  apiGateway: {
    kind: 'apiGateway',
    realName: 'API gateway',
    analogyName: 'The reception desk',
    shortDescription: 'The one door every order passes through before reaching a depot.',
    defaultConfig: (): ApiGatewayConfig => ({
      kind: 'apiGateway',
      capacityRps: 100,
      baseMs: 15,
      costPerHour: 6,
    }),
  },
  service: {
    kind: 'service',
    realName: 'Microservice',
    analogyName: 'Courier team',
    shortDescription: 'A small team that does one job, and can depend on other teams to do theirs.',
    defaultConfig: (): ServiceConfig => ({
      kind: 'service',
      capacityRps: 50,
      baseMs: 60,
      costPerHour: 9,
    }),
  },
  rateLimiter: {
    kind: 'rateLimiter',
    realName: 'Rate limiter',
    analogyName: 'The intake window',
    shortDescription: 'Caps how fast orders get accepted, however they arrive.',
    defaultConfig: (): RateLimiterConfig => ({
      kind: 'rateLimiter',
      algorithm: 'tokenBucket',
      sustainedRps: 30,
      burstCapacity: 60,
      windowMs: 1000,
      costPerHour: 4,
    }),
  },
  circuitBreaker: {
    kind: 'circuitBreaker',
    realName: 'Circuit breaker',
    analogyName: 'The trip switch',
    shortDescription: 'Stops sending orders to a struggling depot, then tests if it has recovered.',
    defaultConfig: (): CircuitBreakerConfig => ({
      kind: 'circuitBreaker',
      capacityRps: 100,
      baseMs: 10,
      costPerHour: 5,
      errorThreshold: 0.5,
      windowMs: 1000,
      openDurationMs: 2000,
      halfOpenTrialFraction: 0.1,
    }),
  },
}

export function createDefaultNodeConfig(kind: ComponentKind) {
  return COMPONENT_REGISTRY[kind].defaultConfig()
}
