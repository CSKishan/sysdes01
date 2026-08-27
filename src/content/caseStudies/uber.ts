import type { CaseStudy } from './types'
import { deriveScaledWorkload, formatBytes, formatBytesPerSecond, formatRps, SECONDS_PER_DAY } from './helpers'
import { hasConnectedNodeKind, meetsLoad } from '@/game/rubricScoring'

// Shared by multiple estimation outputs below -- named once instead of
// re-derived inline at each call site.
const totalRequests = (v: Record<string, number>) => v.dau * v.actionsPerUser
const dailyBytes = (v: Record<string, number>) => totalRequests(v) * v.avgRecordBytes

export const uberCaseStudy: CaseStudy = {
  id: 'cs-uber',
  order: 5,
  title: 'Uber',
  realConcept: 'Uber',
  scenario: [
    'Design an Uber-like ride-hailing service: customers request a ride and see nearby drivers with ETA and pricing; drivers accept rides and are tracked live until drop-off.',
  ],
  requirements: {
    intro: ['Two very different clients here -- customers and drivers -- both streaming live location, both needing the system to react in near-real time.'],
    questions: [
      {
        id: 'functional',
        category: 'functional',
        question: 'Which of these should be functional requirements?',
        options: [
          { id: 'see-cabs', label: 'Customers see nearby cabs with ETA and pricing', inCanonicalDesign: true },
          { id: 'book', label: 'Customers can book a cab to a destination', inCanonicalDesign: true },
          { id: 'driver-location', label: 'Customers can see the driver’s live location', inCanonicalDesign: true },
          { id: 'accept-deny', label: 'Drivers can accept or deny a requested ride', inCanonicalDesign: true },
          { id: 'schedule-weeks', label: 'Customers can schedule a ride weeks in advance', inCanonicalDesign: false },
        ],
      },
      {
        id: 'nonfunctional',
        category: 'nonFunctional',
        question: 'Which of these should be non-functional requirements?',
        options: [
          { id: 'reliability', label: 'High reliability', inCanonicalDesign: true },
          { id: 'availability', label: 'High availability with minimal latency', inCanonicalDesign: true },
          { id: 'scalable', label: 'The system should be scalable and efficient', inCanonicalDesign: true },
          { id: 'offline-mode', label: 'The mobile app must fully function with no network connection', inCanonicalDesign: false },
        ],
      },
      {
        id: 'extended',
        category: 'extended',
        question: 'Which of these are reasonable extended requirements?',
        options: [
          { id: 'rating', label: 'Customers can rate the trip after completion', inCanonicalDesign: true },
          { id: 'payment', label: 'Payment processing', inCanonicalDesign: true },
          { id: 'analytics', label: 'Metrics and analytics', inCanonicalDesign: true },
          { id: 'translate', label: 'Real-time in-app chat translation', inCanonicalDesign: false },
        ],
      },
    ],
  },
  estimation: {
    intro: ['Every customer action -- checking fares, booking, tracking -- is a request, on top of constant driver location pings.'],
    inputs: [
      { id: 'dau', label: 'Daily active users', unit: '', defaultValue: 100_000_000, min: 10_000_000, max: 300_000_000, step: 10_000_000 },
      { id: 'actionsPerUser', label: 'Actions per user/day', unit: '', defaultValue: 10, min: 2, max: 30, step: 2 },
      { id: 'avgRecordBytes', label: 'Average request/record size', unit: 'bytes', defaultValue: 400, min: 100, max: 1000, step: 100 },
      { id: 'retentionYears', label: 'Retention period', unit: 'years', defaultValue: 10, min: 1, max: 20, step: 1 },
    ],
    outputs: [
      { id: 'requestsPerDay', label: 'Requests per day', compute: (v) => totalRequests(v), formatValue: (n) => `${(n / 1e9).toFixed(1)}B` },
      { id: 'rps', label: 'Requests per second', compute: (v) => totalRequests(v) / SECONDS_PER_DAY, formatValue: formatRps },
      { id: 'dailyStorage', label: 'Storage per day', compute: (v) => dailyBytes(v), formatValue: formatBytes },
      { id: 'totalStorage', label: `Total storage`, compute: (v) => dailyBytes(v) * v.retentionYears * 365, formatValue: formatBytes },
      { id: 'bandwidth', label: 'Bandwidth', compute: (v) => dailyBytes(v) / SECONDS_PER_DAY, formatValue: formatBytesPerSecond },
    ],
    canonicalEstimate: [
      { label: 'Daily active users', value: '100 million' },
      { label: 'Requests per second', value: '12K/s' },
      { label: 'Storage (per day)', value: '~400 GB' },
      { label: 'Storage (10 years)', value: '~1.4 PB' },
      { label: 'Bandwidth', value: '~5 MB/s' },
    ],
    readmeQuote: {
      text: 'Let us assume we have 100 million daily active users (DAU) with 1 million drivers and on average our platform enables 10 million rides daily.',
      source: 'Chapter V · Uber (Estimation and Constraints)',
    },
    deriveWorkload: (o) => deriveScaledWorkload(o.rps * 0.8, o.rps * 0.2),
  },
  design: {
    brief: [
      'Ride matching needs to find nearby drivers fast -- a plain lat/long range scan doesn’t scale (this is exactly the geohashing/quadtree problem from Chapter IV). Build it, then submit for review.',
    ],
    rubric: [
      {
        id: 'services',
        label: 'Splits ride matching, trips, and payments into separate services',
        whyItMatters: 'Ride matching is latency-critical and read/write-heavy on live location; payment processing has completely different reliability and consistency needs -- bundling them couples unrelated failure modes.',
        check: (graph) => hasConnectedNodeKind(graph, 'service'),
      },
      {
        id: 'database',
        label: 'Has a database sized for a high-frequency write load (live location pings)',
        whyItMatters: 'Every driver is pinging their location constantly -- this is a sustained high-write workload, not an occasional one.',
        check: (graph) => hasConnectedNodeKind(graph, 'database'),
      },
      {
        id: 'queue',
        label: 'Uses a queue or broker to broadcast a ride request to nearby drivers',
        whyItMatters: 'Notifying multiple nearby drivers about one ride request and collecting the first accept is an async, fan-out-shaped problem, not a single synchronous call.',
        check: (graph) => hasConnectedNodeKind(graph, 'queue') || hasConnectedNodeKind(graph, 'broker'),
      },
      {
        id: 'redundancy',
        label: 'Has a load balancer distributing traffic across redundant backends',
        whyItMatters: 'The "high reliability" requirement rules out a single instance anywhere on the live-ride path -- a mid-ride outage strands a real passenger.',
        check: (graph) => hasConnectedNodeKind(graph, 'loadBalancer'),
      },
      {
        id: 'meets-load',
        label: 'Clears the estimated load with a low error rate',
        whyItMatters: 'A ride-matching system that errors under normal load leaves customers stranded, not just inconvenienced.',
        check: (_graph, result) => meetsLoad(result),
      },
    ],
    referenceArchitecture: {
      summary: [
        'A Ride Service owns matching: it geohashes/quadtree-indexes driver locations for fast nearby-driver queries, rather than scanning a lat/long range.',
        'Location updates push over WebSockets; ride requests broadcast to nearby drivers via a queue, and the first accept wins.',
        'Trip and Payment are separate services from Ride matching, so a payment-provider slowdown can’t stall active ride matching.',
      ],
      keyDecisions: [
        'Geohashing/quadtree indexing for nearby-driver queries, not a raw SQL range scan -- covered in Chapter IV, and it’s exactly this problem.',
        'Push (WebSockets), not polling, for live location -- matches the real-time-tracking non-functional requirement.',
        'Ride matching decoupled from payment processing, so each can scale and fail independently.',
      ],
    },
  },
  interviewPhrase: '"Finding nearby drivers is a spatial query, not a relational one -- I’d reach for a geohash or quadtree index rather than a raw lat/long range scan, which stops scaling well long before this system’s real traffic would."',
}
