// Chapter I -- Foundations. Five levels, each ending in at least one real
// build-and-run, from a single server through load balancing, routing
// algorithms, and caching (with its invalidation twist as the capstone).

import type { Chapter, Level } from './types'
import type { GraphNode, SimGraph } from '@/engine/types'
import { constantTraffic, rampTraffic } from '@/engine/traffic'
import { client, edge, loadBalancer } from './graphHelpers'

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
      baseMs: overrides.baseMs ?? 80,
      costPerHour: overrides.costPerHour ?? 8,
    },
  }
}

function cacheNode(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides: Partial<{
    capacitySlots: number
    keyspaceSize: number
    zipfS: number
    hitMs: number
    missOverheadMs: number
    staleFraction: number
  }> = {},
): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    config: {
      kind: 'cache',
      capacitySlots: overrides.capacitySlots ?? 50,
      keyspaceSize: overrides.keyspaceSize ?? 500,
      zipfS: overrides.zipfS ?? 1.1,
      hitMs: overrides.hitMs ?? 5,
      missOverheadMs: overrides.missOverheadMs ?? 2,
      costPerHour: 3,
      policy: 'writeThrough',
      staleFraction: overrides.staleFraction ?? 0,
    },
  }
}

// ---------------------------------------------------------------------------
// Level 1 -- One Courier (the Server, and the canvas itself)
// ---------------------------------------------------------------------------

const l1StartGraph: SimGraph = { nodes: [client()], edges: [] }

