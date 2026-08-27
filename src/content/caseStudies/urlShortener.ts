// URL Shortener case study -- README's own numbers (100M links/month,
// 100:1 read/write, 40 writes/s -> 4K reads/s, 6TB over 10 years) already
// anchor ch0-l3's RPS lesson (see chapter0.ts), so this stays consistent
// with that rather than inventing a second, disagreeing set of numbers.

import type { CaseStudy } from './types'
import { deriveScaledWorkload, formatBytes, formatBytesPerSecond, formatRps, SECONDS_PER_MONTH } from './helpers'
import { hasConnectedNodeKind, countConnectedNodeKind, meetsLoad } from '@/game/rubricScoring'

export const urlShortenerCaseStudy: CaseStudy = {
  id: 'cs-url-shortener',
  order: 1,
  title: 'URL Shortener',
  realConcept: 'URL Shortener',
  scenario: [
    'Design a URL shortener, similar to Bitly or TinyURL: given a long URL, generate a short, unique alias that redirects back to the original when visited.',
  ],
  requirements: {
    intro: [
      "Before drawing anything, scope the problem. What must this system do, what quality bar does it have to hit, and what's a nice-to-have for later?",
    ],
    questions: [
      {
        id: 'functional',
        category: 'functional',
        question: 'Which of these should be functional requirements?',
        options: [
          { id: 'generate-alias', label: 'Given a URL, generate a shorter, unique alias for it', inCanonicalDesign: true },
          { id: 'redirect', label: 'Redirect users to the original URL when they visit the short link', inCanonicalDesign: true },
          { id: 'expire', label: 'Links expire after a default timespan', inCanonicalDesign: true },
          { id: 'edit-destination', label: 'Allow editing a short link’s destination after creation', inCanonicalDesign: false },
        ],
      },
      {
        id: 'nonfunctional',
        category: 'nonFunctional',
        question: 'Which of these should be non-functional requirements?',
        options: [
          { id: 'availability', label: 'High availability with minimal latency', inCanonicalDesign: true },
          { id: 'scalable', label: 'The system should be scalable and efficient', inCanonicalDesign: true },
          { id: 'strong-consistency', label: 'Every replica must be strongly consistent at all times', inCanonicalDesign: false },
        ],
      },
      {
        id: 'extended',
        category: 'extended',
        question: 'Which of these are reasonable extended (nice-to-have) requirements?',
        options: [
          { id: 'abuse', label: 'Prevent abuse of the service', inCanonicalDesign: true },
          { id: 'analytics', label: 'Record analytics and metrics for redirections', inCanonicalDesign: true },
          { id: 'vanity', label: 'Every user can pick a fully custom vanity alias', inCanonicalDesign: false },
        ],
      },
    ],
  },
  estimation: {
    intro: [
      'This is a read-heavy system. Assume a 100:1 read/write ratio -- for every new link created, it gets visited about 100 times.',
    ],
    inputs: [
      { id: 'linksPerMonth', label: 'New links created', unit: '/month', defaultValue: 100_000_000, min: 10_000_000, max: 500_000_000, step: 10_000_000 },
      { id: 'readWriteRatio', label: 'Read:write ratio', unit: ': 1', defaultValue: 100, min: 10, max: 500, step: 10 },
      { id: 'avgRecordBytes', label: 'Average record size', unit: 'bytes', defaultValue: 500, min: 100, max: 2000, step: 100 },
      { id: 'retentionYears', label: 'Retention period', unit: 'years', defaultValue: 10, min: 1, max: 20, step: 1 },
    ],
    outputs: [
      { id: 'writesPerSecond', label: 'Writes per second', compute: (v) => v.linksPerMonth / SECONDS_PER_MONTH, formatValue: formatRps },
      { id: 'readsPerSecond', label: 'Reads per second', compute: (v) => (v.linksPerMonth / SECONDS_PER_MONTH) * v.readWriteRatio, formatValue: formatRps },
      { id: 'incomingBandwidth', label: 'Incoming bandwidth', compute: (v) => (v.linksPerMonth / SECONDS_PER_MONTH) * v.avgRecordBytes, formatValue: formatBytesPerSecond },
      { id: 'outgoingBandwidth', label: 'Outgoing bandwidth', compute: (v) => (v.linksPerMonth / SECONDS_PER_MONTH) * v.readWriteRatio * v.avgRecordBytes, formatValue: formatBytesPerSecond },
      { id: 'totalStorage', label: `Total storage`, compute: (v) => v.linksPerMonth * v.retentionYears * 12 * v.avgRecordBytes, formatValue: formatBytes },
    ],
    canonicalEstimate: [
      { label: 'Writes (new URLs)', value: '40/s' },
      { label: 'Reads (redirection)', value: '4K/s' },
      { label: 'Bandwidth (in)', value: '20 KB/s' },
      { label: 'Bandwidth (out)', value: '2 MB/s' },
      { label: 'Storage (10 years)', value: '6 TB' },
    ],
    readmeQuote: {
      text: 'This will be a read-heavy system, so let’s assume a 100:1 read/write ratio with 100 million links generated per month.',
      source: 'Chapter V · URL Shortener (Estimation and Constraints)',
    },
    deriveWorkload: (o) => deriveScaledWorkload(o.readsPerSecond, o.writesPerSecond),
  },
  design: {
    brief: [
      "Build the system. The simulated traffic below is scaled down from your own estimate (same read:write ratio, capped so the canvas sliders stay meaningful) -- design against it, then submit for review whenever you're ready.",
    ],
    rubric: [
      {
        id: 'cache',
        label: 'Caches hot redirects instead of hitting the database on every read',
        whyItMatters: 'At a 100:1 read ratio, an uncached database is doing 100x more work than it needs to for the same link.',
        check: (graph) => hasConnectedNodeKind(graph, 'cache'),
      },
      {
        id: 'database',
        label: 'Has a database to durably store links past a single request',
        whyItMatters: 'Short links need to survive a server restart -- an in-memory-only design loses every link the moment a node dies.',
        check: (graph) => hasConnectedNodeKind(graph, 'database'),
      },
      {
        id: 'rate-limiter',
        label: 'Rate-limits link creation to blunt abuse',
        whyItMatters: 'An unprotected create-link endpoint is an open invitation for scraping or spam link generation at scale.',
        check: (graph) => hasConnectedNodeKind(graph, 'rateLimiter'),
      },
      {
        id: 'redundancy',
        label: 'Has more than one path to the backend (load balancer + multiple servers)',
        whyItMatters: 'A single API server is a single point of failure for a service with a "high availability" requirement.',
        check: (graph) => hasConnectedNodeKind(graph, 'loadBalancer') && countConnectedNodeKind(graph, 'server') + countConnectedNodeKind(graph, 'service') > 1,
      },
      {
        id: 'meets-load',
        label: 'Clears the estimated load with a low error rate',
        whyItMatters: 'A design that looks right on paper but falls over under its own estimated traffic isn’t actually done.',
        check: (_graph, result) => meetsLoad(result),
      },
    ],
    referenceArchitecture: {
      summary: [
        'Clients hit an API Gateway (rate limiting, auth) in front of redundant API servers.',
        'A cache sits in front of the database, absorbing the 100:1 read skew (Pareto: cache ~20% of links, catch ~80% of reads).',
        'A sharded/partitioned database stores link records, keyed by the short hash.',
        'A standalone Key Generation Service pre-generates unique keys ahead of time, avoiding hash-collision retries under load.',
      ],
      keyDecisions: [
        'NoSQL over SQL: the data isn’t relational -- one record per link, looked up by key.',
        'LRU eviction for the cache: recently-created links get visited most.',
        'Base62 + a counter-based key generation service, not MD5 hashing, to avoid collision retries entirely.',
      ],
    },
  },
  interviewPhrase: '"For a read-heavy system like this, I’d put a cache in front of the database sized around the actual read skew, and generate keys ahead of time rather than hashing on the fly, so key collisions never become a request-path problem."',
}
