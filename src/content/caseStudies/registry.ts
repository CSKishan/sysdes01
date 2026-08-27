import type { CaseStudy } from './types'
import { urlShortenerCaseStudy } from './urlShortener'
import { whatsappCaseStudy } from './whatsapp'
import { twitterCaseStudy } from './twitter'
import { netflixCaseStudy } from './netflix'
import { uberCaseStudy } from './uber'

export const CASE_STUDIES: CaseStudy[] = [
  urlShortenerCaseStudy,
  whatsappCaseStudy,
  twitterCaseStudy,
  netflixCaseStudy,
  uberCaseStudy,
].sort((a, b) => a.order - b.order)

const CASE_STUDY_BY_ID = new Map(CASE_STUDIES.map((cs) => [cs.id, cs]))

export function getCaseStudy(id: string): CaseStudy | undefined {
  return CASE_STUDY_BY_ID.get(id)
}
