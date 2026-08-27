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
import { LibraryHome } from '@/ui/library/LibraryHome'
import { TopicPage } from '@/ui/library/TopicPage'
import { GlossaryPage } from '@/ui/library/GlossaryPage'
import { NumbersPage } from '@/ui/library/NumbersPage'
import { CheatSheetPage } from '@/ui/library/CheatSheetPage'
import { SearchPalette } from '@/ui/library/SearchPalette'
import { getCaseStudy } from '@/content/caseStudies/registry'
import { CaseStudyMenu, INTERVIEWS_LEVEL_ID } from '@/ui/casestudy/CaseStudyMenu'
import { CaseStudyPlayer } from '@/ui/casestudy/CaseStudyPlayer'

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

function CaseStudyMenuRoute() {
  const navigate = useNavigate()
  return (
    <CaseStudyMenu
      onOpenCaseStudy={(caseStudyId) => navigate(`/case-studies/${caseStudyId}`)}
      onPlayLevel={(levelId) => navigate(`/level/${levelId}`)}
      onBack={() => navigate('/')}
    />
  )
}

function CaseStudyRoute() {
  const { caseStudyId } = useParams<{ caseStudyId: string }>()
  const navigate = useNavigate()
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds)
  const caseStudy = caseStudyId ? getCaseStudy(caseStudyId) : undefined

  if (!caseStudy) {
    return (
      <div className="p-8 text-ink-200">
        Couldn't find that case study.{' '}
        <Button variant="secondary" className="ml-2" onClick={() => navigate('/case-studies')}>
          Back to case studies
        </Button>
      </div>
    )
  }

  // Same reasoning as LevelRoute's isLevelUnlocked re-check: a direct link
  // bypasses CaseStudyMenu's disabled-button gate entirely. Case studies
  // need every unlocked component kind to be meaningfully designable, so
  // gate on having finished the campaign's own "start here" framework level.
  if (!completedLevelIds.includes(INTERVIEWS_LEVEL_ID)) {
    return <Navigate to="/case-studies" replace />
  }

  // key={caseStudy.id} forces a full remount when navigating directly
  // between two different case studies (same route pattern, so React
  // Router reuses the component instance and only updates the param) --
  // without it, CaseStudyPlayer's local stage/timer/transcript state would
  // leak from whichever case study was open before.
  return <CaseStudyPlayer key={caseStudy.id} caseStudy={caseStudy} onExit={() => navigate('/case-studies')} />
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
      <Route path="/library" element={<LibraryHome />} />
      <Route path="/library/topic/:levelId" element={<TopicPage />} />
      <Route path="/library/glossary" element={<GlossaryPage />} />
      <Route path="/library/numbers" element={<NumbersPage />} />
      <Route path="/library/cheatsheet/:chapterId" element={<CheatSheetPage />} />
      <Route path="/case-studies" element={<CaseStudyMenuRoute />} />
      <Route path="/case-studies/:caseStudyId" element={<CaseStudyRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false'
  }, [reducedMotion])

  // The inline script in index.html already applies this attribute
  // synchronously before first paint (avoiding a flash of the wrong
  // theme on load for a returning light-mode user) -- this effect keeps
  // it in sync with the store for every render after that, including
  // toggling it live from Settings.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <HashRouter>
      <SearchPalette />
      <AppRoutes />
    </HashRouter>
  )
}

export default App
