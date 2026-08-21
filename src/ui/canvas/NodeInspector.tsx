import { X } from 'lucide-react'
import type { CacheConfig, LoadBalancerConfig, NodeConfig, ServerConfig } from '@/engine/types'
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
}: NodeInspectorProps) {
  const def = COMPONENT_REGISTRY[config.kind]

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

      <div className="flex flex-col gap-3">
        {config.kind === 'server' && (
          <ServerFields config={config} onChange={(c) => onChange(c)} />
        )}
        {config.kind === 'loadBalancer' && (
          <LoadBalancerFields config={config} onChange={(c) => onChange(c)} />
        )}
        {config.kind === 'cache' && <CacheFields config={config} onChange={(c) => onChange(c)} />}
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
