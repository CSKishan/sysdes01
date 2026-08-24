// Chapter I extension -- the remaining topics from the source README's
// Chapter I that v0.1 didn't cover: IP, OSI, TCP/UDP, DNS, Clustering,
// Proxy, Storage (teach-only -- none of these have a natural traffic/cost
// mechanic), plus CDN and Availability (build stages: CDN reuses the
// existing cache engine under an "edge" framing, Availability is the
// first level to surface computeSystemAvailability end to end).

import type { Level } from './types'
import type { GraphNode, SimGraph } from '@/engine/types'
import { constantTraffic } from '@/engine/traffic'
import { client, edge } from './graphHelpers'

function server(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides: Partial<{ capacityRps: number; baseMs: number; costPerHour: number; availability: number }> = {},
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
      availability: overrides.availability,
    },
  }
}

// ---------------------------------------------------------------------------
// IP
// ---------------------------------------------------------------------------

const ch1NetIp: Level = {
  id: 'ch1-net-ip',
  chapterId: 'ch1',
  order: 6,
  title: 'The Address',
  realConcept: 'IP addresses',
  analogyName: "Every depot's street address",
  stages: [
    {
      kind: 'situation',
      title: 'Found, but not yet named',
      body: [
        'Every depot and every customer needs to be locatable on the network. Long before there is a friendly name like packetandpost.com, there is a number.',
      ],
    },
    {
      kind: 'teach',
      title: 'IP addresses',
      body: [
        'An **IP address** is a unique number that identifies a device on a network — the way a street address identifies a building. **IPv4** uses a 32-bit number, giving about 4 billion possible addresses. **IPv6** uses 128 bits — enough to number practically everything on Earth many times over.',
        'Addresses also come in flavors: **public** (one address shared by everyone behind your router), **private** (a unique address for each device inside your own network), **static** (never changes — used for servers), and **dynamic** (reassigned periodically — used for most home devices).',
      ],
      readmeQuote: {
        text: 'An IP address is a unique address that identifies a device on the internet or a local network... They contain location information and make devices accessible for communication.',
        source: 'Chapter I · IP',
      },
      realWorldExamples: ["Your router's public IP", "Your laptop's private IP on your home Wi-Fi"],
      check: {
        question: "You're hosting a server that must always be reachable at the exact same address. Which type of IP address do you want?",
        options: [
          { id: 'a', label: 'Static', correct: true, feedback: 'Right — static addresses never change, which is exactly what a server needs.' },
          { id: 'b', label: 'Dynamic', correct: false, feedback: "Dynamic addresses get reassigned periodically — bad for something that needs to stay put." },
          { id: 'c', label: 'Private', correct: false, feedback: "A private address alone isn't reachable from the wider internet." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Roughly how many addresses does IPv6 support compared to IPv4?',
      options: [
        { id: 'a', label: 'Vastly more — enough for practically every device on Earth many times over', correct: true, feedback: '128-bit addressing vs IPv4\'s 32-bit gives an astronomically larger space.' },
        { id: 'b', label: 'About the same', correct: false, feedback: 'Not close — IPv6 is a completely different scale.' },
        { id: 'c', label: 'Fewer, but more secure', correct: false, feedback: 'IPv6 has more addresses, not fewer.' },
      ],
    },
    {
      id: 'q2',
      question: 'A public IP address is best described as...',
      options: [
        { id: 'a', label: 'One address shared by an entire network, as seen from the outside internet', correct: true, feedback: 'Right — everything behind your router typically shares one public-facing address.' },
        { id: 'b', label: 'A unique address for every single device, even inside your home', correct: false, feedback: "That's what private addresses are for." },
        { id: 'c', label: 'An address that changes every few minutes', correct: false, feedback: "That's describing dynamic addressing, a separate concept from public/private." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// OSI Model
// ---------------------------------------------------------------------------

const ch1NetOsi: Level = {
  id: 'ch1-net-osi',
  chapterId: 'ch1',
  order: 7,
  title: 'Seven Hand-offs',
  realConcept: 'The OSI Model',
  analogyName: 'How a parcel actually moves',
  stages: [
    {
      kind: 'situation',
      title: "It's not one trip",
      body: [
        "A parcel doesn't teleport from your depot to a customer's door. It's boxed, labeled, driven, sorted, and delivered — several distinct hand-offs, each doing exactly one job and not caring how the others do theirs.",
      ],
    },
    {
      kind: 'teach',
      title: 'The OSI Model',
      body: [
        'The **OSI Model** splits network communication into seven layers, each stacked on the one below it, from **Physical** (the actual cables and electrical signals) up to **Application** (the software you interact with, like a browser).',
        'In between: **Data Link** (device-to-device on the same network), **Network** (routing between different networks — this is where IP lives), **Transport** (end-to-end delivery — TCP/UDP live here), **Session** (opening and closing a conversation), and **Presentation** (formatting/encryption). You don\'t need to memorize all seven — the useful habit is being able to ask "which layer is this problem actually in?" when something breaks.',
      ],
      diagram: {
        steps: [
          { icon: '🖥️', label: 'Application' },
          { icon: '🔀', label: 'Transport' },
          { icon: '🌐', label: 'Network' },
          { icon: '🔌', label: 'Physical' },
        ],
        caption: 'Four of the seven layers — each hands off to the one below it without needing to know how it works.',
      },
      readmeQuote: {
        text: "The OSI Model is a logical and conceptual model that defines network communication... It's based on the concept of splitting up a communication system into seven abstract layers, each one stacked upon the last.",
        source: 'Chapter I · OSI Model',
      },
      realWorldExamples: ['Diagnosing "is this a cabling issue or an application bug?" by layer', 'HTTP living at the Application layer, TCP at Transport'],
      check: {
        question: 'HTTP — the protocol your browser uses to load a page — belongs to which OSI layer?',
        options: [
          { id: 'a', label: 'Application', correct: true, feedback: "Right — HTTP is exactly the kind of software-facing protocol the Application layer is for." },
          { id: 'b', label: 'Physical', correct: false, feedback: 'Physical is cables and signals, several layers below HTTP.' },
          { id: 'c', label: 'Transport', correct: false, feedback: "That's TCP's layer — HTTP rides on top of TCP, one layer up." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which OSI layer is responsible for the actual cables and electrical signals?',
      options: [
        { id: 'a', label: 'Physical', correct: true, feedback: 'Right — the literal wires, switches, and signal encoding.' },
        { id: 'b', label: 'Session', correct: false, feedback: 'Session is about opening/closing a conversation, not the physical medium.' },
        { id: 'c', label: 'Presentation', correct: false, feedback: 'Presentation handles formatting and encryption, not physical transmission.' },
      ],
    },
    {
      id: 'q2',
      question: "What's the main practical benefit of thinking in OSI layers when something breaks?",
      options: [
        { id: 'a', label: 'It lets you isolate which layer a problem is actually coming from', correct: true, feedback: 'Exactly — "cabling issue vs application bug" is an OSI-layer question in disguise.' },
        { id: 'b', label: 'It makes network transmission physically faster', correct: false, feedback: "It's a conceptual model, not a performance optimization." },
        { id: 'c', label: 'It replaces the need for TCP/IP', correct: false, feedback: 'OSI is a conceptual reference model; TCP/IP is what actually runs the modern internet.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// TCP and UDP
// ---------------------------------------------------------------------------

const ch1NetTcpUdp: Level = {
  id: 'ch1-net-tcp-udp',
  chapterId: 'ch1',
  order: 8,
  title: 'Signed-For, or a Leaflet',
  realConcept: 'TCP and UDP',
  analogyName: 'Two ways to send something',
  stages: [
    {
      kind: 'situation',
      title: 'Two kinds of delivery',
      body: [
        'Some deliveries need a signature and an ironclad guarantee. Others are more like a leaflet through the door — drop it and move on, no big deal if a few never arrive.',
      ],
    },
    {
      kind: 'teach',
      title: 'TCP and UDP',
      body: [
        '**TCP** (Transmission Control Protocol) is connection-oriented and reliable: it guarantees delivery, in order, checking for errors — at the cost of extra overhead. **UDP** (User Datagram Protocol) skips all that ceremony: no handshake, no guarantee, just send — faster and lighter, but nothing promises it arrives.',
        "Rule of thumb: reach for TCP when correctness matters more than speed (web pages, file transfers, email). Reach for UDP when speed matters more than a few dropped pieces (live video, voice calls, DNS lookups).",
      ],
      readmeQuote: {
        text: 'TCP is instinctively reliable, its feedback mechanisms also result in a larger overhead... UDP... is largely preferred for real-time communications. We should use UDP over TCP when we need the lowest latency and late data is worse than the loss of data.',
        source: 'Chapter I · TCP and UDP',
      },
      realWorldExamples: ['HTTPS, email, file transfer → TCP', 'Video calls, live streaming, DNS → UDP'],
      check: {
        question: 'A live video call drops a tiny fraction of frames rather than pause and wait to redeliver them. Which protocol is it almost certainly using?',
        options: [
          { id: 'a', label: 'UDP', correct: true, feedback: 'Right — a late frame is worse than a missing one, the exact case UDP is built for.' },
          { id: 'b', label: 'TCP', correct: false, feedback: 'TCP would stall the whole stream to guarantee every frame arrives in order — not what a live call wants.' },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which protocol guarantees data arrives in the exact order it was sent?',
      options: [
        { id: 'a', label: 'TCP', correct: true, feedback: 'Right — ordered, reliable delivery is TCP\'s whole job.' },
        { id: 'b', label: 'UDP', correct: false, feedback: "UDP makes no ordering or delivery guarantees at all." },
      ],
    },
    {
      id: 'q2',
      question: 'Why does DNS typically use UDP rather than TCP for lookups?',
      options: [
        { id: 'a', label: 'A DNS query is small and needs to be fast; the low overhead of UDP outweighs occasionally needing to retry', correct: true, feedback: 'Right — small, latency-sensitive, easily-retried queries are a good UDP fit.' },
        { id: 'b', label: 'DNS lookups always contain large files that TCP can\'t handle', correct: false, feedback: 'DNS queries are tiny — that\'s part of why UDP suits them.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// DNS
// ---------------------------------------------------------------------------

const ch1NetDns: Level = {
  id: 'ch1-net-dns',
  chapterId: 'ch1',
  order: 9,
  title: "The Internet's Phonebook",
  realConcept: 'DNS',
  analogyName: 'packetandpost.com instead of a raw address',
  stages: [
    {
      kind: 'situation',
      title: 'Nobody wants to type an address',
      body: [
        "Nobody wants to type your depot's raw network address into a browser. They want to type packetandpost.com and have it just work.",
      ],
    },
    {
      kind: 'teach',
      title: 'DNS',
      body: [
        "**DNS** (Domain Name System) is the internet's phonebook: it translates human-friendly names into IP addresses. A lookup travels a chain — your **resolver** asks a **root server**, which points to a **TLD server** (the one for `.com`, `.org`, etc.), which points to the **authoritative server** that actually holds the answer.",
        'Once resolved, the answer gets cached for a while, governed by a **TTL** (time-to-live), so the whole chain doesn\'t have to be walked again for every single request.',
      ],
      diagram: {
        steps: [
          { icon: '🧭', label: 'Resolver' },
          { icon: '🏛️', label: 'Root' },
          { icon: '🏢', label: 'TLD (.com)' },
          { icon: '📇', label: 'Authoritative' },
        ],
        caption: 'Each stop hands you closer to the final answer — and the answer gets cached so this chain isn\'t walked every time.',
      },
      readmeQuote: {
        text: 'DNS...is a hierarchical and decentralized naming system used for translating human-readable domain names to IP addresses.',
        source: 'Chapter I · Domain Name System (DNS)',
      },
      realWorldExamples: ['Route53, Cloudflare DNS, Google Cloud DNS', 'The small delay the very first time you visit a brand-new site'],
      check: {
        question: 'In a fresh DNS lookup, which server does the resolver ask first?',
        options: [
          { id: 'a', label: 'A root server', correct: true, feedback: 'Right — the root server is the first stop, pointing the resolver toward the right TLD.' },
          { id: 'b', label: 'The authoritative server', correct: false, feedback: "That's the last stop, not the first." },
          { id: 'c', label: 'The TLD server', correct: false, feedback: "The TLD server is the second stop — the root points the resolver there first." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What does a DNS TTL actually control?',
      options: [
        { id: 'a', label: 'How long a resolved answer can be cached before it must be looked up again', correct: true, feedback: 'Right — TTL is the record\'s cache lifetime.' },
        { id: 'b', label: 'How many hops a packet can take before being dropped', correct: false, feedback: "That's a different TTL concept (IP packet time-to-live), not the DNS one." },
      ],
    },
    {
      id: 'q2',
      question: "Which DNS record type holds a domain's actual IPv4 address?",
      options: [
        { id: 'a', label: 'A record', correct: true, feedback: 'Right — "A" is short for Address record.' },
        { id: 'b', label: 'CNAME record', correct: false, feedback: 'CNAME is an alias to another domain name, not an IP address directly.' },
        { id: 'c', label: 'MX record', correct: false, feedback: 'MX records route mail, unrelated to resolving a website\'s address.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

const ch1Clustering: Level = {
  id: 'ch1-clustering',
  chapterId: 'ch1',
  order: 10,
  title: 'More Than Just Sharing the Load',
  realConcept: 'Clustering',
  analogyName: 'Depots that know about each other',
  stages: [
    {
      kind: 'situation',
      title: 'They know about each other',
      body: [
        "Remember the dispatcher and two depots you built a few levels back? They weren't just independently splitting traffic — in a well-run setup, the depots are actually aware of each other and coordinate. That combination has its own name.",
      ],
    },
    {
      kind: 'teach',
      title: 'Clustering',
      body: [
        'A **cluster** is a group of machines working together toward a common goal, aware of one another — different from plain load balancing, where the servers behind the dispatcher have no idea the others exist; they just each react to whatever requests arrive.',
        '**Active-active** clusters keep every node live, sharing the load — close to what you already built. **Active-passive** clusters keep one node doing all the work while a standby waits idle, only taking over if the active one fails.',
      ],
      readmeQuote: {
        text: 'Clustering provides redundancy and boosts capacity and availability. Servers in a cluster are aware of each other and work together toward a common purpose. But with load balancing, servers are not aware of each other. Instead, they react to the requests they receive from the load balancer.',
        source: 'Chapter I · Clustering',
      },
      realWorldExamples: ['Kubernetes node clusters', 'Database replica sets (MongoDB, Cassandra)'],
      check: {
        question: 'A standby depot sits completely idle, only stepping in if the main depot goes down. What\'s this configuration called?',
        options: [
          { id: 'a', label: 'Active-passive', correct: true, feedback: 'Right — one active node doing the work, one passive node waiting to take over.' },
          { id: 'b', label: 'Active-active', correct: false, feedback: "Active-active means both are live and sharing load, not one sitting idle." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: "What's the key difference between clustering and plain load balancing?",
      options: [
        { id: 'a', label: 'Cluster nodes are aware of each other and coordinate; load-balanced servers just independently react to whatever traffic arrives', correct: true, feedback: 'Right — awareness/coordination is the dividing line.' },
        { id: 'b', label: 'Clustering only works with exactly two servers', correct: false, feedback: 'Clusters can have any number of nodes.' },
      ],
    },
    {
      id: 'q2',
      question: 'Which clustering configuration maximizes throughput by keeping every node actively serving traffic?',
      options: [
        { id: 'a', label: 'Active-active', correct: true, feedback: 'Right — every node contributes capacity simultaneously.' },
        { id: 'b', label: 'Active-passive', correct: false, feedback: 'Active-passive leaves a standby node idle most of the time — good for failover, not extra throughput.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Proxy
// ---------------------------------------------------------------------------

const ch1Proxy: Level = {
  id: 'ch1-proxy',
  chapterId: 'ch1',
  order: 11,
  title: 'Someone Standing In Between',
  realConcept: 'Forward vs. reverse proxy',
  analogyName: 'Which side is being hidden?',
  stages: [
    {
      kind: 'situation',
      title: 'Wait, is that the same as your dispatcher?',
      body: [
        "Someone on your team points out that your dispatcher looks a lot like something called a \"reverse proxy.\" Are they the same thing?",
      ],
    },
    {
      kind: 'teach',
      title: 'Forward vs. reverse proxy',
      body: [
        'A **proxy** is simply a go-between that sits between a client and a server. A **forward proxy** sits in front of a group of *clients*, hiding them from the servers they talk to — used for anonymity, content filtering, or bypassing restrictions. A **reverse proxy** sits in front of a *server* (or servers), hiding it from clients — used for security, caching, SSL handling, and yes, load balancing.',
        'So is your dispatcher a reverse proxy? Sort of. A load balancer specifically earns its keep once you have *multiple* servers to split across. A reverse proxy is useful even with just *one* server, purely for the security/caching/SSL benefits. A reverse proxy can also load balance — but that\'s one feature among several, not its whole job.',
      ],
      readmeQuote: {
        text: 'A forward proxy sits in front of a client and ensures that no origin server ever communicates directly with that specific client. On the other hand, a reverse proxy sits in front of an origin server and ensures that no client ever communicates directly with that origin server.',
        source: 'Chapter I · Proxy',
      },
      realWorldExamples: ['A corporate VPN/proxy (forward)', 'Nginx or Cloudflare in front of a website (reverse)'],
      check: {
        question: "A company's proxy hides its employees' identities from the outside websites they browse. Forward or reverse?",
        options: [
          { id: 'a', label: 'Forward', correct: true, feedback: 'Right — it sits in front of the clients, hiding them from the servers.' },
          { id: 'b', label: 'Reverse', correct: false, feedback: 'A reverse proxy would be hiding a server from clients, not the other way around.' },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'True or false: a reverse proxy can be useful even with only one backend server, while a load balancer specifically needs multiple servers to be useful.',
      options: [
        { id: 'a', label: 'True', correct: true, feedback: "Right — caching, SSL termination, and security benefits from a reverse proxy don't require multiple backends." },
        { id: 'b', label: 'False', correct: false, feedback: "It's true — a reverse proxy earns its keep with a single server too." },
      ],
    },
    {
      id: 'q2',
      question: 'Which of these is a forward-proxy benefit, not a reverse-proxy one?',
      options: [
        { id: 'a', label: 'Hiding a client\'s identity from the sites it visits', correct: true, feedback: 'Right — that\'s specifically a forward proxy\'s job.' },
        { id: 'b', label: 'SSL termination for a website', correct: false, feedback: "That's a reverse-proxy benefit." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Storage (RAID)
// ---------------------------------------------------------------------------

const ch1Storage: Level = {
  id: 'ch1-net-storage',
  chapterId: 'ch1',
  order: 12,
  title: 'When a Disk Just Dies',
  realConcept: 'Storage & RAID',
  analogyName: "The depot's paper records",
  stages: [
    {
      kind: 'situation',
      title: 'A disk failed overnight',
      body: [
        'Your depots keep records — order history, price lists — on physical disks. Overnight, one just dies. How much do you actually lose?',
      ],
    },
    {
      kind: 'teach',
      title: 'RAID and storage types',
      body: [
        '**RAID** (Redundant Array of Independent Disks) spreads or duplicates data across multiple disks so a single drive failure doesn\'t mean data loss. **RAID 0** (striping) splits data across disks for speed, with zero redundancy — one disk dies, everything on it is gone. **RAID 1** (mirroring) keeps a full duplicate on a second disk. **RAID 5/6** stripe data *with* parity information, tolerating one (RAID 5) or two (RAID 6) drive failures. **RAID 10** combines striping and mirroring for both speed and safety.',
        'Beyond RAID, storage itself comes in shapes: **file storage** (folders and paths, like a shared drive), **block storage** (raw chunks a system assembles itself, like a hard disk), and **object storage** (a flat pool of objects with metadata, like Amazon S3) — picked based on whether you need a filesystem, raw performance, or massive flat-scale storage.',
      ],
      readmeQuote: {
        text: 'RAID (Redundant Array of Independent Disks) is a way of storing the same data on multiple hard disks or solid-state drives (SSDs) to protect data in the case of a drive failure.',
        source: 'Chapter I · Storage',
      },
      realWorldExamples: ["RAID 1 for a database's critical volume", 'Amazon S3 (object storage), Amazon EBS (block storage)'],
      check: {
        question: 'Which RAID level provides zero redundancy — a single disk failure loses everything striped across the array?',
        options: [
          { id: 'a', label: 'RAID 0', correct: true, feedback: 'Right — striping alone, no duplication or parity, means no safety net.' },
          { id: 'b', label: 'RAID 1', correct: false, feedback: "RAID 1 mirrors data — a full duplicate survives a single disk failure." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Amazon S3 stores everything as a flat pool of objects with metadata, rather than a folder structure. What storage type is this?',
      options: [
        { id: 'a', label: 'Object storage', correct: true, feedback: 'Right — the defining trait of object storage.' },
        { id: 'b', label: 'Block storage', correct: false, feedback: 'Block storage deals in raw chunks a system assembles itself, closer to how a hard disk works.' },
      ],
    },
    {
      id: 'q2',
      question: 'Which RAID level duplicates all data onto a second disk?',
      options: [
        { id: 'a', label: 'RAID 1 (mirroring)', correct: true, feedback: 'Right — a full, exact copy on a second disk.' },
        { id: 'b', label: 'RAID 0 (striping)', correct: false, feedback: 'Striping splits data for speed, with no duplication.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// CDN (build stage -- reuses the cache engine at "edge" scale)
// ---------------------------------------------------------------------------

const cdnStartGraph: SimGraph = {
  nodes: [client(), server('distant-depot', 'Distant Depot', 480, 160, { capacityRps: 100, baseMs: 300 })],
  edges: [],
}

const ch1Cdn: Level = {
  id: 'ch1-cdn',
  chapterId: 'ch1',
  order: 13,
  title: 'The Pickup Locker',
  realConcept: 'Content Delivery Network (CDN)',
  analogyName: 'A shelf, but at the edge of the network',
  stages: [
    {
      kind: 'situation',
      title: "It's not overloaded, it's just far",
      body: [
        "A customer on the other side of the country waits nearly a second just to see your price list load. Your depot isn't overloaded — check the dashboard, plenty of headroom. It's just physically far away.",
      ],
    },
    {
      kind: 'teach',
      title: 'CDN — a shelf at the edge',
      body: [
        'A **Content Delivery Network (CDN)** is a network of servers spread across many locations, each holding a cached copy of your static content close to wherever the customer actually is — cutting the physical distance data has to travel.',
        'A **push CDN** is pre-stocked by you ahead of time. A **pull CDN** fetches and caches content the first time someone nearby requests it, then reuses that copy for everyone in the area afterward. This is exactly the shelf mechanics you already know from caching — just placed at the edge of the network instead of in front of one depot.',
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Faraway customer' },
          { icon: '📍', label: 'Pickup locker (edge)' },
          { icon: '🏬', label: 'Origin depot' },
        ],
        caption: 'Most requests get resolved right at the nearby locker — only misses make the long trip to the origin.',
      },
      readmeQuote: {
        text: 'A content delivery network (CDN) is a geographically distributed group of servers that work together to provide fast delivery of internet content... To minimize the distance between the visitors and the website\'s server, a CDN stores a cached version of its content in multiple geographical locations known as edge locations.',
        source: 'Chapter I · Content Delivery Network (CDN)',
      },
      realWorldExamples: ['Amazon CloudFront, Cloudflare CDN, Fastly'],
      check: {
        question: 'A CDN fetches and caches a file the first time someone in a region requests it, then reuses that copy for everyone nearby afterward. Push or pull?',
        options: [
          { id: 'a', label: 'Pull', correct: true, feedback: 'Right — the CDN pulls content in on first request rather than being pre-stocked.' },
          { id: 'b', label: 'Push', correct: false, feedback: "Push means you pre-stock the CDN ahead of time — this is fetch-on-demand instead." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Put a locker near them',
      brief: ['The origin depot is fine — it\'s the 300ms of physical distance that\'s slow. Add a pickup locker between customers and the distant depot.'],
      startingGraph: cdnStartGraph,
      unlockedKinds: ['client', 'server', 'cache'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(40) },
      slo: { maxP99Ms: 340, maxErrorRate: 0, minThroughputRps: 35 },
      guidedSteps: [
        { instruction: 'Drag a Shelf onto the map, between Customers and the Distant Depot — think of it as the pickup locker.' },
        { instruction: 'Connect Customers → Shelf, then Shelf → Distant Depot.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          'Most requests now resolve right at the locker in a few milliseconds — only the unlucky misses make the full 300ms trip to the distant depot.',
          "This is the entire idea behind a CDN: the same caching mechanics you already know, just placed geographically close to the customer instead of logically close to one server.",
        ],
        failureBody: ['Make sure the Shelf sits between Customers and the Distant Depot, wired both directions.'],
        readmeQuote: {
          text: 'Content Delivery Network (CDN) increases content availability and redundancy while reducing bandwidth costs and improving security. Serving content from CDNs can significantly improve performance as users receive content from data centers close to them.',
          source: 'Chapter I · Content Delivery Network (CDN)',
        },
        realWorldExamples: ['Amazon CloudFront, Cloudflare CDN in front of static assets'],
        interviewPhrase: '"For a globally distributed user base, I\'d put a CDN in front of static content so most requests resolve at an edge location instead of crossing the whole network to the origin."',
        ruleOfThumb: 'A CDN is a cache — the only thing that changed is where it physically sits.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What specifically does a CDN reduce that a local cache in front of one server does not?',
      options: [
        { id: 'a', label: 'The physical distance data has to travel to reach a far-away customer', correct: true, feedback: "Right — that's the whole point of edge locations." },
        { id: 'b', label: 'The total amount of storage needed anywhere in the system', correct: false, feedback: 'A CDN typically uses *more* total storage (copies at many edges), not less.' },
      ],
    },
    {
      id: 'q2',
      question: 'Which of these is generally best served from a CDN?',
      options: [
        { id: 'a', label: 'Static assets like images, CSS, and JS files', correct: true, feedback: 'Right — content that\'s the same for everyone and doesn\'t change often.' },
        { id: 'b', label: "A user's real-time, personal account balance", correct: false, feedback: "That's dynamic, per-user data — a poor fit for a shared edge cache." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Availability (build stage -- surfaces computeSystemAvailability)
// ---------------------------------------------------------------------------

const availabilityStartGraph: SimGraph = {
  nodes: [client(), server('depot-1', 'Depot', 320, 160)],
  edges: [edge('client', 'depot-1')],
}

const ch1Availability: Level = {
  id: 'ch1-availability',
  chapterId: 'ch1',
  order: 14,
  title: 'The Contract',
  realConcept: 'Availability & the nines',
  analogyName: 'Promising the customer an uptime number',
  stages: [
    {
      kind: 'situation',
      title: 'You signed a contract',
      body: [
        'Packet & Post just signed a contract promising 99.8% uptime. Your current single-depot design — reliable most days, but not bulletproof — doesn\'t come close on paper.',
      ],
    },
    {
      kind: 'teach',
      title: 'Availability and the nines',
      body: [
        'Availability is usually expressed in **nines**: 99% ("two nines") allows about 3.65 days of downtime a year; 99.9% ("three nines") allows about 8.77 hours; 99.99% allows about 52.6 minutes. Each extra nine is a dramatically harder — and more expensive — promise to keep.',
        'The math depends entirely on how components are arranged. Components in **series** multiply their availabilities together — every additional link in the chain can only hurt you. Components in **parallel** (redundant — either one alone can serve traffic) combine as `1 − (1−A)×(1−B)` — redundancy can push you well past what either component alone could offer.',
      ],
      readmeQuote: {
        text: 'If availability is 99.00% available, it is said to have "2 nines" of availability, and if it is 99.9%, it is called "3 nines"... Overall availability increases when two components are in parallel.',
        source: 'Chapter I · Availability',
      },
      realWorldExamples: ['A single-region deployment vs. a multi-region failover setup', 'Redundant load balancers'],
      check: {
        question: 'Two depots, each individually 99% available, are set up as redundant backups for each other (either one alone can serve everyone). Is the combined availability higher or lower than 99%?',
        options: [
          { id: 'a', label: 'Higher', correct: true, feedback: 'Right — redundancy in parallel pushes availability up, since both would have to fail at once to cause an outage.' },
          { id: 'b', label: 'Lower', correct: false, feedback: "Redundancy helps, not hurts — the combined number is higher than either alone." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Hit the number',
      brief: [
        'One depot alone can\'t satisfy a 99.8% contract. First, select the wire straight from Customers to the Depot and delete it (click it, then press Backspace) — you\'ll route through a dispatcher instead. Then add a Dispatcher and a second Depot as a redundant backup, the same mechanics as "A Second Depot," optimizing for a new number on the dashboard this time: Availability.',
      ],
      startingGraph: availabilityStartGraph,
      unlockedKinds: ['client', 'server', 'loadBalancer'],
      lockedNodeIds: ['depot-1'],
      workload: { durationMs: 4000, tickMs: 250, trafficCurve: constantTraffic(20) },
      slo: { minAvailability: 0.998, minThroughputRps: 15 },
      debrief: {
        successBody: [
          'A single depot alone was capped at its own individual availability, however reliable it was. Two redundant depots behind a dispatcher pushed the combined number past the contract — because now both would have to fail at the same moment to cause an outage.',
          "Notice the dispatcher itself still sets a ceiling: however many redundant depots you add behind it, the dispatcher's own availability caps the whole system. That's the next single point of failure worth worrying about.",
        ],
        failureBody: [
          'A lone depot can\'t clear 99.8% by itself. Make sure you deleted the direct Customers→Depot wire, then routed both depots through a dispatcher — a leftover direct connection alongside the dispatcher will not give you clean redundancy.',
        ],
        readmeQuote: {
          text: 'A fault-tolerant system has no service interruption but a significantly higher cost, while a highly available system has minimal service interruption.',
          source: 'Chapter I · Availability',
        },
        realWorldExamples: ['Multi-AZ database deployments', 'Redundant load balancer pairs (active-passive)'],
        interviewPhrase: '"I\'d avoid any single component being a hard dependency for availability — redundancy in parallel is what actually buys extra nines, not just making one machine more reliable."',
        ruleOfThumb: 'One reliable machine has a ceiling. Two redundant ones raise it — but whatever sits in front of them, undoubled, becomes the new ceiling.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Roughly how much downtime per year does 99.9% ("three nines") availability allow?',
      options: [
        { id: 'a', label: 'About 8.77 hours', correct: true, feedback: 'Right — straight from the nines table.' },
        { id: 'b', label: 'About 3.65 days', correct: false, feedback: "That's the allowance for 99% (two nines), a full order of magnitude looser." },
        { id: 'c', label: 'About 5 minutes', correct: false, feedback: "That's closer to 99.999% (five nines) territory." },
      ],
    },
    {
      id: 'q2',
      question: 'Two components in series (A then B, both required) have availabilities 99% and 99.9%. What happens to overall availability compared to either alone?',
      options: [
        { id: 'a', label: 'It drops below both individual numbers', correct: true, feedback: 'Right — series composition multiplies availabilities, so the combined number is always ≤ the weaker link.' },
        { id: 'b', label: 'It averages out to somewhere between the two', correct: false, feedback: "Series availability multiplies, which lands below both, not between them." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Scalability (build stage -- the capstone: a single server's capacity
// slider physically caps out at 300rps, so this is the one level where
// vertical scaling can't be argued around. It has to go horizontal.)
// ---------------------------------------------------------------------------

const scalabilityStartGraph: SimGraph = {
  nodes: [client(), server('megadepot', 'Depot (maxed out)', 320, 160, { capacityRps: 300, baseMs: 80 })],
  edges: [edge('client', 'megadepot')],
}

const ch1Scalability: Level = {
  id: 'ch1-scalability',
  chapterId: 'ch1',
  order: 15,
  title: 'The Real Ceiling',
  realConcept: 'Scalability',
  analogyName: "There's no bigger depot to build",
  stages: [
    {
      kind: 'situation',
      title: 'You maxed it out',
      body: [
        "You've upgraded this depot every time it struggled, and it's now as big as a single depot can physically get. Demand just grew past what even that can handle. There is no bigger single depot to build.",
      ],
    },
    {
      kind: 'teach',
      title: 'Scalability, put plainly',
      body: [
        '**Scalability** is how well a system responds to more demand by adding resources. You\'ve actually been practicing it since Level 2 — this is just the moment it gets a name and its two strategies get compared directly.',
        '**Vertical scaling** (make the existing machine bigger) is simple and keeps data in one place, but it has a hard ceiling, and that one machine stays a single point of failure the whole way. **Horizontal scaling** (add more machines) has no such ceiling and survives one machine dying — at the cost of needing something to coordinate them, which by now you already know how to build.',
        "The rule of thumb: reach for vertical scaling first, because it's cheap and simple. Reach for horizontal scaling the moment you hit a ceiling — a maximum machine size, a single-point-of-failure requirement, or a bill that's growing faster than your traffic is.",
      ],
      diagram: {
        steps: [
          { icon: '🏬', label: 'One depot, maxed' },
          { icon: '🧭', label: 'Dispatcher' },
          { icon: '🏬', label: 'Depot A' },
          { icon: '🏬', label: 'Depot B' },
        ],
        caption: 'Past the ceiling, the only way up is out.',
      },
      readmeQuote: {
        text: 'Scalability is the measure of how well a system responds to changes by adding or removing resources to meet demands.',
        source: 'Chapter I · Scalability',
      },
      realWorldExamples: [
        'A database maxed out on the largest instance size a cloud provider offers',
        'A service adding pods/replicas instead of a bigger single instance',
      ],
      check: {
        question: "A server is already running the largest machine size your cloud provider sells, and it's still not enough. What's the only scaling option left?",
        options: [
          { id: 'a', label: 'Horizontal scaling — add more machines', correct: true, feedback: "Right — once vertical scaling hits a hard ceiling, adding more machines is the only way to add more capacity." },
          { id: 'b', label: 'Keep vertically scaling the same machine', correct: false, feedback: "That's exactly the ceiling — there's no bigger machine left to move to." },
          { id: 'c', label: 'Lower the traffic', correct: false, feedback: "That avoids the problem rather than solving it, and usually isn't something you control." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Past the ceiling',
      brief: [
        "This depot is maxed at its capacity slider's ceiling and demand still exceeds it. Delete the direct wire from Customers, then add a Dispatcher and a second Depot alongside it — and make sure the new depot's capacity is actually turned up enough to share the load, not left at its default.",
      ],
      startingGraph: scalabilityStartGraph,
      unlockedKinds: ['client', 'server', 'loadBalancer'],
      lockedNodeIds: ['megadepot'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(320) },
      slo: { maxP99Ms: 300, maxErrorRate: 0.01, minThroughputRps: 300 },
      debrief: {
        successBody: [
          "Vertical scaling got you this far and no further — the depot was already at its ceiling before you even opened this level. Adding a second depot behind a dispatcher is the only move left, and it has no ceiling like this one did.",
          "Notice this cost more than just turning a slider: a new depot, a dispatcher, and now two things that need to be sized correctly instead of one.",
        ],
        failureBody: [
          "Make sure the direct Customers→Depot wire is gone, both depots run through the Dispatcher, and the new depot's own capacity slider is turned up — its default is much too small to share this much traffic.",
        ],
        readmeQuote: {
          text: 'Horizontal scaling (also known as scaling out) expands a system\'s scale by adding more machines... Increased redundancy, better fault tolerance, flexible and efficient.',
          source: 'Chapter I · Scalability',
        },
        realWorldExamples: ['A service migrating from one large database instance to a sharded/replicated fleet'],
        interviewPhrase: '"I\'d scale vertically first since it\'s simple, but I\'d design for horizontal scaling from the start, because vertical scaling always has a ceiling."',
        ruleOfThumb: 'Vertical scaling buys time. Horizontal scaling is what you fall back to once time runs out.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which is a genuine disadvantage of vertical scaling that horizontal scaling doesn\'t share?',
      options: [
        { id: 'a', label: 'It has a hard ceiling, and the one machine stays a single point of failure', correct: true, feedback: 'Right — straight from the trade-off table.' },
        { id: 'b', label: 'It is always more expensive per unit of capacity', correct: false, feedback: 'Not universally true — vertical scaling is often the cheaper, simpler option below the ceiling.' },
      ],
    },
    {
      id: 'q2',
      question: 'What specifically forces a move from vertical to horizontal scaling in this level?',
      options: [
        { id: 'a', label: "The single server is already at its maximum possible capacity", correct: true, feedback: "Right — there's no larger single machine left to move to." },
        { id: 'b', label: 'The dispatcher stopped working', correct: false, feedback: "There was no dispatcher yet — the single depot itself hit its ceiling." },
      ],
    },
  ],
}

export const CHAPTER_1_EXTRA_LEVELS: Level[] = [
  ch1NetIp,
  ch1NetOsi,
  ch1NetTcpUdp,
  ch1NetDns,
  ch1Clustering,
  ch1Proxy,
  ch1Storage,
  ch1Cdn,
  ch1Availability,
  ch1Scalability,
]
