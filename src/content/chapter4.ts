// Chapter IV -- Operations & Security. Four anchor builds (Circuit Breaker,
// Rate Limiting, Service Discovery, Disaster Recovery) exercise the Phase 6
// engine primitives (rateLimiter, circuitBreaker, healthAware load
// balancing, region/killRegionIds) end to end; the remaining six topics are
// teach-only or interactive walkthroughs, in chapter4-extra.ts.
//
// One honest note on Circuit Breaker specifically: in this simulator, a
// plain capacity-limited node already behaves like an ideal proportional
// admission controller under *steady* overload -- there's no "resource
// exhaustion cascading through a caller chain" for a breaker to prevent,
// because the engine has no concurrent-in-flight/thread-pool concept. A
// breaker genuinely can't be shown to beat a plain connection on error rate
// or latency here. What the engine *can* honestly prove is the real,
// well-known flip side: a badly-tuned (trigger-happy, slow-to-recover)
// breaker does far more self-inflicted damage than the blip it's meant to
// guard against -- so that's the lesson this build teaches instead.
//
// A separate, unrelated constraint: NodeInspector.tsx's CircuitBreakerFields
// exposes capacity, trip threshold, open duration, and half-open trial, but
// NOT windowMs -- there's no slider for it. The Circuit Breaker build's
// intended fix (see chapter4.test.ts) only ever touches the four exposed
// fields; windowMs stays at its authored default. Before designing a future
// level's fix around any *Fields component's config, check what it actually
// renders first -- not every field on a config type has a matching control.

import type { Chapter, Level } from './types'
import { constantTraffic, spikeTraffic } from '@/engine/traffic'
import { client, edge, loadBalancer } from './graphHelpers'
import type { CircuitBreakerConfig, GraphNode, SimGraph } from '@/engine/types'
import { CHAPTER_4_EXTRA_LEVELS } from './chapter4-extra'

function server(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number }> = {},
  region?: string,
): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    region,
    config: {
      kind: 'server',
      capacityRps: overrides.capacityRps ?? 50,
      baseMs: overrides.baseMs ?? 30,
      costPerHour: overrides.costPerHour ?? 8,
    },
  }
}

function circuitBreakerNode(id: string, label: string, x: number, y: number, overrides: Partial<CircuitBreakerConfig> = {}): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    config: {
      kind: 'circuitBreaker',
      capacityRps: overrides.capacityRps ?? 300,
      baseMs: overrides.baseMs ?? 5,
      costPerHour: overrides.costPerHour ?? 5,
      errorThreshold: overrides.errorThreshold ?? 0.05,
      windowMs: overrides.windowMs ?? 250,
      openDurationMs: overrides.openDurationMs ?? 4000,
      halfOpenTrialFraction: overrides.halfOpenTrialFraction ?? 0.05,
    },
  }
}

// ---------------------------------------------------------------------------
// Circuit Breaker -- a jumpy trip switch does more harm than the blip itself
// ---------------------------------------------------------------------------

const circuitBreakerStartGraph: SimGraph = {
  nodes: [client(), circuitBreakerNode('cb', 'Trip Switch', 380, 160), server('dispatch', 'Dispatch Desk', 660, 160, { capacityRps: 100, baseMs: 20 })],
  edges: [edge('client', 'cb'), edge('cb', 'dispatch')],
}

