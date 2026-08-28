// Phase 9.4: one screen that answers "how am I actually doing" -- a
// coverage heatmap across every chapter, weak-area detection from quiz
// history, the daily streak, unlocked achievements, and Challenge-mode
// personal bests. Read-only: everything here is derived from stores other
// screens already write to, nothing new is tracked here.

import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Flame, Trophy, Zap, AlertTriangle } from 'lucide-react'
import { CHAPTERS, getLevelsForChapter } from '@/content/registry'
import { CASE_STUDIES } from '@/content/caseStudies/registry'
import { ACHIEVEMENTS } from '@/content/achievements'
import { useProgressStore } from '@/game/progressStore'
import { useCaseStudyProgressStore } from '@/game/caseStudyProgressStore'
import { useQuizStore } from '@/game/quizStore'
import { useStreakStore } from '@/game/streakStore'
import { useAchievementsStore } from '@/game/achievementsStore'
import { useLeaderboardStore } from '@/game/leaderboardStore'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function ProgressDashboard({ onBack }: { onBack: () => void }) {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const completedCaseStudyIds = useCaseStudyProgressStore((s) => s.completedCaseStudyIds)
  const sessions = useQuizStore((s) => s.sessions)
  const { currentStreakDays, longestStreakDays } = useStreakStore()
  const { unlockedIds, unlockedAtById } = useAchievementsStore()
  const recordsByLevelId = useLeaderboardStore((s) => s.recordsByLevelId)

  const totalLevels = CHAPTERS.reduce((acc, c) => acc + getLevelsForChapter(c.id).length, 0) + CASE_STUDIES.length
  const totalDone = completedLevelIds.length + completedCaseStudyIds.length

  // Weak areas: per-chapter accuracy across every recorded quiz session,
  // lowest accuracy first -- only chapters with at least one attempt, so an
  // untouched chapter doesn't read as "weak" alongside a genuinely
  // struggled-with one.
  const accuracyByChapter = new Map<string, { correct: number; total: number }>()
  for (const session of sessions) {
    for (const [chapterId, stats] of Object.entries(session.byChapter)) {
      const existing = accuracyByChapter.get(chapterId) ?? { correct: 0, total: 0 }
      accuracyByChapter.set(chapterId, { correct: existing.correct + stats.correct, total: existing.total + stats.total })
    }
  }
  const weakAreas = Array.from(accuracyByChapter.entries())
    .map(([chapterId, stats]) => ({
      chapterId,
      title: CHAPTERS.find((c) => c.id === chapterId)?.title ?? chapterId,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      total: stats.total,
    }))
    .filter((c) => c.total >= 3) // enough attempts to mean something
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)

  const challengeRecords = Object.values(recordsByLevelId).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink-100">
          <TrendingUp className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
          Progress
        </h1>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Map
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Topics covered" value={`${totalDone}/${totalLevels}`} />
        <StatTile label="Current streak" value={`${currentStreakDays}d`} icon={<Flame className="h-3.5 w-3.5 text-warn-500" strokeWidth={1.8} />} />
        <StatTile label="Longest streak" value={`${longestStreakDays}d`} />
        <StatTile label="Achievements" value={`${unlockedIds.length}/${ACHIEVEMENTS.length}`} icon={<Trophy className="h-3.5 w-3.5 text-brand-400" strokeWidth={1.8} />} />
      </div>

      <Panel className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-100">Coverage by chapter</h2>
        <div className="flex flex-col gap-2">
          {CHAPTERS.map((chapter) => {
            const levels = getLevelsForChapter(chapter.id)
            const done = levels.filter((l) => completedLevelIds.includes(l.id)).length
            const pct = levels.length ? (done / levels.length) * 100 : 0
            return (
              <div key={chapter.id} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs text-ink-300">{chapter.title}</span>
                <div className="h-2 flex-1 border border-ink-700 bg-ink-950">
                  <div
                    className={clsx('h-full', pct === 100 ? 'bg-ok-500' : 'bg-brand-500/70')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-500">
                  {done}/{levels.length}
                </span>
              </div>
            )
          })}
          <div className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs text-ink-300">Case studies</span>
            <div className="h-2 flex-1 border border-ink-700 bg-ink-950">
              <div
                className={clsx('h-full', completedCaseStudyIds.length === CASE_STUDIES.length ? 'bg-ok-500' : 'bg-brand-500/70')}
                style={{ width: `${CASE_STUDIES.length ? (completedCaseStudyIds.length / CASE_STUDIES.length) * 100 : 0}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-500">
              {completedCaseStudyIds.length}/{CASE_STUDIES.length}
            </span>
          </div>
        </div>
      </Panel>

      {weakAreas.length > 0 && (
        <Panel className="mb-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-100">
            <AlertTriangle className="h-4 w-4 text-warn-500" strokeWidth={1.8} />
            Weakest areas
          </h2>
          <div className="flex flex-col gap-2">
            {weakAreas.map((area) => (
              <div key={area.chapterId} className="flex items-center justify-between border border-ink-700 bg-ink-950/50 px-3 py-2 text-sm">
                <span className="text-ink-300">{area.title}</span>
                <span className="font-mono tabular-nums text-warn-500">{Math.round(area.accuracy * 100)}% correct</span>
              </div>
            ))}
          </div>
          <Link
            to="/review/quiz"
            className="mt-3 inline-flex items-center justify-center border border-ink-700 bg-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-200 hover:border-brand-500/50 hover:text-ink-100"
          >
            Review due questions
          </Link>
        </Panel>
      )}

      {challengeRecords.length > 0 && (
        <Panel className="mb-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-100">
            <Zap className="h-4 w-4 text-brand-400" strokeWidth={1.8} />
            Challenge-mode bests
          </h2>
          <div className="flex flex-col gap-2">
            {challengeRecords.map((r) => (
              <div key={r.levelId} className="flex items-center justify-between border border-ink-700 bg-ink-950/50 px-3 py-2 text-sm">
                <span className="text-ink-300">{r.levelId}</span>
                <span className="flex gap-3 font-mono text-[11px] tabular-nums text-ink-100">
                  <span>{formatDuration(r.bestElapsedMs)}</span>
                  <span>${r.bestCostPerHour.toFixed(0)}/hr</span>
                  <span className="text-ink-500">{r.attempts} attempt{r.attempts === 1 ? '' : 's'}</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-100">
          <Trophy className="h-4 w-4 text-brand-400" strokeWidth={1.8} />
          Achievements
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.includes(a.id)
            return (
              <div
                key={a.id}
                className={clsx(
                  'border px-3 py-2 text-sm',
                  unlocked ? 'border-brand-500/40 bg-brand-500/10' : 'border-ink-800 bg-ink-950/40 opacity-50',
                )}
              >
                <p className={clsx('font-medium', unlocked ? 'text-ink-100' : 'text-ink-400')}>{a.title}</p>
                <p className="mt-0.5 text-xs text-ink-500">{a.description}</p>
                {unlocked && unlockedAtById[a.id] && (
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wide text-brand-400">
                    Unlocked {new Date(unlockedAtById[a.id]).toLocaleDateString()}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function StatTile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="border border-ink-700 bg-ink-900/60 p-3">
      <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wide text-ink-400">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg tabular-nums text-ink-100">{value}</p>
    </div>
  )
}
