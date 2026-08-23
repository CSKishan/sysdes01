// Every glossary entry that names a topicId must point at a real level --
// otherwise RichText's [[term]] links and the Glossary page silently 404
// (well, redirect to /library) the moment someone clicks through.

import { describe, expect, it } from 'vitest'
import { GLOSSARY } from '../glossary'
import { getLevel } from '../registry'

describe('glossary', () => {
  it('every topicId resolves to a real level', () => {
    for (const entry of GLOSSARY) {
      if (entry.topicId) {
        expect(getLevel(entry.topicId), `glossary term "${entry.term}" -> topicId "${entry.topicId}"`).toBeDefined()
      }
    }
  })

  it('has no duplicate terms', () => {
    const terms = GLOSSARY.map((e) => e.term.toLowerCase())
    expect(new Set(terms).size).toBe(terms.length)
  })
})
