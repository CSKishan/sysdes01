import type { CaseStudy } from './types'
import { deriveScaledWorkload, formatBytes, formatBytesPerSecond, formatRps, SECONDS_PER_DAY } from './helpers'
import { hasConnectedNodeKind, meetsLoad } from '@/game/rubricScoring'

// Shared by multiple estimation outputs below -- named once instead of
// re-derived inline at each call site.
const watchesPerDay = (v: Record<string, number>) => v.dau * v.videosPerUser
const uploadsPerDay = (v: Record<string, number>) => watchesPerDay(v) / v.readWriteRatio
const uploadBytesPerDay = (v: Record<string, number>) => uploadsPerDay(v) * v.avgVideoMB * 1024 * 1024

export const netflixCaseStudy: CaseStudy = {
  id: 'cs-netflix',
  order: 4,
  title: 'Netflix',
  realConcept: 'Netflix',
  scenario: [
    'Design a Netflix-like video streaming service: users stream video on demand, a content team uploads new titles, and users can search and comment.',
  ],
  requirements: {
    intro: ['Two very different problems live under one product here: getting a huge video file processed and stored, and streaming it back with low latency to millions of concurrent viewers.'],
    questions: [
      {
        id: 'functional',
        category: 'functional',
        question: 'Which of these should be functional requirements?',
        options: [
          { id: 'stream', label: 'Users can stream and share videos', inCanonicalDesign: true },
          { id: 'upload', label: 'The content team can upload new videos', inCanonicalDesign: true },
          { id: 'search', label: 'Users can search for videos by title or tags', inCanonicalDesign: true },
          { id: 'comment', label: 'Users can comment on a video', inCanonicalDesign: true },
          { id: 'live', label: 'Support live-streamed events', inCanonicalDesign: false },
        ],
      },
      {
        id: 'nonfunctional',
        category: 'nonFunctional',
        question: 'Which of these should be non-functional requirements?',
        options: [
          { id: 'availability', label: 'High availability with minimal latency', inCanonicalDesign: true },
          { id: 'reliability', label: 'High reliability -- no uploads should be lost', inCanonicalDesign: true },
          { id: 'scalable', label: 'The system should be scalable and efficient', inCanonicalDesign: true },
          { id: 'collab-edit', label: 'Support real-time collaborative video editing', inCanonicalDesign: false },
        ],
      },
      {
        id: 'extended',
        category: 'extended',
        question: 'Which of these are reasonable extended requirements?',
        options: [
          { id: 'geoblock', label: 'Certain content should be geo-blocked', inCanonicalDesign: true },
          { id: 'resume', label: 'Resume playback from where the user left off', inCanonicalDesign: true },
          { id: 'analytics', label: 'Record metrics and analytics of videos', inCanonicalDesign: true },
          { id: 'editor', label: 'An in-app video editing tool', inCanonicalDesign: false },
        ],
      },
    ],
  },
  estimation: {
    intro: ['Read-heavy: assume a 200:1 ratio of videos watched to videos uploaded.'],
    inputs: [
      { id: 'dau', label: 'Daily active users', unit: '', defaultValue: 200_000_000, min: 20_000_000, max: 500_000_000, step: 20_000_000 },
      { id: 'videosPerUser', label: 'Videos watched per user/day', unit: '', defaultValue: 5, min: 1, max: 20, step: 1 },
      { id: 'readWriteRatio', label: 'Watch:upload ratio', unit: ': 1', defaultValue: 200, min: 20, max: 1000, step: 20 },
      { id: 'avgVideoMB', label: 'Average processed video size', unit: 'MB', defaultValue: 100, min: 10, max: 500, step: 10 },
    ],
    outputs: [
      { id: 'watchesPerDay', label: 'Videos watched per day', compute: (v) => watchesPerDay(v), formatValue: (n) => `${(n / 1e9).toFixed(1)}B` },
      { id: 'rps', label: 'Requests per second', compute: (v) => watchesPerDay(v) / SECONDS_PER_DAY, formatValue: formatRps },
      { id: 'uploadsPerDay', label: 'Videos uploaded per day', compute: (v) => uploadsPerDay(v), formatValue: (n) => `${Math.round(n).toLocaleString()}` },
      { id: 'dailyStorage', label: 'Storage per day', compute: (v) => uploadBytesPerDay(v), formatValue: formatBytes },
      // Labeled "upload ingress" specifically, not total bandwidth -- the
      // README's own ~5.8 GB/s figure is explicitly the cost of accepting
      // uploads ("500 TB of ingress every day"), not the far larger cost of
      // streaming watches back out, which it doesn't estimate at all.
      { id: 'bandwidth', label: 'Bandwidth (upload ingress)', compute: (v) => uploadBytesPerDay(v) / SECONDS_PER_DAY, formatValue: formatBytesPerSecond },
    ],
    canonicalEstimate: [
      { label: 'Daily active users', value: '200 million' },
      { label: 'Requests per second', value: '12K/s' },
      { label: 'Storage (per day)', value: '~500 TB' },
      { label: 'Storage (10 years)', value: '~1,825 PB' },
      { label: 'Bandwidth (upload ingress)', value: '~5.8 GB/s' },
    ],
    readmeQuote: {
      text: 'This will be a read-heavy system, let us assume we have 1 billion total users with 200 million daily active users (DAU), and on average each user watches 5 videos a day.',
      source: 'Chapter V · Netflix (Estimation and Constraints)',
    },
    deriveWorkload: (o) => deriveScaledWorkload(o.watchesPerDay / SECONDS_PER_DAY, o.uploadsPerDay / SECONDS_PER_DAY),
  },
  design: {
    brief: [
      'Uploads are a slow, multi-step pipeline (chunk, filter, transcode, package). Streaming is the opposite: millions of viewers, low latency, mostly-static content. Build it, then submit for review.',
    ],
    rubric: [
      {
        id: 'cache',
        label: 'Caches or CDN-fronts video delivery instead of serving every stream from origin',
        whyItMatters: 'Streaming the same popular title from a single origin to millions of concurrent viewers is exactly what a CDN/cache layer exists to absorb.',
        check: (graph) => hasConnectedNodeKind(graph, 'cache'),
      },
      {
        id: 'queue',
        label: 'Uses a queue or broker to decouple video processing from the upload path',
        whyItMatters: 'Chunking, content filtering, and transcoding a video is a long-running job -- accepting the upload and queuing the work is what keeps the upload endpoint itself fast.',
        check: (graph) => hasConnectedNodeKind(graph, 'queue') || hasConnectedNodeKind(graph, 'broker'),
      },
      {
        id: 'database',
        label: 'Has a database for video metadata, separate from the video bytes themselves',
        whyItMatters: 'Titles, tags, and view counts are small, structured, and queried constantly -- a very different access pattern from the large binary video files.',
        check: (graph) => hasConnectedNodeKind(graph, 'database'),
      },
      {
        id: 'services',
        label: 'Splits streaming, upload/processing, and search into separate services',
        whyItMatters: 'A processing-pipeline slowdown shouldn’t be able to degrade live streaming for everyone already watching.',
        check: (graph) => hasConnectedNodeKind(graph, 'service'),
      },
      {
        id: 'meets-load',
        label: 'Clears the estimated load with a low error rate',
        whyItMatters: 'A streaming service that buffers or errors under its own expected concurrent-viewer load has failed the one thing it exists to do.',
        check: (_graph, result) => meetsLoad(result),
      },
    ],
    referenceArchitecture: {
      summary: [
        'Uploads are queued for a processing pipeline: file chunker -> content filter -> transcoder -> quality conversion, writing finished renditions to object storage.',
        'A CDN (Netflix\'s own Open Connect, or a general-purpose one) fronts streaming, serving from edge locations near each viewer instead of one origin.',
        'A Stream Service and Search Service are split from the Media (upload/processing) Service, so a processing backlog can’t degrade live viewers.',
      ],
      keyDecisions: [
        'Chunking by scene, not fixed timestamps -- a client refetching a chunk gets a complete scene, reducing playback interruption.',
        'A message queue between upload and processing -- processing is slow and shouldn’t block the upload response.',
        'CDN-first streaming architecture -- re-serving the same popular title from origin to millions of viewers doesn’t scale otherwise.',
      ],
    },
  },
  interviewPhrase: '"Upload and streaming are different problems wearing the same product -- I’d queue the processing pipeline so uploads stay fast, and push playback through a CDN so origin never sees the real concurrent-viewer load."',
}
