import { useState } from 'react'
import { X, Cable } from 'lucide-react'
import type {
  ApiGatewayConfig,
  BrokerConfig,
  CacheConfig,
  CircuitBreakerConfig,
  DatabaseConfig,
  LoadBalancerConfig,
  NodeConfig,
  QueueConfig,
  RateLimiterConfig,
  ReplicaConfig,
  ServerConfig,
  ServiceConfig,
  ShardRouterConfig,
} from '@/engine/types'
import { COMPONENT_REGISTRY } from '@/engine/components'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

interface NodeInspectorProps {
  nodeId: string
  label: string
  config: NodeConfig
  locked?: boolean
  onChange: (config: NodeConfig) => void
  onDelete: () => void
  onClose: () => void
  /** Every other node on the canvas, for the keyboard-accessible "connect
   * to" control below -- the only way to wire two nodes together used to
   * be dragging between their handles, which a keyboard-only or
   * screen-reader user has no way to do at all. */
  otherNodes: { id: string; label: string }[]
  onConnectTo: (targetNodeId: string) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-ink-300">
      <span className="font-mono text-[10px] uppercase tracking-wide text-ink-400">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'border border-ink-600 bg-ink-950 px-2 py-1.5 text-sm text-ink-100 outline-none focus:border-brand-500'

export function NodeInspector({
  nodeId,
  label,
  config,
  locked,
  onChange,
  onDelete,
  onClose,
  otherNodes,
  onConnectTo,
}: NodeInspectorProps) {
  const def = COMPONENT_REGISTRY[config.kind]
  const [connectTargetId, setConnectTargetId] = useState('')

  return (
    <Panel className="w-64 shrink-0 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-100">{label}</p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-brand-500">{def.realName}</p>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-100" aria-label="Close">
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      {otherNodes.length > 0 && (
        <div className="mb-4 flex items-end gap-1.5 border-b border-ink-800 pb-4">
          <Field label="Connect to">
            <select
              className={inputClass}
              value={connectTargetId}
              onChange={(e) => setConnectTargetId(e.target.value)}
            >
              <option value="">Choose a component…</option>
              {otherNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </Field>
          <Button
            variant="secondary"
            disabled={!connectTargetId}
            onClick={() => {
              onConnectTo(connectTargetId)
              setConnectTargetId('')
            }}
            aria-label={`Connect ${label} to the chosen component`}
          >
            <Cable className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {config.kind === 'server' && (
          <ServerFields config={config} onChange={(c) => onChange(c)} />
        )}
        {config.kind === 'loadBalancer' && (
          <LoadBalancerFields config={config} onChange={(c) => onChange(c)} />
        )}
        {config.kind === 'cache' && <CacheFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'database' && <DatabaseFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'replica' && <ReplicaFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'shardRouter' && <ShardRouterFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'queue' && <QueueFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'broker' && <BrokerFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'apiGateway' && <ApiGatewayFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'service' && <ServiceFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'rateLimiter' && <RateLimiterFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'circuitBreaker' && <CircuitBreakerFields config={config} onChange={(c) => onChange(c)} />}
        {config.kind === 'client' && (
          <p className="text-xs text-ink-400">This is where requests enter the system.</p>
        )}
      </div>

      {!locked && (
        <Button variant="secondary" onClick={onDelete} className="mt-4 w-full text-bad-500">
          Remove
        </Button>
      )}
      {locked && <p className="mt-4 text-xs text-ink-500">This node is fixed for this level.</p>}
      <p className="mt-2 font-mono text-[10px] text-ink-600">ID: {nodeId}</p>
    </Panel>
  )
}

function ServerFields({
  config,
  onChange,
}: {
  config: ServerConfig
  onChange: (c: ServerConfig) => void
}) {
  return (
    <>
      <Field label={`Capacity: ${config.capacityRps} rps`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.capacityRps}
          onChange={(e) => onChange({ ...config, capacityRps: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Base service time: ${config.baseMs}ms`}>
        <input
          type="range"
          min={10}
          max={400}
          step={10}
          value={config.baseMs}
          onChange={(e) => onChange({ ...config, baseMs: Number(e.target.value) })}
        />
      </Field>
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function LoadBalancerFields({
  config,
  onChange,
}: {
  config: LoadBalancerConfig
  onChange: (c: LoadBalancerConfig) => void
}) {
  return (
    <>
      <Field label="Dispatch rule">
        <select
          className={inputClass}
          value={config.algorithm}
          onChange={(e) =>
            onChange({ ...config, algorithm: e.target.value as LoadBalancerConfig['algorithm'] })
          }
        >
          <option value="roundRobin">Round robin (take turns)</option>
          <option value="leastConnections">Least busy first</option>
          <option value="hash">Hash (always same depot for same order)</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-xs text-ink-300">
        <input
          type="checkbox"
          checked={config.healthAware ?? false}
          onChange={(e) => onChange({ ...config, healthAware: e.target.checked })}
        />
        Health-aware (skip targets that are currently down)
      </label>
    </>
  )
}

function CacheFields({
  config,
  onChange,
}: {
  config: CacheConfig
  onChange: (c: CacheConfig) => void
}) {
  return (
    <>
      <Field label={`Shelf size: ${config.capacitySlots} items`}>
        <input
          type="range"
          min={5}
          max={Math.max(config.keyspaceSize, 5)}
          step={5}
          value={config.capacitySlots}
          onChange={(e) => onChange({ ...config, capacitySlots: Number(e.target.value) })}
        />
      </Field>
      <Field label="Restocking policy">
        <select
          className={inputClass}
          value={config.policy}
          onChange={(e) => onChange({ ...config, policy: e.target.value as CacheConfig['policy'] })}
        >
          <option value="writeThrough">Write-through (always accurate)</option>
          <option value="writeAround">Write-around (skip the shelf on updates)</option>
          <option value="writeBack">Write-back (update later)</option>
        </select>
      </Field>
    </>
  )
}

function DatabaseFields({
  config,
  onChange,
}: {
  config: DatabaseConfig
  onChange: (c: DatabaseConfig) => void
}) {
  return (
    <>
      <Field label="Engine">
        <select
          className={inputClass}
          value={config.engine}
          onChange={(e) => onChange({ ...config, engine: e.target.value as DatabaseConfig['engine'] })}
        >
          <option value="sql">SQL</option>
          <option value="nosql">NoSQL</option>
        </select>
      </Field>
      <Field label={`Read capacity: ${config.capacityRps} rps`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.capacityRps}
          onChange={(e) => onChange({ ...config, capacityRps: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Read speed: ${config.baseMs}ms`}>
        <input
          type="range"
          min={5}
          max={400}
          step={5}
          value={config.baseMs}
          onChange={(e) => onChange({ ...config, baseMs: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Write capacity: ${config.writeCapacityRps} rps`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.writeCapacityRps}
          onChange={(e) => onChange({ ...config, writeCapacityRps: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Write speed: ${config.writeBaseMs}ms`}>
        <input
          type="range"
          min={5}
          max={400}
          step={5}
          value={config.writeBaseMs}
          onChange={(e) => onChange({ ...config, writeBaseMs: Number(e.target.value) })}
        />
      </Field>
      <label className="flex items-center gap-2 text-xs text-ink-300">
        <input
          type="checkbox"
          checked={config.indexed}
          onChange={(e) => onChange({ ...config, indexed: e.target.checked })}
        />
        Indexed (faster reads, slower writes)
      </label>
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function ReplicaFields({
  config,
  onChange,
}: {
  config: ReplicaConfig
  onChange: (c: ReplicaConfig) => void
}) {
  return (
    <>
      <Field label="Replication mode">
        <select
          className={inputClass}
          value={config.replicationMode}
          onChange={(e) =>
            onChange({ ...config, replicationMode: e.target.value as ReplicaConfig['replicationMode'] })
          }
        >
          <option value="async">Async (faster, can serve stale reads)</option>
          <option value="sync">Sync (always fresh, slower to keep up)</option>
        </select>
      </Field>
      <Field label={`Read capacity: ${config.capacityRps} rps`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.capacityRps}
          onChange={(e) => onChange({ ...config, capacityRps: Number(e.target.value) })}
        />
      </Field>
      {config.replicationMode === 'async' && (
        <>
          <Field label={`Stale read chance: ${Math.round(config.staleReadFraction * 100)}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(config.staleReadFraction * 100)}
              onChange={(e) => onChange({ ...config, staleReadFraction: Number(e.target.value) / 100 })}
            />
          </Field>
          <Field label={`Replication lag: ${config.replicationLagMs}ms`}>
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={config.replicationLagMs}
              onChange={(e) => onChange({ ...config, replicationLagMs: Number(e.target.value) })}
            />
          </Field>
        </>
      )}
      {config.replicationMode === 'sync' && (
        <Field label={`Ack wait: ${config.syncAckWaitMs}ms`}>
          <input
            type="range"
            min={0}
            max={300}
            step={10}
            value={config.syncAckWaitMs}
            onChange={(e) => onChange({ ...config, syncAckWaitMs: Number(e.target.value) })}
          />
        </Field>
      )}
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function ShardRouterFields({
  config,
  onChange,
}: {
  config: ShardRouterConfig
  onChange: (c: ShardRouterConfig) => void
}) {
  return (
    <>
      <Field label="Routing strategy">
        <select
          className={inputClass}
          value={config.strategy}
          onChange={(e) => onChange({ ...config, strategy: e.target.value as ShardRouterConfig['strategy'] })}
        >
          <option value="modulo">Modulo (key % shard count)</option>
          <option value="consistentHash">Consistent hashing</option>
        </select>
      </Field>
      <Field label={`Key skew: ${config.zipfS.toFixed(1)}`}>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={config.zipfS}
          onChange={(e) => onChange({ ...config, zipfS: Number(e.target.value) })}
        />
      </Field>
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function QueueFields({
  config,
  onChange,
}: {
  config: QueueConfig
  onChange: (c: QueueConfig) => void
}) {
  return (
    <>
      <Field label={`Backlog capacity: ${config.capacity} items`}>
        <input
          type="range"
          min={10}
          max={1000}
          step={10}
          value={config.capacity}
          onChange={(e) => onChange({ ...config, capacity: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Drain rate: ${config.drainRps} items/sec`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.drainRps}
          onChange={(e) => onChange({ ...config, drainRps: Number(e.target.value) })}
        />
      </Field>
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function BrokerFields({
  config,
  onChange,
}: {
  config: BrokerConfig
  onChange: (c: BrokerConfig) => void
}) {
  return (
    <>
      <Field label="Delivery semantics">
        <select
          className={inputClass}
          value={config.deliverySemantics}
          onChange={(e) =>
            onChange({ ...config, deliverySemantics: e.target.value as BrokerConfig['deliverySemantics'] })
          }
        >
          <option value="atMostOnce">At most once (fire and forget)</option>
          <option value="atLeastOnce">At least once (retries instead of dropping)</option>
        </select>
      </Field>
      <Field label={`Dispatch capacity: ${config.capacityRps} rps`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.capacityRps}
          onChange={(e) => onChange({ ...config, capacityRps: Number(e.target.value) })}
        />
      </Field>
      {config.deliverySemantics === 'atLeastOnce' && (
        <Field label={`Retry buffer: ${config.retryBufferCapacity} items`}>
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={config.retryBufferCapacity}
            onChange={(e) => onChange({ ...config, retryBufferCapacity: Number(e.target.value) })}
          />
        </Field>
      )}
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function ApiGatewayFields({
  config,
  onChange,
}: {
  config: ApiGatewayConfig
  onChange: (c: ApiGatewayConfig) => void
}) {
  return (
    <>
      <Field label={`Capacity: ${config.capacityRps} rps`}>
        <input
          type="range"
          min={5}
          max={400}
          step={5}
          value={config.capacityRps}
          onChange={(e) => onChange({ ...config, capacityRps: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Added hop latency: ${config.baseMs}ms`}>
        <input
          type="range"
          min={5}
          max={200}
          step={5}
          value={config.baseMs}
          onChange={(e) => onChange({ ...config, baseMs: Number(e.target.value) })}
        />
      </Field>
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function ServiceFields({
  config,
  onChange,
}: {
  config: ServiceConfig
  onChange: (c: ServiceConfig) => void
}) {
  return (
    <>
      <Field label={`Capacity: ${config.capacityRps} rps`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.capacityRps}
          onChange={(e) => onChange({ ...config, capacityRps: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Base service time: ${config.baseMs}ms`}>
        <input
          type="range"
          min={10}
          max={400}
          step={10}
          value={config.baseMs}
          onChange={(e) => onChange({ ...config, baseMs: Number(e.target.value) })}
        />
      </Field>
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function RateLimiterFields({
  config,
  onChange,
}: {
  config: RateLimiterConfig
  onChange: (c: RateLimiterConfig) => void
}) {
  return (
    <>
      <Field label="Algorithm">
        <select
          className={inputClass}
          value={config.algorithm}
          onChange={(e) => onChange({ ...config, algorithm: e.target.value as RateLimiterConfig['algorithm'] })}
        >
          <option value="tokenBucket">Token bucket (allows a burst, then throttles)</option>
          <option value="leakyBucket">Leaky bucket (smooths every burst into wait time)</option>
          <option value="slidingWindow">Sliding window (rolling recent-request budget)</option>
        </select>
      </Field>
      <Field label={`Sustained rate: ${config.sustainedRps} rps`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.sustainedRps}
          onChange={(e) => onChange({ ...config, sustainedRps: Number(e.target.value) })}
        />
      </Field>
      {config.algorithm !== 'slidingWindow' && (
        <Field
          label={
            config.algorithm === 'tokenBucket'
              ? `Burst capacity: ${config.burstCapacity} tokens`
              : `Bucket capacity: ${config.burstCapacity} items`
          }
        >
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={config.burstCapacity}
            onChange={(e) => onChange({ ...config, burstCapacity: Number(e.target.value) })}
          />
        </Field>
      )}
      {config.algorithm === 'slidingWindow' && (
        <Field label={`Window: ${config.windowMs}ms`}>
          <input
            type="range"
            min={100}
            max={5000}
            step={100}
            value={config.windowMs}
            onChange={(e) => onChange({ ...config, windowMs: Number(e.target.value) })}
          />
        </Field>
      )}
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}

function CircuitBreakerFields({
  config,
  onChange,
}: {
  config: CircuitBreakerConfig
  onChange: (c: CircuitBreakerConfig) => void
}) {
  return (
    <>
      <Field label={`Capacity: ${config.capacityRps} rps`}>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={config.capacityRps}
          onChange={(e) => onChange({ ...config, capacityRps: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Trip threshold: ${Math.round(config.errorThreshold * 100)}% downstream errors`}>
        <input
          type="range"
          min={5}
          max={95}
          step={5}
          value={Math.round(config.errorThreshold * 100)}
          onChange={(e) => onChange({ ...config, errorThreshold: Number(e.target.value) / 100 })}
        />
      </Field>
      <Field label={`Open duration: ${config.openDurationMs}ms`}>
        <input
          type="range"
          min={250}
          max={10000}
          step={250}
          value={config.openDurationMs}
          onChange={(e) => onChange({ ...config, openDurationMs: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Half-open trial: ${Math.round(config.halfOpenTrialFraction * 100)}% of traffic`}>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={Math.round(config.halfOpenTrialFraction * 100)}
          onChange={(e) => onChange({ ...config, halfOpenTrialFraction: Number(e.target.value) / 100 })}
        />
      </Field>
      <Field label="Cost">
        <span className={inputClass + ' opacity-70'}>${config.costPerHour}/hr</span>
      </Field>
    </>
  )
}
