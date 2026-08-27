import type { CaseStudy } from './types'
import { deriveScaledWorkload, formatBytes, formatBytesPerSecond, formatRps, SECONDS_PER_DAY } from './helpers'
import { hasConnectedNodeKind, meetsLoad } from '@/game/rubricScoring'

// Shared by multiple estimation outputs below -- named once instead of
// re-derived inline at each call site.
const totalTweets = (v: Record<string, number>) => v.dau * v.tweetsPerUser
const dailyBytes = (v: Record<string, number>) =>
  totalTweets(v) * v.avgTweetBytes + totalTweets(v) * (v.mediaPercent / 100) * v.avgMediaKB * 1024

export const twitterCaseStudy: CaseStudy = {
  id: 'cs-twitter',
  order: 3,
  title: 'Twitter',
  realConcept: 'Twitter',
  scenario: [
    'Design a Twitter-like social media service: users post short messages ("tweets"), follow other users, and read a newsfeed made of tweets from who they follow.',
  ],
  requirements: {
    intro: ['This is the classic "celebrity problem" system -- some accounts have orders of magnitude more followers than others, and the design has to survive that skew.'],
    questions: [
      {
        id: 'functional',
        category: 'functional',
        question: 'Which of these should be functional requirements?',
        options: [
          { id: 'post', label: 'Post new tweets (text, image, video)', inCanonicalDesign: true },
          { id: 'follow', label: 'Follow other users', inCanonicalDesign: true },
          { id: 'newsfeed', label: 'A newsfeed of tweets from people the user follows', inCanonicalDesign: true },
          { id: 'search', label: 'Search tweets', inCanonicalDesign: true },
          { id: 'dm', label: 'Direct messaging between users', inCanonicalDesign: false },
        ],
      },
      {
        id: 'nonfunctional',
        category: 'nonFunctional',
        question: 'Which of these should be non-functional requirements?',
        options: [
          { id: 'availability', label: 'High availability with minimal latency', inCanonicalDesign: true },
          { id: 'scalable', label: 'The system should be scalable and efficient', inCanonicalDesign: true },
          { id: 'exactly-once', label: 'Guarantee exactly-once tweet delivery to every follower', inCanonicalDesign: false },
        ],
      },
      {
        id: 'extended',
        category: 'extended',
        question: 'Which of these are reasonable extended requirements?',
        options: [
          { id: 'analytics', label: 'Metrics and analytics', inCanonicalDesign: true },
          { id: 'retweet', label: 'Retweet functionality', inCanonicalDesign: true },
          { id: 'favorite', label: 'Favorite tweets', inCanonicalDesign: true },
          { id: 'ad-targeting', label: 'An algorithmic ad-targeting dashboard', inCanonicalDesign: false },
        ],
      },
    ],
  },
  estimation: {
    intro: ['A read-heavy system: far more newsfeed reads happen than tweets get posted.'],
    inputs: [
      { id: 'dau', label: 'Daily active users', unit: '', defaultValue: 200_000_000, min: 20_000_000, max: 500_000_000, step: 20_000_000 },
      { id: 'tweetsPerUser', label: 'Tweets posted per user/day', unit: '', defaultValue: 5, min: 1, max: 20, step: 1 },
      { id: 'mediaPercent', label: 'Share of tweets with media', unit: '%', defaultValue: 10, min: 1, max: 30, step: 1 },
      { id: 'avgTweetBytes', label: 'Average tweet text size', unit: 'bytes', defaultValue: 100, min: 50, max: 300, step: 10 },
      { id: 'avgMediaKB', label: 'Average media file size', unit: 'KB', defaultValue: 50, min: 20, max: 500, step: 10 },
    ],
    outputs: [
      { id: 'tweetsPerDay', label: 'Tweets posted per day', compute: (v) => totalTweets(v), formatValue: (n) => `${(n / 1e9).toFixed(1)}B` },
      { id: 'rps', label: 'Requests per second', compute: (v) => totalTweets(v) / SECONDS_PER_DAY, formatValue: formatRps },
      { id: 'dailyStorage', label: 'Storage per day', compute: (v) => dailyBytes(v), formatValue: formatBytes },
      { id: 'bandwidth', label: 'Bandwidth', compute: (v) => dailyBytes(v) / SECONDS_PER_DAY, formatValue: formatBytesPerSecond },
    ],
    canonicalEstimate: [
      { label: 'Daily active users', value: '200 million' },
      { label: 'Requests per second', value: '12K/s' },
      { label: 'Storage (per day)', value: '~5.1 TB' },
      { label: 'Storage (10 years)', value: '~19 PB' },
      { label: 'Bandwidth', value: '~60 MB/s' },
    ],
    readmeQuote: {
      text: 'This will be a read-heavy system, let us assume we have 1 billion total users with 200 million daily active users (DAU), and on average each user tweets 5 times a day.',
      source: 'Chapter V · Twitter (Estimation and Constraints)',
    },
    deriveWorkload: (o) => deriveScaledWorkload(o.rps * 0.9, o.rps * 0.1),
  },
  design: {
    brief: [
      'The hard part isn’t posting a tweet -- it’s cheaply fanning it out to however many followers a user has, from a handful to tens of millions. Build it, then submit for review.',
    ],
    rubric: [
      {
        id: 'cache',
        label: 'Caches pre-generated newsfeeds instead of recomputing them on every read',
        whyItMatters: 'Ranking and assembling a feed from scratch on every request is expensive -- caching the generated feed is what makes a read-heavy system like this affordable.',
        check: (graph) => hasConnectedNodeKind(graph, 'cache'),
      },
      {
        id: 'fanout',
        label: 'Uses a queue or broker to fan out a new tweet to followers asynchronously',
        whyItMatters: 'Pushing a tweet to every follower synchronously on the write path would make posting as a popular account catastrophically slow.',
        check: (graph) => hasConnectedNodeKind(graph, 'queue') || hasConnectedNodeKind(graph, 'broker'),
      },
      {
        id: 'services',
        label: 'Splits tweet posting, newsfeed, and search into separate services',
        whyItMatters: 'Newsfeed generation, search indexing, and posting have very different load and scaling profiles -- one monolith couples their failure modes together.',
        check: (graph) => hasConnectedNodeKind(graph, 'service'),
      },
      {
        id: 'redundancy',
        label: 'Has a load balancer distributing read traffic across redundant backends',
        whyItMatters: 'A read-heavy system with a single backend instance has no headroom and no failover.',
        check: (graph) => hasConnectedNodeKind(graph, 'loadBalancer'),
      },
      {
        id: 'meets-load',
        label: 'Clears the estimated load with a low error rate',
        whyItMatters: 'A newsfeed that times out under normal load defeats the entire point of the product.',
        check: (_graph, result) => meetsLoad(result),
      },
    ],
    referenceArchitecture: {
      summary: [
        'A Tweet Service handles posting; a Newsfeed Service pre-generates and caches each user’s feed.',
        'Fan-out on write (push) for most users; fan-out on load (pull) for accounts with huge follower counts -- a hybrid model, avoiding a single celebrity tweet triggering millions of synchronous writes.',
        'A Search Service maintains its own index, decoupled from the primary tweet store.',
      ],
      keyDecisions: [
        'Hybrid push/pull fan-out, not one model for everyone -- push doesn’t scale to celebrity accounts, pull alone would make every read expensive.',
        'Feed ranking happens once, at generation time, and gets cached -- not recomputed per read.',
      ],
    },
  },
  interviewPhrase: '"Fan-out on write works until you hit an account with millions of followers -- at that point I’d switch that specific user to fan-out on read, so one celebrity tweet doesn’t trigger millions of synchronous writes."',
}
