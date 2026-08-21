import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { ComponentKind } from '@/engine/types'
import { getLevel, isLevelUnlocked } from '@/content/registry'
import { useProgressStore, type LevelStars } from '@/game/progressStore'
import { useSettingsStore } from '@/game/settingsStore'
import { ChapterMap } from '@/ui/campaign/ChapterMap'
import { LevelPlayer } from '@/ui/campaign/LevelPlayer'
import { JournalView } from '@/ui/journal/JournalView'
import { SandboxView } from '@/ui/sandbox/SandboxView'
import { QuizView } from '@/ui/quiz/QuizView'
import { SettingsView } from '@/ui/settings/SettingsView'
import { Button } from '@/ui/shared/Button'

function ChapterMapRoute() {
  const navigate = useNavigate()
  return (
    <ChapterMap
      onPlayLevel={(levelId, challengeMode) =>
        navigate(challengeMode ? `/level/${levelId}?mode=challenge` : `/level/${levelId}`)
      }
      onOpenJournal={() => navigate('/journal')}
      onOpenSandbox={() => navigate('/sandbox')}
      onOpenQuiz={() => navigate('/quiz')}
      onOpenSettings={() => navigate('/settings')}
    />
  )
}

function LevelRoute() {
  const { levelId } = useParams<{ levelId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const isChallengeUnlocked = useProgressStore((s) => s.isChallengeUnlocked)
  const level = levelId ? getLevel(levelId) : undefined

  if (!level) {
    return (
      <div className="p-8 text-ink-200">
        Couldn't find that level.{' '}
        <Button variant="secondary" className="ml-2" onClick={() => navigate('/')}>
          Back to map
        </Button>
      </div>
    )
  }

  // The level screen used to be reachable only through ChapterMap's Play
  // button (disabled while locked). Now that /level/:id is a real,
  // bookmarkable/shareable URL, that gate has to be re-enforced here too,
  // or a direct link bypasses progression entirely.
  if (!isLevelUnlocked(level.id, completedLevelIds)) {
    return <Navigate to="/" replace />
  }

  return (
    <LevelPlayer
      level={level}
      challengeMode={searchParams.get('mode') === 'challenge' && isChallengeUnlocked(level.id)}
      onExit={() => navigate('/')}
      onLevelComplete={(stars: LevelStars, unlockedKinds: ComponentKind[]) => {
        completeLevel(level.id, stars, unlockedKinds)
        navigate('/')
      }}
    />
  )
}

function AppRoutes() {
  const navigate = useNavigate()
  return (
    <Routes>
      <Route path="/" element={<ChapterMapRoute />} />
      <Route path="/level/:levelId" element={<LevelRoute />} />
      <Route path="/journal" element={<JournalView onBack={() => navigate('/')} />} />
      <Route path="/sandbox" element={<SandboxView onBack={() => navigate('/')} />} />
      <Route path="/quiz" element={<QuizView onBack={() => navigate('/')} />} />
      <Route path="/settings" element={<SettingsView onBack={() => navigate('/')} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false'
  }, [reducedMotion])

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}

export default App
