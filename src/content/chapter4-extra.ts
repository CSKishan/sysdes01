// Chapter IV extension -- the teach-only and interactive-walkthrough topics
// from the source README's Chapter IV that don't get a dedicated build
// (Geohashing and Quadtrees, SLA/SLO/SLI, VMs and Containers, OAuth 2.0 and
// OIDC, SSO, SSL/TLS/mTLS). The security topics reuse SequenceDiagram (built
// in Phase 5 for REST/GraphQL/gRPC and long polling/WebSockets/SSE) to show
// the canonical flow, and ComprehensionCheck's existing question/options
// shape to ask a "spot the vulnerability" question about it -- these are
// handshake sequences, not topologies, so there's nothing to build/run.

import type { Level } from './types'

// ---------------------------------------------------------------------------
// Geohashing and Quadtrees
// ---------------------------------------------------------------------------

const ch4GeohashingQuadtrees: Level = {
  id: 'ch4-geohashing-quadtrees',
  chapterId: 'ch4',
  order: 1,
  title: 'Finding the Nearest Courier',
  realConcept: 'Geohashing and Quadtrees',
  analogyName: 'Carving the map into finer and finer boxes',
  stages: [
    {
      kind: 'situation',
      title: 'Comparing everyone to everyone',
      body: [
        "A customer needs a courier, right now, whoever's actually closest. Naively, that means computing the exact distance from every courier in the city to this one pickup point and sorting the results -- for one request. At real volume, that's an enormous amount of throwaway math for a question that's fundamentally about *location*, not exact distance.",
      ],
    },
    {
      kind: 'teach',
      title: 'Geohashing and Quadtrees',
      body: [
        '**Geohashing** encodes a latitude/longitude pair into a short string, built by recursively dividing the world into smaller cells. Crucially, two geohashes that share a longer prefix are guaranteed to be spatially closer -- so "is this courier near this pickup" becomes a cheap string-prefix comparison instead of a distance calculation, and it doubles as a compact, shareable way to store or transmit a location.',
        'A **quadtree** takes a different angle on the same problem: a tree where each node covers a square region, and any node holding more points than some threshold splits into four equal quadrants, recursively. The result adapts to where points actually are -- dense clusters end up finely subdivided, empty space stays one large cell -- which is exactly what makes range queries ("who\'s within this box") fast: most of the map gets ruled out by checking one big cell instead of scanning every point in it.',
        'Try the demo below: regenerate the points and watch the boundaries redraw themselves around wherever the new cluster landed.',
      ],
      spatialVisualizer: 'quadtree',
      readmeQuote: {
        text: 'A quadtree is a tree data structure in which each internal node has exactly four children. They are often used to partition a two-dimensional space by recursively subdividing it into four quadrants or regions.',
        source: 'Chapter IV · Geohashing and Quadtrees (Quadtrees)',
      },
      realWorldExamples: ['Redis and MySQL both support geohash-based geo-indexing directly', 'Uber and Google Maps use spatial indexing structures like this for nearest-driver / nearest-place queries'],
      check: {
        question: 'Why does a quadtree only subdivide a cell once it holds more than some threshold of points, instead of subdividing every cell all the way down unconditionally?',
        options: [
          { id: 'a', label: 'Subdividing only where points actually cluster saves computation -- empty regions stay as one large, cheap-to-check cell', correct: true, feedback: "Right — that's exactly the payoff the README calls out: saving computation by only subdividing after a threshold." },
          { id: 'b', label: 'Because a quadtree is physically incapable of subdividing more than a fixed number of times', correct: false, feedback: 'There\'s no hard structural limit like that — it\'s a deliberate efficiency choice, not a constraint of the data structure.' },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What does it mean that two geohash strings share a long common prefix?',
      options: [
        { id: 'a', label: 'The two locations are spatially close to each other', correct: true, feedback: 'Right — shared prefix length directly reflects spatial closeness.' },
        { id: 'b', label: 'The two locations were geocoded at exactly the same point in time', correct: false, feedback: "Geohash prefixes encode spatial proximity, not anything about timing." },
      ],
    },
    {
      id: 'q2',
      question: 'Which of these is a listed use case for quadtrees, per the README?',
      options: [
        { id: 'a', label: 'Location-based services like Google Maps or Uber, and image representation/compression', correct: true, feedback: 'Right — straight from the listed use cases.' },
        { id: 'b', label: 'Storing user passwords securely', correct: false, feedback: "Quadtrees are a spatial indexing structure — password storage isn't one of their use cases." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// SLA, SLO, SLI
// ---------------------------------------------------------------------------

const ch4SlaSloSli: Level = {
  id: 'ch4-sla-slo-sli',
  chapterId: 'ch4',
  order: 5,
  title: 'The Promise Behind the Promise',
  realConcept: 'SLA, SLO, SLI',
  analogyName: 'A stricter internal target than what customers actually see',
  stages: [
    {
      kind: 'situation',
      title: 'Two different numbers, on purpose',
      body: [
        'Leadership wants to publicly promise customers 99.9% uptime. Engineering privately targets 99.95% internally -- a *stricter* number than the public promise. That gap isn\'t a mistake. It\'s deliberate breathing room, so the team finds out they\'re at risk of breaking their promise before a customer ever notices.',
      ],
    },
    {
      kind: 'teach',
      title: 'SLA, SLO, and SLI',
      body: [
        'An **SLI** (Service Level Indicator) is a measured number -- error rate, p99 latency, whatever you actually track. An **SLO** (Service Level Objective) is the internal target for an SLI -- "error rate ≤ 0.1%." An **SLA** (Service Level Agreement) is an SLO with consequences attached: a contractual promise made to customers, usually looser than the internal SLO, so the team breaches its own goal before it ever breaches the customer-facing one.',
        'The gap between "always available" and your SLO target is your **error budget** -- a 99.9% SLO leaves a 0.1% budget for things to go wrong before you\'ve broken your own promise. **Burn rate** is how fast you\'re spending that budget: 1.0x means spending it at exactly the sustainable pace; 2.0x means you\'ll exhaust it in half the time.',
        'You\'ve actually been looking at burn rate the entire campaign without the vocabulary for it -- every debrief screen\'s scorecard shows each check\'s ratio against its target as an "×budget" bar. That bar *is* a burn rate: under 1x means comfortably within budget, over 1x means burning it faster than sustainable.',
      ],
      readmeQuote: {
        text: 'An SLO, or Service Level Objective, is the promise that a company makes to users regarding a specific metric such as incident response or uptime... The SLO is the specific goal that the service must meet in order to comply with the SLA.',
        source: 'Chapter IV · SLA, SLO, SLI',
      },
      realWorldExamples: ['Google\'s public Site Reliability Engineering (SRE) book, which popularized error budgets as a concept', 'A cloud provider\'s public SLA credits vs. its internal, stricter reliability targets'],
      check: {
        question: 'Why is an SLO typically set stricter (harder to meet) than the SLA made to customers?',
        options: [
          { id: 'a', label: 'So the team finds out it\'s at risk of breaking its promise to customers before that promise is actually broken', correct: true, feedback: 'Right — the gap between SLO and SLA is deliberate early-warning room.' },
          { id: 'b', label: 'Because SLAs and SLOs are required by law to be different values', correct: false, feedback: "There's no legal requirement here — the gap is a deliberate operational choice, not a regulatory one." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which of SLA, SLO, and SLI is typically written by a company\'s business or legal team, per the README?',
      options: [
        { id: 'a', label: 'The SLA', correct: true, feedback: 'Right — the README calls this out specifically.' },
        { id: 'b', label: 'The SLI', correct: false, feedback: "An SLI is just a measured metric — it's the SLA that carries the legal/business weight." },
      ],
    },
    {
      id: 'q2',
      question: 'What does a "burn rate" of 2.0x mean?',
      options: [
        { id: 'a', label: 'The error budget is being consumed twice as fast as sustainable, exhausting it in half the intended time', correct: true, feedback: 'Right — burn rate is speed of consumption relative to sustainable, not an absolute count.' },
        { id: 'b', label: 'The service has already used exactly 2% of its error budget', correct: false, feedback: "Burn rate is a rate (how fast you're spending), not a fixed percentage already consumed." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Virtual Machines (VMs) and Containers
// ---------------------------------------------------------------------------

const ch4VmsContainers: Level = {
  id: 'ch4-vms-containers',
  chapterId: 'ch4',
  order: 7,
  title: 'One Box, Many Depots',
  realConcept: 'Virtual Machines and Containers',
  analogyName: 'A shared building vs. separate buildings that look shared',
  stages: [
    {
      kind: 'situation',
      title: 'One physical machine, several workloads',
      body: [
        'You\'ve got one physical server and several pieces of software that need to run on it, isolated from each other so a bug in one can\'t take down another. There are two very different ways to get that isolation.',
      ],
    },
    {
      kind: 'teach',
      title: 'Virtual Machines and Containers',
      body: [
        'A **Virtual Machine (VM)** is a full virtual computer -- its own CPU, memory, network interface, and storage -- created on physical hardware by a **hypervisor**, which carves up the real hardware\'s resources and hands each VM its share. Each VM runs a complete guest operating system of its own. That\'s real, strong isolation, but it\'s heavy: every VM pays the cost of a whole separate OS.',
        'A **container** packages an application with only its own dependencies -- no separate OS. Containers share the host machine\'s OS kernel, which is exactly what makes them far lighter than VMs: faster to start, less memory overhead, and portable across any environment with a compatible kernel.',
        'The trade-off is isolation strength versus overhead. VMs isolate more completely (separate kernels) at a heavier resource cost; containers are lighter and faster but share a kernel, which is a smaller, though real, isolation boundary.',
      ],
      diagram: {
        steps: [
          { icon: '🖥️', label: 'Physical hardware' },
          { icon: '🧱', label: 'Hypervisor / host OS' },
          { icon: '📦', label: 'VM (own OS) or container (shared kernel)' },
        ],
      },
      readmeQuote: {
        text: 'Instead of virtualizing the underlying hardware, containers virtualize the operating system so each container contains only the application and its dependencies making them much more lightweight than VMs. Containers also share the OS kernel.',
        source: 'Chapter IV · Virtual Machines (VMs) and Containers',
      },
      realWorldExamples: ['VMware and AWS EC2 instances as classic VM-based isolation', 'Docker and Kubernetes as the standard container tooling'],
      check: {
        question: 'What specifically makes containers lighter-weight than virtual machines?',
        options: [
          { id: 'a', label: 'Containers share the host\'s OS kernel instead of each running a full separate guest OS', correct: true, feedback: 'Right — no duplicated OS per workload is exactly why containers start faster and use less memory.' },
          { id: 'b', label: 'Containers don\'t run on physical hardware at all', correct: false, feedback: "Containers still ultimately run on physical hardware, same as VMs — the difference is the isolation layer, not the hardware underneath." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is a Hypervisor\'s job, per the README?',
      options: [
        { id: 'a', label: 'It isolates the OS and resources from virtual machines and enables the creation/management of those VMs', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'It compiles application source code before deployment', correct: false, feedback: "A hypervisor manages virtualized hardware resources — it has nothing to do with compiling code." },
      ],
    },
    {
      id: 'q2',
      question: 'What is server consolidation, as a reason to use VMs, per the README?',
      options: [
        { id: 'a', label: 'Placing many virtual servers onto each physical server to improve hardware utilization, avoiding extra physical purchases', correct: true, feedback: 'Right — that efficiency gain is the top reason the README gives for using VMs.' },
        { id: 'b', label: 'Merging multiple companies\' physical data centers into one shared building', correct: false, feedback: "Server consolidation here is about utilization of existing hardware via virtualization, not a real-estate/organizational merger." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// OAuth 2.0 and OpenID Connect (OIDC)
// ---------------------------------------------------------------------------

const ch4OauthOidc: Level = {
  id: 'ch4-oauth-oidc',
  chapterId: 'ch4',
  order: 8,
  title: 'Access, Not Your Password',
  realConcept: 'OAuth 2.0 and OpenID Connect (OIDC)',
  analogyName: 'A valet key that only opens the trunk',
  stages: [
    {
      kind: 'situation',
      title: 'A third party wants to see order history',
      body: [
        'A budgeting app wants to read a customer\'s Packet & Post order history, to help them track shipping spend. Handing the app the customer\'s actual username and password would be a disaster the moment that app gets breached — it would need a way to get *just* that one piece of access, without ever seeing the real credentials at all.',
      ],
    },
    {
      kind: 'teach',
      title: 'OAuth 2.0 and OpenID Connect',
      body: [
        '**OAuth 2.0** is an *authorization* protocol, not an authentication one -- it grants a **Client** (the budgeting app) limited access to resources on a **Resource Server** (Packet & Post\'s order API), on behalf of a **Resource Owner** (the customer), without the client ever seeing the owner\'s actual credentials. The **Authorization Server** issues a scoped **Access Token** after the resource owner explicitly consents -- and that scope can be as narrow as "read order history," nothing more.',
        'The standard flow: the client asks the Authorization Server for access, the resource owner approves, the Authorization Server redirects back with an authorization code, and the client exchanges that code for an access token it can then present to the Resource Server.',
        '**OpenID Connect (OIDC)** is a thin identity layer on top of OAuth 2.0 -- OAuth alone only grants access to resources, it says nothing about *who* is logged in. OIDC adds that: an Authorization Server that supports it is called an **Identity Provider**, and it returns identity information as a JSON Web Token (JWT) instead of just an opaque access token.',
      ],
      sequenceDiagram: {
        steps: [
          { direction: 'clientToServer', label: 'Client requests authorization, with scope + redirect URI' },
          { direction: 'serverToClient', label: 'Resource Owner is prompted to approve access' },
          { direction: 'serverToClient', label: 'Authorization Server redirects back with an authorization code' },
          { direction: 'clientToServer', label: 'Client exchanges the code for an access token' },
          { direction: 'clientToServer', label: 'Client calls the Resource Server, presenting the access token' },
        ],
        caption: 'The client never sees the resource owner\'s actual credentials at any point in this exchange.',
      },
      readmeQuote: {
        text: 'OAuth 2.0, which stands for Open Authorization, is a standard designed to provide consented access to resources on behalf of the user, without ever sharing the user\'s credentials.',
        source: 'Chapter IV · OAuth 2.0 and OpenID Connect (OIDC)',
      },
      realWorldExamples: ['"Sign in with Google" and similar third-party login buttons', 'A budgeting app connecting to a bank via Plaid, using OAuth-scoped read access'],
      check: {
        question: 'Suppose the flow above were changed so the Authorization Server returned the access token directly in the browser\'s URL, instead of a code the client exchanges server-side for a token (the older "implicit grant" approach). What specifically makes that riskier?',
        options: [
          { id: 'a', label: 'A token sitting in a URL can end up in browser history, server access logs, and the Referer header of any page it links to next', correct: true, feedback: 'Right — that\'s exactly why the industry moved away from the implicit grant toward the authorization-code-plus-exchange pattern.' },
          { id: 'b', label: 'It isn\'t actually riskier — URLs and server-side exchanges are equally secure ways to hand over a token', correct: false, feedback: "It is meaningfully riskier — a URL is far more exposed (logs, history, referrers) than a value that only ever travels in a direct server-to-server exchange." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What entity does OpenID Connect (OIDC) add on top of plain OAuth 2.0?',
      options: [
        { id: 'a', label: 'An Identity Provider, returning identity information as a JSON Web Token (JWT)', correct: true, feedback: 'Right — that\'s the identity layer OIDC adds on top of OAuth\'s pure authorization.' },
        { id: 'b', label: 'A second, entirely separate Resource Server dedicated only to OIDC traffic', correct: false, feedback: "OIDC doesn't require a separate resource server — it adds identity information to the existing OAuth flow." },
      ],
    },
    {
      id: 'q2',
      question: 'Is OAuth 2.0 an authentication protocol or an authorization protocol, per the README?',
      options: [
        { id: 'a', label: 'Authorization — it\'s designed to grant access to resources, not to establish who someone is', correct: true, feedback: 'Right, verbatim from the README\'s own distinction.' },
        { id: 'b', label: 'Authentication — its entire purpose is confirming a user\'s identity', correct: false, feedback: "That's OIDC's job, layered on top — plain OAuth 2.0 is explicitly about authorization, not identity." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Single Sign-On (SSO)
// ---------------------------------------------------------------------------

const ch4Sso: Level = {
  id: 'ch4-sso',
  chapterId: 'ch4',
  order: 9,
  title: 'One Login, Every Depot Tool',
  realConcept: 'Single Sign-On (SSO)',
  analogyName: 'One badge that opens every door',
  stages: [
    {
      kind: 'situation',
      title: 'Eight tools, eight passwords',
      body: [
        'Every dispatcher on staff needs the routing tool, the inventory tool, the payroll tool, and five more besides -- each with its own separate login. New hires take a full day just getting all eight accounts set up, and half the team keeps their passwords on a sticky note because there are simply too many to remember.',
      ],
    },
    {
      kind: 'teach',
      title: 'Single Sign-On (SSO)',
      body: [
        '**Single Sign-On (SSO)** lets a user log in once and gain access to multiple applications, instead of authenticating separately with each one. A centralized **Identity Provider (IdP)** stores and manages user identities and authenticates on behalf of every connected application; each application is a **Service Provider**, trusting the IdP\'s word instead of running its own login.',
        'The flow: a user requests a resource from some application; the application redirects them to the IdP; the user authenticates once there; the IdP sends a signed SSO response back to the application; the application grants access based on that response.',
        '**SAML** (Security Assertion Markup Language) is one standard way to carry that signed assertion, popular in enterprise settings; OAuth 2.0/OIDC increasingly cover the same ground for modern web and mobile apps. Either way, the core risk SSO introduces is concentration: if the one IdP credential is compromised, every connected application is compromised with it.',
      ],
      sequenceDiagram: {
        steps: [
          { direction: 'clientToServer', label: 'User requests a resource from the application' },
          { direction: 'serverToClient', label: 'Application redirects the user to the Identity Provider' },
          { direction: 'clientToServer', label: 'User authenticates once with the Identity Provider', wait: true },
          { direction: 'serverToClient', label: 'Identity Provider sends a signed SSO response back to the application' },
          { direction: 'serverToClient', label: 'Application grants access' },
        ],
        caption: 'One authentication with the IdP, trusted by every connected application from then on.',
      },
      readmeQuote: {
        text: 'Single Sign-On (SSO) is an authentication process in which a user is provided access to multiple applications or websites by using only a single set of login credentials.',
        source: 'Chapter IV · Single Sign-On (SSO)',
      },
      realWorldExamples: ['Okta and Auth0 as commercial Identity Providers', '"Sign in with your company Google Workspace account" across internal tools'],
      check: {
        question: 'Suppose the application (Service Provider) accepted the SSO response above without verifying the Identity Provider\'s signature on it. What specifically goes wrong?',
        options: [
          { id: 'a', label: 'Anyone could forge a fake SSO response and impersonate any user, since nothing confirms it genuinely came from the trusted Identity Provider', correct: true, feedback: 'Right — the signature is exactly what proves the assertion is authentic and untampered, coming from the IdP the Service Provider actually trusts.' },
          { id: 'b', label: 'Nothing meaningful — the redirect step alone is already sufficient proof of identity', correct: false, feedback: "A redirect proves nothing about who ends up sending the response — skipping signature verification means accepting an assertion from anyone, not just the real IdP." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the single biggest disadvantage of SSO, per the README?',
      options: [
        { id: 'a', label: 'Single Password Vulnerability — if the main SSO credential is compromised, every connected application is compromised too', correct: true, feedback: 'Right — concentrating access into one credential is SSO\'s core risk.' },
        { id: 'b', label: 'It makes it impossible to add a new connected application later', correct: false, feedback: "Adding new Service Providers to an existing SSO setup is routine — that's not a listed disadvantage." },
      ],
    },
    {
      id: 'q2',
      question: 'What role does an Identity Broker play, per the README?',
      options: [
        { id: 'a', label: 'An intermediary connecting multiple Service Providers with various different Identity Providers', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'It replaces the need for any Identity Provider entirely', correct: false, feedback: "A broker connects to IdPs, it doesn't eliminate the need for them." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// SSL, TLS, mTLS
// ---------------------------------------------------------------------------

const ch4TlsMtls: Level = {
  id: 'ch4-tls-mtls',
  chapterId: 'ch4',
  order: 10,
  title: 'Trusting the Depot on the Other End',
  realConcept: 'SSL, TLS, mTLS',
  analogyName: 'A sealed envelope, checked at both ends',
  stages: [
    {
      kind: 'situation',
      title: 'Payment details, in transit',
      body: [
        'A customer\'s payment details travel from their browser to the checkout server on every order. Sent as plain text, anyone positioned between the two -- a compromised Wi-Fi hotspot, a malicious router -- could simply read it, or worse, quietly alter it in transit.',
      ],
    },
    {
      kind: 'teach',
      title: 'SSL, TLS, and mTLS',
      body: [
        '**TLS** (Transport Layer Security) is the modern protocol that secures internet communication — the successor to the now-deprecated **SSL** (Secure Sockets Layer), whose name still lingers because certificate providers never renamed their products. TLS accomplishes three things at once: **encryption** (hides the data from eavesdroppers), **authentication** (confirms the parties are who they claim to be), and **integrity** (proves the data wasn\'t tampered with in transit).',
        'In a normal TLS handshake, the *server* proves its identity to the client via a certificate — but the client stays anonymous to the server at the connection level. **mTLS** (mutual TLS) requires both sides to present and verify a certificate, so the server can also confirm exactly which client it\'s talking to before any data moves.',
        'mTLS shows up constantly in **zero trust** architectures and service-to-service communication inside a microservices backend — anywhere "on the same network" isn\'t considered proof enough that a caller is who it claims to be.',
      ],
      sequenceDiagram: {
        steps: [
          { direction: 'clientToServer', label: 'Client Hello -- proposes supported encryption options' },
          { direction: 'serverToClient', label: 'Server Hello, plus its certificate' },
          { direction: 'clientToServer', label: 'Client verifies the certificate, then agrees on a shared session key' },
          { direction: 'serverToClient', label: 'Encrypted session begins' },
        ],
        caption: 'A simplified TLS handshake -- the client verifies the server\'s certificate before any application data is exchanged.',
      },
      readmeQuote: {
        text: 'Mutual TLS, or mTLS, is a method for mutual authentication. mTLS ensures that the parties at each end of a network connection are who they claim to be by verifying that they both have the correct private key.',
        source: 'Chapter IV · SSL, TLS, mTLS (mTLS)',
      },
      realWorldExamples: ['Every HTTPS website, using standard (server-only) TLS', 'Istio and other service meshes enforcing mTLS between every internal service call'],
      check: {
        question: 'Suppose the client in the handshake above skipped verifying the server\'s certificate and just trusted whatever certificate was presented. What specifically could go wrong?',
        options: [
          { id: 'a', label: 'A man-in-the-middle could present its own certificate, and the client would establish an encrypted session with the attacker instead of the real server', correct: true, feedback: 'Right — encryption alone means nothing if you never confirmed *who* you\'re encrypting the conversation with.' },
          { id: 'b', label: 'Nothing — encryption alone is enough, regardless of whether the certificate is genuinely verified', correct: false, feedback: "That's exactly the trap: an unverified certificate can still produce a perfectly encrypted connection — just encrypted with the wrong, attacker-controlled party." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What are the three things TLS accomplishes, per the README?',
      options: [
        { id: 'a', label: 'Encryption, authentication, and integrity', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'Compression, caching, and load balancing', correct: false, feedback: "Those are unrelated concerns — TLS is specifically about encryption, authentication, and integrity." },
      ],
    },
    {
      id: 'q2',
      question: 'What is the key difference between plain TLS and mTLS?',
      options: [
        { id: 'a', label: 'Plain TLS only has the server prove its identity; mTLS requires both client and server to verify each other', correct: true, feedback: "Right — the \"mutual\" in mTLS is exactly that two-way verification." },
        { id: 'b', label: 'mTLS doesn\'t use encryption at all, only authentication', correct: false, feedback: "mTLS still encrypts the connection — it adds mutual authentication on top, it doesn't remove encryption." },
      ],
    },
  ],
}

export const CHAPTER_4_EXTRA_LEVELS: Level[] = [
  ch4GeohashingQuadtrees,
  ch4SlaSloSli,
  ch4VmsContainers,
  ch4OauthOidc,
  ch4Sso,
  ch4TlsMtls,
]
