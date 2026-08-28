// A small, self-dismissing corner banner for newly-unlocked achievements.
// Mounted once in App.tsx so it can fire from any screen that runs a
// simulation, not just the Progress dashboard.

import { useEffect } from 'react'
import { Trophy } from 'lucide-react'
import { ACHIEVEMENTS } from '@/content/achievements'
import { useAchievementsStore } from '@/game/achievementsStore'

const VISIBLE_MS = 4500

export function AchievementToast() {
  const justUnlocked = useAchievementsStore((s) => s.justUnlocked)
  const showing = justUnlocked[0]

  // Shows `showing` for VISIBLE_MS, then pops it so the next queued one (if
  // any) takes its place. Keyed on `showing` itself, not the whole
  // `justUnlocked` array -- a second achievement unlocking and appending to
  // the queue while the first is still displayed must not restart this
  // timer, or the first toast would linger well past its intended window
  // every time something else unlocks in the background. justUnlocked
  // itself never survives a reload (see achievementsStore's `partialize`),
  // so there's no separate "already seen" bookkeeping needed here -- a
  // reload mid-toast just means it doesn't replay.
  useEffect(() => {
    if (showing === undefined) return
    const id = setTimeout(() => {
      useAchievementsStore.setState((s) => ({ justUnlocked: s.justUnlocked.slice(1) }))
    }, VISIBLE_MS)
    return () => clearTimeout(id)
  }, [showing])

  if (showing === undefined) return null
  const achievement = ACHIEVEMENTS.find((a) => a.id === showing)
  if (!achievement) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex items-center gap-3 border border-brand-500 bg-ink-900 px-4 py-3 shadow-lg"
    >
      <Trophy className="h-5 w-5 shrink-0 text-brand-400" strokeWidth={1.8} />
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-brand-400">Achievement unlocked</p>
        <p className="text-sm font-medium text-ink-100">{achievement.title}</p>
      </div>
    </div>
  )
}
