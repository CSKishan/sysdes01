// Phase 10.5: one comprehensive authoring-quality check across every level,
// instead of each new chapter's test file re-deriving its own version of
// "does this level have a real quote/examples/rule of thumb." Every level
// added from here on gets checked by this automatically -- nothing to
// remember to add per chapter.

import { describe, expect, it } from 'vitest'
import { ALL_LEVELS } from '../registry'
import type { BuildStage } from '../types'

// "Chapter I · Load Balancing", "Getting Started · What is system design?"
// -- every authored quote source follows this "<section> · <topic>" shape.
const SOURCE_PATTERN = /^[^·]+ · [^·]+$/

describe('content lint: every build stage of every level', () => {
  for (const level of ALL_LEVELS) {
    // Every build stage (guided/solo/twist), not just the last -- each one
    // renders its own debrief to the player the moment they complete that
    // specific stage (BuildStagePlayer passes `stage.debrief` straight
    // through), so a gap in an earlier stage ships to players just as
    // surely as one in the final stage would. (interviewPhrases.ts's own
    // lastBuildStage picks only the last stage deliberately, for a
    // different reason: one definitive phrase per topic in a practice
    // deck, not a QA sweep over everything a player actually sees.)
    const buildStages = level.stages.filter((s): s is BuildStage => s.kind === 'build')
    if (buildStages.length === 0) continue

    describe(`${level.id} (${level.title})`, () => {
      for (const stage of buildStages) {
        describe(`"${stage.title}" (${stage.mode})`, () => {
          it('has a verbatim README quote with a properly-formatted source', () => {
            expect(stage.debrief.readmeQuote.text.length, 'readmeQuote.text is empty').toBeGreaterThan(0)
            expect(
              stage.debrief.readmeQuote.source,
              `source "${stage.debrief.readmeQuote.source}" doesn't match "<section> · <topic>"`,
            ).toMatch(SOURCE_PATTERN)
          })

          it('has at least one real-world example', () => {
            expect(stage.debrief.realWorldExamples.length, 'realWorldExamples is empty').toBeGreaterThan(0)
            for (const example of stage.debrief.realWorldExamples) {
              expect(example.trim().length, 'a realWorldExamples entry is blank').toBeGreaterThan(0)
            }
          })

          it('has a non-empty rule of thumb', () => {
            expect(stage.debrief.ruleOfThumb.trim().length, 'ruleOfThumb is empty').toBeGreaterThan(0)
          })

          it('has a non-empty interview phrase', () => {
            expect(stage.debrief.interviewPhrase.trim().length, 'interviewPhrase is empty').toBeGreaterThan(0)
          })

          it('has non-empty success and failure debrief bodies', () => {
            expect(stage.debrief.successBody.length, 'successBody is empty').toBeGreaterThan(0)
            expect(stage.debrief.failureBody.length, 'failureBody is empty').toBeGreaterThan(0)
          })
        })
      }
    })
  }
})

describe('content lint: quiz coverage', () => {
  for (const level of ALL_LEVELS) {
    it(`${level.id} has at least 2 quiz questions`, () => {
      expect(level.quizQuestions?.length ?? 0, `${level.id} has fewer than 2 quiz questions`).toBeGreaterThanOrEqual(2)
    })
  }
})
