// Phase 10.1: component test coverage for one of the plan's named
// load-bearing components. Drives the real content bank (not a stub) so
// this also proves QuizView actually renders authored questions correctly,
// not just its own internal state machine.

import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuizView } from '../QuizView'
import { useProgressStore, initialState as progressInitialState } from '@/game/progressStore'
import { useQuizStore } from '@/game/quizStore'

function resetStores() {
  useProgressStore.setState(progressInitialState)
  useQuizStore.setState({ sessions: [] })
}

describe('QuizView', () => {
  it('shows an empty state with nothing completed, and never shows a "start" button', () => {
    resetStores()
    render(<QuizView onBack={() => {}} />)
    expect(screen.getByText(/nothing to practice yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/random mix/i)).not.toBeInTheDocument()
  })

  it('offers a random-mix session once a level with quiz questions is completed', () => {
    resetStores()
    useProgressStore.setState({ completedLevelIds: ['ch0-l1'] })
    render(<QuizView onBack={() => {}} />)
    expect(screen.getByText(/random mix/i)).toBeInTheDocument()
  })

  it('answering every question in a session records one entry in quizStore, and shows a score summary', () => {
    resetStores()
    // Every Chapter 0 level has quiz questions (content-lint enforces
    // >= 2 per level) -- completing the whole chapter gives a real,
    // multi-question bank to actually run a session against.
    useProgressStore.setState({
      completedLevelIds: ['ch0-l0', 'ch0-l1', 'ch0-l2', 'ch0-l3', 'ch0-l4', 'ch0-l5'],
    })
    render(<QuizView onBack={() => {}} />)

    fireEvent.click(screen.getByText(/random mix/i))
    expect(screen.getByText(/question 1 of/i)).toBeInTheDocument()

    // Answer every question by always picking the first option, then
    // advancing -- this test cares about the session completing and being
    // recorded, not about scoring every question correctly.
    for (let i = 0; i < 20; i++) {
      const nextOrResults = screen.queryByText(/session complete/i)
      if (nextOrResults) break
      const optionButtons = screen.getAllByRole('button').filter((b) => !/map|next question|see results/i.test(b.textContent ?? ''))
      fireEvent.click(optionButtons[0])
      const advanceButton = screen.getByText(/next question|see results/i)
      fireEvent.click(advanceButton)
    }

    expect(screen.getByText(/session complete/i)).toBeInTheDocument()
    expect(useQuizStore.getState().sessions).toHaveLength(1)
    expect(useQuizStore.getState().sessions[0].total).toBeGreaterThan(0)
  })
})
