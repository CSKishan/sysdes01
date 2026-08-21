import { useState } from 'react'
import type { ComponentKind } from '@/engine/types'
import { getLevel } from '@/content/registry'
import { useProgressStore, type LevelStars } from '@/game/progressStore'
import { ChapterMap } from '@/ui/campaign/ChapterMap'
import { LevelPlayer } from '@/ui/campaign/LevelPlayer'
import { JournalView } from '@/ui/journal/JournalView'
import { SandboxView } from '@/ui/sandbox/SandboxView'
import { QuizView } from '@/ui/quiz/QuizView'

type View =
  | { screen: 'map' }
  | { screen: 'level'; levelId: string; challengeMode: boolean }
  | { screen: 'journal' }
  | { screen: 'sandbox' }
  | { screen: 'quiz' }

function App() {
  const [view, setView] = useState<View>({ screen: 'map' })
  const completeLevel = useProgressStore((s) => s.completeLevel)

  if (view.screen === 'journal') {
    return <JournalView onBack={() => setView({ screen: 'map' })} />
  }

  if (view.screen === 'sandbox') {
    return <SandboxView onBack={() => setView({ screen: 'map' })} />
  }

  if (view.screen === 'quiz') {
    return <QuizView onBack={() => setView({ screen: 'map' })} />
  }

  if (view.screen === 'level') {
    const level = getLevel(view.levelId)
    if (!level) {
      return (
        <div className="p-8 text-ink-200">
          Couldn't find that level.{' '}
          <button className="underline" onClick={() => setView({ screen: 'map' })}>
            Back to map
          </button>
        </div>
      )
    }
    return (
      <LevelPlayer
        level={level}
        challengeMode={view.challengeMode}
        onExit={() => setView({ screen: 'map' })}
        onLevelComplete={(stars: LevelStars, unlockedKinds: ComponentKind[]) => {
          completeLevel(level.id, stars, unlockedKinds)
          setView({ screen: 'map' })
        }}
      />
    )
  }

  return (
    <ChapterMap
      onPlayLevel={(levelId, challengeMode) => setView({ screen: 'level', levelId, challengeMode })}
      onOpenJournal={() => setView({ screen: 'journal' })}
      onOpenSandbox={() => setView({ screen: 'sandbox' })}
      onOpenQuiz={() => setView({ screen: 'quiz' })}
    />
  )
}

export default App
