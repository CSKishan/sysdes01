// Chapter III extension -- the teach-only topics from the source README's
// Chapter III that don't get a dedicated build (N-tier, Message Brokers,
// ESB, EDA, Event Sourcing, REST/GraphQL/gRPC, Long polling/WebSockets/
// SSE). The last two use the new SequenceDiagram primitive instead of
// MiniDiagram -- they're differences in *request pattern over time*, not
// topology, which MiniDiagram's traveling-dot-over-icons can't represent.

import type { Level } from './types'

// ---------------------------------------------------------------------------
// N-tier architecture
// ---------------------------------------------------------------------------

const ch3NTier: Level = {
  id: 'ch3-ntier',
  chapterId: 'ch3',
  order: 1,
  title: 'Three Separate Buildings',
  realConcept: 'N-tier architecture',
  analogyName: 'Front counter, pricing office, ledger room',
  stages: [
    {
      kind: 'situation',
      title: 'One building, every job',
      body: [
        "Right now, Packet & Post's software is one building: the front counter, the pricing rules, and the ledger all live under one roof, run by whoever's on shift. It works, but you can't upgrade the pricing logic without touching everything else, and you can't put the ledger somewhere more secure without moving the whole building.",
      ],
    },
    {
      kind: 'teach',
      title: 'N-tier architecture',
      body: [
        '**N-tier architecture** divides an application into logical **layers** (separated responsibilities) and physical **tiers** (separated machines). A higher layer can call a lower layer, but not the other way around. A classic 3-tier split: a **presentation layer** (handles the customer interaction), a **business logic layer** (validates and applies the rules), and a **data access layer** (talks to the database).',
        "Tiers are physically separate machines, which is what actually buys you something: you can scale, secure, and update each one independently. That separation also costs you something -- every hop between tiers is a network call, not a function call, so N-tier architecture trades some latency for that independence.",
        'In a **closed layer** architecture, a layer can only call the one immediately below it -- fewer surprise dependencies, but sometimes a wasted hop just passing something along. In an **open layer** architecture, a layer can call any layer below it -- fewer hops, but harder to reason about what depends on what.',
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Front counter' },
          { icon: '📋', label: 'Pricing office' },
          { icon: '📚', label: 'Ledger room' },
        ],
        caption: 'Each tier only calls the one below it -- a closed-layer split.',
      },
      readmeQuote: {
        text: "N-tier architecture divides an application into logical layers and physical tiers. Layers are a way to separate responsibilities and manage dependencies. Each layer has a specific responsibility. A higher layer can use services in a lower layer, but not the other way around.",
        source: 'Chapter III · N-tier architecture',
      },
      realWorldExamples: ['A classic web app: web tier, application tier, database tier, each on its own machine'],
      check: {
        question: 'What does physically separating tiers onto different machines actually buy you, at the cost of extra network hops?',
        options: [
          { id: 'a', label: 'The ability to scale, secure, and update each tier independently', correct: true, feedback: 'Right — that independence is the whole trade being made for the added latency.' },
          { id: 'b', label: 'Nothing — it only adds latency with no benefit', correct: false, feedback: "It genuinely does cost latency, but the independent scaling/security/deployment is a real benefit in return." },
          { id: 'c', label: 'It removes the need for a database layer entirely', correct: false, feedback: "N-tier doesn't eliminate a layer — the data access layer is one of the standard three." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'In a closed-layer N-tier architecture, which layers can the presentation layer call directly?',
      options: [
        { id: 'a', label: 'Only the layer immediately below it', correct: true, feedback: 'Right — that\'s the defining constraint of "closed."' },
        { id: 'b', label: 'Any layer below it, skipping ahead if convenient', correct: false, feedback: "That's an open-layer architecture, not closed." },
      ],
    },
    {
      id: 'q2',
      question: 'What is a genuine disadvantage of N-tier architecture as tiers increase?',
      options: [
        { id: 'a', label: 'Increased network latency and hardware cost, since every tier runs on its own machine', correct: true, feedback: 'Right — straight from the README\'s disadvantages list.' },
        { id: 'b', label: 'It becomes impossible to secure any individual layer', correct: false, feedback: "The opposite is closer to true — separate tiers can behave like firewalls, improving security." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Message Brokers
// ---------------------------------------------------------------------------

const ch3MessageBrokers: Level = {
  id: 'ch3-message-brokers',
  chapterId: 'ch3',
  order: 2,
  title: 'The Dispatch Board',
  realConcept: 'Message brokers',
  analogyName: 'A board every depot can post to and read from',
  stages: [
    {
      kind: 'situation',
      title: 'Everyone calling everyone',
      body: [
        "The billing system calls the depot software directly to check delivery status. The depot software calls the customer-notification system directly to send an update. Every new system you add means more direct phone lines to wire up between teams who now have to agree on each other's exact calling conventions.",
      ],
    },
    {
      kind: 'teach',
      title: 'Message brokers',
      body: [
        'A **message broker** is software that lets applications, systems, and services exchange information without calling each other directly -- it validates, stores, routes, and delivers messages between them. Senders don\'t need to know where receivers are, whether they\'re currently up, or how many of them exist. That\'s what decouples the system.',
        'Brokers support two distribution patterns: **point-to-point** (a message queue -- one sender, one receiver per message) and **publish-subscribe** (a topic -- one message, every subscriber gets a copy). Both are covered as their own topics next.',
        'Compared to an [[event streaming]] platform, a broker can guarantee delivery and track which consumers received what -- an event streaming platform trades that guarantee for higher raw scale.',
      ],
      readmeQuote: {
        text: 'A message broker is a software that enables applications, systems, and services to communicate with each other and exchange information. The message broker does this by translating messages between formal messaging protocols. This allows interdependent services to "talk" with one another directly, even if they were written in different languages or implemented on different platforms.',
        source: 'Chapter III · Message Brokers',
      },
      realWorldExamples: ['Apache Kafka', 'RabbitMQ', 'NATS', 'Amazon SQS/SNS'],
      check: {
        question: "What's the actual benefit of routing service-to-service communication through a broker instead of calling each other directly?",
        options: [
          { id: 'a', label: "Senders don't need to know where receivers are, whether they're up, or how many exist", correct: true, feedback: "Right — that's the decoupling the README calls out directly." },
          { id: 'b', label: "It makes every message arrive with lower latency than a direct call would", correct: false, feedback: "A broker adds a hop, so it's rarely lower-latency than a direct call — the win is decoupling, not speed." },
          { id: 'c', label: 'It eliminates the need for services to agree on a message format', correct: false, feedback: "Services still need to agree on formats — the broker just handles routing and delivery, not schema design." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What are the two basic message distribution patterns a message broker offers?',
      options: [
        { id: 'a', label: 'Point-to-point (queues) and publish-subscribe (topics)', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'Synchronous and asynchronous', correct: false, feedback: "That's a real distinction elsewhere, but not the two named distribution patterns here." },
      ],
    },
    {
      id: 'q2',
      question: 'How does a message broker differ from an event streaming platform?',
      options: [
        { id: 'a', label: 'A broker can guarantee delivery and track consumers; an event streaming platform trades that for higher scale', correct: true, feedback: "Right — straight from the README's comparison." },
        { id: 'b', label: 'Event streaming platforms only work with a single consumer at a time', correct: false, feedback: "Event streaming platforms are built for pub/sub-style fan-out, not single-consumer delivery." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Enterprise Service Bus (ESB)
// ---------------------------------------------------------------------------

const ch3Esb: Level = {
  id: 'ch3-esb',
  chapterId: 'ch3',
  order: 5,
  title: 'One Switchboard For Everything',
  realConcept: 'Enterprise Service Bus (ESB)',
  analogyName: 'The central clearinghouse',
  stages: [
    {
      kind: 'situation',
      title: 'The old regional system',
      body: [
        "Before message brokers, the old regional courier network you're modernizing solved this with one centralized clearinghouse building: every branch's paperwork routed through it, and it handled translating formats, converting protocols, and stitching requests together. It worked -- until it became the one building nobody could touch without breaking three other branches.",
      ],
    },
    {
      kind: 'teach',
      title: 'Enterprise Service Bus (ESB)',
      body: [
        'An **Enterprise Service Bus (ESB)** is a centralized software component that performs integrations between applications: transforming data models, handling connectivity, routing messages, converting protocols, and sometimes composing multiple requests together -- then exposing all of that as a reusable service interface.',
        'In theory this standardizes and simplifies integration dramatically. In practice, ESBs earned a reputation as a bottleneck: complex, expensive to maintain, hard to troubleshoot in production, and a change to one integration risks destabilizing every other one that shares it.',
        'Message brokers grew popular largely as a lighter-weight alternative that provides similar inter-service communication at a lower cost, and fit the microservices architectures that became common as ESBs fell out of favor.',
      ],
      readmeQuote: {
        text: 'An Enterprise Service Bus (ESB) is an architectural pattern whereby a centralized software component performs integrations between applications. It performs transformations of data models, handles connectivity, performs message routing, converts communication protocols, and potentially manages the composition of multiple requests.',
        source: 'Chapter III · Enterprise Service Bus (ESB)',
      },
      realWorldExamples: ['Azure Service Bus', 'IBM App Connect', 'Apache Camel'],
      check: {
        question: 'Why did message brokers become the more popular choice as microservices took off, relative to an ESB?',
        options: [
          { id: 'a', label: 'Brokers are a lighter-weight, cheaper alternative providing similar inter-service communication', correct: true, feedback: 'Right — straight from the README\'s comparison.' },
          { id: 'b', label: 'ESBs cannot route messages between more than two services', correct: false, feedback: "An ESB can compose and route across many services — routing capability isn't the limitation." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is a commonly cited disadvantage of a centralized ESB?',
      options: [
        { id: 'a', label: 'A single point of failure can bring down all communications routed through it', correct: true, feedback: 'Right — centralization is both its selling point and its risk.' },
        { id: 'b', label: 'It cannot perform protocol conversion between services', correct: false, feedback: "Protocol conversion is one of an ESB's core listed responsibilities, not a limitation." },
      ],
    },
    {
      id: 'q2',
      question: 'What does an ESB do that a plain point-to-point integration between two services does not?',
      options: [
        { id: 'a', label: 'Centralizes transformation, routing, and protocol conversion as a reusable service', correct: true, feedback: "Right — that's the whole architectural pattern." },
        { id: 'b', label: 'Guarantees zero latency between services', correct: false, feedback: "An ESB adds a hop like any intermediary — it doesn't guarantee zero latency." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Event-Driven Architecture (EDA)
// ---------------------------------------------------------------------------

const ch3Eda: Level = {
  id: 'ch3-eda',
  chapterId: 'ch3',
  order: 7,
  title: 'The Scanner Doesn\'t Know Who\'s Listening',
  realConcept: 'Event-Driven Architecture (EDA)',
  analogyName: '"Package scanned" tells nobody in particular',
  stages: [
    {
      kind: 'situation',
      title: 'One scan, three systems care',
      body: [
        'A parcel gets scanned leaving the depot. Billing needs to know. Tracking needs to know. Customer notifications needs to know. The scanner itself has no idea any of that is true, and it shouldn\'t have to.',
      ],
    },
    {
      kind: 'teach',
      title: 'Event-Driven Architecture',
      body: [
        '**Event-Driven Architecture (EDA)** uses events -- typically over a message broker -- to communicate within a system. An **event** is just a data point representing a state change; it doesn\'t say what should happen next, only that something did happen. The publisher doesn\'t know who\'s consuming an event, and consumers don\'t know about each other -- that mutual ignorance is the whole point.',
        'Three components make up the pattern: **event producers** publish an event to a router, **event routers** filter and push events to consumers, and **event consumers** react to events by updating their own piece of the system.',
        'This is the umbrella pattern behind several others you\'ll meet: [[Publish-Subscribe]], [[Event Sourcing]], and CQRS are all specific ways of implementing event-driven communication.',
      ],
      diagram: {
        steps: [
          { icon: '📦', label: 'Scan event' },
          { icon: '🧭', label: 'Event router' },
          { icon: '💰', label: 'Billing / Tracking / Notify' },
        ],
      },
      readmeQuote: {
        text: 'Event-Driven Architecture (EDA) is about using events as a way to communicate within a system. Generally, leveraging a message broker to publish and consume events asynchronously. The publisher is unaware of who is consuming an event and the consumers are unaware of each other.',
        source: 'Chapter III · Event-Driven Architecture (EDA)',
      },
      realWorldExamples: ['Apache Kafka event streams', 'Amazon EventBridge'],
      check: {
        question: 'What does it mean that "the publisher is unaware of who is consuming an event"?',
        options: [
          { id: 'a', label: 'A producer can publish without knowing which services (if any) will react to it', correct: true, feedback: "Right — that mutual unawareness is what buys the loose coupling." },
          { id: 'b', label: 'Events are encrypted so consumers can\'t identify the publisher', correct: false, feedback: "This is about architectural coupling, not encryption or identity hiding." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What are the three key components of an event-driven architecture?',
      options: [
        { id: 'a', label: 'Event producers, event routers, event consumers', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'Client, server, database', correct: false, feedback: "Those are general system-design roles, not EDA's specific three components." },
      ],
    },
    {
      id: 'q2',
      question: 'Which of these is a genuine challenge of event-driven architectures, per the README?',
      options: [
        { id: 'a', label: 'Guaranteed delivery and exactly-once, in-order processing of events is hard', correct: true, feedback: 'Right — straight from the listed challenges.' },
        { id: 'b', label: 'It is impossible to add a new consumer without redeploying every producer', correct: false, feedback: "Adding new consumers is actually listed as an advantage — EDA makes that easy, not hard." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Event Sourcing
// ---------------------------------------------------------------------------

const ch3EventSourcing: Level = {
  id: 'ch3-event-sourcing',
  chapterId: 'ch3',
  order: 8,
  title: 'Every Entry, Not Just the Balance',
  realConcept: 'Event sourcing',
  analogyName: 'The ledger keeps every transaction, not just the total',
  stages: [
    {
      kind: 'situation',
      title: '"What was the balance last Tuesday?"',
      body: [
        'A customer disputes a charge from last Tuesday. Your ledger only stores the current balance -- it was overwritten on every transaction. You have no way to reconstruct what it looked like at any point in the past.',
      ],
    },
    {
      kind: 'teach',
      title: 'Event sourcing',
      body: [
        'Instead of storing just the current state, **event sourcing** uses an append-only store to record the full series of actions taken on the data. The event log *is* the system of record -- current state is just whatever you get from replaying every event in order.',
        'This buys real audit trails (every past state is reconstructable), fail-safety (the whole domain can be rebuilt from the log), and flexibility (any type of event can be stored) -- at the cost of needing efficient infrastructure and a reliable way to manage message formats as they evolve.',
        "Event sourcing is easy to confuse with [[event-driven architecture]] -- EDA is about communicating *between* services via events; event sourcing is about using events *as the storage model itself*, and is really just one of several patterns for implementing EDA.",
      ],
      readmeQuote: {
        text: 'Instead of storing just the current state of the data in a domain, use an append-only store to record the full series of actions taken on that data. The store acts as the system of record and can be used to materialize the domain objects.',
        source: 'Chapter III · Event Sourcing',
      },
      realWorldExamples: ['Git\'s own commit history (current file state = replay of every commit)', 'Bank transaction ledgers'],
      check: {
        question: 'In event sourcing, how is the "current state" of an object actually obtained?',
        options: [
          { id: 'a', label: 'By replaying the full sequence of stored events for that object', correct: true, feedback: 'Right — the events are the source of truth; state is derived, not stored directly.' },
          { id: 'b', label: 'It\'s stored directly, the same as any normal database row', correct: false, feedback: "That's the opposite of event sourcing — only the actions are stored, not a directly-overwritten current value." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the main difference between event sourcing and event-driven architecture (EDA)?',
      options: [
        { id: 'a', label: 'EDA is about communicating between services via events; event sourcing is about using events as the storage model', correct: true, feedback: 'Right — event sourcing is one specific way to implement EDA, not a synonym for it.' },
        { id: 'b', label: 'They are two names for exactly the same pattern', correct: false, feedback: "The README explicitly calls out that they're constantly confused but distinct." },
      ],
    },
    {
      id: 'q2',
      question: 'Which of these is a genuine disadvantage of event sourcing?',
      options: [
        { id: 'a', label: 'It requires a reliable way to manage message/event schema as formats evolve over time', correct: true, feedback: 'Right — straight from the listed disadvantages.' },
        { id: 'b', label: 'It makes audit logging impossible', correct: false, feedback: "The opposite — event sourcing is called out as the preferred way to achieve audit-log functionality." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// REST, GraphQL, gRPC (sequence diagram)
// ---------------------------------------------------------------------------

const ch3RestGraphqlGrpc: Level = {
  id: 'ch3-rest-graphql-grpc',
  chapterId: 'ch3',
  order: 11,
  title: 'Three Ways to Ask',
  realConcept: 'REST, GraphQL, gRPC',
  analogyName: 'How a customer asks the depot for shipment info',
  stages: [
    {
      kind: 'situation',
      title: 'One question, three round trips',
      body: [
        'A customer wants a shipment\'s status, its estimated delivery date, and its courier\'s name. With your current API, that\'s three separate calls to three separate endpoints -- and the courier-name response comes back with fifteen fields the app throws straight in the bin.',
      ],
    },
    {
      kind: 'teach',
      title: 'REST vs GraphQL vs gRPC',
      body: [
        '**REST** treats a **resource** as the fundamental unit -- `/shipments/{id}`, `/shipments/{id}/courier`, each its own endpoint, each returning its own fixed shape. Simple, cacheable, and universally supported -- but "chatty" (multiple round trips for related data) and prone to **over-fetching** (getting fields you didn\'t need).',
        '**GraphQL** treats a **query** as the fundamental unit: the client states exactly which fields it wants across however many related resources, in a single request, and gets back exactly that -- no more, no less. That eliminates over-fetching and chattiness at the cost of a harder-to-cache response and more server-side complexity.',
        '**gRPC** is a high-performance RPC framework built on protocol buffers (a compact binary format, not JSON) with built-in code generation and **bi-directional streaming** -- a persistent, fast channel well suited to service-to-service calls, at the cost of being harder to call from a browser and not human-readable on the wire.',
      ],
      sequenceDiagram: {
        steps: [
          { direction: 'clientToServer', label: 'GET /shipments/42' },
          { direction: 'serverToClient', label: 'status, ETA, courierId (full record)' },
          { direction: 'clientToServer', label: 'GET /couriers/17' },
          { direction: 'serverToClient', label: 'full courier record' },
        ],
        caption: 'REST: two resources, two round trips, each returning more fields than the app actually needed.',
      },
      readmeQuote: {
        text: 'Well, the answer is none of them. There is no silver bullet as each of these technologies has its own advantages and disadvantages. Users only care about using our APIs in a consistent way, so make sure to focus on your domain and requirements when designing your API.',
        source: 'Chapter III · REST, GraphQL, gRPC (Which API technology is better?)',
      },
      realWorldExamples: ['REST: almost every public web API', 'GraphQL: Facebook\'s own API, used as a backend-for-frontend', 'gRPC: inter-service calls inside a microservices backend'],
      check: {
        question: 'What specific problem does GraphQL solve that plain REST tends to have, per the README?',
        options: [
          { id: 'a', label: 'Over-fetching data and needing multiple round trips for related resources', correct: true, feedback: 'Right — GraphQL lets a client ask for exactly the fields it needs, across related resources, in one request.' },
          { id: 'b', label: 'REST cannot use HTTP as a transport at all', correct: false, feedback: "REST is built on HTTP — the issue GraphQL addresses is fetch shape and chattiness, not the transport itself." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the "fundamental unit" in REST, and what is it in GraphQL, per the README?',
      options: [
        { id: 'a', label: 'REST: a resource. GraphQL: a query.', correct: true, feedback: 'Right, verbatim from the README\'s own framing.' },
        { id: 'b', label: 'Both use "endpoint" as their fundamental unit', correct: false, feedback: "That's the REST framing specifically — GraphQL is explicitly framed around the query, not fixed endpoints." },
      ],
    },
    {
      id: 'q2',
      question: 'Which of these is a genuine advantage of gRPC over REST and GraphQL, per the comparison table?',
      options: [
        { id: 'a', label: 'Great performance and built-in code generation, at the cost of worse browser support', correct: true, feedback: 'Right — gRPC trades broad compatibility for raw performance and tooling.' },
        { id: 'b', label: 'It is universally readable in a browser with no extra tooling', correct: false, feedback: "gRPC is specifically called out as not human-readable and having limited browser support." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Long polling, WebSockets, Server-Sent Events (sequence diagram)
// ---------------------------------------------------------------------------

const ch3Realtime: Level = {
  id: 'ch3-realtime',
  chapterId: 'ch3',
  order: 12,
  title: 'Getting the Depot to Call You Back',
  realConcept: 'Long polling, WebSockets, SSE',
  analogyName: 'How a customer learns their parcel moved',
  stages: [
    {
      kind: 'situation',
      title: 'The customer keeps calling back',
      body: [
        'A customer wants to know the second their parcel is out for delivery. Right now, that means they call the depot every thirty seconds asking "is it out yet?" -- most calls get the same answer: no.',
      ],
    },
    {
      kind: 'teach',
      title: 'Long polling, WebSockets, SSE',
      body: [
        'A plain client-server model has no way for the server to push anything -- the client always has to ask first. Three approaches work around that.',
        '**Long polling**: the client asks, and the server *holds the connection open* without answering until it actually has something new (or a timeout hits). The moment it answers, the client immediately reconnects and asks again. It emulates a push, but a new connection gets opened on every single exchange.',
        '**WebSockets**: after one handshake, the connection stays open and **full-duplex** -- either side can send a message at any time, with no need to reopen anything. Lower overhead once established, but a dropped connection doesn\'t automatically recover.',
        '**Server-Sent Events (SSE)**: one request, then the connection stays open **one-way** -- the server pushes events whenever it likes, but the client can\'t send anything new over that same connection. Simple, and works through firewalls that dislike WebSockets, at the cost of being unidirectional.',
      ],
      sequenceDiagram: {
        steps: [
          { direction: 'clientToServer', label: 'GET /parcel-status (poll)' },
          { direction: 'serverToClient', label: '"still in transit"', wait: true },
          { direction: 'clientToServer', label: 'GET /parcel-status (poll again, immediately)' },
          { direction: 'serverToClient', label: '"out for delivery"', wait: true },
        ],
        caption: 'Long polling: every answer triggers an immediate new request -- a fresh connection each round.',
      },
      readmeQuote: {
        text: 'WebSocket provides full-duplex communication channels over a single TCP connection. It is a persistent connection between a client and a server that both parties can use to start sending data at any time.',
        source: 'Chapter III · Long polling, WebSockets, Server-Sent Events (SSE)',
      },
      realWorldExamples: ['WebSockets: live chat apps, multiplayer games', 'SSE: live sports scores, stock tickers', 'Long polling: a fallback when neither of the above is available'],
      check: {
        question: 'What is the key structural difference between long polling and WebSockets?',
        options: [
          { id: 'a', label: 'Long polling opens a new connection on every exchange; WebSockets keep one connection open for many messages both ways', correct: true, feedback: 'Right — that reconnect-per-message pattern is exactly what the sequence diagram shows.' },
          { id: 'b', label: 'WebSockets can only be used for one message total, then must be closed', correct: false, feedback: "The opposite is true — a WebSocket connection is meant to stay open for many messages." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What makes Server-Sent Events (SSE) different from WebSockets?',
      options: [
        { id: 'a', label: 'SSE is unidirectional (server to client only); WebSockets are full-duplex', correct: true, feedback: 'Right — SSE trades bidirectionality for simplicity.' },
        { id: 'b', label: 'SSE requires a new TCP connection for every single message', correct: false, feedback: "That's long polling's pattern, not SSE's — SSE keeps one connection open for multiple pushes." },
      ],
    },
    {
      id: 'q2',
      question: 'What is a real downside of long polling, per the README?',
      options: [
        { id: 'a', label: 'It creates a new connection each time, which can be intensive on the server, and increases latency', correct: true, feedback: 'Right — straight from the listed disadvantages.' },
        { id: 'b', label: 'It is not supported by any modern browser', correct: false, feedback: "Long polling is called out as nearly universally supported — that's actually one of its advantages." },
      ],
    },
  ],
}

export const CHAPTER_3_EXTRA_LEVELS: Level[] = [
  ch3NTier,
  ch3MessageBrokers,
  ch3Esb,
  ch3Eda,
  ch3EventSourcing,
  ch3RestGraphqlGrpc,
  ch3Realtime,
]
