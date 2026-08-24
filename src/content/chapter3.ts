// Chapter III -- Architecture. Five anchor builds (Message Queues, Pub-Sub,
// Monoliths vs Microservices, CQRS, API Gateway) exercise the Phase 4
// engine primitives (queue, broker, service, apiGateway) end to end; the
// remaining seven topics are teach-only, in chapter3-extra.ts.

import type { Chapter, Level } from './types'
import type { BrokerConfig, GraphNode, SimGraph } from '@/engine/types'
import { constantTraffic, spikeTraffic } from '@/engine/traffic'
import { client, edge, loadBalancer } from './graphHelpers'
import { CHAPTER_3_EXTRA_LEVELS } from './chapter3-extra'

function server(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number }> = {},
): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    config: {
      kind: 'server',
      capacityRps: overrides.capacityRps ?? 50,
      baseMs: overrides.baseMs ?? 60,
      costPerHour: overrides.costPerHour ?? 8,
    },
  }
}

function service(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number }> = {},
): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    config: {
      kind: 'service',
      capacityRps: overrides.capacityRps ?? 50,
      baseMs: overrides.baseMs ?? 40,
      costPerHour: overrides.costPerHour ?? 9,
    },
  }
}

function database(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides: Partial<{ capacityRps: number; baseMs: number; writeCapacityRps: number; writeBaseMs: number; costPerHour: number }> = {},
): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    config: {
      kind: 'database',
      engine: 'sql',
      capacityRps: overrides.capacityRps ?? 60,
      baseMs: overrides.baseMs ?? 40,
      writeCapacityRps: overrides.writeCapacityRps ?? 30,
      writeBaseMs: overrides.writeBaseMs ?? 50,
      indexed: false,
      costPerHour: overrides.costPerHour ?? 12,
    },
  }
}

// ---------------------------------------------------------------------------
// Message Queues -- the Holding Bay absorbs a spike a bare depot can't
// ---------------------------------------------------------------------------

const mqStartGraph: SimGraph = {
  nodes: [client(), server('gift-wrap', 'Gift Wrap Station', 400, 160, { capacityRps: 50, baseMs: 60 })],
  edges: [edge('client', 'gift-wrap')],
}