const ch1Level1: Level = {
  id: 'ch1-l1',
  chapterId: 'ch1',
  order: 1,
  title: 'One Courier',
  realConcept: 'Server',
  analogyName: 'The depot',
  stages: [
    {
      kind: 'situation',
      title: 'Time to build',
      body: [
        "Packet & Post is growing past \"one clerk at a counter.\" It's time to open your first real **depot** — a place that actually receives an order and does the work of fulfilling it.",
        "You'll place it yourself. Every level from here on, you build the map and press Run.",
      ],
    },
    {
      kind: 'teach',
      title: 'The depot (server)',
      body: [
        'A **depot** is what system design calls a **server** — the thing that actually does the work of answering a request. It has a **capacity** (how many orders/second it can handle) and a **base speed** (how long one order takes when it isn\'t busy).',
        "On the map, you'll drag a Depot into place, then connect **Customers** to it with a wire — that wire is the path a request travels.",
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Customers' },
          { icon: '🏬', label: 'Depot' },
        ],
        caption: 'Requests flow left to right along the wires you draw.',
      },
      readmeQuote: {
        text: 'Scalability is the measure of how well a system responds to changes by adding or removing resources to meet demands.',
        source: 'Chapter I · Scalability',
      },
      realWorldExamples: ['A single API server', 'One EC2 instance running your app'],
      check: {
        question: 'On the map, what does the wire between Customers and a Depot represent?',
        options: [
          { id: 'a', label: 'The path a request travels to reach the server', correct: true, feedback: 'Right — connecting two components means requests can flow between them.' },
          { id: 'b', label: 'A payment being processed', correct: false, feedback: "It's simpler than that — it's just the flow of requests, not money." },
          { id: 'c', label: 'Nothing; it\'s just decoration', correct: false, feedback: "It matters a lot — without a wire, requests have nowhere to go." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Open your first depot',
      brief: ['A light, steady trickle of orders is coming in. Get a depot up and answering them.'],
      startingGraph: l1StartGraph,
      unlockedKinds: ['client', 'server'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(10) },
      slo: { maxP99Ms: 250, maxErrorRate: 0, minThroughputRps: 8 },
      guidedSteps: [
        { instruction: 'Drag a Depot from the left panel onto the map.' },
        { instruction: 'Drag from the dot on the right edge of Customers to the left edge of the Depot to connect them.' },
        { instruction: 'Press ▶ Run at the top to send orders through your new depot.' },
      ],
      debrief: {
        successBody: [
          "That's it — that's the whole loop you'll use for the rest of the course: build, run, read the dashboard.",
          'Notice the depot is barely breaking a sweat. Plenty of room before this becomes a problem — which is exactly what the next level is about.',
        ],
        failureBody: [
          "Doesn't look connected yet, or the depot isn't there. Make sure Customers has a wire running all the way to the Depot, then run again.",
        ],
        readmeQuote: {
          text: 'A good system design requires us to think about everything, from infrastructure all the way down to the data and how it\'s stored.',
          source: 'Getting Started · What is system design?',
        },
        realWorldExamples: ['Deploying your first backend server'],
        interviewPhrase: "\"I'd start with the simplest thing that could work — a single server — and scale from there once I understand where it actually breaks.\"",
        ruleOfThumb: 'One server, well under its capacity, is the correct starting point for almost anything.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What two things define a server\'s basic behavior in this game?',
      options: [
        { id: 'a', label: 'Its capacity (requests/sec it can handle) and its base speed (how long one request takes when idle)', correct: true, feedback: 'Right — those two numbers drive everything else about how it behaves under load.' },
        { id: 'b', label: 'Its color and its position on the map', correct: false, feedback: "Those are purely cosmetic — capacity and base speed are what the simulation actually uses." },
      ],
    },
    {
      id: 'q2',
      question: 'On the canvas, what does a wire between two components represent?',
      options: [
        { id: 'a', label: 'The path requests can flow along', correct: true, feedback: 'Right — no wire, no traffic flow between those two components.' },
        { id: 'b', label: 'A billing relationship between components', correct: false, feedback: "Wires are purely about request flow, not cost or billing." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 2 -- The Lunch Rush (overload -> vertical scaling)
// ---------------------------------------------------------------------------

const l2StartGraph: SimGraph = {
  nodes: [client(), server('depot-1', 'Depot', 320, 160, { capacityRps: 50, baseMs: 80 })],
  edges: [edge('client', 'depot-1')],
}

const ch1Level2: Level = {
  id: 'ch1-l2',
  chapterId: 'ch1',
  order: 2,
  title: 'The Lunch Rush',
  realConcept: 'Overload & vertical scaling',
  analogyName: 'One depot, too many orders',
  stages: [
    {
      kind: 'situation',
      title: 'Noon hits',
      body: [
        'Word got out. Lunch rush arrives and your one depot — comfortable all morning — starts falling behind. Orders pile up. Some customers start walking away without being served at all.',
      ],
    },
    {
      kind: 'teach',
      title: 'Overload, and the quick fix',
      body: [
        "When requests arrive faster than a server can process them, two things happen: latency climbs (the queue backs up), and past a point, requests start getting **dropped outright** — refused, not just slow. That's an error.",
        'The fastest fix, when you own the depot outright, is **vertical scaling**: make the existing depot bigger/faster rather than opening a new one. Simple to do, but it has a ceiling — you can only make one machine so big, and it gets expensive fast.',
      ],
      readmeQuote: {
        text: 'Vertical scaling (also known as scaling up) expands a system\'s scalability by adding more power to an existing machine... Risk of high downtime, harder to upgrade, can be a single point of failure.',
        source: 'Chapter I · Scalability',
      },
      realWorldExamples: ['Upgrading an EC2 instance to a bigger size', 'Adding more RAM/CPU to a database box'],
      check: {
        question: 'What specifically distinguishes "vertical" scaling from the alternative you\'ll meet next level?',
        options: [
          { id: 'a', label: 'It makes one existing machine bigger, instead of adding more machines', correct: true, feedback: 'Right — that\'s the whole distinction, and it\'s why it has a ceiling.' },
          { id: 'b', label: 'It only works for databases', correct: false, feedback: 'It applies to any single server, not just databases.' },
          { id: 'c', label: 'It requires a load balancer', correct: false, feedback: 'The opposite, actually — vertical scaling is what you do *before* you need a load balancer.' },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Survive the rush',
      brief: [
        'Traffic is ramping up fast and your one depot is about to fall over. You can\'t add a second depot yet — but you can make this one bigger. Select it and turn up its capacity.',
      ],
      startingGraph: l2StartGraph,
      unlockedKinds: ['client', 'server'],
      lockedNodeIds: ['depot-1'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: rampTraffic(10, 90, 6000) },
      slo: { maxP99Ms: 260, maxErrorRate: 0.01, minThroughputRps: 40 },
      debrief: {
        successBody: [
          'You bought yourself real headroom by turning up the depot\'s capacity — classic vertical scaling.',
          "But notice what you didn't fix: it's still one depot. If it goes down, or if traffic doubles again next week, you're back here. That's the ceiling.",
        ],
        failureBody: [
          "Click the depot and drag its capacity slider up. It needs to handle the traffic near the end of the rush, not just the start.",
        ],
        readmeQuote: {
          text: 'Horizontal scaling (also known as scaling out) expands a system\'s scale by adding more machines... Increased redundancy, better fault tolerance, flexible and efficient.',
          source: 'Chapter I · Scalability',
        },
        realWorldExamples: ['A startup upsizing its database instance before it needs a cluster'],
        interviewPhrase: '"Vertical scaling buys time cheaply, but it doesn\'t solve the single-point-of-failure problem — eventually you need to scale out, not just up."',
        ruleOfThumb: 'Vertical scaling is a fast, cheap patch with a ceiling — not a permanent fix.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'When incoming traffic exceeds what a server can process, what happens first, before outright errors appear?',
      options: [
        { id: 'a', label: 'Latency climbs as the queue backs up', correct: true, feedback: 'Right — the queue backs up before requests start getting dropped outright.' },
        { id: 'b', label: 'The server immediately starts refusing every request', correct: false, feedback: "Errors come after the queue has already backed up, not immediately at the first sign of overload." },
      ],
    },
    {
      id: 'q2',
      question: 'What is the main limitation of vertical scaling as a long-term fix?',
      options: [
        { id: 'a', label: "There's a ceiling to how big one machine can get, and it's expensive near that ceiling", correct: true, feedback: "Right — that's exactly the ceiling this level is about." },
        { id: 'b', label: 'It requires a load balancer to work at all', correct: false, feedback: "The opposite — vertical scaling is what you do before you need a load balancer." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 3 -- A Second Depot (horizontal scaling + load balancer)
// ---------------------------------------------------------------------------

const l3StartGraph: SimGraph = { nodes: [client()], edges: [] }

const ch1Level3: Level = {
  id: 'ch1-l3',
  chapterId: 'ch1',
  order: 3,
  title: 'A Second Depot',
  realConcept: 'Horizontal scaling & load balancing',
  analogyName: 'The dispatcher',
  stages: [
    {
      kind: 'situation',
      title: 'The ceiling',
      body: [
        "You've upgraded the depot twice now, and it's getting expensive. There's a simpler idea you haven't tried: open a **second** depot, and have someone at the door send each customer to whichever one is free.",
      ],
    },
    {
      kind: 'teach',
      title: 'Horizontal scaling & the dispatcher',
      body: [
        '**Horizontal scaling** means adding more machines instead of making one machine bigger. It scales further and survives one machine dying — but now you need something to spread requests across them.',
        "That something is a **load balancer** — in Packet & Post, the **dispatcher** standing at the door, sending each new customer to an available depot instead of always the same one.",
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Customers' },
          { icon: '🧭', label: 'Dispatcher' },
          { icon: '🏬', label: 'Depot A / B' },
        ],
        caption: 'The dispatcher decides which depot each request goes to.',
      },
      readmeQuote: {
        text: 'Load balancing lets us distribute incoming network traffic across multiple resources ensuring high availability and reliability by sending requests only to resources that are online.',
        source: 'Chapter I · Load Balancing',
      },
      realWorldExamples: ['Nginx or HAProxy in front of an app server pool', 'AWS Elastic Load Balancing'],
      check: {
        question: 'Why does adding a second depot require a dispatcher (load balancer) at all — why not just let customers pick one?',
        options: [
          { id: 'a', label: 'Something needs to know which depots exist and are free, and split traffic between them', correct: true, feedback: 'Exactly — customers (or client code) shouldn\'t need to track server health themselves.' },
          { id: 'b', label: 'It doesn\'t — a dispatcher is optional decoration', correct: false, feedback: 'Without it, traffic tends to pile onto whichever depot happens to be first, defeating the point of having two.' },
          { id: 'c', label: 'Because two depots can\'t connect to the same customers directly', correct: false, feedback: 'They technically could be wired directly — the real reason is about *balancing* load evenly, not a wiring limitation.' },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Open a second depot',
      brief: ['This much traffic overwhelmed a single depot last week. Build a dispatcher and two depots to handle it comfortably.'],
      startingGraph: l3StartGraph,
      unlockedKinds: ['client', 'server', 'loadBalancer'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(60) },
      slo: { maxP99Ms: 320, maxErrorRate: 0, minThroughputRps: 55 },
      guidedSteps: [
        { instruction: 'Drag a Dispatcher onto the map and connect Customers to it.' },
        { instruction: 'Drag two Depots onto the map.' },
        { instruction: 'Connect the Dispatcher to each Depot.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          'Same total traffic that made a single depot buckle a few levels ago — now handled comfortably, because it\'s split across two.',
          "The dispatcher defaulted to **round robin**: strict alternation, one customer to Depot A, the next to Depot B. That works well here because both depots are identical. Next level: what happens when they aren\'t.",
        ],
        failureBody: [
          'Make sure both depots are actually connected to the dispatcher, and the dispatcher is connected to Customers.',
        ],
        readmeQuote: {
          text: 'Round-robin: Requests are distributed to application servers in rotation.',
          source: 'Chapter I · Load Balancing (Routing Algorithms)',
        },
        realWorldExamples: ['A Kubernetes Service load-balancing across pod replicas'],
        interviewPhrase: '"I\'d put a load balancer in front of a pool of stateless servers so we can scale horizontally and tolerate one instance failing."',
        ruleOfThumb: 'Horizontal scaling + a load balancer beats vertical scaling once you need real headroom or fault tolerance.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What does a load balancer add that two independent servers without one don\'t have?',
      options: [
        { id: 'a', label: 'Something that knows which servers exist and splits traffic between them', correct: true, feedback: 'Right — without it, traffic has no principled way to spread across the pool.' },
        { id: 'b', label: 'Extra storage capacity', correct: false, feedback: "A load balancer routes traffic; it doesn't add storage." },
      ],
    },
    {
      id: 'q2',
      question: 'What is the main advantage horizontal scaling has over vertical scaling?',
      options: [
        { id: 'a', label: 'It scales further and survives one machine dying', correct: true, feedback: 'Right — no single ceiling, and redundancy comes for free.' },
        { id: 'b', label: "It's always simpler to set up than vertical scaling", correct: false, feedback: "It's usually more complex to set up — a load balancer and multiple machines to manage, instead of one." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 4 -- Dispatch Rules (routing algorithms)
// ---------------------------------------------------------------------------

const l4StartGraph: SimGraph = {
  nodes: [
    client(),
    loadBalancer('dispatcher', 'Dispatcher', 280, 160),
    server('depot-fast', 'Depot A (big oven)', 500, 90, { capacityRps: 150, baseMs: 80 }),
    server('depot-slow', 'Depot B (small oven)', 500, 230, { capacityRps: 50, baseMs: 80 }),
  ],
  edges: [edge('client', 'dispatcher'), edge('dispatcher', 'depot-fast'), edge('dispatcher', 'depot-slow')],
}

const ch1Level4: Level = {
  id: 'ch1-l4',
  chapterId: 'ch1',
  order: 4,
  title: 'Dispatch Rules',
  realConcept: 'Load balancing algorithms',
  analogyName: 'Not every depot is the same size',
  stages: [
    {
      kind: 'situation',
      title: 'Depot B keeps falling behind',
      body: [
        "You opened a second location, but it's smaller — a single small oven instead of a full kitchen. Your dispatcher is still alternating customers evenly between them, one-for-one. Depot B keeps drowning while Depot A has room to spare.",
      ],
    },
    {
      kind: 'teach',
      title: 'Not all dispatch rules are equal',
      body: [
        '**Round robin** sends requests in strict rotation — great when every server is identical, bad when they\'re not, because it hands the small depot exactly as much as the big one.',
        '**Least connections** (here: "least busy first") instead sends more traffic to whichever server has more room, roughly proportional to its capacity. **Hash**-based routing always sends the same kind of request to the same server — useful for consistency, not for balancing uneven capacity.',
        "The fix here isn't a new component — it's changing the dispatcher's rule.",
      ],
      readmeQuote: {
        text: 'Weighted Round-robin: Builds on the simple Round-robin technique to account for differing server characteristics such as compute and traffic handling capacity... Least Connections: A new request is sent to the server with the fewest current connections to clients.',
        source: 'Chapter I · Load Balancing (Routing Algorithms)',
      },
      realWorldExamples: ['HAProxy leastconn balancing mode', 'AWS ALB least-outstanding-requests routing'],
      check: {
        question: 'Two servers have very different capacities. Which routing algorithm is built to account for that automatically?',
        options: [
          { id: 'a', label: 'Least connections (least busy first)', correct: true, feedback: 'Right — it favors whichever server has more room, which naturally suits an uneven pool.' },
          { id: 'b', label: 'Round robin', correct: false, feedback: 'Round robin ignores capacity entirely — it just alternates strictly.' },
          { id: 'c', label: 'Hash', correct: false, feedback: 'Hash routing is about consistency (same request → same server), not about balancing uneven load.' },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Fix the dispatch rule',
      brief: [
        'Same setup, same traffic. Depot A can handle 150 rps, Depot B only 50. The dispatcher is still round-robin. Change its rule so Depot B stops drowning.',
      ],
      startingGraph: l4StartGraph,
      unlockedKinds: ['client', 'server', 'loadBalancer'],
      lockedNodeIds: ['dispatcher', 'depot-fast', 'depot-slow'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(140) },
      slo: { maxP99Ms: 320, maxErrorRate: 0.01, minThroughputRps: 130 },
      debrief: {
        successBody: [
          'Switching the dispatcher to "least busy first" routes roughly 3x more traffic to the big depot than the small one — matching their actual capacity instead of splitting blindly down the middle.',
          "Same two depots, same total traffic. The only thing that changed was the rule for how work gets assigned.",
        ],
        failureBody: [
          'Select the Dispatcher and change its "Dispatch rule" — round robin is splitting evenly and overwhelming the smaller depot.',
        ],
        readmeQuote: {
          text: 'Least Response Time: Sends requests to the server selected by a formula that combines the fastest response time and fewest active connections.',
          source: 'Chapter I · Load Balancing (Routing Algorithms)',
        },
        realWorldExamples: ['Any production load balancer serving a mixed-size fleet'],
        interviewPhrase: '"With heterogeneous server capacity, I\'d avoid plain round robin and use a weighted or least-connections strategy so load tracks actual capacity."',
        ruleOfThumb: 'Round robin assumes every server is equal. The moment that\'s untrue, it becomes the bottleneck\'s best friend.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'A dispatcher always sends the same customer\'s repeat orders to the same depot. Which routing algorithm is this?',
      options: [
        { id: 'a', label: 'Hash-based routing', correct: true, feedback: 'Right — hash routing consistently maps the same key to the same server.' },
        { id: 'b', label: 'Round robin', correct: false, feedback: "Round robin alternates strictly, with no memory of who went where before." },
      ],
    },
    {
      id: 'q2',
      question: 'Why does round robin struggle once servers have different capacities?',
      options: [
        { id: 'a', label: 'It splits traffic evenly regardless of capacity, overloading the smaller server', correct: true, feedback: 'Right — even splitting ignores how much each server can actually handle.' },
        { id: 'b', label: "It stops working entirely and sends all traffic to one server", correct: false, feedback: "It still alternates evenly — the problem is that 'even' isn't the right split for uneven servers." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 5 -- The Shelf (caching, capstone: guided -> solo -> twist)
// ---------------------------------------------------------------------------

const l5GuidedStart: SimGraph = {
  nodes: [client(), server('storeroom', 'Storeroom', 480, 160, { capacityRps: 50, baseMs: 150 })],
  edges: [],
}

const l5SoloStart: SimGraph = {
  nodes: [client(), server('storeroom', 'Storeroom', 480, 160, { capacityRps: 50, baseMs: 160 })],
  edges: [],
}

const l5TwistBaseGraph: SimGraph = {
  nodes: [
    client(),
    cacheNode('shelf', 'Shelf', 280, 160, { capacitySlots: 50, keyspaceSize: 500, zipfS: 1.1 }),
    server('storeroom', 'Storeroom', 500, 160, { capacityRps: 50, baseMs: 150 }),
  ],
  edges: [edge('client', 'shelf'), edge('shelf', 'storeroom')],
}

const ch1Level5: Level = {
  id: 'ch1-l5',
  chapterId: 'ch1',
  order: 5,
  title: 'The Shelf',
  realConcept: 'Caching & cache invalidation',
  analogyName: 'The front-counter shelf',
  stages: [
    {
      kind: 'situation',
      title: 'The same question, forty times an hour',
      body: [
        'Every time someone asks "how much to send a parcel to Leeds?", your clerk walks all the way to the storeroom, checks the price list, and walks back. It takes ages — and forty people an hour ask that exact same question.',
      ],
    },
    {
      kind: 'teach',
      title: 'The shelf (cache)',
      body: [
        '_"There are only two hard things in Computer Science: cache invalidation and naming things."_ — a joke you\'ll understand fully by the end of this level.',
        'A **cache** is a small, fast store of *copies* of things you fetch often, kept close at hand — so you don\'t make the slow trip every time. It works because of **locality of reference**: recently requested data is likely to be requested again.',
        'A **cache hit** means the answer was already on the shelf. A **cache miss** means it wasn\'t, and you still had to walk to the storeroom — but now you leave a copy on the shelf for next time.',
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Customers' },
          { icon: '🗂️', label: 'Shelf (cache)' },
          { icon: '🏬', label: 'Storeroom' },
        ],
        caption: 'Most answers get resolved right at the shelf — only misses walk all the way to the storeroom.',
      },
      readmeQuote: {
        text: "A cache's primary purpose is to increase data retrieval performance by reducing the need to access the underlying slower storage layer... Caches take advantage of the locality of reference principle \"recently requested data is likely to be requested again.\"",
        source: 'Chapter I · Caching',
      },
      realWorldExamples: ['Redis or Memcached in front of a database', 'Your browser\'s local page cache'],
      check: {
        question: 'A customer asks a question that was already answered from the shelf a minute ago. What just happened?',
        options: [
          { id: 'a', label: 'A cache hit', correct: true, feedback: 'Right — answered straight from the shelf, no trip to the storeroom needed.' },
          { id: 'b', label: 'A cache miss', correct: false, feedback: 'A miss is when the shelf did *not* have the answer.' },
          { id: 'c', label: 'Cache invalidation', correct: false, feedback: "That's what happens when a shelf answer becomes wrong and needs removing — not what happened here." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Put in a shelf',
      brief: ['The storeroom is slow (150ms just to check a price) and getting the same questions over and over. Add a shelf in front of it.'],
      startingGraph: l5GuidedStart,
      unlockedKinds: ['client', 'server', 'cache'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(40) },
      slo: { maxP99Ms: 260, maxErrorRate: 0, minThroughputRps: 35 },
      guidedSteps: [
        { instruction: 'Drag a Shelf onto the map, between Customers and the Storeroom.' },
        { instruction: 'Connect Customers → Shelf, then Shelf → Storeroom.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          'Most of that traffic never touched the slow storeroom at all — it was answered straight from the shelf in a few milliseconds.',
          'p99 is still shaped by the unlucky requests that missed the shelf, but far fewer requests take the slow path now.',
        ],
        failureBody: ['Make sure the Shelf sits between Customers and the Storeroom, wired both directions.'],
        readmeQuote: {
          text: 'Improves performance · Reduce latency · Reduce load on the database · Increase Read Throughput',
          source: 'Chapter I · Caching (Advantages)',
        },
        realWorldExamples: ['CDN edge caches', 'An application-layer cache in front of a database'],
        interviewPhrase: '"I\'d add a cache in front of the read path for data that\'s requested far more often than it changes."',
        ruleOfThumb: 'A cache helps exactly as much as your traffic repeats itself — high repetition, big win.',
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'A new branch, same trick',
      brief: ['New location, same problem: a slow storeroom and repetitive questions. Place the shelf yourself this time.'],
      startingGraph: l5SoloStart,
      unlockedKinds: ['client', 'server', 'cache'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(40) },
      slo: { maxP99Ms: 280, maxErrorRate: 0, minThroughputRps: 35 },
      debrief: {
        successBody: ['You didn\'t need the step-by-step this time — that\'s the point.'],
        failureBody: ['Same idea as last time: Customers → Shelf → Storeroom, all connected.'],
        readmeQuote: {
          text: 'A cache typically stores a subset of data transiently, in contrast to databases whose data is usually complete and durable.',
          source: 'Chapter I · Caching',
        },
        realWorldExamples: ['Every read-heavy service you\'ll ever build'],
        interviewPhrase: '"Caching is one of the highest-leverage changes you can make to a read-heavy system, for relatively little complexity."',
        ruleOfThumb: 'If you can place it without the checklist, you\'ve actually learned it.',
      },
    },
    {
      kind: 'build',
      mode: 'twist',
      title: 'The price just changed',
      brief: [
        'Leeds delivery went up to £6 this morning. Your shelf doesn\'t know that yet — it\'s still confidently handing out the old price. How should it handle updates?',
      ],
      startingGraph: l5TwistBaseGraph,
      unlockedKinds: ['client', 'server', 'cache'],
      lockedNodeIds: ['shelf', 'storeroom'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(40) },
      slo: { maxP99Ms: 300, maxErrorRate: 0, minThroughputRps: 35, maxStaleReadRate: 0.05 },
      decisionCard: {
        prompt: 'The price list changed. How should the shelf handle it?',
        options: [
          {
            id: 'write-around',
            label: 'Write-around — update the storeroom only',
            description: 'Fast to update. Old answers stay on the shelf until they\'re naturally replaced — customers may get stale prices for a while.',
            applyToGraph: (graph) => ({
              ...graph,
              nodes: graph.nodes.map((n) =>
                n.id === 'shelf' && n.config.kind === 'cache'
                  ? { ...n, config: { ...n.config, policy: 'writeAround', staleFraction: 0.6 } }
                  : n,
              ),
            }),
          },
          {
            id: 'write-through',
            label: 'Write-through — update the shelf and storeroom together',
            description: 'The shelf is updated at the same moment as the storeroom. Slightly slower to write, but never wrong.',
            applyToGraph: (graph) => ({
              ...graph,
              nodes: graph.nodes.map((n) =>
                n.id === 'shelf' && n.config.kind === 'cache'
                  ? { ...n, config: { ...n.config, policy: 'writeThrough', staleFraction: 0 } }
                  : n,
              ),
            }),
          },
        ],
      },
      debrief: {
        successBody: [
          "This is the trade-off at the heart of caching. Write-around is cheaper and simpler to build, but it means some customers get charged the wrong price for a while — that's not a bug, it's the mechanism working exactly as designed, just designed for a different priority.",
          'Write-through costs a little more on every price change, but a shelf answer is never wrong. For something like a price, that\'s usually worth it.',
        ],
        failureBody: [
          'If stale reads are above the limit, the shelf is still running write-around. Try write-through instead — it keeps the shelf and storeroom in lockstep.',
        ],
        readmeQuote: {
          text: 'Write-through cache: Data is written into the cache and the corresponding database simultaneously. Pro: Fast retrieval, complete data consistency between cache and storage. Con: Higher latency for write operations.',
          source: 'Chapter I · Caching (Cache Invalidation)',
        },
        realWorldExamples: ['Payment/pricing systems (write-through)', 'Social media feeds (often write-around, staleness tolerated)'],
        interviewPhrase: '"For data where being wrong is worse than being slow, I\'d use write-through. Where staleness is tolerable, write-around trades a little correctness for simplicity and speed."',
        ruleOfThumb: 'Every caching strategy is a trade of some staleness risk for some speed — the question is never "which is best," only "which risk can this data tolerate."',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What principle explains why caching works at all?',
      options: [
        { id: 'a', label: 'Locality of reference — recently requested data is likely to be requested again', correct: true, feedback: 'Right — straight from the source README.' },
        { id: 'b', label: 'All data is requested exactly once, so caching prevents duplicate work', correct: false, feedback: "If data were only ever requested once, a cache would never get a hit — the opposite of why caching helps." },
      ],
    },
    {
      id: 'q2',
      question: 'Between write-through and write-around, which one risks serving stale data after an update?',
      options: [
        { id: 'a', label: 'Write-around', correct: true, feedback: 'Right — the cache isn\'t updated at write time, so old entries can linger until naturally replaced.' },
        { id: 'b', label: 'Write-through', correct: false, feedback: "Write-through updates the cache and the source at the same moment, so it stays accurate." },
      ],
    },
  ],
}

import { CHAPTER_1_EXTRA_LEVELS } from './chapter1-extra'

// Full pedagogical order: the networking fundamentals (IP/OSI/TCP-UDP/DNS)
// come first, matching the source README's own chapter order, since
// everything after assumes "a request travels from a client to a server."
// Clustering follows the dispatcher+depots build (L3) it names. Proxy and
// Storage are placed after caching/routing since they lean on vocabulary
// already built by then. CDN and Availability close out the mechanics
// built so far, and Scalability caps the chapter as the formal synthesis
// of the vertical/horizontal trade-off every level since L2 has been
// practicing without naming.
const [ip, osi, tcpUdp, dns, clustering, proxy, storage, cdn, availability, scalability] =
  CHAPTER_1_EXTRA_LEVELS

export const CHAPTER_1: Chapter = {
  id: 'ch1',
  order: 1,
  title: 'Chapter I · Foundations',
  subtitle: 'From one courier to a dispatched, cached network',
  levelIds: [
    ip.id,
    osi.id,
    tcpUdp.id,
    dns.id,
    ch1Level1.id,
    ch1Level2.id,
    ch1Level3.id,
    clustering.id,
    ch1Level4.id,
    ch1Level5.id,
    proxy.id,
    storage.id,
    cdn.id,
    availability.id,
    scalability.id,
  ],
}

export const CHAPTER_1_LEVELS: Level[] = [
  ip,
  osi,
  tcpUdp,
  dns,
  ch1Level1,
  ch1Level2,
  ch1Level3,
  clustering,
  ch1Level4,
  ch1Level5,
  proxy,
  storage,
  cdn,
  availability,
  scalability,
]
