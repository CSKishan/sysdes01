// Client-side full-text search over the Library corpus (Phase 1.2). No
// dependency needed at this corpus size (~35 levels, ~50 glossary terms) --
// a flat array and a substring/token scan is plenty fast for Ctrl-K.

import type { Level } from './types'
import { ALL_LEVELS, CHAPTERS } from './registry'
import { GLOSSARY, type GlossaryEntry } from './glossary'

export interface SearchDoc {
  id: string
  kind: 'topic' | 'glossary'
  title: string
  subtitle: string
  chapterTitle?: string
  /** Lowercased, space-joined searchable text. Built once at index time. */
  haystack: string
  href: string
}

function levelText(level: Level): string {
  const parts: string[] = [level.title, level.realConcept, level.analogyName]
  for (const stage of level.stages) {
    if (stage.kind === 'situation') parts.push(stage.title, ...stage.body)
    if (stage.kind === 'teach') {
      parts.push(stage.title, ...stage.body, stage.readmeQuote.text, ...stage.realWorldExamples)
    }
    if (stage.kind === 'build') {
      parts.push(stage.title, ...stage.brief, stage.debrief.readmeQuote.text, ...stage.debrief.realWorldExamples)
    }
  }
  return parts.join(' ')
}

function buildTopicDoc(level: Level): SearchDoc {
  const chapter = CHAPTERS.find((c) => c.id === level.chapterId)
  return {
    id: level.id,
    kind: 'topic',
    title: level.title,
    subtitle: level.realConcept,
    chapterTitle: chapter?.title,
    haystack: levelText(level).toLowerCase(),
    href: `/library/topic/${level.id}`,
  }
}

function buildGlossaryDoc(entry: GlossaryEntry): SearchDoc {
  return {
    id: `glossary-${entry.term}`,
    kind: 'glossary',
    title: entry.term,
    subtitle: entry.definition,
    haystack: `${entry.term} ${entry.definition}`.toLowerCase(),
    href: entry.topicId ? `/library/topic/${entry.topicId}` : '/library/glossary',
  }
}

let cachedIndex: SearchDoc[] | null = null

export function getSearchIndex(): SearchDoc[] {
  if (!cachedIndex) {
    cachedIndex = [...ALL_LEVELS.map(buildTopicDoc), ...GLOSSARY.map(buildGlossaryDoc)]
  }
  return cachedIndex
}

export interface SearchResult {
  doc: SearchDoc
  score: number
}

/** Ranks by where the match falls (title beats subtitle beats body) rather
 * than a real relevance model -- appropriate for a corpus this size. */
export function searchContent(query: string, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const terms = q.split(/\s+/).filter(Boolean)

  const results: SearchResult[] = []
  for (const doc of getSearchIndex()) {
    let score = 0
    const titleLower = doc.title.toLowerCase()
    if (titleLower === q) score += 100
    else if (titleLower.startsWith(q)) score += 50
    else if (titleLower.includes(q)) score += 25

    let allTermsMatch = true
    for (const term of terms) {
      if (titleLower.includes(term)) score += 8
      else if (doc.subtitle.toLowerCase().includes(term)) score += 4
      else if (doc.haystack.includes(term)) score += 1
      else allTermsMatch = false
    }
    if (allTermsMatch && score > 0) {
      if (doc.kind === 'topic') score += 2 // topics edge out glossary on ties
      results.push({ doc, score })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}
