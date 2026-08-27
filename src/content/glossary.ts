// Term -> one-line definition -> the topic (level) that teaches it in full.
// Powers RichText's `[[term]]` inline links and the standalone Glossary
// page (Phase 1.3). `topicId`, when present, must be a real level id --
// glossary.test.ts checks every one resolves against the registry.

export interface GlossaryEntry {
  term: string
  definition: string
  topicId?: string
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'system design', definition: 'The process of defining the architecture, interfaces, and data for a system that satisfies specific requirements.', topicId: 'ch0-l0' },
  { term: 'client', definition: 'Whoever sends a request -- a browser, an app, another service.', topicId: 'ch0-l1' },
  { term: 'server', definition: 'Whoever answers a request with a response.', topicId: 'ch0-l1' },
  { term: 'request', definition: "A client's ask, sent to a server.", topicId: 'ch0-l1' },
  { term: 'response', definition: "A server's answer, sent back to the client that asked.", topicId: 'ch0-l1' },
  { term: 'latency', definition: 'How long one request takes, start to finish.', topicId: 'ch0-l2' },
  { term: 'throughput', definition: 'How many requests a system can get through per second.', topicId: 'ch0-l2' },
  { term: 'rps', definition: 'Requests per second -- the standard unit for measuring throughput.', topicId: 'ch0-l3' },
  { term: 'capacity', definition: "The maximum rps a component can serve before requests start queueing or erroring.", topicId: 'ch0-l4' },
  { term: 'utilization', definition: 'How much of a component\'s capacity is currently in use, as a percentage.', topicId: 'ch0-l4' },
  { term: 'p99', definition: 'The 99th-percentile latency -- 99% of requests finish this fast or faster. A better health signal than the average, since it still shows the slow tail.', topicId: 'ch0-l5' },
  { term: 'SLO', definition: 'Service Level Objective -- a target for a metric (e.g. "p99 under 200ms") a system is expected to meet.', topicId: 'ch0-l5' },
  { term: 'IP address', definition: 'A unique number that identifies a device on a network.', topicId: 'ch1-net-ip' },
  { term: 'IPv4', definition: 'A 32-bit IP address format, giving about 4 billion possible addresses.', topicId: 'ch1-net-ip' },
  { term: 'IPv6', definition: 'A 128-bit IP address format, with enough addresses to number practically everything on Earth many times over.', topicId: 'ch1-net-ip' },
  { term: 'OSI model', definition: 'A seven-layer reference model (Physical, Data Link, Network, Transport, Session, Presentation, Application) describing how a request actually crosses a network.', topicId: 'ch1-net-osi' },
  { term: 'TCP', definition: 'A connection-oriented transport protocol that guarantees ordered, reliable delivery -- at the cost of more overhead than UDP.', topicId: 'ch1-net-tcp-udp' },
  { term: 'UDP', definition: 'A connectionless transport protocol with lower overhead than TCP, but no delivery or ordering guarantee.', topicId: 'ch1-net-tcp-udp' },
  { term: 'DNS', definition: "The internet's phonebook: resolves human-readable domain names to IP addresses.", topicId: 'ch1-net-dns' },
  { term: 'TTL', definition: "How long a resolved DNS answer can be cached before it must be looked up again.", topicId: 'ch1-net-dns' },
  { term: 'load balancer', definition: 'A component that spreads incoming requests across multiple servers so no single one is overwhelmed.', topicId: 'ch1-l2' },
  { term: 'horizontal scaling', definition: 'Adding more machines to share load, instead of making one machine bigger.', topicId: 'ch1-scalability' },
  { term: 'vertical scaling', definition: 'Making a single machine bigger (more CPU, RAM) instead of adding more machines.', topicId: 'ch1-scalability' },
  { term: 'clustering', definition: 'A group of nodes that are aware of each other and coordinate, unlike plain load-balanced servers that react independently.', topicId: 'ch1-clustering' },
  { term: 'active-active', definition: 'A clustering configuration where every node actively serves traffic simultaneously.', topicId: 'ch1-clustering' },
  { term: 'cache', definition: 'A fast, small store that keeps a copy of frequently-requested data so most requests can skip the slower source.', topicId: 'ch1-l4' },
  { term: 'cache hit rate', definition: 'The fraction of requests a cache can answer without going to the source behind it.', topicId: 'ch1-l4' },
  { term: 'cache invalidation', definition: 'Removing or updating stale entries in a cache so it does not keep serving outdated data.', topicId: 'ch1-l5' },
  { term: 'write-through cache', definition: 'A cache strategy that updates the cache and the source at the same moment, keeping the cache always accurate.', topicId: 'ch1-l5' },
  { term: 'write-around cache', definition: 'A cache strategy that writes only to the source, leaving the cache to catch up (and go briefly stale) on the next read.', topicId: 'ch1-l5' },
  { term: 'reverse proxy', definition: 'A server-side intermediary that sits in front of one or more backend servers, useful even with only one backend.', topicId: 'ch1-proxy' },
  { term: 'forward proxy', definition: "A client-side intermediary that hides a client's identity from the sites it visits." , topicId: 'ch1-proxy' },
  { term: 'block storage', definition: 'Raw, low-level storage addressed in fixed-size blocks -- what a disk attached to a server looks like.', topicId: 'ch1-net-storage' },
  { term: 'object storage', definition: 'Storage that keeps data as a flat pool of objects with metadata, rather than a folder hierarchy (e.g. Amazon S3).', topicId: 'ch1-net-storage' },
  { term: 'RAID', definition: 'Redundant Array of Independent Disks -- combining multiple physical disks for redundancy and/or performance.', topicId: 'ch1-net-storage' },
  { term: 'CDN', definition: 'Content Delivery Network -- a geographically distributed set of caches ("edge locations") that serve static content from near the requester.', topicId: 'ch1-cdn' },
  { term: 'availability', definition: 'The fraction of time a system is capable of serving traffic, usually expressed in "nines" (e.g. 99.9%).', topicId: 'ch1-availability' },
  { term: 'nines', definition: 'Shorthand for availability: 99% is "two nines," 99.9% is "three nines," and so on -- each extra nine allows dramatically less downtime per year.', topicId: 'ch1-availability' },
  { term: 'database', definition: 'A system that stores, organizes, and durably persists data so it survives past a single request.', topicId: 'ch2-db-intro' },
  { term: 'SQL', definition: 'Relational databases: structured tables with a fixed schema, related by keys, queried with SQL.', topicId: 'ch2-sql' },
  { term: 'NoSQL', definition: 'Non-relational databases (document, key-value, wide-column, graph) that trade some of SQL\'s structure and guarantees for flexibility or scale.', topicId: 'ch2-nosql' },
  { term: 'replication', definition: 'Keeping copies of the same data on multiple database nodes, for redundancy and read scaling.', topicId: 'ch2-replication' },
  { term: 'replication lag', definition: 'The delay between a write landing on a primary and that write becoming visible on a replica.', topicId: 'ch2-replication' },
  { term: 'synchronous replication', definition: 'A replication mode that waits for a replica to acknowledge a write before confirming it -- safer, slower.', topicId: 'ch2-replication' },
  { term: 'asynchronous replication', definition: 'A replication mode that confirms a write without waiting for replicas -- faster, but replicas can briefly serve stale reads.', topicId: 'ch2-replication' },
  { term: 'index', definition: 'A database structure that speeds up reads on a column at the cost of slower writes (every write now has to update the index too).', topicId: 'ch2-indexes' },
  { term: 'normalization', definition: 'Structuring a relational database to minimize duplicate data, usually by splitting it into more tables.', topicId: 'ch2-normalization' },
  { term: 'denormalization', definition: 'Deliberately duplicating data across tables to make reads faster, at the cost of more complex writes.', topicId: 'ch2-normalization' },
  { term: 'ACID', definition: 'Atomicity, Consistency, Isolation, Durability -- the guarantees a transactional (typically SQL) database makes about a transaction.', topicId: 'ch2-acid-base' },
  { term: 'BASE', definition: 'Basically Available, Soft state, Eventually consistent -- the looser guarantees many NoSQL databases favor for availability and scale.', topicId: 'ch2-acid-base' },
  { term: 'CAP theorem', definition: 'A distributed system can only guarantee two of Consistency, Availability, and Partition tolerance at once -- and partitions happen, so it is really a choice between C and A during one.', topicId: 'ch2-cap' },
  { term: 'PACELC', definition: "An extension of CAP: even without a Partition, a system still trades off Latency against Consistency (Else)." , topicId: 'ch2-pacelc' },
  { term: 'transaction', definition: 'A group of operations that succeed or fail together as a single unit.', topicId: 'ch2-transactions' },
  { term: 'two-phase commit', definition: 'A protocol (prepare, then commit) for coordinating a transaction across multiple nodes so they all commit or all abort together.', topicId: 'ch2-distributed-transactions' },
  { term: 'sharding', definition: 'Splitting a dataset across multiple database nodes ("shards") by key, so no single node holds all the data.', topicId: 'ch2-sharding' },
  { term: 'hot shard', definition: 'A shard receiving disproportionately more traffic than the others, usually from a skewed key distribution.', topicId: 'ch2-sharding' },
  { term: 'consistent hashing', definition: 'A hashing scheme that maps both keys and nodes onto a ring, so adding or removing a node only remaps a small fraction of keys.', topicId: 'ch2-consistent-hashing' },
  { term: 'federation', definition: "Splitting one database by function (e.g. a users DB, a products DB) rather than by key, so each piece can scale independently." , topicId: 'ch2-federation' },
  { term: 'geohash', definition: 'A short string encoding a latitude/longitude pair -- locations that share a longer prefix are spatially closer together.', topicId: 'ch4-geohashing-quadtrees' },
  { term: 'quadtree', definition: 'A tree that recursively subdivides 2D space into four quadrants once a region holds more than some threshold of points.', topicId: 'ch4-geohashing-quadtrees' },
  { term: 'circuit breaker', definition: 'A pattern that trips open and refuses calls immediately once a dependency\'s failures cross a threshold, instead of letting every caller wait on a doomed call.', topicId: 'ch4-circuit-breaker' },
  { term: 'token bucket', definition: 'A rate-limiting algorithm: each request spends a token from a bucket that refills at a steady rate; an empty bucket means the request is refused.', topicId: 'ch4-rate-limiting' },
  { term: 'rate limiting', definition: 'Capping how frequently an operation is allowed to happen, refusing anything past the cap outright.', topicId: 'ch4-rate-limiting' },
  { term: 'service discovery', definition: 'How a caller finds a currently-reachable instance of a service whose instances come and go dynamically.', topicId: 'ch4-service-discovery' },
  { term: 'service registry', definition: 'The database of which service instances are currently alive and reachable, kept accurate via self-registration and heartbeats.', topicId: 'ch4-service-discovery' },
  { term: 'SLA', definition: 'Service Level Agreement -- an SLO with consequences: a contractual promise made to customers, usually looser than the internal SLO.', topicId: 'ch4-sla-slo-sli' },
  { term: 'SLI', definition: 'Service Level Indicator -- a measured metric (error rate, p99 latency) that an SLO sets a target for.', topicId: 'ch4-sla-slo-sli' },
  { term: 'error budget', definition: 'How much failure is tolerable before an SLO is broken -- 1 minus the SLO target.', topicId: 'ch4-sla-slo-sli' },
  { term: 'burn rate', definition: 'How fast an error budget is being consumed relative to sustainable -- 1.0x is exactly sustainable, 2.0x exhausts it in half the time.', topicId: 'ch4-sla-slo-sli' },
  { term: 'RTO', definition: 'Recovery Time Objective -- the maximum acceptable delay between an outage starting and service being restored.', topicId: 'ch4-disaster-recovery' },
  { term: 'RPO', definition: 'Recovery Point Objective -- the maximum acceptable data loss, measured as time since the last recovery point.', topicId: 'ch4-disaster-recovery' },
  { term: 'hot site', definition: 'A disaster-recovery standby that keeps live, up-to-date copies running continuously for fast failover.', topicId: 'ch4-disaster-recovery' },
  { term: 'hypervisor', definition: 'Software that carves up physical hardware resources and hands each virtual machine its own share.', topicId: 'ch4-vms-containers' },
  { term: 'container', definition: 'A package of an application and its own dependencies that shares the host OS kernel, making it far lighter than a virtual machine.', topicId: 'ch4-vms-containers' },
  { term: 'OAuth 2.0', definition: 'An authorization protocol that grants a client limited, scoped access to resources on a user\'s behalf, without ever sharing the user\'s credentials.', topicId: 'ch4-oauth-oidc' },
  { term: 'OIDC', definition: 'OpenID Connect -- a thin identity layer on top of OAuth 2.0, adding login and profile information via a JSON Web Token.', topicId: 'ch4-oauth-oidc' },
  { term: 'access token', definition: 'A piece of data representing scoped authorization to access resources on behalf of a user, without carrying their actual credentials.', topicId: 'ch4-oauth-oidc' },
  { term: 'SSO', definition: 'Single Sign-On -- logging in once with a centralized Identity Provider to gain access to multiple applications, instead of authenticating separately with each.', topicId: 'ch4-sso' },
  { term: 'identity provider', definition: 'The centralized system that authenticates a user and asserts their identity to every connected application.', topicId: 'ch4-sso' },
  { term: 'TLS', definition: 'Transport Layer Security -- the protocol securing most internet traffic today, providing encryption, authentication, and integrity.', topicId: 'ch4-tls-mtls' },
  { term: 'mTLS', definition: 'Mutual TLS -- both sides of a connection present and verify a certificate, so the server can also confirm exactly which client it\'s talking to.', topicId: 'ch4-tls-mtls' },
]

const GLOSSARY_BY_TERM = new Map(GLOSSARY.map((g) => [g.term.toLowerCase(), g]))

export function findGlossaryEntry(term: string): GlossaryEntry | undefined {
  return GLOSSARY_BY_TERM.get(term.toLowerCase())
}

export function slugifyTerm(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
