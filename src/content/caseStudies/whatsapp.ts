import type { CaseStudy } from './types'
import { deriveScaledWorkload, formatBytes, formatBytesPerSecond, formatRps, SECONDS_PER_DAY } from './helpers'
import { hasConnectedNodeKind, meetsLoad } from '@/game/rubricScoring'

// Shared by multiple estimation outputs below -- named once instead of
// re-derived inline at each call site.
const totalMessages = (v: Record<string, number>) => v.dau * v.messagesPerUser
const dailyBytes = (v: Record<string, number>) =>
  totalMessages(v) * v.avgMessageBytes + totalMessages(v) * (v.mediaPercent / 100) * v.avgMediaKB * 1024

export const whatsappCaseStudy: CaseStudy = {
  id: 'cs-whatsapp',
  order: 2,
  title: 'WhatsApp',
  realConcept: 'WhatsApp',
  scenario: [
    'Design a WhatsApp-like instant messaging service: one-on-one chat, group chats, file sharing, and real-time delivery to over a billion users.',
  ],
  requirements: {
    intro: ['Messaging systems live or die on real-time delivery. Scope the chat surface before touching the transport.'],
    questions: [
      {
        id: 'functional',
        category: 'functional',
        question: 'Which of these should be functional requirements?',
        options: [
          { id: 'one-on-one', label: 'Support one-on-one chat', inCanonicalDesign: true },
          { id: 'groups', label: 'Group chats (max 100 people)', inCanonicalDesign: true },
          { id: 'files', label: 'Support file sharing (image, video, etc.)', inCanonicalDesign: true },
          { id: 'calling', label: 'Voice and video calling', inCanonicalDesign: false },
        ],
      },
      {
        id: 'nonfunctional',
        category: 'nonFunctional',
        question: 'Which of these should be non-functional requirements?',
        options: [
          { id: 'availability', label: 'High availability with minimal latency', inCanonicalDesign: true },
          { id: 'scalable', label: 'The system should be scalable and efficient', inCanonicalDesign: true },
          { id: 'linearizable', label: 'Every message read must be linearizable across all replicas', inCanonicalDesign: false },
        ],
      },
      {
        id: 'extended',
        category: 'extended',
        question: 'Which of these are reasonable extended requirements?',
        options: [
          { id: 'receipts', label: 'Sent, delivered, and read receipts', inCanonicalDesign: true },
          { id: 'lastseen', label: "Show a user's last seen time", inCanonicalDesign: true },
          { id: 'push', label: 'Push notifications', inCanonicalDesign: true },
          { id: 'admin-keys', label: 'An admin dashboard for managing end-to-end encryption keys', inCanonicalDesign: false },
        ],
      },
    ],
  },
  estimation: {
    intro: [
      'Assume each active user sends messages to a handful of people each day. Media (images, video, files) is a minority of messages but dominates storage.',
    ],
    inputs: [
      { id: 'dau', label: 'Daily active users', unit: '', defaultValue: 50_000_000, min: 5_000_000, max: 200_000_000, step: 5_000_000 },
      { id: 'messagesPerUser', label: 'Messages sent per user/day', unit: '', defaultValue: 40, min: 5, max: 100, step: 5 },
      { id: 'mediaPercent', label: 'Share of messages that are media', unit: '%', defaultValue: 5, min: 1, max: 20, step: 1 },
      { id: 'avgMessageBytes', label: 'Average text message size', unit: 'bytes', defaultValue: 100, min: 50, max: 500, step: 50 },
      { id: 'avgMediaKB', label: 'Average media file size', unit: 'KB', defaultValue: 100, min: 50, max: 1000, step: 50 },
    ],
    outputs: [
      { id: 'messagesPerDay', label: 'Messages per day', compute: (v) => totalMessages(v), formatValue: (n) => `${(n / 1e9).toFixed(1)}B` },
      { id: 'rps', label: 'Requests per second', compute: (v) => totalMessages(v) / SECONDS_PER_DAY, formatValue: formatRps },
      { id: 'dailyStorage', label: 'Storage per day', compute: (v) => dailyBytes(v), formatValue: formatBytes },
      { id: 'bandwidth', label: 'Bandwidth', compute: (v) => dailyBytes(v) / SECONDS_PER_DAY, formatValue: formatBytesPerSecond },
    ],
    canonicalEstimate: [
      { label: 'Daily active users', value: '50 million' },
      { label: 'Requests per second', value: '24K/s' },
      { label: 'Storage (per day)', value: '~10.2 TB' },
      { label: 'Storage (10 years)', value: '~38 PB' },
      { label: 'Bandwidth', value: '~120 MB/s' },
    ],
    readmeQuote: {
      text: 'Let us assume we have 50 million daily active users (DAU) and on average each user sends at least 10 messages to 4 different people every day.',
      source: 'Chapter V · WhatsApp (Estimation and Constraints)',
    },
    deriveWorkload: (o) => deriveScaledWorkload(o.rps * 0.5, o.rps * 0.5),
  },
  design: {
    brief: [
      "Real-time delivery is the whole point here -- a message that only shows up on the next poll isn't instant messaging. Build it, then submit for review.",
    ],
    rubric: [
      {
        id: 'services',
        label: 'Splits concerns into separate services (chat, presence, notifications) rather than one monolith',
        whyItMatters: 'Chat, presence, and notification delivery have very different scaling and failure profiles -- bundling them means a notification-service problem can take down chat too.',
        check: (graph) => hasConnectedNodeKind(graph, 'service'),
      },
      {
        id: 'queue',
        label: 'Uses a queue or broker for offline push notifications',
        whyItMatters: "When a recipient isn't currently connected, the notification has to wait and be delivered at-least-once later -- exactly what a queue is for.",
        check: (graph) => hasConnectedNodeKind(graph, 'queue') || hasConnectedNodeKind(graph, 'broker'),
      },
      {
        id: 'cache',
        label: 'Uses a cache to track presence / last-seen without hitting the database on every heartbeat',
        whyItMatters: 'Presence updates are extremely frequent and low-value individually -- writing every heartbeat straight to a durable database wastes write capacity that message storage actually needs.',
        check: (graph) => hasConnectedNodeKind(graph, 'cache'),
      },
      {
        id: 'database',
        label: 'Has a database sized for a high, sustained write volume',
        whyItMatters: 'Every message sent is a write -- this is one of the least read-skewed systems in the whole curriculum.',
        check: (graph) => hasConnectedNodeKind(graph, 'database'),
      },
      {
        id: 'meets-load',
        label: 'Clears the estimated load with a low error rate',
        whyItMatters: 'A messaging service that drops messages under its own expected load has failed its core job.',
        check: (_graph, result) => meetsLoad(result),
      },
    ],
    referenceArchitecture: {
      summary: [
        'A Chat Service holds WebSocket connections and routes messages in real time; a Presence Service (backed by cache) tracks who is currently online.',
        'Offline recipients get an event queued for the Notification Service, which forwards to FCM/APNS based on platform.',
        'Messages persist to a database partitioned by chat/group id, decoupled from the real-time delivery path.',
      ],
      keyDecisions: [
        'WebSockets (push), not long polling -- a pull model wastes resources on empty-response polls and adds latency.',
        'A message queue for notifications, not direct fan-out -- the queue gives at-least-once delivery and ordering guarantees.',
        'Presence lives in cache, not the primary database -- it changes constantly and doesn’t need durability.',
      ],
    },
  },
  interviewPhrase: '"For real-time delivery I’d reach for WebSockets over polling -- and for anything that has to reach an offline user later, a queue gives me at-least-once delivery without the chat service itself needing to track retry state."',
}
