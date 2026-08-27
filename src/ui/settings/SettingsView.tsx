// Settings: the one place resetProgress was reachable from before this
// existed. Also the escape hatch for "I'm switching machines" (export/
// import) and the one display preference the game has (reduced motion).

import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Settings, ArrowLeft, Download, Upload, RotateCcw, Check, Sun, Moon } from 'lucide-react'
import type { ComponentKind } from '@/engine/types'
import { COMPONENT_REGISTRY } from '@/engine/components'
import { useProgressStore, initialState as progressInitialState, type LevelStars } from '@/game/progressStore'
import { useCaseStudyProgressStore, initialCaseStudyState } from '@/game/caseStudyProgressStore'
import { useJournalStore } from '@/game/journalStore'
import { useQuizStore } from '@/game/quizStore'
import { useSettingsStore } from '@/game/settingsStore'
import { Panel } from '@/ui/shared/Panel'
import { Button } from '@/ui/shared/Button'

const EXPORT_FORMAT_VERSION = 1

// Derived from the registry (the same single source of truth the palette
// and engine use) instead of a hand-typed list, so this never goes stale
// the next time a component kind is added.
const VALID_COMPONENT_KINDS: ComponentKind[] = Object.keys(COMPONENT_REGISTRY) as ComponentKind[]
const VALID_STAR_VALUES: LevelStars[] = [0, 1, 2, 3]

/** Keeps only entries whose value is a real star rating (0-3) -- an
 * imported file with a corrupted/out-of-range/non-finite number here
 * (e.g. from hand-editing, or float overflow like `1e309` -> Infinity)
 * would otherwise crash `'★'.repeat(stars)` on the chapter map. */
function sanitizeStarsByLevelId(value: unknown): Record<string, LevelStars> {
  if (!value || typeof value !== 'object') return {}
  const result: Record<string, LevelStars> = {}
  for (const [levelId, stars] of Object.entries(value as Record<string, unknown>)) {
    if (VALID_STAR_VALUES.includes(stars as LevelStars)) {
      result[levelId] = stars as LevelStars
    }
  }
  return result
}

/** Filters to known component kinds and always keeps 'client' present --
 * an imported file with an empty or 'client'-missing array would otherwise
 * silently empty the build palette (Sandbox especially) with no error. */
function sanitizeUnlockedKinds(value: unknown): ComponentKind[] {
  const known = Array.isArray(value)
    ? value.filter((k): k is ComponentKind => VALID_COMPONENT_KINDS.includes(k))
    : []
  return Array.from(new Set<ComponentKind>(['client', ...known]))
}

/** Same corrupted-import guard as sanitizeStarsByLevelId, for rubric scores
 * (must be a finite 0-100 number). */
function sanitizeScoresByCaseStudyId(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const result: Record<string, number> = {}
  for (const [caseStudyId, score] of Object.entries(value as Record<string, unknown>)) {
    if (typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100) {
      result[caseStudyId] = score
    }
  }
  return result
}

