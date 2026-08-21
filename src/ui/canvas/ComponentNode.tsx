import { Handle, Position, type NodeProps } from '@xyflow/react'
import clsx from 'clsx'
import { AlertTriangle } from 'lucide-react'
import { COMPONENT_REGISTRY } from '@/engine/components'
import { COMPONENT_ICONS } from './componentIcons'
import type { FlowNode } from './flowAdapters'
import { useNodeMetric } from './NodeMetricsContext'

function utilizationTone(u: number): 'ok' | 'warn' | 'bad' {
  if (u >= 0.95) return 'bad'
  if (u >= 0.75) return 'warn'
  return 'ok'
}

export function ComponentNode({ id, data, selected }: NodeProps<FlowNode>) {
  const def = COMPONENT_REGISTRY[data.config.kind]
  const Icon = COMPONENT_ICONS[data.config.kind]
  const metric = useNodeMetric(id)
  const showsUtilization = data.config.kind === 'server'
  const showsHitRate = data.config.kind === 'cache'

  const utilization = metric?.utilization ?? 0
  const tone = utilizationTone(utilization)
  const hasError = Boolean(metric && metric.errorRps > 0)

  return (
    <div
      className={clsx(
        'w-40 border-[1.5px] bg-ink-800 transition-colors',
        selected ? 'border-brand-500' : hasError ? 'border-bad-500' : 'border-ink-600',
      )}
    >
      <Handle type="target" position={Position.Left} className="!rounded-none !border-none !bg-ink-400" />
      <div className="flex items-center gap-2 border-b border-ink-700 px-2.5 py-2">
        <Icon
          className={clsx('h-4 w-4 shrink-0', selected ? 'text-brand-500' : 'text-ink-400')}
          strokeWidth={1.6}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-ink-100">{data.label}</p>
          <p className="truncate font-mono text-[9px] uppercase tracking-wide text-ink-400">
            {def.realName}
          </p>
        </div>
      </div>

      {metric && showsUtilization && (
        <div className="px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wide text-ink-400">Util</span>
            <span
              className={clsx(
                'font-mono text-[10px]',
                tone === 'ok' && 'text-ok-500',
                tone === 'warn' && 'text-warn-500',
                tone === 'bad' && 'text-bad-500',
              )}
            >
              {Math.round(utilization * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full border border-ink-700 bg-ink-950">
            <div
              className={clsx(
                'h-full',
                tone === 'ok' && 'bg-ok-500',
                tone === 'warn' && 'bg-warn-500',
                tone === 'bad' && 'bg-bad-500',
              )}
              style={{ width: `${Math.min(100, utilization * 100)}%` }}
            />
          </div>
          {hasError && (
            <p className="mt-1 flex items-center gap-1 font-mono text-[9px] text-bad-500">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
              {metric!.errorRps.toFixed(0)} rps dropped
            </p>
          )}
        </div>
      )}

      {metric && showsHitRate && metric.cacheHitRate !== undefined && (
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="font-mono text-[9px] uppercase tracking-wide text-ink-400">Hit rate</span>
          <span className="font-mono text-[10px] text-ok-500">
            {Math.round(metric.cacheHitRate * 100)}%
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!rounded-none !border-none !bg-ink-400" />
    </div>
  )
}

export const NODE_TYPES = { component: ComponentNode }
