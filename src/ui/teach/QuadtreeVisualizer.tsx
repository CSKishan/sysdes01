import { useMemo, useState } from 'react'
import { createSeededRng } from '@/engine/rng'
import { Button } from '@/ui/shared/Button'

/** How many points a cell tolerates before it splits into four quadrants --
 * the same "threshold" the README calls out as the reason quadtrees save
 * computation over subdividing unconditionally. */
const CAPACITY = 4
const MAX_DEPTH = 6
const SIZE = 320
const POINT_COUNT = 60

interface Point {
  x: number
  y: number
}

interface Cell {
  x: number
  y: number
  w: number
  h: number
}

/** Recurses straight to the rendered leaf cells -- no intermediate tree, since
 * nothing here ever needs anything but the final leaves. */
function collectLeaves(x: number, y: number, w: number, h: number, points: Point[], depth: number, out: Cell[]): void {
  const inside = points.filter((p) => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h)
  if (inside.length <= CAPACITY || depth >= MAX_DEPTH) {
    out.push({ x, y, w, h })
    return
  }
  const hw = w / 2
  const hh = h / 2
  collectLeaves(x, y, hw, hh, inside, depth + 1, out)
  collectLeaves(x + hw, y, hw, hh, inside, depth + 1, out)
  collectLeaves(x, y + hh, hw, hh, inside, depth + 1, out)
  collectLeaves(x + hw, y + hh, hw, hh, inside, depth + 1, out)
}

function randomPoints(seed: number): Point[] {
  const rng = createSeededRng(seed)
  const points: Point[] = []
  // Two denser clusters plus scattered noise -- makes the payoff visible:
  // small cells where points bunch up, large cells over empty space.
  const clusters = [
    { cx: SIZE * 0.28, cy: SIZE * 0.32, spread: 40, count: 24 },
    { cx: SIZE * 0.72, cy: SIZE * 0.68, spread: 36, count: 20 },
  ]
  for (const c of clusters) {
    for (let i = 0; i < c.count; i++) {
      const x = Math.min(SIZE - 1, Math.max(0, c.cx + (rng() - 0.5) * c.spread * 2))
      const y = Math.min(SIZE - 1, Math.max(0, c.cy + (rng() - 0.5) * c.spread * 2))
      points.push({ x, y })
    }
  }
  while (points.length < POINT_COUNT) {
    points.push({ x: rng() * SIZE, y: rng() * SIZE })
  }
  return points
}

/** A recursive quadtree subdivision demo -- the one genuinely spatial
 * concept in the curriculum, and the only lesson MiniDiagram/SequenceDiagram
 * can't represent. Regenerating points re-runs the subdivision live, so the
 * cell boundaries visibly adapt to wherever points happen to cluster. */
export function QuadtreeVisualizer() {
  const [seed, setSeed] = useState(1)
  const points = useMemo(() => randomPoints(seed), [seed])
  const leaves = useMemo(() => {
    const out: Cell[] = []
    collectLeaves(0, 0, SIZE, SIZE, points, 0, out)
    return out
  }, [points])

  return (
    <div className="corner-marks my-4 border border-ink-700 bg-ink-950/60 px-5 py-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          Recursive subdivision
        </span>
        <Button variant="secondary" onClick={() => setSeed((s) => s + 1)}>
          Regenerate points
        </Button>
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full border border-ink-700 bg-ink-900">
        {leaves.map((cell, i) => (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={cell.w}
            height={cell.h}
            fill="none"
            stroke="rgb(120 113 108 / 0.6)"
            strokeWidth={1}
          />
        ))}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="rgb(242 179 102)" />
        ))}
      </svg>
      <p className="mt-3 text-center text-xs italic text-ink-400">
        Each cell splits into four once it holds more than {CAPACITY} points -- dense clusters end up finely divided,
        empty space stays one large cell.
      </p>
    </div>
  )
}
