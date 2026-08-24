import { Line } from 'recharts'
import type { SimResult } from '@/engine/types'
import { TickLineChart } from './TickLineChart'

export function LatencyChart({ result, tickIndex }: { result: SimResult; tickIndex: number }) {
  const data = result.ticks.slice(0, tickIndex + 1).map((t) => ({
    tMs: t.tMs,
    p50: Math.round(t.p50Ms),
    p99: Math.round(t.p99Ms),
  }))

  return (
    <TickLineChart data={data}>
      <Line type="monotone" dataKey="p50" stroke="#7c8aa5" strokeWidth={1.5} dot={false} name="p50" />
      <Line type="monotone" dataKey="p99" stroke="#f2b366" strokeWidth={2} dot={false} name="p99" />
    </TickLineChart>
  )
}