const ch3MessageQueues: Level = {
  id: 'ch3-message-queues',
  chapterId: 'ch3',
  order: 3,
  title: 'The Gift-Wrap Rush',
  realConcept: 'Message queues',
  analogyName: 'The holding bay',
  stages: [
    {
      kind: 'situation',
      title: 'The promo went out ten minutes ago',
      body: [
        "A flash promo just went out: free gift-wrap on every order, for one hour. The Gift Wrap Station handles a steady trickle fine, but the promo just caused a huge burst of requests all at once — more than the station can physically wrap in that window, so orders are getting turned away outright.",
      ],
    },
    {
      kind: 'teach',
      title: 'Message queues',
      body: [
        'A **message queue** is a form of point-to-point, asynchronous service-to-service communication: a producer publishes a job to the queue and moves on; a consumer picks it up, processes it, and signals completion. Each message is processed by exactly **one** consumer -- unlike publish-subscribe, which you\'ll meet next, where every subscriber gets its own copy.',
        'The headline benefit is **decoupling**: the producer and consumer never talk to each other directly, and don\'t need to be online at the same moment. That decoupling is also what buys you **spike absorption** -- a burst can pile up *in the queue* instead of overwhelming whatever processes it, as long as the average settles back down before the queue itself fills up.',
        'A queue that fills up anyway has to do something -- that\'s **backpressure**: once it\'s full, new arrivals get refused (in the real world, an HTTP 503) rather than accepted and lost track of.',
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Orders' },
          { icon: '📥', label: 'Holding bay' },
          { icon: '🎁', label: 'Gift wrap' },
        ],
        caption: 'A burst piles up in the holding bay instead of overwhelming the station directly.',
      },
      readmeQuote: {
        text: 'A message queue is a form of service-to-service communication that facilitates asynchronous communication. It asynchronously receives messages from producers and sends them to consumers.',
        source: 'Chapter III · Message Queues',
      },
      realWorldExamples: ['Amazon SQS in front of an image-processing worker fleet', 'A background job queue (Sidekiq, Celery, BullMQ)'],
      check: {
        question: 'What specifically lets a message queue absorb a traffic burst that would otherwise overwhelm a consumer?',
        options: [
          { id: 'a', label: 'Excess work piles up in the queue and drains over time, instead of hitting the consumer all at once', correct: true, feedback: "Right — the queue is doing the waiting so the consumer doesn't have to do it under pressure." },
          { id: 'b', label: 'The queue makes the consumer permanently faster at processing each message', correct: false, feedback: "A queue doesn't speed up processing — it buys time by holding work, not by making the consumer itself faster." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Add a holding bay',
      brief: [
        'This exact traffic pattern overwhelmed the Gift Wrap Station last time it happened, live, with no cushion. Put a holding bay in front of it this time.',
      ],
      startingGraph: mqStartGraph,
      unlockedKinds: ['client', 'server', 'queue'],
      lockedNodeIds: ['gift-wrap'],
      workload: { durationMs: 4000, tickMs: 250, trafficCurve: spikeTraffic(20, 80, 1000, 2000) },
      slo: { maxErrorRate: 0.01, minThroughputRps: 28 },
      guidedSteps: [
        { instruction: 'Delete the wire between Customers and the Gift Wrap Station.' },
        { instruction: 'Drag a Holding Bay onto the map.' },
        { instruction: 'Connect Customers → Holding Bay, then Holding Bay → Gift Wrap Station.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          'The burst piled up in the holding bay instead of hitting the station directly — the station never saw more than it could actually handle, and the backlog drained on its own once the rush passed.',
          'Notice the default drain rate: it\'s deliberately at or below the station\'s own capacity. A holding bay that drains *faster* than what\'s behind it doesn\'t absorb anything — it just relocates the overload one hop downstream.',
        ],
        failureBody: [
          'Make sure the old direct wire from Customers to the Gift Wrap Station is gone, and traffic now flows Customers → Holding Bay → Gift Wrap Station.',
        ],
        readmeQuote: {
          text: 'If queues start to grow significantly, the queue size can become larger than memory, resulting in cache misses, disk reads, and even slower performance. Backpressure can help by limiting the queue size, thereby maintaining a high throughput rate and good response times for jobs already in the queue.',
          source: 'Chapter III · Message Queues (Backpressure)',
        },
        realWorldExamples: ['Order-processing queues absorbing a Black Friday spike'],
        interviewPhrase: '"I\'d put a bounded queue in front of anything with a hard capacity ceiling and bursty traffic — it turns a spike into a backlog instead of an outage, as long as the drain rate respects what\'s downstream."',
        ruleOfThumb: 'A queue absorbs a burst only if its drain rate stays at or below what\'s actually behind it.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'In a message queue, how many consumers process any single message?',
      options: [
        { id: 'a', label: 'Exactly one', correct: true, feedback: 'Right — point-to-point delivery, one message to one consumer.' },
        { id: 'b', label: 'Every subscribed consumer gets its own copy', correct: false, feedback: "That's publish-subscribe's model, not a plain message queue's." },
      ],
    },
    {
      id: 'q2',
      question: 'What happens once a bounded queue is completely full and more messages arrive?',
      options: [
        { id: 'a', label: 'Backpressure kicks in — new arrivals are refused rather than silently accepted', correct: true, feedback: 'Right — refusing outright (e.g. HTTP 503) beats accepting work you have nowhere to put.' },
        { id: 'b', label: 'The oldest messages are silently deleted to make room, with no signal to anyone', correct: false, feedback: "That's not backpressure — the README's version refuses new arrivals rather than quietly discarding old ones." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Publish-Subscribe -- fan-out via a broker, vs a load balancer's split
// ---------------------------------------------------------------------------

const pubsubStartGraph: SimGraph = {
  nodes: [
    client(),
    loadBalancer('router', 'Router', 380, 160, { costPerHour: 4 }),
    server('board-pricing', 'Pricing Board', 660, 90, { capacityRps: 80, baseMs: 15 }),
    server('board-notify', 'Notify Board', 660, 230, { capacityRps: 80, baseMs: 15 }),
  ],
  edges: [edge('client', 'router'), edge('router', 'board-pricing'), edge('router', 'board-notify')],
}

const brokerRouterConfig: BrokerConfig = {
  kind: 'broker',
  capacityRps: 100,
  baseMs: 15,
  costPerHour: 6,
  deliverySemantics: 'atMostOnce',
  retryBufferCapacity: 100,
}

const ch3PubSub: Level = {
  id: 'ch3-pubsub',
  chapterId: 'ch3',
  order: 4,
  title: 'The Price Just Changed, Everywhere',
  realConcept: 'Publish-subscribe',
  analogyName: 'The dispatch board',
  stages: [
    {
      kind: 'situation',
      title: 'Only one board got the memo',
      body: [
        'Leeds delivery went up to £6 this morning. That update needs to reach *both* the Pricing Board (what customers see) and the Notify Board (what triggers courier alerts) — every time, not just sometimes. Right now they\'re wired through a router that was built for splitting customer traffic between two identical depots, and that\'s the wrong job for this.',
      ],
    },
    {
      kind: 'teach',
      title: 'Publish-subscribe',
      body: [
        '**Publish-subscribe** ("pub/sub") is the other half of what a message broker offers, alongside plain queues: a publisher pushes a message to a **topic**, and *every* subscriber to that topic gets its own full copy, pushed immediately rather than pulled or batched.',
        "That's a fundamentally different job than a load balancer's. A load balancer **splits** one stream of traffic across interchangeable servers — each request goes to exactly one of them. A pub-sub broker **fans out** — one message becomes N full copies, one per subscriber, because every subscriber needs the *same* information, not a share of it.",
        'Publishers don\'t need to know who\'s listening, and subscribers can be added, removed, or changed without touching the publisher at all — that dynamic decoupling is the main advantage over wiring each interested party up directly.',
      ],
      diagram: {
        steps: [
          { icon: '📢', label: 'Publish' },
          { icon: '🧭', label: 'Dispatch board' },
          { icon: '📋', label: 'Every subscriber' },
        ],
        caption: 'One publish, one full copy delivered to each subscriber -- not a split between them.',
      },
      readmeQuote: {
        text: 'Similar to a message queue, publish-subscribe is also a form of service-to-service communication that facilitates asynchronous communication. In a pub/sub model, any message published to a topic is pushed immediately to all the subscribers of the topic.',
        source: 'Chapter III · Publish-Subscribe',
      },
      realWorldExamples: ['Amazon SNS fanning a single event out to email, SMS, and a queue at once', 'A price-change event notifying every downstream system that cares'],
      check: {
        question: 'What is the fundamental difference between how a load balancer and a pub-sub broker handle multiple downstream targets?',
        options: [
          { id: 'a', label: 'A load balancer splits traffic between targets; a broker copies the same message to every subscriber', correct: true, feedback: "Right — split vs. copy is the whole distinction." },
          { id: 'b', label: 'There is no real difference — both distribute load evenly across targets', correct: false, feedback: "They solve different problems: dividing identical load vs. delivering the same information everywhere it's needed." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'twist',
      title: 'Wrong tool, right tool',
      brief: [
        'Both boards need the *same* price update, every time — not half the updates each. Pick the right router for that job.',
      ],
      startingGraph: pubsubStartGraph,
      unlockedKinds: ['client', 'loadBalancer', 'broker', 'server'],
      lockedNodeIds: ['router', 'board-pricing', 'board-notify'],
      workload: { durationMs: 3000, tickMs: 250, trafficCurve: constantTraffic(30) },
      slo: { maxErrorRate: 0, minThroughputRps: 45 },
      decisionCard: {
        prompt: 'Which router belongs between the publisher and the two boards?',
        options: [
          {
            id: 'load-balancer',
            label: 'Keep the Router (load balancer)',
            description: 'Splits each update between the two boards — every board gets roughly half of the updates, never all of them.',
            applyToGraph: (graph) => graph,
          },
          {
            id: 'broker',
            label: 'Swap it for a Dispatch Board (broker)',
            description: 'Copies every update in full to both boards — exactly the guarantee "everywhere, every time" needs.',
            applyToGraph: (graph) => ({
              ...graph,
              nodes: graph.nodes.map((n) => (n.id === 'router' ? { ...n, label: 'Dispatch Board', config: { ...brokerRouterConfig } } : n)),
            }),
          },
        ],
      },
      debrief: {
        successBody: [
          "With a broker in place, both boards independently received the *full* stream of updates — that's why completed throughput came out close to double the offered rate: two boards, each doing the full amount of work, not half each.",
          'That number is the tell. A load balancer\'s split conserves total work (completed ≈ offered); a broker\'s fan-out multiplies it by subscriber count. If your dashboard shows completed work multiplying instead of staying flat, you\'re looking at genuine fan-out.',
        ],
        failureBody: [
          'Open the decision card again and pick the Dispatch Board (broker) — a load balancer splits traffic between the boards instead of copying it to both.',
        ],
        readmeQuote: {
          text: 'This scenario happens when a message is sent to a topic and then replicated and pushed to multiple endpoints. Fanout provides asynchronous event notifications which in turn allows for parallel processing.',
          source: 'Chapter III · Publish-Subscribe (Fanout)',
        },
        realWorldExamples: ['Google Pub/Sub fanning an event to independent downstream consumers'],
        interviewPhrase: '"If every downstream consumer needs the same message, that\'s pub-sub, not load balancing — a load balancer would silently starve half your consumers of information they actually needed."',
        ruleOfThumb: 'Splitting identical work is a load balancer\'s job. Copying the same information everywhere it\'s needed is a broker\'s.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What does "fanout" mean in a publish-subscribe system?',
      options: [
        { id: 'a', label: 'A message is replicated and pushed to multiple endpoints, enabling parallel processing', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'A single subscriber receives messages faster the more subscribers there are', correct: false, feedback: "Fanout is about delivery to many subscribers, not about speeding up any one of them." },
      ],
    },
    {
      id: 'q2',
      question: 'Why don\'t publishers in a pub-sub system need to know who is subscribed?',
      options: [
        { id: 'a', label: 'The topic manages subscriptions and delivery — subscribers can change without the publisher being touched', correct: true, feedback: 'Right — that dynamic targeting is one of pub-sub\'s core advantages.' },
        { id: 'b', label: 'Publishers always broadcast to every service in the company automatically', correct: false, feedback: "Only subscribers to that specific topic receive the message — it's not a blanket broadcast to everything." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Monoliths vs Microservices -- cascading failure through a dependency
// ---------------------------------------------------------------------------

const microservicesStartGraph: SimGraph = {
  nodes: [client(), service('pricing', 'Pricing Team', 380, 160, { capacityRps: 100, baseMs: 30 }), service('inventory-1', 'Inventory Team A', 660, 160, { capacityRps: 100, baseMs: 40 })],
  edges: [],
}

const ch3Microservices: Level = {
  id: 'ch3-monoliths-microservices',
  chapterId: 'ch3',
  order: 6,
  title: 'One Team\'s Bad Morning',
  realConcept: 'Monoliths vs microservices',
  analogyName: 'Cascading failure through a dependency',
  stages: [
    {
      kind: 'situation',
      title: 'Checkout depends on Inventory',
      body: [
        "Checkout used to be one big program that did everything. You've split it into small, focused teams instead — a Pricing team, an Inventory team — each independently deployable. This morning, the single Inventory instance has a bad morning: a host reboot takes it down for a while. Checkout as a whole goes with it, even though Pricing itself never had a problem.",
      ],
    },
    {
      kind: 'teach',
      title: 'Monoliths, microservices, and cascading failure',
      body: [
        'A **monolith** is one self-contained application doing everything. Simple to develop, debug, and reason about — but the whole thing redeploys on every change, and a single bug can bring the entire system down.',
        'A **microservices** architecture splits that into small, autonomous services, each owning one business capability and its own data. That buys independent deployment, independent scaling, and fault isolation *between unrelated* services — but it introduces a failure mode a monolith never has: **cascading failure**. If service A calls service B and B goes down, A\'s own code can be completely healthy and still fail every request that needed B.',
        'The fix isn\'t "don\'t use microservices" — it\'s that **each dependency needs its own resilience**, the same way the whole system would if it were one box. A single instance behind a critical call is still a single point of failure, no matter how many other services surround it.',
      ],
      readmeQuote: {
        text: 'Isolate failures and use resiliency strategies to prevent failures within a service from cascading... Lack of design for fault tolerance may result in cascading failures.',
        source: 'Chapter III · Monoliths and Microservices (Best practices / Pitfalls)',
      },
      realWorldExamples: ['A single unavailable auth service taking down every service that calls it', 'Netflix\'s Hystrix, built specifically to contain cascading failures between services'],
      check: {
        question: 'In a microservices chain, what specifically causes "cascading failure"?',
        options: [
          { id: 'a', label: 'A healthy service\'s requests fail anyway because a service it depends on is down', correct: true, feedback: "Right — the failure cascades backward through the dependency chain, not from the healthy service's own code." },
          { id: 'b', label: 'Every microservice in the system crashes simultaneously at the same instant', correct: false, feedback: "Cascading failure is about one dependency's failure propagating through the chain, not simultaneous unrelated crashes." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Give Inventory some backup',
      brief: [
        'Inventory Team A goes down for this entire run, on purpose — that\'s the scenario, and nothing on the canvas stops it directly. What you can do is make sure it isn\'t the *only* team handling that work.',
      ],
      startingGraph: microservicesStartGraph,
      unlockedKinds: ['client', 'service', 'loadBalancer'],
      lockedNodeIds: ['pricing', 'inventory-1'],
      workload: { durationMs: 3000, tickMs: 250, trafficCurve: constantTraffic(25) },
      incidents: [{ id: 'inventory-outage', label: 'Inventory Team A is down', startMs: 0, endMs: 3000, killNodeIds: ['inventory-1'] }],
      slo: { maxErrorRate: 0.3, minThroughputRps: 17 },
      guidedSteps: [
        { instruction: 'Connect Customers → Pricing Team.' },
        { instruction: 'Drag a Dispatcher onto the map and connect Pricing Team → Dispatcher.' },
        { instruction: 'Connect the Dispatcher → Inventory Team A.' },
        { instruction: 'Drag three more Inventory Teams onto the map and connect the Dispatcher to each of them too.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          "Team A stayed dead the entire run — that part never changed. What changed is how much of your traffic depended on it: with three more instances sharing the load, only around a quarter of requests still land on the dead one instead of all of them.",
          "Notice that's not the same as a system that automatically routes *around* failures. The dispatcher has no idea Team A is down — round robin just keeps sending its fair share there regardless. True self-healing needs health-aware routing on top of redundancy, a topic for later. Redundancy alone still caps your blast radius at roughly one over the instance count, instead of the full outage a single instance gives you — a real, worthwhile improvement, just not a complete fix.",
        ],
        failureBody: [
          'Make sure Customers connects through Pricing Team, then through a Dispatcher wired to *four* separate Inventory Team instances — fewer instances means a bigger share of traffic still lands on the dead one.',
        ],
        readmeQuote: {
          text: 'Services should be designed in such a way that they still function in case of failure or errors. In environments with independently deployable services, failure tolerance is of the highest importance.',
          source: 'Chapter III · Monoliths and Microservices (Characteristics)',
        },
        realWorldExamples: ['Running several replicas of a critical microservice behind a load balancer, as standard practice'],
        interviewPhrase: '"Splitting a monolith into services doesn\'t remove single points of failure — it relocates them into the dependency graph. Redundancy behind a dependency shrinks the blast radius of one instance dying, but without health-aware routing, a dumb dispatcher still sends traffic into the dead one at its fair share."',
        ruleOfThumb: 'A dependency with one instance is a full single point of failure. More instances behind a blind dispatcher shrink that blast radius, but don\'t remove it — that needs health-aware routing too.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which of these is a genuine advantage of a monolith over microservices?',
      options: [
        { id: 'a', label: 'Fast, reliable in-process communication and easier debugging of the whole system', correct: true, feedback: 'Right — straight from the monolith advantages list.' },
        { id: 'b', label: 'It scales each function of the business independently', correct: false, feedback: "That's a microservices advantage — a monolith scales (or fails) as one indivisible unit." },
      ],
    },
    {
      id: 'q2',
      question: 'What is a "distributed monolith," per the README?',
      options: [
        { id: 'a', label: 'A system that looks like microservices but is still tightly coupled — shared databases, dependent services, low latency requirements between them', correct: true, feedback: 'Right — you get all of microservices\' operational complexity with none of the loose-coupling benefit.' },
        { id: 'b', label: 'Any microservices system that uses more than five services', correct: false, feedback: "Service count isn't the definition — tight coupling despite the distributed shape is." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// CQRS -- scaling the read path with replicas, without touching writes
// ---------------------------------------------------------------------------

const cqrsStartGraph: SimGraph = {
  nodes: [client(), database('ledger', 'The Ledger', 500, 160, { capacityRps: 60, writeCapacityRps: 30 })],
  edges: [],
}

const ch3Cqrs: Level = {
  id: 'ch3-cqrs',
  chapterId: 'ch3',
  order: 9,
  title: 'Browsing Outgrew Buying',
  realConcept: 'CQRS',
  analogyName: 'Reads and writes, scaled separately',
  stages: [
    {
      kind: 'situation',
      title: 'The catalog took off',
      body: [
        'The public parcel-tracking page just got popular — customers refresh it constantly to watch their delivery move. Actual status *updates* (couriers marking a parcel as delivered) haven\'t grown at all. One ledger handling both is now buckling under browsing traffic, even though writes are perfectly fine.',
      ],
    },
    {
      kind: 'teach',
      title: 'Command Query Responsibility Segregation (CQRS)',
      body: [
        '**CQRS** splits a system\'s actions into **commands** (writes — an instruction to change something, returning only success/failure) and **queries** (reads — a request for information that changes nothing). The core idea is separating them so each can be scaled and optimized independently, since distributed systems often benefit enormously from that split.',
        'In practice this usually means separate read and write *paths* — sometimes even separate data stores, tailored to each. You already have the pieces for the read side: a [[replication|replica]] resolves reads locally and forwards only writes onward, so putting several replicas behind a load balancer scales *reads* horizontally without the write path even noticing.',
        'The trade-off is real: more moving pieces, and the read replicas can lag slightly behind the source of truth (the same staleness trade-off from the Replication level) -- but read and write workloads with wildly different scale needs are exactly the situation CQRS is for.',
      ],
      readmeQuote: {
        text: 'Command Query Responsibility Segregation (CQRS) is an architectural pattern that divides a system\'s actions into commands and queries... Allows independent scaling of read and write workloads.',
        source: 'Chapter III · Command and Query Responsibility Segregation (CQRS)',
      },
      realWorldExamples: ['A product catalog read from many cheap replicas, with orders written to one primary database'],
      check: {
        question: 'What is the core principle CQRS is built around?',
        options: [
          { id: 'a', label: 'Separating commands (writes) from queries (reads) so each can scale and be optimized independently', correct: true, feedback: 'Right, straight from the README\'s own framing.' },
          { id: 'b', label: 'Combining reads and writes into a single unified request type for simplicity', correct: false, feedback: "That's the opposite of CQRS — it deliberately separates them, not merges them." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Scale reads, leave writes alone',
      brief: [
        'One replica alone couldn\'t keep up with how much the tracking page gets hit now. Put several behind a dispatcher, all still backed by the same ledger for writes.',
      ],
      startingGraph: cqrsStartGraph,
      unlockedKinds: ['client', 'loadBalancer', 'replica', 'database'],
      lockedNodeIds: ['ledger'],
      workload: { durationMs: 3000, tickMs: 250, trafficCurve: constantTraffic(100), writeFraction: 0.1 },
      slo: { maxErrorRate: 0.02, minThroughputRps: 85 },
      guidedSteps: [
        { instruction: 'Drag a Dispatcher onto the map and connect Customers → it.' },
        { instruction: 'Drag three Read Replicas onto the map and connect the Dispatcher to each one.' },
        { instruction: 'Connect each Read Replica → the Ledger.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          'Reads now spread across three replicas instead of hammering one — each one only has to keep up with a third of the browsing traffic. Writes still all land on the same Ledger, completely untouched by how much reading is happening.',
          'That\'s CQRS in its simplest honest form: you didn\'t need a different technology for reads and writes, just a different *shape* for each — one path that fans out, one that stays singular.',
        ],
        failureBody: [
          'Make sure Customers routes through a Dispatcher wired to *three* replicas, and each replica is wired onward to the Ledger — one replica alone won\'t have enough combined capacity.',
        ],
        readmeQuote: {
          text: 'CQRS-based systems use separate read and write data models, each tailored to relevant tasks and often located in physically separate stores.',
          source: 'Chapter III · Command and Query Responsibility Segregation (CQRS)',
        },
        realWorldExamples: ['Read replicas fronting a heavily-browsed product catalog while orders write to one primary'],
        interviewPhrase: '"When reads and writes have very different scale profiles, I\'d split the read path onto replicas instead of trying to size one database for both — CQRS doesn\'t require a new datastore to start paying off."',
        ruleOfThumb: 'Reads and writes rarely grow at the same rate — CQRS just lets you scale each on its own schedule.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'In CQRS terms, is "get the current price of a shipment" a command or a query?',
      options: [
        { id: 'a', label: 'A query — it requests information without changing system state', correct: true, feedback: 'Right — no side effects, just a read.' },
        { id: 'b', label: 'A command — it instructs the system to look something up', correct: false, feedback: 'A command changes state and returns only success/failure — a lookup with no side effects is a query.' },
      ],
    },
    {
      id: 'q2',
      question: 'What is a genuine disadvantage of adopting CQRS, per the README?',
      options: [
        { id: 'a', label: 'More complex application design, and dealing with eventual consistency between the read and write sides', correct: true, feedback: 'Right — straight from the listed disadvantages.' },
        { id: 'b', label: 'It makes independent scaling of reads and writes impossible', correct: false, feedback: "Independent scaling is CQRS's headline advantage, not a disadvantage." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// API Gateway -- one door, sized for everything behind it
// ---------------------------------------------------------------------------

const apiGatewayStartGraph: SimGraph = {
  nodes: [
    client(),
    { id: 'gateway', label: 'Reception Desk', position: { x: 380, y: 160 }, config: { kind: 'apiGateway', capacityRps: 50, baseMs: 15, costPerHour: 6 } },
    service('checkout', 'Checkout Service', 660, 160, { capacityRps: 150, baseMs: 30 }),
  ],
  edges: [edge('client', 'gateway'), edge('gateway', 'checkout')],
}

const ch3ApiGateway: Level = {
  id: 'ch3-api-gateway',
  chapterId: 'ch3',
  order: 10,
  title: 'One Door, Every Order',
  realConcept: 'API Gateway',
  analogyName: 'The reception desk',
  stages: [
    {
      kind: 'situation',
      title: 'Every request through one desk',
      body: [
        "You've put a single reception desk in front of every backend team now, instead of customers calling each team directly — one entry point, one place for auth checks and routing. Checkout itself has plenty of capacity. But every single order, from every customer, now has to get past the reception desk first, and it's turning people away.",
      ],
    },
    {
      kind: 'teach',
      title: 'API Gateway',
      body: [
        'An **API Gateway** sits between clients and a collection of backend services as a single entry point — it encapsulates the internal architecture and adds cross-cutting concerns like authentication, rate limiting, routing, and logging in one place instead of duplicating them in every service.',
        "That centralization is also its risk. The README lists it plainly: a gateway can become a **single point of failure**, can **impact performance**, and can become a **bottleneck if not scaled properly** — because unlike any one backend service, *every* request passes through it, not just the requests for one feature.",
        'The fix is unglamorous but real: size the gateway for the **combined** traffic of everything behind it, not for any single service\'s share.',
      ],
      readmeQuote: {
        text: 'The API Gateway is an API management tool that sits between a client and a collection of backend services. It is a single entry point into a system that encapsulates the internal system architecture and provides an API that is tailored to each client.',
        source: 'Chapter III · API Gateway',
      },
      realWorldExamples: ['Amazon API Gateway or Kong in front of a microservices backend', 'Every mobile app\'s single "api.example.com" entry point'],
      check: {
        question: 'Why does an API Gateway need to be sized for *combined* traffic across every backend service, not any single one?',
        options: [
          { id: 'a', label: 'Every request to any backend passes through the same one gateway hop first', correct: true, feedback: "Right — it's a single funnel for everything, so its own capacity has to reflect that." },
          { id: 'b', label: 'It doesn\'t — each backend service has its own separate gateway instance automatically', correct: false, feedback: 'The whole point of a gateway is being one shared entry point, not a separate instance per backend.' },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Size the front door',
      brief: [
        'The Reception Desk is undersized for how much traffic now funnels through it. Turn up its capacity until it can actually carry the load headed to Checkout.',
      ],
      startingGraph: apiGatewayStartGraph,
      unlockedKinds: ['client', 'apiGateway', 'service'],
      lockedNodeIds: ['gateway', 'checkout'],
      workload: { durationMs: 3000, tickMs: 250, trafficCurve: constantTraffic(80) },
      slo: { maxErrorRate: 0.02, minThroughputRps: 70 },
      debrief: {
        successBody: [
          "Checkout itself never broke a sweat — it had capacity to spare the entire time. The Reception Desk was the actual bottleneck, exactly because every request has to clear it first, regardless of which backend it's ultimately headed to.",
          "This is the trade the README warns about directly: centralizing cross-cutting concerns in one gateway is genuinely useful, but that gateway now needs the same capacity planning as any high-traffic service — because it *is* one.",
        ],
        failureBody: ['Select the Reception Desk and turn its capacity slider up until it comfortably clears the offered traffic.'],
        readmeQuote: {
          text: 'Can become a bottleneck if not scaled properly.',
          source: 'Chapter III · API Gateway (Disadvantages)',
        },
        realWorldExamples: ['Autoscaling an API gateway tier the same way you\'d autoscale any other high-traffic service'],
        interviewPhrase: '"A gateway centralizes cross-cutting concerns, but it also centralizes load — I\'d capacity-plan it against the sum of everything behind it, not treat it as a free pass-through."',
        ruleOfThumb: 'A single entry point is also a single point of contention — size it for everything that funnels through it.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which of these is a listed responsibility of an API Gateway, beyond simple routing?',
      options: [
        { id: 'a', label: 'Authentication, rate limiting, caching, and logging, among others', correct: true, feedback: 'Right — straight from the README\'s features list.' },
        { id: 'b', label: 'Permanently storing all application data', correct: false, feedback: "A gateway routes and manages requests — it isn't a data store." },
      ],
    },
    {
      id: 'q2',
      question: 'What is the Backend For Frontend (BFF) pattern, per the README?',
      options: [
        { id: 'a', label: 'Separate backend services built specifically for each frontend/interface, avoiding one generic backend serving all of them', correct: true, feedback: "Right — tailoring the backend to each specific client instead of one-size-fits-all." },
        { id: 'b', label: 'Running the frontend code directly on the backend server', correct: false, feedback: "BFF is about a dedicated backend service per frontend, not about co-locating frontend and backend code." },
      ],
    },
  ],
}

const [ntier, messageBrokers, esb, eda, eventSourcing, restGraphqlGrpc, realtime] = CHAPTER_3_EXTRA_LEVELS

export const CHAPTER_3: Chapter = {
  id: 'ch3',
  order: 3,
  title: 'Chapter III · Architecture',
  subtitle: 'Messaging, services, and the shapes traffic takes between them',
  levelIds: [
    ntier.id,
    messageBrokers.id,
    ch3MessageQueues.id,
    ch3PubSub.id,
    esb.id,
    ch3Microservices.id,
    eda.id,
    eventSourcing.id,
    ch3Cqrs.id,
    ch3ApiGateway.id,
    restGraphqlGrpc.id,
    realtime.id,
  ],
}

export const CHAPTER_3_LEVELS: Level[] = [
  ntier,
  messageBrokers,
  ch3MessageQueues,
  ch3PubSub,
  esb,
  ch3Microservices,
  eda,
  eventSourcing,
  ch3Cqrs,
  ch3ApiGateway,
  restGraphqlGrpc,
  realtime,
]
