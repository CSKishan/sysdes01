import { Line } from 'recharts'
import type { SimResult } from '@/engine/types'
import { TickLineChart } from './TickLineChart'
import { useThemeColor } from '@/ui/shared/useThemeColor'

export function LatencyChart({ result, tickIndex }: { result: SimResult; tickIndex: number }) {
  const data = result.ticks.slice(0, tickIndex + 1).map((t) => ({
    tMs: t.tMs,
    p50: Math.round(t.p50Ms),
    p99: Math.round(t.p99Ms),
  }))
  const p50Color = useThemeColor('--color-ink-400')
  const p99Color = useThemeColor('--color-warn-500')

  return (
    <TickLineChart data={data}>
      <Line type="monotone" dataKey="p50" stroke={p50Color} strokeWidth={1.5} dot={false} name="p50" />
      <Line type="monotone" dataKey="p99" stroke={p99Color} strokeWidth={2} dot={false} name="p99" />
    </TickLineChart>
  )
}