export function SettingsView({ onBack }: { onBack: () => void }) {
  const progress = useProgressStore()
  const caseStudyProgress = useCaseStudyProgressStore()
  const journal = useJournalStore()
  const quiz = useQuizStore()
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const setReducedMotion = useSettingsStore((s) => s.setReducedMotion)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const [confirmingReset, setConfirmingReset] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const payload = {
      formatVersion: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      progress: {
        completedLevelIds: progress.completedLevelIds,
        starsByLevelId: progress.starsByLevelId,
        unlockedComponentKinds: progress.unlockedComponentKinds,
        challengeUnlockedLevelIds: progress.challengeUnlockedLevelIds,
      },
      journal: { entries: journal.entries },
      quiz: { sessions: quiz.sessions },
      caseStudies: {
        completedCaseStudyIds: caseStudyProgress.completedCaseStudyIds,
        bestScorePercentByCaseStudyId: caseStudyProgress.bestScorePercentByCaseStudyId,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `packet-and-post-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    setImportMessage(null)
    fileInputRef.current?.click()
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data || typeof data !== 'object') throw new Error('Not a valid export file.')

      if (data.progress && typeof data.progress === 'object') {
        useProgressStore.setState({
          completedLevelIds: Array.isArray(data.progress.completedLevelIds)
            ? data.progress.completedLevelIds
            : progressInitialState.completedLevelIds,
          starsByLevelId: sanitizeStarsByLevelId(data.progress.starsByLevelId),
          unlockedComponentKinds: sanitizeUnlockedKinds(data.progress.unlockedComponentKinds),
          challengeUnlockedLevelIds: Array.isArray(data.progress.challengeUnlockedLevelIds)
            ? data.progress.challengeUnlockedLevelIds
            : progressInitialState.challengeUnlockedLevelIds,
        })
      }
      if (data.journal && Array.isArray(data.journal.entries)) {
        useJournalStore.setState({ entries: data.journal.entries })
      }
      if (data.quiz && Array.isArray(data.quiz.sessions)) {
        useQuizStore.setState({ sessions: data.quiz.sessions })
      }
      if (data.caseStudies && typeof data.caseStudies === 'object') {
        useCaseStudyProgressStore.setState({
          completedCaseStudyIds: Array.isArray(data.caseStudies.completedCaseStudyIds)
            ? data.caseStudies.completedCaseStudyIds
            : initialCaseStudyState.completedCaseStudyIds,
          bestScorePercentByCaseStudyId: sanitizeScoresByCaseStudyId(data.caseStudies.bestScorePercentByCaseStudyId),
        })
      }
      setImportMessage('Imported successfully.')
    } catch {
      setImportMessage("Couldn't read that file — make sure it's a Packet & Post export.")
    }
  }

  function handleReset() {
    progress.resetProgress()
    caseStudyProgress.resetCaseStudyProgress()
    journal.clear()
    quiz.clear()
    setConfirmingReset(false)
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink-100">
          <Settings className="h-5 w-5 text-brand-500" strokeWidth={1.6} />
          Settings
        </h1>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Map
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <Panel className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink-100">Display</h2>
          <p className="mb-3 text-sm text-ink-400">Theme, and whether things move.</p>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-ink-200">Theme</span>
            <div className="inline-flex border border-ink-700" role="radiogroup" aria-label="Theme">
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                  theme === 'dark' ? 'bg-brand-500 text-ink-950' : 'text-ink-400 hover:text-ink-100',
                )}
              >
                <Moon className="h-3.5 w-3.5" strokeWidth={1.8} />
                Dark
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                onClick={() => setTheme('light')}
                className={clsx(
                  'flex items-center gap-1.5 border-l border-ink-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                  theme === 'light' ? 'bg-brand-500 text-ink-950' : 'text-ink-400 hover:text-ink-100',
                )}
              >
                <Sun className="h-3.5 w-3.5" strokeWidth={1.8} />
                Light
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            Reduce motion
          </label>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink-100">Backup</h2>
          <p className="mb-3 text-sm text-ink-400">
            Everything lives only in this browser. Export a copy before clearing your browser data
            or to move progress to another machine.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
              Export progress
            </Button>
            <Button variant="secondary" onClick={handleImportClick}>
              <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
              Import progress
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportFile(file)
                e.target.value = ''
              }}
            />
          </div>
          {importMessage && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
              <Check className="h-3 w-3" strokeWidth={2} />
              {importMessage}
            </p>
          )}
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink-100">Reset</h2>
          <p className="mb-3 text-sm text-ink-400">
            Clears all completed levels, stars, unlocked components, case study progress, your
            decision journal, and your quiz history. This can't be undone unless you've exported a
            backup above.
          </p>
          {!confirmingReset ? (
            <Button variant="secondary" onClick={() => setConfirmingReset(true)}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
              Reset all progress
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-bad-500">Reset everything? This can't be undone.</span>
              <Button variant="primary" onClick={handleReset}>
                Yes, reset
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingReset(false)}>
                Cancel
              </Button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
