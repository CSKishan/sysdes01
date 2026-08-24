import type { ReactNode } from 'react'
import { LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/** Shared shell for every per-tick line chart on the dashboard (latency,
 * queue depth, ...): the container, axes, tooltip styling, and empty-state
 * are the same regardless of what's being charted -- only the data and the
 * <Line> elements themselves differ. */
export function TickLineChart({ data, children }: { data: Array<Record<string, unknown>>; children: ReactNode }) {
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
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
