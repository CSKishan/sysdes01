import type { ReactNode } from 'react'
import { LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useThemeColor } from '@/ui/shared/useThemeColor'

/** Shared shell for every per-tick line chart on the dashboard (latency,
 * queue depth, ...): the container, axes, tooltip styling, and empty-state
 * are the same regardless of what's being charted -- only the data and the
 * <Line> elements themselves differ. */
export function TickLineChart({ data, children }: { data: Array<Record<string, unknown>>; children: ReactNode }) {
  // Recharts renders these as literal SVG/style attributes, not CSS, so
  // they need the theme's resolved color values, not var(...) references
  // -- see useThemeColor.
  const axisColor = useThemeColor('--color-ink-400')
  const axisLineColor = useThemeColor('--color-ink-600')
  const tooltipBg = useThemeColor('--color-ink-900')
  const tooltipBorder = useThemeColor('--color-ink-700')
  const tooltipText = useThemeColor('--color-ink-100')

  if (data.length < 2) {
    return <div className="h-32 w-full" />
  }

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <XAxis dataKey="tMs" hide />
          <YAxis width={40} tick={{ fill: axisColor, fontSize: 10 }} stroke={axisLineColor} />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: tooltipText,
            }}
            labelFormatter={(v) => `t=${v}ms`}
          />
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
