// Generic SM-2 spaced-repetition scheduler, shared by both review decks
// (Phase 9.1's quiz-question review and Phase 9.2's glossary flashcards)
// instead of two near-identical schedulers -- a card is just a
// `deckId:cardId` pair; the deck's actual content (a quiz question, a
// glossary term) lives in content/*, not here.
//
// Standard SM-2 (SuperMemo-2): a review reports a 0-5 "quality" score.
// quality < 3 resets the card to tomorrow (a lapse); quality >= 3 grows the
// interval by the card's ease factor, which itself drifts up or down based
// on how easy that review felt. See reviewCard below for the exact formula.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DeckId = 'quiz' | 'glossary'

/** 0-5 per the original SM-2 spec. The two review UIs only ever send one of
 * these four -- AGAIN/HARD/GOOD/EASY -- skipping 0/2 as a distinction most
 * players won't find meaningful in a quick review session. */
export const QUALITY = { AGAIN: 1, HARD: 3, GOOD: 4, EASY: 5 } as const
export type Quality = (typeof QUALITY)[keyof typeof QUALITY]

export interface CardState {
  repetitions: number
  easeFactor: number
  intervalDays: number
  dueAt: number
  lastReviewedAt: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const STARTING_EASE = 2.5
const MIN_EASE = 1.3

function newCardState(now: number): CardState {
  return { repetitions: 0, easeFactor: STARTING_EASE, intervalDays: 0, dueAt: now, lastReviewedAt: null }
}

/** The SM-2 update itself, factored out from the store so it's unit-testable
 * without touching persisted state. */
export function sm2(prev: CardState, quality: Quality, now: number): CardState {
  if (quality < 3) {
    // A lapse: back to square one, but the ease factor still erodes a
    // little (below) rather than resetting -- a card that keeps getting
    // forgotten should keep coming back faster than one that's merely new.
    return {
      repetitions: 0,
      easeFactor: Math.max(MIN_EASE, prev.easeFactor - 0.2),
      intervalDays: 1,
      dueAt: now + DAY_MS,
      lastReviewedAt: now,
    }
  }
  const repetitions = prev.repetitions + 1
  const intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(prev.intervalDays * prev.easeFactor)
  const easeFactor = Math.max(MIN_EASE, prev.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  return { repetitions, easeFactor, intervalDays, dueAt: now + intervalDays * DAY_MS, lastReviewedAt: now }
}

export interface SpacedRepetitionState {
  cards: Record<string, CardState>
  getCardState: (deckId: DeckId, cardId: string) => CardState
  /** Due now, including cards never reviewed at all (always due). Doesn't
   * require every id to already have an entry -- a freshly-authored quiz
   * question or glossary term is due from the moment it exists. Dedupes
   * `allCardIds` itself -- a caller passing a raw id that isn't actually
   * unique across its whole deck (this happened with quiz question ids
   * before quizCardId existed) would otherwise get repeats back, inflating
   * any "N due" count built from the result's length. */
  getDueCardIds: (deckId: DeckId, allCardIds: string[], now?: number) => string[]
  reviewCard: (deckId: DeckId, cardId: string, quality: Quality) => void
  clear: () => void
}

function cardKey(deckId: DeckId, cardId: string): string {
  return `${deckId}:${cardId}`
}

export const useSpacedRepetitionStore = create<SpacedRepetitionState>()(
  persist(
    (set, get) => ({
      cards: {},

      getCardState: (deckId, cardId) => get().cards[cardKey(deckId, cardId)] ?? newCardState(Date.now()),

      getDueCardIds: (deckId, allCardIds, now = Date.now()) => {
        const cards = get().cards
        return Array.from(new Set(allCardIds)).filter((id) => {
          const state = cards[cardKey(deckId, id)]
          return !state || state.dueAt <= now
        })
      },

      reviewCard: (deckId, cardId, quality) => {
        const now = Date.now()
        const key = cardKey(deckId, cardId)
        const prev = get().cards[key] ?? newCardState(now)
        set((state) => ({ cards: { ...state.cards, [key]: sm2(prev, quality, now) } }))
      },

      clear: () => set({ cards: {} }),
    }),
    {
      name: 'packet-and-post.spaced-repetition',
      // See progressStore.ts for why both `version` and `migrate` are
      // required together -- without `migrate`, this discards every
      // existing player's review schedule instead of preserving it.
      version: 1,
      migrate: (persisted) => persisted as SpacedRepetitionState,
    },
  ),
)
