import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SimResult } from '@/engine/types'

export function LatencyChart({ result, tickIndex }: { result: SimResult; tickIndex: number }) {
  const data = result.ticks.slice(0, tickIndex + 1).map((t) => ({
    tMs: t.tMs,
    p50: Math.round(t.p50Ms),
    p99: Math.round(t.p99Ms),
  }))

  if (data.length < 2) {
    return <div className="h-32 w-full" />
  }

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <XAxis dataKey="tMs" hide />
          <YAxis width={40} tick={{ fill: '#7c8aa5', fontSize: 10 }} stroke="#384154" />
          <Tooltip
            contentStyle={{
              background: '#12151c',
              border: '1px solid #262c3a',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `t=${v}ms`}
          />
          <Line type="monotone" dataKey="p50" stroke="#7c8aa5" strokeWidth={1.5} dot={false} name="p50" />
          <Line type="monotone" dataKey="p99" stroke="#f2b366" strokeWidth={2} dot={false} name="p99" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
