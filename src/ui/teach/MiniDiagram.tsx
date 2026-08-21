import type { Diagram } from '@/content/types'

/** A small looping animation: a dot travels step-to-step along a row of
 * icons. Deliberately generic so every lesson can get motion without
 * bespoke SVG art per concept. */
export function MiniDiagram({ diagram }: { diagram: Diagram }) {
  const n = diagram.steps.length
  return (
    <div className="corner-marks my-4 border border-ink-700 bg-ink-950/60 px-6 py-8">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-6 right-6 top-1/2 h-px -translate-y-1/2 bg-ink-700" />
        {n > 1 && (
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-brand-400 shadow-[0_0_8px_2px_rgba(242,179,102,0.6)]"
            style={{
              animation: `mini-diagram-travel-${n} 3.2s ease-in-out infinite`,
            }}
          />
        )}
        {diagram.steps.map((step, i) => (
          <div key={i} className="relative z-10 flex flex-col items-center gap-2 bg-ink-950/60 px-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-xl">
              {step.icon}
            </div>
            <span className="max-w-20 text-center text-xs text-ink-300">{step.label}</span>
          </div>
        ))}
      </div>
      {diagram.caption && (
        <p className="mt-6 text-center text-xs italic text-ink-400">{diagram.caption}</p>
      )}
      <DiagramKeyframes n={n} />
    </div>
  )
}

/** Generates a keyframe animation with a stop at each step's horizontal
 * position, expressed as percentages so it works for any step count. */
function DiagramKeyframes({ n }: { n: number }) {
  if (n <= 1) return null
  const positions = Array.from({ length: n }, (_, i) => (i / (n - 1)) * 100)
  const segmentPercent = 100 / (2 * n)
  const frames: string[] = []
  positions.forEach((pos, i) => {
    const holdStart = (i * 2 * segmentPercent).toFixed(2)
    const holdEnd = ((i * 2 + 1) * segmentPercent).toFixed(2)
    frames.push(`${holdStart}% { left: ${pos}%; }`)
    frames.push(`${holdEnd}% { left: ${pos}%; }`)
  })
  frames.push(`100% { left: ${positions[0]}%; }`)

  return (
    <style>{`@keyframes mini-diagram-travel-${n} { ${frames.join(' ')} }`}</style>
  )
}