const ch4CircuitBreaker: Level = {
  id: 'ch4-circuit-breaker',
  chapterId: 'ch4',
  order: 2,
  title: 'The Switch That Wouldn\'t Reset',
  realConcept: 'Circuit breaker',
  analogyName: 'The trip switch',
  stages: [
    {
      kind: 'situation',
      title: 'One blip, a whole afternoon of silence',
      body: [
        'The Dispatch Desk had a single half-second hiccup this morning — a network blip, nothing more, and it was back to normal instantly. But the trip switch guarding it is set to go off at the *slightest* provocation, and once it trips it stays tripped for ages before it even considers testing the water again. That one tiny blip just cost you an entire afternoon of refused orders, from a desk that has been perfectly healthy the whole time.',
      ],
    },
    {
      kind: 'teach',
      title: 'Circuit breaker',
      body: [
        'A **circuit breaker** wraps a risky call and watches for failures. Below its error threshold it stays **closed** and lets everything through as normal. Once failures cross that threshold, it trips **open** — every further call is refused immediately, without even attempting the thing behind it. After a cooldown, it moves to **half-open** and lets a small trial of traffic through: if that trial succeeds, it closes again; if not, it goes back to open and waits some more.',
        "The whole point is failing **fast** instead of failing **slow** — a caller that gets an instant, cheap refusal isn't stuck waiting on something that was never going to answer anyway.",
        "But a breaker is only as good as its tuning. Set the threshold too sensitively and the cooldown too long, and it turns a half-second blip into a self-inflicted outage lasting far longer than the real problem ever did — the switch itself becomes the failure.",
      ],
      diagram: {
        steps: [
          { icon: '✅', label: 'Closed' },
          { icon: '⛔', label: 'Open' },
          { icon: '🔍', label: 'Half-open' },
        ],
        caption: 'Closed lets everything through. Open refuses everything instantly. Half-open tests the water before deciding which way to go back.',
      },
      readmeQuote: {
        text: 'Once the failures reach a certain threshold, the circuit breaker trips, and all further calls to the circuit breaker return with an error, without the protected call being made at all.',
        source: 'Chapter IV · Circuit breaker',
      },
      realWorldExamples: ['Netflix\'s Hystrix library, one of the patterns that popularized circuit breaking', 'A payment gateway client that stops hammering a down processor and fails fast instead'],
      check: {
        question: 'What specifically happens to a request while a circuit breaker is open?',
        options: [
          { id: 'a', label: 'It is refused immediately, without the protected call being attempted at all', correct: true, feedback: 'Right — that immediate refusal is the whole point: failing fast instead of failing slow.' },
          { id: 'b', label: 'It is queued and retried automatically until the breaker closes again', correct: false, feedback: "That's a queue's job, not a breaker's — an open breaker refuses outright, it doesn't hold anything." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Stop punishing yourself for a blip',
      brief: [
        'The Dispatch Desk itself is fine — it was down for half a second and has been healthy ever since. Retune the trip switch so a brief blip doesn\'t turn into a self-inflicted afternoon of refusals.',
      ],
      startingGraph: circuitBreakerStartGraph,
      unlockedKinds: ['client', 'circuitBreaker', 'server'],
      lockedNodeIds: ['cb', 'dispatch'],
      workload: { durationMs: 5000, tickMs: 250, trafficCurve: constantTraffic(40) },
      incidents: [{ id: 'blip', label: 'A half-second network blip', startMs: 500, endMs: 1000, killNodeIds: ['dispatch'] }],
      slo: { maxErrorRate: 0.2, minThroughputRps: 30 },
      debrief: {
        successBody: [
          'The blip itself only lasted half a second — but with the trip switch set to go off at a 5% error threshold and stay open for four full seconds afterward, one tiny hiccup was enough to make it refuse nearly everything for most of the run. Raising the threshold and shortening the cooldown let it shrug off the blip the way the Dispatch Desk itself already had.',
          "Notice what *didn't* change: the Dispatch Desk's own healthy behavior. The only thing that moved was how the switch reacted to it. A circuit breaker doesn't make a healthy system faster — a badly tuned one can make a healthy system look broken.",
        ],
        failureBody: [
          'Raise the trip switch\'s error threshold so a single brief blip doesn\'t cross it, and shorten the open duration so it doesn\'t stay tripped long after the desk has already recovered.',
        ],
        readmeQuote: {
          text: 'In this state circuit breaker returns an error immediately without even invoking the services.',
          source: 'Chapter IV · Circuit breaker (States)',
        },
        realWorldExamples: ['Production incidents caused by an overly aggressive circuit breaker, not the dependency it was guarding'],
        interviewPhrase: '"A circuit breaker isn\'t a free win — I\'d tune its threshold and cooldown to the failure it\'s actually meant to catch, because an over-sensitive one can inflict more downtime than the outage it was protecting against."',
        ruleOfThumb: 'A circuit breaker that trips on everything and stays open forever is worse than no breaker at all — tune it to the failure, not to zero tolerance.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What are the three states a circuit breaker moves between?',
      options: [
        { id: 'a', label: 'Closed, open, half-open', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'Healthy, degraded, offline', correct: false, feedback: "Those describe a service's condition generally — a circuit breaker's own states are closed/open/half-open specifically." },
      ],
    },
    {
      id: 'q2',
      question: 'Why do circuit breakers exist, per the README\'s own framing?',
      options: [
        { id: 'a', label: 'Many callers hammering an unresponsive dependency can run out of critical resources, leading to cascading failures', correct: true, feedback: "Right — that's the core motivation the README gives." },
        { id: 'b', label: 'To make every request permanently faster, regardless of whether anything is failing', correct: false, feedback: "A breaker protects against failure conditions — it doesn't speed up normal, healthy traffic." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Rate Limiting -- a hard ceiling protects latency, not the total refused
// ---------------------------------------------------------------------------

const rateLimitingStartGraph: SimGraph = {
  nodes: [client(), server('intake', 'Intake Counter', 500, 160, { capacityRps: 30, baseMs: 40 })],
  edges: [edge('client', 'intake')],
}

const ch4RateLimiting: Level = {
  id: 'ch4-rate-limiting',
  chapterId: 'ch4',
  order: 3,
  title: 'The Line That Wouldn\'t Move',
  realConcept: 'Rate limiting',
  analogyName: 'The intake window',
  stages: [
    {
      kind: 'situation',
      title: 'Everyone waits, including the lucky ones',
      body: [
        'A burst of parcel drop-offs just hit the Intake Counter — three times what it can actually process at once. It still accepts everyone into the queue and works through them, but with this many people crammed in at once, even the ones who eventually get served are waiting an absurd amount of time. The counter isn\'t collapsing, it\'s just drowning, and everyone in line is drowning with it.',
      ],
    },
    {
      kind: 'teach',
      title: 'Rate limiting',
      body: [
        '**Rate limiting** caps how frequently an operation is allowed to happen, refusing anything past that cap outright rather than letting it pile in. It protects a shared resource\'s availability, defends against unintended or malicious overuse, and puts a predictable ceiling on load instead of an open-ended one.',
        'The **token bucket** algorithm is a common approach: a bucket holds a limited number of tokens, refilled at a steady rate; each admitted request spends one token, and once the bucket is empty, further requests are refused until it refills. A bucket with more tokens tolerates a bigger instant burst before it starts refusing.',
        "Here's the part that's easy to miss: a rate limiter doesn't reduce *how much* gets refused during a genuine overload — the excess demand is real either way. What it changes is *who pays the cost* of that overload. Without a cap, everyone (including the requests that do get through) waits behind the pile-up. With a hard cap, the excess gets a fast, clean refusal instead, and the requests that *are* admitted never see the pile-up at all — because it never happened for them.",
      ],
      readmeQuote: {
        text: 'Rate limiting refers to preventing the frequency of an operation from exceeding a defined limit... so that shared resources can maintain availability.',
        source: 'Chapter IV · Rate Limiting',
      },
      realWorldExamples: ['A public API returning HTTP 429 past a per-key request cap', 'Login endpoints capping attempts per IP to blunt credential-stuffing bursts'],
      check: {
        question: 'What does a token-bucket rate limiter actually improve for a burst that genuinely exceeds a resource\'s capacity?',
        options: [
          { id: 'a', label: 'How badly the wait time degrades for whatever traffic does get admitted, by never letting the pile-up happen in the first place', correct: true, feedback: "Right — the excess still gets refused either way; what changes is that admitted traffic is protected from ever queuing up behind it." },
          { id: 'b', label: 'It reduces the total number of requests that end up refused during the burst', correct: false, feedback: "Not necessarily — a strict cap can refuse just as much (or more) than an uncapped system would under the same overload. Its real win is protecting latency for what gets through." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Cap it before it piles up',
      brief: [
        'Nothing about the Intake Counter itself needs to change — put a hard admission cap in front of it so a burst can\'t turn into a pile-up for everyone waiting behind it.',
      ],
      startingGraph: rateLimitingStartGraph,
      unlockedKinds: ['client', 'server', 'rateLimiter'],
      lockedNodeIds: ['intake'],
      workload: { durationMs: 3000, tickMs: 250, trafficCurve: spikeTraffic(15, 90, 1000, 2000) },
      slo: { maxP99Ms: 250, maxErrorRate: 0.65, minThroughputRps: 10 },
      guidedSteps: [
        { instruction: 'Delete the wire between Customers and the Intake Counter.' },
        { instruction: 'Drag an Intake Window onto the map.' },
        { instruction: 'Connect Customers → Intake Window, then Intake Window → Intake Counter.' },
        { instruction: 'Set the Intake Window\'s sustained rate to 25/s and its burst allowance to 5.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          "The burst still got mostly refused — that number barely moved. What changed is what happened to the requests that *did* get through: instead of piling up behind ninety requests all fighting for thirty slots, the Intake Window let through only what the counter could actually absorb without its own wait time blowing up. p99 latency dropped from multiple seconds to a small fraction of one.",
          'This is the honest trade a rate limiter makes: a small, deliberately-set burst allowance smooths a *little* real burstiness, but a spike far past capacity gets a fast, clean refusal — protecting the experience for everyone who is admitted, instead of degrading it for everyone equally.',
        ],
        failureBody: [
          'Make sure the direct wire from Customers to the Intake Counter is gone, traffic flows through the Intake Window first, and its sustained rate sits comfortably below the counter\'s own capacity — a burst allowance that\'s too generous lets the whole spike straight through anyway.',
        ],
        readmeQuote: {
          text: 'Here we use a concept of a bucket. When a request comes in, a token from the bucket must be taken and processed. The request will be refused if no token is available in the bucket.',
          source: 'Chapter IV · Rate Limiting (Token Bucket)',
        },
        realWorldExamples: ['Stripe\'s API rate limits, tuned to protect tail latency for every merchant sharing the platform'],
        interviewPhrase: '"A rate limiter doesn\'t necessarily lower your total error count under real overload — its real value is a predictable ceiling that protects latency for whatever traffic you do admit, instead of letting a pile-up degrade everyone."',
        ruleOfThumb: 'A rate limiter trades "some requests get a fast, clean refusal" for "nobody waits behind an unbounded pile-up" — it protects latency, not the total refused.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'In the token bucket algorithm, what happens when a request arrives and the bucket is empty?',
      options: [
        { id: 'a', label: 'The request is refused, and the requester has to try again later', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'The request waits in the bucket until a token becomes available', correct: false, feedback: "That's closer to a leaky bucket's queuing behavior — plain token bucket refuses outright rather than holding the request." },
      ],
    },
    {
      id: 'q2',
      question: 'What is a genuine reason to add rate limiting beyond just handling a traffic burst, per the README?',
      options: [
        { id: 'a', label: 'Controlling operational cost and defending against Denial of Service (DoS) style overuse', correct: true, feedback: 'Right — straight from the listed reasons.' },
        { id: 'b', label: 'It permanently increases the underlying resource\'s raw processing capacity', correct: false, feedback: "A rate limiter caps demand — it doesn't add any capacity to what's behind it." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Service Discovery -- the dispatcher finally learns to check who's alive
// ---------------------------------------------------------------------------

const serviceDiscoveryStartGraph: SimGraph = {
  nodes: [
    client(),
    loadBalancer('dispatcher', 'Dispatcher', 380, 160),
    server('inventory-1', 'Inventory Team A', 660, 90, { capacityRps: 100, baseMs: 25 }),
    server('inventory-2', 'Inventory Team B', 660, 230, { capacityRps: 100, baseMs: 25 }),
  ],
  edges: [edge('client', 'dispatcher'), edge('dispatcher', 'inventory-1'), edge('dispatcher', 'inventory-2')],
}

const ch4ServiceDiscovery: Level = {
  id: 'ch4-service-discovery',
  chapterId: 'ch4',
  order: 4,
  title: 'The Dispatcher Learns to Check',
  realConcept: 'Service discovery',
  analogyName: 'A dispatcher that knows who\'s actually answering',
  stages: [
    {
      kind: 'situation',
      title: 'Same old blind spot',
      body: [
        'This is the same dispatcher from before, wired to two Inventory teams instead of one -- and it still has no idea Team A just went down for maintenance. It keeps sending its usual even split to both, so a full half of every order still lands on a team that\'s not answering, purely because the dispatcher was never told.',
      ],
    },
    {
      kind: 'teach',
      title: 'Service discovery',
      body: [
        '**Service discovery** is how a caller finds a *currently reachable* instance of a service in an environment where instances come and go dynamically -- deployed, scaled, killed, replaced -- instead of sitting at one fixed, hand-configured address forever.',
        'A **service registry** is the database of who\'s actually up right now. Instances typically register themselves and send periodic **heartbeats** to prove they\'re still alive (**self-registration**); a registry entry that stops heartbeating gets removed. The registry has to stay highly available and up to date, or every caller relying on it inherits its blind spots.',
        'What you\'ve been calling a "dispatcher" this whole campaign is, underneath, a load balancer -- and a load balancer that actually checks who\'s alive before routing is doing a simplified version of what a full service registry provides. It\'s not the complete picture (no self-registration, no heartbeats, no separate registry service) -- but the core idea is identical: **stop sending traffic to instances you should already know are dead.**',
      ],
      readmeQuote: {
        text: 'We need a mechanism that enables the clients of service to make requests to a dynamically changing set of ephemeral service instances.',
        source: 'Chapter IV · Service Discovery',
      },
      realWorldExamples: ['Consul, etcd, and Apache Zookeeper as dedicated service registries', 'Kubernetes Services, which continuously track which pods are actually ready to receive traffic'],
      check: {
        question: 'What specifically does a service registry need to stay accurate, per the README\'s self-registration model?',
        options: [
          { id: 'a', label: 'Each instance sends periodic heartbeats to prove it\'s still alive, so a dead one gets removed', correct: true, feedback: "Right — no heartbeat means the registry eventually drops it, keeping the list of \"who's up\" honest." },
          { id: 'b', label: 'A human operator manually updates the registry file whenever an instance changes', correct: false, feedback: "That's exactly what self-registration and heartbeats replace — the whole point is instances managing their own presence automatically." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Give the dispatcher eyes',
      brief: [
        'Inventory Team A is down for this entire run. The dispatcher already exists and is already wired to both teams — it just has no idea one of them is dead. Fix that.',
      ],
      startingGraph: serviceDiscoveryStartGraph,
      unlockedKinds: ['client', 'loadBalancer', 'server'],
      lockedNodeIds: ['dispatcher', 'inventory-1', 'inventory-2'],
      workload: { durationMs: 2000, tickMs: 250, trafficCurve: constantTraffic(40) },
      incidents: [{ id: 'maintenance', label: 'Inventory Team A is down for maintenance', startMs: 0, endMs: 2000, killNodeIds: ['inventory-1'] }],
      slo: { maxErrorRate: 0.1, minThroughputRps: 30 },
      debrief: {
        successBody: [
          "Team A stayed down the entire run, exactly as before — but this time, zero orders landed on it. Once the dispatcher was health-aware, it simply stopped counting the dead instance as a routing target at all, splitting every order across only the team that was actually answering.",
          "Compare this to the earlier microservices level, where redundancy alone only shrank the blast radius to roughly one over the instance count — the dead instance still ate its fair share every time. This is the difference health-aware routing makes on top of redundancy: not a smaller share landing on the failure, but *none* of it.",
        ],
        failureBody: [
          'Select the Dispatcher and turn on health-aware routing — redundant instances alone don\'t help if the router has no way to know which ones are actually alive.',
        ],
        readmeQuote: {
          text: 'A Service Registry must be highly available and up-to-date.',
          source: 'Chapter IV · Service Discovery (Service Registry)',
        },
        realWorldExamples: ['A Kubernetes Service automatically excluding pods that fail their readiness probe'],
        interviewPhrase: '"Redundant instances alone don\'t remove a single point of failure if the router blindly sends traffic to all of them regardless of health — service discovery is what turns \'more instances\' into \'automatic failover.\'"',
        ruleOfThumb: 'Redundancy without health awareness still hands the dead instance its fair share. Health-aware routing is what actually routes around it.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the difference between client-side and server-side service discovery, per the README?',
      options: [
        { id: 'a', label: 'Client-side: the client queries the registry directly. Server-side: an intermediate load balancer does the lookup and forwards the request.', correct: true, feedback: 'Right — the client either does the lookup itself, or delegates it to an intermediary.' },
        { id: 'b', label: 'Client-side discovery only works for mobile apps; server-side only works for web browsers', correct: false, feedback: "The distinction is about who performs the registry lookup, not about client platform." },
      ],
    },
    {
      id: 'q2',
      question: 'What is a service mesh, per the README?',
      options: [
        { id: 'a', label: 'A layer enabling managed, observable, secure service-to-service communication, working with service discovery to detect services', correct: true, feedback: "Right, straight from the README's framing." },
        { id: 'b', label: 'A replacement for service discovery that removes the need for a registry entirely', correct: false, feedback: "A service mesh works alongside service discovery — it doesn't eliminate the need to detect which services exist." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Disaster Recovery -- one region isn't a plan, it's a single point of failure
// ---------------------------------------------------------------------------

const disasterRecoveryStartGraph: SimGraph = {
  nodes: [client(), server('depot-east', 'East Coast Depot', 500, 160, { capacityRps: 100, baseMs: 30 }, 'us-east')],
  edges: [edge('client', 'depot-east')],
}

const ch4DisasterRecovery: Level = {
  id: 'ch4-disaster-recovery',
  chapterId: 'ch4',
  order: 6,
  title: 'One Depot, One Region',
  realConcept: 'Disaster recovery',
  analogyName: 'A hot backup site, in a region the storm can\'t reach',
  stages: [
    {
      kind: 'situation',
      title: 'The whole coast lost power',
      body: [
        'A storm just knocked out power across the entire region your East Coast Depot sits in — not one server, the whole facility, for hours. Every single order routes there and only there. There is nowhere else for any of it to go.',
      ],
    },
    {
      kind: 'teach',
      title: 'Disaster recovery',
      body: [
        '**Disaster recovery (DR)** is how a system regains access and functionality after an event that takes out an entire site — a natural disaster, a regional outage, anything bigger than one dead node. It relies on replicating data and processing to a second location, physically separated from whatever might take out the first one.',
        'Two numbers define a DR plan: **RTO** (Recovery Time Objective) — how long service is acceptably unavailable before you\'re in breach of your own promises — and **RPO** (Recovery Point Objective) — how much data loss, measured in time since the last recovery point, is acceptable. A tighter RTO or RPO costs more to achieve.',
        'A **hot site** keeps a live, up-to-date standby running at all times — fast failover, expensive to run continuously. A **cold site** has the bare infrastructure ready but nothing actively running — cheap, but slow to bring up. The trade is always speed of recovery against cost of standing readiness.',
      ],
      readmeQuote: {
        text: 'Disaster recovery relies upon the replication of data and computer processing in an off-premises location not affected by the disaster.',
        source: 'Chapter IV · Disaster recovery',
      },
      realWorldExamples: ['Multi-region cloud deployments with an active standby in a separate availability region', 'Financial systems required to prove a tested RTO/RPO to regulators'],
      check: {
        question: 'What specifically does RTO (Recovery Time Objective) measure?',
        options: [
          { id: 'a', label: 'The maximum acceptable delay between an outage starting and service being restored', correct: true, feedback: 'Right — RTO is about downtime duration specifically.' },
          { id: 'b', label: 'The maximum acceptable amount of data lost since the last backup', correct: false, feedback: "That's RPO — RTO is about how long you're down, not how much data you lose." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Give the storm somewhere it can\'t reach',
      brief: [
        'One region, one depot, one storm away from a total outage. Add a standby depot somewhere the same storm can\'t touch, and make sure traffic actually finds it when the primary goes dark.',
      ],
      startingGraph: disasterRecoveryStartGraph,
      unlockedKinds: ['client', 'loadBalancer', 'server'],
      lockedNodeIds: ['depot-east'],
      workload: { durationMs: 2000, tickMs: 250, trafficCurve: constantTraffic(40) },
      incidents: [{ id: 'storm', label: 'Regional power outage, us-east', startMs: 0, endMs: 2000, killRegionIds: ['us-east'] }],
      slo: { maxErrorRate: 0.1, minAvailability: 0.995 },
      guidedSteps: [
        { instruction: 'Delete the wire between Customers and the East Coast Depot.' },
        { instruction: 'Drag a Dispatcher onto the map and connect Customers → it.' },
        { instruction: 'Connect the Dispatcher → East Coast Depot.' },
        { instruction: 'Drag a second Depot onto the map and connect the Dispatcher → it too.' },
        { instruction: 'Turn on health-aware routing on the Dispatcher.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          "The entire us-east region went dark for the whole run — same as before. The difference is that the East Coast Depot was never the only place orders could go. Once the Dispatcher could see it was unreachable, every order failed over to the standby depot instead — a depot the storm never touched, because it was never part of the affected region to begin with.",
          "This is disaster recovery in its simplest working form: a second site, genuinely outside the blast radius of whatever takes out the first one, plus routing that actually knows to use it. Miss any one piece — no second site, a second site the same disaster could also reach, or a dispatcher that can't tell who's alive — and you're back to a single point of failure with extra steps.",
        ],
        failureBody: [
          'Make sure there\'s a second depot wired in alongside the original (not replacing it), and health-aware routing is switched on — a dispatcher that can\'t detect failures won\'t fail over at all, no matter how many depots it\'s wired to.',
        ],
        readmeQuote: {
          text: 'A hot site maintains up-to-date copies of data at all times. Hot sites are time-consuming to set up and more expensive than cold sites, but they dramatically reduce downtime.',
          source: 'Chapter IV · Disaster recovery (Strategies)',
        },
        realWorldExamples: ['AWS multi-region active-active deployments for services with a near-zero RTO requirement'],
        interviewPhrase: '"A single-region deployment isn\'t a disaster recovery plan — I\'d want a genuinely separate-region standby plus health-aware failover, sized against an actual RTO/RPO target, not just \'we have a backup somewhere.\'"',
        ruleOfThumb: 'A backup site only helps if it\'s outside the blast radius of whatever takes out the primary, and something actually knows to route to it.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the key structural difference between a hot site and a cold site?',
      options: [
        { id: 'a', label: 'A hot site keeps live, up-to-date copies running continuously; a cold site only has basic infrastructure ready, not actively running', correct: true, feedback: 'Right — that\'s the speed-vs-cost trade the README describes.' },
        { id: 'b', label: 'A cold site is only used for read traffic, a hot site only for write traffic', correct: false, feedback: "That's not the distinction — it's about how actively the standby site is kept ready, not what traffic type it serves." },
      ],
    },
    {
      id: 'q2',
      question: 'What does RPO (Recovery Point Objective) measure, per the README?',
      options: [
        { id: 'a', label: 'The maximum acceptable amount of data loss, measured as time since the last recovery point', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'The maximum number of regions a system must be deployed across', correct: false, feedback: "RPO is about acceptable data loss over time, not a count of deployment regions." },
      ],
    },
  ],
}

const [
  geohashingQuadtrees,
  slaSloSli,
  vmsContainers,
  oauthOidc,
  sso,
  tlsMtls,
] = CHAPTER_4_EXTRA_LEVELS

export const CHAPTER_4: Chapter = {
  id: 'ch4',
  order: 4,
  title: 'Chapter IV · Operations & Security',
  subtitle: 'Keeping the system alive under pressure, and keeping the wrong people out',
  levelIds: [
    geohashingQuadtrees.id,
    ch4CircuitBreaker.id,
    ch4RateLimiting.id,
    ch4ServiceDiscovery.id,
    slaSloSli.id,
    ch4DisasterRecovery.id,
    vmsContainers.id,
    oauthOidc.id,
    sso.id,
    tlsMtls.id,
  ],
}

export const CHAPTER_4_LEVELS: Level[] = [
  geohashingQuadtrees,
  ch4CircuitBreaker,
  ch4RateLimiting,
  ch4ServiceDiscovery,
  slaSloSli,
  ch4DisasterRecovery,
  vmsContainers,
  oauthOidc,
  sso,
  tlsMtls,
]
