// Chapter II -- Data. The build levels: introducing the database/replica/
// shardRouter primitives (Phase 2's engine work) through the topics that
// actually have a live traffic mechanic -- the ledger itself, replication,
// indexes, normalization, CAP, distributed transactions, and sharding
// (both the hot-shard failure and the resize-cost lesson). The purely
// conceptual topics (SQL, NoSQL, SQL vs NoSQL, ACID/BASE, PACELC,
// Transactions, Federation) live in chapter2-extra.ts.

import type { Chapter, Level } from './types'
import type { DatabaseConfig, GraphNode, ReplicaConfig, SimGraph } from '@/engine/types'
import { constantTraffic } from '@/engine/traffic'
import { CHAPTER_2_EXTRA_LEVELS } from './chapter2-extra'
import { client, edge } from './graphHelpers'

function database(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides: Partial<DatabaseConfig> = {},
): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    config: {
      kind: 'database',
      engine: overrides.engine ?? 'sql',
      capacityRps: overrides.capacityRps ?? 60,
      baseMs: overrides.baseMs ?? 40,
      writeCapacityRps: overrides.writeCapacityRps ?? 25,
      writeBaseMs: overrides.writeBaseMs ?? 60,
      indexed: overrides.indexed ?? false,
      costPerHour: overrides.costPerHour ?? 12,
      availability: overrides.availability,
    },
  }
}

function replica(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides: Partial<ReplicaConfig> = {},
): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    config: {
      kind: 'replica',
      capacityRps: overrides.capacityRps ?? 60,
      baseMs: overrides.baseMs ?? 40,
      costPerHour: overrides.costPerHour ?? 10,
      replicationMode: overrides.replicationMode ?? 'async',
      staleReadFraction: overrides.staleReadFraction ?? 0.15,
      replicationLagMs: overrides.replicationLagMs ?? 150,
      syncAckWaitMs: overrides.syncAckWaitMs ?? 40,
      availability: overrides.availability,
    },
  }
}

function shardRouter(id: string, label: string, x: number, y: number, zipfS = 1.5): GraphNode {
  return {
    id,
    label,
    position: { x, y },
    config: { kind: 'shardRouter', strategy: 'modulo', keyspaceSize: 1000, zipfS, costPerHour: 4 },
  }
}

// ---------------------------------------------------------------------------
// Level 1 -- The Permanent Ledger (Databases and DBMS)
// ---------------------------------------------------------------------------

const l1StartGraph: SimGraph = { nodes: [client()], edges: [] }

const ch2Db: Level = {
  id: 'ch2-db-intro',
  chapterId: 'ch2',
  order: 1,
  title: 'The Permanent Ledger',
  realConcept: 'Databases and DBMS',
  analogyName: 'Somewhere the records actually live',
  stages: [
    {
      kind: 'situation',
      title: 'A depot forgets everything overnight',
      body: [
        "Every depot you've built so far answers a question and moves on — it doesn't remember yesterday's orders. But Packet & Post needs a permanent record: who shipped what, when, and for how much. Answering fast isn't enough anymore. Something has to actually keep the books.",
      ],
    },
    {
      kind: 'teach',
      title: 'The database (and the DBMS that runs it)',
      body: [
        'A **database** is an organized collection of structured data, typically stored electronically so it survives long after the request that wrote it. It\'s usually controlled by a **DBMS** (Database Management System) — software that sits between the database and everyone using it, handling retrieval, updates, and the administrative work of keeping the whole thing healthy.',
        'On the map, this is the **Ledger**: unlike a depot, which just does work and forgets it, the Ledger actually persists what it\'s told — and because writing something down permanently is a different (and usually slower) job than looking something up, the Ledger tracks read and write traffic separately from here on.',
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Customers' },
          { icon: '📒', label: 'Ledger' },
        ],
        caption: 'Not just an answer — a permanent record of it.',
      },
      readmeQuote: {
        text: 'A database is an organized collection of structured information, or data, typically stored electronically in a computer system. A database is usually controlled by a Database Management System (DBMS).',
        source: 'Chapter II · Databases and DBMS',
      },
      realWorldExamples: ['PostgreSQL, MySQL running behind an application server', 'The DBMS layer handling backup, tuning, and access control'],
      check: {
        question: 'What specifically distinguishes a database from a depot (server) in this game so far?',
        options: [
          { id: 'a', label: 'A database persists what it\'s told, instead of just answering and moving on', correct: true, feedback: "Right — permanence is the whole point of a database." },
          { id: 'b', label: 'A database is always faster than a server', correct: false, feedback: "Often the opposite — writing something down durably tends to be slower than a stateless answer." },
          { id: 'c', label: 'Nothing — they\'re interchangeable', correct: false, feedback: "They're not interchangeable — a database specifically keeps a durable record; a plain server doesn't." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Open the ledger',
      brief: ['Wire up your first Ledger so orders actually get recorded, not just answered.'],
      startingGraph: l1StartGraph,
      unlockedKinds: ['client', 'database'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(20) },
      slo: { maxP99Ms: 250, maxErrorRate: 0, minThroughputRps: 15 },
      guidedSteps: [
        { instruction: 'Drag a Ledger from the left panel onto the map.' },
        { instruction: 'Connect Customers to the Ledger.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          'Same loop as every depot before it — build, run, read the dashboard — except now what you built actually keeps a record.',
          'Notice the dashboard is unchanged in shape; a Ledger reports capacity and errors just like a depot does. What\'s different is underneath: for the rest of this chapter, reads and writes to it are tracked — and cost — separately.',
        ],
        failureBody: ['Make sure Customers has a wire running all the way to the Ledger, then run again.'],
        readmeQuote: {
          text: 'A DBMS serves as an interface between the database and its end-users or programs, allowing users to retrieve, update, and manage how the information is organized and optimized.',
          source: 'Chapter II · Databases and DBMS',
        },
        realWorldExamples: ['Any application server writing to its database on every request'],
        interviewPhrase: '"Once a system needs to remember something past the lifetime of a single request, that\'s the point a database enters the design."',
        ruleOfThumb: 'A server answers. A database remembers. Most real systems need both.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What role does a DBMS play, beyond just storing bytes on disk?',
      options: [
        { id: 'a', label: 'It interfaces between the database and its users/programs, handling retrieval, updates, and admin tasks like backup and tuning', correct: true, feedback: 'Right — the DBMS is the software layer, not just the storage.' },
        { id: 'b', label: 'It is purely a marketing term with no functional role', correct: false, feedback: "It's a real functional layer — retrieval, updates, backup, tuning, access control all live there." },
      ],
    },
    {
      id: 'q2',
      question: 'Why does this game start tracking read and write traffic separately once a Ledger enters the picture?',
      options: [
        { id: 'a', label: 'Because persisting a write is a genuinely different (usually costlier) job than answering a read', correct: true, feedback: 'Right — and that split is exactly what the rest of this chapter builds on.' },
        { id: 'b', label: 'It\'s purely a UI choice with no underlying reason', correct: false, feedback: 'There\'s a real mechanical reason: reads and writes hit different capacity limits on a real database.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 2 -- A Second Copy of the Ledger (Database Replication)
// ---------------------------------------------------------------------------

const l2GuidedStart: SimGraph = {
  nodes: [client(), database('ledger', 'Ledger', 480, 160)],
  edges: [edge('client', 'ledger')],
}

const l2TwistStart: SimGraph = {
  nodes: [
    client(),
    replica('backup', 'Ledger Copy', 280, 160, { capacityRps: 90 }),
    database('ledger', 'Ledger', 500, 160),
  ],
  edges: [edge('client', 'backup'), edge('backup', 'ledger')],
}

const ch2Replication: Level = {
  id: 'ch2-replication',
  chapterId: 'ch2',
  order: 5,
  title: 'A Second Copy of the Ledger',
  realConcept: 'Database Replication',
  analogyName: 'Read from the copy, write to the original',
  stages: [
    {
      kind: 'situation',
      title: 'Everyone wants to check a price',
      body: [
        'Most requests hitting your Ledger are just price look-ups — nobody\'s actually changing anything. But every single one of them still has to go through the one ledger that also has to handle every write, and it\'s starting to buckle under the read traffic alone.',
      ],
    },
    {
      kind: 'teach',
      title: 'Replication',
      body: [
        '**Replication** shares data across redundant copies to improve reliability and spread out load. The most common shape is **master-slave**: one ledger serves both reads and writes and replicates its writes to one or more read-only copies, which handle reads only — taking that load off the original entirely.',
        'On the map, this is the **Ledger Copy** — reads resolve right at the copy. Writes don\'t belong there at all, so they pass straight through, untouched, to the real Ledger behind it.',
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Customers' },
          { icon: '📗', label: 'Ledger Copy' },
          { icon: '📒', label: 'Ledger' },
        ],
        caption: 'Reads stop at the copy. Writes travel all the way through to the original.',
      },
      readmeQuote: {
        text: 'The master serves reads and writes, replicating writes to one or more slaves, which serve only reads.',
        source: 'Chapter II · Database Replication',
      },
      realWorldExamples: ['A PostgreSQL read replica handling analytics queries', 'MySQL master-slave replication for a read-heavy web app'],
      check: {
        question: 'A write request arrives at a read replica. What should happen to it?',
        options: [
          { id: 'a', label: 'It passes through to the primary — a replica isn\'t the source of truth for writes', correct: true, feedback: 'Right — a replica only resolves reads locally; writes have to reach the real ledger.' },
          { id: 'b', label: 'It gets applied to the replica\'s own copy directly', correct: false, feedback: 'That would let the replica silently drift from the primary — writes have to go through the primary.' },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Add a read copy',
      brief: [
        'Reads alone are overwhelming the Ledger. Add a Ledger Copy in front of it so reads resolve there instead — writes should still reach the real Ledger.',
      ],
      startingGraph: l2GuidedStart,
      unlockedKinds: ['client', 'database', 'replica'],
      lockedNodeIds: ['ledger'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(80), writeFraction: 0.125 },
      slo: { maxErrorRate: 0.02, minThroughputRps: 75, maxP99Ms: 350 },
      guidedSteps: [
        { instruction: 'Select the wire from Customers to the Ledger and delete it (click it, then press Backspace).' },
        { instruction: 'Drag a Ledger Copy onto the map.' },
        { instruction: 'Wire Customers → Ledger Copy, then Ledger Copy → Ledger.' },
        { instruction: 'Select the Ledger Copy and turn its read capacity up to comfortably clear the read traffic.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          'Almost all of that traffic was reads, and now they resolve at the copy without ever touching the real Ledger — which barely notices the handful of writes still reaching it.',
          "You didn't remove any load from the system — you just gave the read traffic somewhere else to go.",
        ],
        failureBody: [
          'Make sure the direct Customers→Ledger wire is gone, and traffic flows Customers→Ledger Copy→Ledger. If it\'s still erroring, the Ledger Copy\'s own read capacity is probably too low for the traffic — turn it up.',
        ],
        readmeQuote: {
          text: 'Applications can read from the slave(s) without impacting the master.',
          source: 'Chapter II · Database Replication (Master-Slave Replication)',
        },
        realWorldExamples: ['Read replicas fanning out a read-heavy workload'],
        interviewPhrase: '"If reads dominate the traffic, a read replica is usually the cheapest way to buy real headroom without touching the write path at all."',
        ruleOfThumb: 'A read replica takes load off the original — it does not make the original\'s writes any safer.',
      },
    },
    {
      kind: 'build',
      mode: 'twist',
      title: 'How in sync should the copy be?',
      brief: [
        "Someone just changed a price at the real Ledger. How current does the Ledger Copy need to be?",
      ],
      startingGraph: l2TwistStart,
      unlockedKinds: ['client', 'database', 'replica'],
      lockedNodeIds: ['backup', 'ledger'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(60), writeFraction: 0.3 },
      decisionCard: {
        prompt: 'How should the Ledger Copy stay in sync with the real Ledger?',
        options: [
          {
            id: 'async',
            label: 'Asynchronous — copy updates a moment later',
            description: 'Writes finish fast. But for a little while after a change, the copy might hand out the old answer.',
            applyToGraph: (graph) => ({
              ...graph,
              nodes: graph.nodes.map((n) =>
                n.id === 'backup' && n.config.kind === 'replica'
                  ? { ...n, config: { ...n.config, replicationMode: 'async', staleReadFraction: 0.3 } }
                  : n,
              ),
            }),
          },
          {
            id: 'sync',
            label: 'Synchronous — copy updates at the same instant',
            description: 'The copy is never wrong. But every write now has to wait for the copy to confirm it too.',
            applyToGraph: (graph) => ({
              ...graph,
              nodes: graph.nodes.map((n) =>
                n.id === 'backup' && n.config.kind === 'replica'
                  ? { ...n, config: { ...n.config, replicationMode: 'sync', staleReadFraction: 0 } }
                  : n,
              ),
            }),
          },
        ],
      },
      slo: { maxStaleReadRate: 0.05, maxErrorRate: 0, minThroughputRps: 55 },
      debrief: {
        successBody: [
          'Synchronous replication means the copy genuinely never lags — but notice every write now pays for a round trip to the copy before it\'s considered done. That extra wait is the literal price of the guarantee.',
          "Asynchronous replication skips that wait, but for a real fraction of reads right after a change, the copy is confidently wrong.",
        ],
        failureBody: [
          'If stale reads are above the limit, the copy is still async. Switch it to synchronous — it keeps the copy and the original in lockstep, at the cost of slower writes.',
        ],
        readmeQuote: {
          text: 'In synchronous replication, data is written to primary storage and the replica simultaneously... In contrast, asynchronous replication copies the data to the replica after the data is already written to the primary storage.',
          source: 'Chapter II · Database Replication (Synchronous vs Asynchronous replication)',
        },
        realWorldExamples: ['Financial ledgers (sync)', 'Social feeds, comment counts (async, staleness tolerated)'],
        interviewPhrase: '"Synchronous replication buys correctness at the cost of write latency; asynchronous buys speed at the cost of a stale window. Which one\'s right depends entirely on what a stale read would cost you."',
        ruleOfThumb: 'Every replication strategy trades some write latency for some staleness risk — the question is only which one this data can tolerate.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'In master-slave replication, what happens if the master goes offline?',
      options: [
        { id: 'a', label: 'The system can continue in read-only mode until a slave is promoted or a new master is provisioned', correct: true, feedback: 'Right — reads survive, writes don\'t, until the master role is restored.' },
        { id: 'b', label: 'The entire system goes down immediately with no recovery path', correct: false, feedback: 'Reads specifically can keep working from the slave(s) — it\'s not a total outage.' },
      ],
    },
    {
      id: 'q2',
      question: 'What is the defining trade-off of synchronous replication vs. asynchronous?',
      options: [
        { id: 'a', label: 'Sync trades write latency for guaranteed freshness; async trades freshness for write speed', correct: true, feedback: 'Right — that exact trade is the whole lesson.' },
        { id: 'b', label: 'There is no real trade-off — synchronous is strictly better in every case', correct: false, feedback: "If that were true, nobody would ever choose async — the added write latency is a real cost." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 3 -- Marking the Pages (Indexes)
// ---------------------------------------------------------------------------

const l3StartGraph: SimGraph = {
  nodes: [
    client(),
    database('ledger', 'Ledger', 400, 160, { baseMs: 200, writeBaseMs: 20, capacityRps: 60, writeCapacityRps: 25 }),
  ],
  edges: [edge('client', 'ledger')],
}

const ch2Indexes: Level = {
  id: 'ch2-indexes',
  chapterId: 'ch2',
  order: 6,
  title: 'Marking the Pages',
  realConcept: 'Indexes',
  analogyName: "A table of contents for the ledger",
  stages: [
    {
      kind: 'situation',
      title: 'Reading every page, every time',
      body: [
        'To answer "what\'s the price to Leeds?", the clerk currently pages through the entire Ledger front to back, every single time. It works, but it\'s brutally slow — and the answer is always on some page, if only there were a faster way to find it.',
      ],
    },
    {
      kind: 'teach',
      title: 'Indexes',
      body: [
        'An **index** is used to improve the speed of data retrieval — a table of contents that points straight at where a row actually lives, instead of scanning every row to find it. Creating one means storing a column plus a pointer to its full row, separately from the data itself.',
        'That speed isn\'t free: every index has to be updated on every insert, update, and delete too, alongside the actual data. Indexes trade increased storage and **slower writes** for **much faster reads** — the more indexes you add, the more that write cost compounds.',
      ],
      diagram: {
        steps: [
          { icon: '📖', label: 'Scan every page' },
          { icon: '📑', label: 'Or: check the index' },
          { icon: '🎯', label: 'Straight to the row' },
        ],
        caption: 'An index skips the scan — at the cost of one more thing to keep updated.',
      },
      readmeQuote: {
        text: 'An index makes the trade-offs of increased storage overhead, and slower writes (since we not only have to write the data but also have to update the index) for the benefit of faster reads.',
        source: 'Chapter II · Indexes',
      },
      realWorldExamples: ['A B-tree index on a frequently-queried column', 'A slow query log pointing straight at a missing index'],
      check: {
        question: 'Why does adding an index make writes slower, not just reads faster?',
        options: [
          { id: 'a', label: 'Every insert, update, or delete now also has to update the index, not just the underlying data', correct: true, feedback: "Right — the index needs its own upkeep on every write." },
          { id: 'b', label: 'It doesn\'t — indexes only ever help, with no downside', correct: false, feedback: "Indexes are a genuine trade, not a free upgrade — the write cost is real." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Stop the full scan',
      brief: [
        'This Ledger is read-heavy, and every read means paging through the whole book (200ms). Select it and turn indexing on.',
      ],
      startingGraph: l3StartGraph,
      unlockedKinds: ['client', 'database'],
      lockedNodeIds: ['ledger'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(40), writeFraction: 0.2 },
      slo: { maxP99Ms: 200, maxErrorRate: 0, minThroughputRps: 35 },
      debrief: {
        successBody: [
          'Toggling the index roughly quarters the read latency — no more paging through the whole book for every price check.',
          "Check the write side of the dashboard too: it did get slower, just not enough to matter at this traffic level. That's not a coincidence — it's the trade-off the index just made, visible in the one number this puzzle wasn't grading you on.",
        ],
        failureBody: ["Select the Ledger and check \"Indexed\" in the inspector — right now every read is a full, unindexed scan."],
        readmeQuote: {
          text: 'An index is a data structure that can be perceived as a table of contents that points us to the location where actual data lives.',
          source: 'Chapter II · Indexes',
        },
        realWorldExamples: ['Adding an index after spotting a slow, full-table-scanning query'],
        interviewPhrase: '"I\'d index columns that are read far more often than they\'re written, and watch write latency for anything queried rarely enough that the index isn\'t worth its upkeep."',
        ruleOfThumb: 'An index is a bet that this column gets read a lot more than it gets written.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the difference between a dense index and a sparse index?',
      options: [
        { id: 'a', label: 'Dense creates an entry for every row; sparse only creates entries for some of them', correct: true, feedback: 'Right — straight from the definitions.' },
        { id: 'b', label: 'They are two names for the exact same structure', correct: false, feedback: "They're genuinely different — dense costs more to maintain but finds anything with a direct lookup; sparse is lighter but slower to search." },
      ],
    },
    {
      id: 'q2',
      question: 'A column is written to constantly but almost never queried. Is it a good candidate for an index?',
      options: [
        { id: 'a', label: 'No — the write overhead would be paid constantly for a read speedup that\'s rarely used', correct: true, feedback: 'Right — indexes pay off when reads are frequent relative to writes, not the other way around.' },
        { id: 'b', label: 'Yes — more indexes are always better', correct: false, feedback: "Every index adds real write overhead — it should earn its keep with actual read traffic." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 4 -- One Book or Many (Normalization and Denormalization)
// ---------------------------------------------------------------------------

const l4StartGraph: SimGraph = {
  nodes: [client(), database('ledger', 'Ledger', 480, 160, { baseMs: 150, writeBaseMs: 20 })],
  edges: [edge('client', 'ledger')],
}

const ch2Normalization: Level = {
  id: 'ch2-normalization',
  chapterId: 'ch2',
  order: 7,
  title: 'One Book, or Many',
  realConcept: 'Normalization and Denormalization',
  analogyName: 'Look it up fresh each time, or keep a copy handy',
  stages: [
    {
      kind: 'situation',
      title: 'Every price check means two books',
      body: [
        "Right now, a customer's name lives in one part of the Ledger and their order history in another — correct, but every single lookup means cross-referencing both. It's accurate and it's slow, in roughly equal measure.",
      ],
    },
    {
      kind: 'teach',
      title: 'Normalization and denormalization',
      body: [
        '**Normalization** organizes data to eliminate redundancy — every fact lives in exactly one place, related to others by keys. It keeps data consistent and flexible, but reading it back often means joining data back together across the split, and updates only ever touch one place, which keeps writes cheap.',
        '**Denormalization** deliberately adds redundant copies of data into one table to avoid those joins, trading write cost for read speed: retrieving data is faster and simpler, but now every place a fact is duplicated has to be updated together, or the copies drift out of sync.',
      ],
      readmeQuote: {
        text: 'Denormalization is a database optimization technique in which we add redundant data to one or more tables. This can help us avoid costly joins in a relational database... It attempts to improve read performance at the expense of some write performance.',
        source: 'Chapter II · Normalization and Denormalization (Denormalization)',
      },
      realWorldExamples: ['A normalized schema with a customers table and a separate orders table', 'A denormalized order record that copies the customer\'s name directly onto it'],
      check: {
        question: 'What is the core cost of denormalizing (duplicating) data into a table to avoid joins?',
        options: [
          { id: 'a', label: 'Every copy of that duplicated data now has to be kept in sync on every write', correct: true, feedback: 'Right — redundancy has to be maintained, or the copies disagree.' },
          { id: 'b', label: 'It makes every read permanently slower', correct: false, feedback: "It's actually the opposite for reads — denormalization specifically speeds reads up, at the cost of writes." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'twist',
      title: 'Redesign the record',
      brief: [
        'This Ledger is read-heavy and every read currently means a 150ms join across two tables. How should the record be shaped?',
      ],
      startingGraph: l4StartGraph,
      unlockedKinds: ['client', 'database'],
      lockedNodeIds: ['ledger'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(40), writeFraction: 0.15 },
      decisionCard: {
        prompt: 'How should customer and order data be organized?',
        options: [
          {
            id: 'normalize',
            label: 'Keep it normalized — look up related data fresh, every time',
            description: 'No redundant data anywhere, and writes stay cheap. But this traffic is read-heavy, and every read still pays for the join.',
            applyToGraph: (graph) => ({
              ...graph,
              nodes: graph.nodes.map((n) =>
                n.id === 'ledger' && n.config.kind === 'database'
                  ? { ...n, config: { ...n.config, baseMs: 150, writeBaseMs: 20 } }
                  : n,
              ),
            }),
          },
          {
            id: 'denormalize',
            label: 'Denormalize — duplicate the data right onto the record',
            description: 'Reads skip the join entirely and come back fast. Writes get heavier, since now there are copies to keep in sync.',
            applyToGraph: (graph) => ({
              ...graph,
              nodes: graph.nodes.map((n) =>
                n.id === 'ledger' && n.config.kind === 'database'
                  ? { ...n, config: { ...n.config, baseMs: 30, writeBaseMs: 90 } }
                  : n,
              ),
            }),
          },
        ],
      },
      slo: { maxP99Ms: 120, maxErrorRate: 0, minThroughputRps: 35 },
      debrief: {
        successBody: [
          'With reads this dominant, denormalizing wins outright: skipping the join drops read latency well under the limit, and the heavier writes barely register since there are so few of them.',
          "That's the whole lesson — this isn't \"denormalization is better,\" it's \"the right shape depends on your read/write ratio.\" Flip that ratio to write-heavy and normalized would win instead.",
        ],
        failureBody: [
          'Staying normalized keeps every join\'s 150ms cost on the read path — with this much read traffic, that\'s what\'s blowing the latency limit. Try denormalizing instead.',
        ],
        readmeQuote: {
          text: 'The goal of normalization is to eliminate redundant data and ensure data is consistent. A fully normalized database allows its structure to be extended to accommodate new types of data without changing the existing structure too much.',
          source: 'Chapter II · Normalization and Denormalization (Normalization)',
        },
        realWorldExamples: ['A read-heavy product catalog (denormalized for speed)', 'A financial ledger (normalized for consistency)'],
        interviewPhrase: '"I\'d default to normalized for correctness, and only denormalize the specific paths where read latency actually matters more than write simplicity — never the whole schema at once."',
        ruleOfThumb: 'Normalize for correctness by default. Denormalize only the reads that are both frequent and provably too slow.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which of these is a genuine advantage of normalization?',
      options: [
        { id: 'a', label: 'Reduces data redundancy and increases data consistency', correct: true, feedback: 'Right — one source of truth per fact.' },
        { id: 'b', label: 'It always makes reads faster than denormalization', correct: false, feedback: "The opposite is usually true for read-heavy paths — that's specifically what denormalization optimizes for." },
      ],
    },
    {
      id: 'q2',
      question: 'A workload is almost entirely writes, with data rarely read back. Which is the safer default?',
      options: [
        { id: 'a', label: 'Normalized — keep writes cheap and simple since that\'s nearly all this workload does', correct: true, feedback: 'Right — denormalization\'s whole cost lands on writes, which is exactly what dominates here.' },
        { id: 'b', label: 'Denormalized — optimize for the reads that barely happen', correct: false, feedback: "That would pay denormalization's write cost constantly for a read speedup this workload barely uses." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 5 -- When the Line Goes Down (CAP Theorem)
// ---------------------------------------------------------------------------

const l5StartGraph: SimGraph = {
  nodes: [client(), database('main-ledger', 'Main Ledger', 480, 160)],
  edges: [edge('client', 'main-ledger')],
}

const ch2Cap: Level = {
  id: 'ch2-cap',
  chapterId: 'ch2',
  order: 9,
  title: 'When the Line Goes Down',
  realConcept: 'CAP Theorem',
  analogyName: "Choosing what breaks when a depot goes dark",
  stages: [
    {
      kind: 'situation',
      title: 'One line, one point of failure',
      body: [
        'Every customer talks straight to your one Main Ledger depot. It works great — until a storm takes the phone line down and it goes completely dark for twenty minutes. What should the rest of the system do about that?',
      ],
    },
    {
      kind: 'teach',
      title: 'The CAP theorem',
      body: [
        'CAP theorem states that a distributed system can deliver only two of three things at once: **Consistency** (everyone sees the same data), **Availability** (every request gets a response), and **Partition tolerance** (the system keeps working despite a communication breakdown between nodes).',
        "In practice, networks fail — so partition tolerance usually isn't optional, which means the real choice is between Consistency and Availability when a partition actually happens. A **CP** system refuses to answer from a node it can't confirm is current. An **AP** system keeps answering anyway, accepting that the answer might be stale until things reconnect.",
      ],
      diagram: {
        steps: [
          { icon: '📒', label: 'Main Ledger' },
          { icon: '⚡', label: 'Line down' },
          { icon: '❓', label: 'Refuse, or answer stale?' },
        ],
        caption: "Partition tolerance isn't really optional — the actual choice is what happens next.",
      },
      readmeQuote: {
        text: 'CAP theorem states that a distributed system can deliver only two of the three desired characteristics Consistency, Availability, and Partition tolerance (CAP).',
        source: 'Chapter II · CAP Theorem',
      },
      realWorldExamples: ['MongoDB, HBase (CP-leaning)', 'Cassandra, CouchDB (AP-leaning)'],
      check: {
        question: 'A distributed database keeps answering requests during a network partition, even from a node that might have outdated data. What is it prioritizing?',
        options: [
          { id: 'a', label: 'Availability over consistency (AP)', correct: true, feedback: "Right — it's choosing to keep answering over guaranteeing freshness." },
          { id: 'b', label: 'Consistency over availability (CP)', correct: false, feedback: "A CP system would refuse to answer from the uncertain node instead — this is the opposite choice." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'twist',
      title: 'Design around the outage',
      brief: [
        "This exact storm already happened once, and the Main Ledger went dark for 20 minutes with nothing else in place. Decide how to build around it before it happens again.",
      ],
      startingGraph: l5StartGraph,
      unlockedKinds: ['client', 'database', 'replica'],
      lockedNodeIds: ['main-ledger'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(20), writeFraction: 0.3 },
      incidents: [{ id: 'outage', label: 'Main Ledger unreachable', startMs: 2000, endMs: 4000, killNodeIds: ['main-ledger'] }],
      decisionCard: {
        prompt: 'How should this be built, knowing the Main Ledger can go dark?',
        options: [
          {
            id: 'single',
            label: 'Keep it simple — one path straight to the Main Ledger',
            description: 'Nothing to keep in sync. But every request depends entirely on that one line staying up.',
            applyToGraph: (graph) => graph,
          },
          {
            id: 'redundant',
            label: 'Add a backup depot with its own copy in front',
            description: "Reads keep working from the backup's own copy even while the Main Ledger is dark — though it may be a little out of date. Writes still can't be confirmed until the line's back.",
            applyToGraph: (graph) => {
              const withoutDirectEdge = graph.edges.filter((e) => !(e.source === 'client' && e.target === 'main-ledger'))
              const backupNode = replica('backup-depot', 'Backup Depot', 270, 160, {
                replicationMode: 'async',
                staleReadFraction: 0.2,
              })
              return {
                nodes: [...graph.nodes, backupNode],
                edges: [...withoutDirectEdge, edge('client', 'backup-depot'), edge('backup-depot', 'main-ledger')],
              }
            },
          },
        ],
      },
      slo: { maxErrorRate: 0.2, minThroughputRps: 12 },
      debrief: {
        successBody: [
          'When the storm hit this time, reads kept resolving from the backup depot\'s own copy the whole way through the outage — only writes (which genuinely can\'t be confirmed without the Main Ledger) came back as errors, and only for the outage window.',
          "That's an AP choice: you kept answering, accepting that the backup's reads might run a little behind, rather than going fully dark like before.",
        ],
        failureBody: [
          'With a single path and no backup, the entire Main Ledger outage becomes a total outage — every request during that window fails, not just the writes. Add the backup depot.',
        ],
        readmeQuote: {
          text: 'An AP database delivers availability and partition tolerance at the expense of consistency. When a partition occurs, all nodes remain available but those at the wrong end of a partition might return an older version of data than others.',
          source: 'Chapter II · CAP Theorem (AP database)',
        },
        realWorldExamples: ['Cassandra staying available during a network split, serving from whichever replica it can reach'],
        interviewPhrase: '"For this kind of read-heavy traffic, I\'d lean AP — a stale price is recoverable, a total outage isn\'t. I\'d only reach for CP if serving wrong data were worse than serving nothing."',
        ruleOfThumb: 'No redundancy means no partition tolerance at all — the outage just becomes total. Redundancy is what turns "everything breaks" into "some of it, for a while."',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Why is partition tolerance treated as effectively non-optional in real distributed systems?',
      options: [
        { id: 'a', label: 'Networks genuinely fail, so a system that can\'t tolerate any partition at all isn\'t realistic to run', correct: true, feedback: "Right — that's why the real-world choice narrows down to C vs A." },
        { id: 'b', label: 'It\'s a purely theoretical concern that never comes up in practice', correct: false, feedback: 'Network partitions are a real, common failure mode in distributed systems — this is not just theoretical.' },
      ],
    },
    {
      id: 'q2',
      question: 'A CP database, during a partition, does what?',
      options: [
        { id: 'a', label: 'Shuts down or refuses to answer from the non-consistent side until the partition resolves', correct: true, feedback: 'Right — straight from the definition: it sacrifices availability to guarantee consistency.' },
        { id: 'b', label: 'Keeps answering from every node regardless of certainty', correct: false, feedback: "That's the AP choice, not CP." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 6 -- All Depots Agree, Or None Do (Distributed Transactions / 2PC)
// ---------------------------------------------------------------------------

const l6StartGraph: SimGraph = { nodes: [client()], edges: [] }

const ch2DistributedTransactions: Level = {
  id: 'ch2-distributed-transactions',
  chapterId: 'ch2',
  order: 12,
  title: 'All Depots Agree, or None Do',
  realConcept: 'Distributed Transactions (Two-Phase Commit)',
  analogyName: 'Checking with the other depot before it\'s final',
  stages: [
    {
      kind: 'situation',
      title: 'Moving a parcel between two books',
      body: [
        "Transferring a parcel between two depots means updating two separate ledgers at once: subtract it from the origin's book, add it to the destination's. If only one of those updates lands, the parcel now exists in neither depot's records, or in both.",
      ],
    },
    {
      kind: 'teach',
      title: 'Distributed transactions and two-phase commit',
      body: [
        'A **distributed transaction** spans two or more databases, and — just like a single-database transaction — all the nodes involved must commit, or all must abort and the whole thing rolls back. Coordinating that across separate machines is the hard part.',
        'The classic solution is **two-phase commit (2PC)**: a coordinator node runs a **prepare phase**, asking every participant to confirm it\'s ready, then a **commit phase**, telling everyone to actually commit only once all of them said yes. It works — but it has real problems: a crashed participant, or worse, a crashed coordinator, and the whole protocol blocks, waiting.',
      ],
      diagram: {
        steps: [
          { icon: '🧭', label: 'Coordinator' },
          { icon: '❓', label: 'Prepare: everyone ready?' },
          { icon: '✅', label: 'Commit — together' },
        ],
        caption: 'Nobody commits until everybody has agreed to.',
      },
      readmeQuote: {
        text: 'The two-phase commit (2PC) protocol is a distributed algorithm that coordinates all the processes that participate in a distributed transaction on whether to commit or abort (roll back) the transaction.',
        source: 'Chapter II · Distributed Transactions (Two-Phase commit)',
      },
      realWorldExamples: ['A payment service debiting one ledger and crediting another atomically', 'XA transactions across two relational databases'],
      check: {
        question: 'What specifically is the "prepare phase" of two-phase commit for?',
        options: [
          { id: 'a', label: 'The coordinator collects confirmation from every participant that it\'s ready to commit, before anyone actually commits', correct: true, feedback: 'Right — nobody commits until everyone has said they can.' },
          { id: 'b', label: 'It applies the transaction\'s changes to every database immediately', correct: false, feedback: "That's the commit phase's job — prepare is only about collecting agreement first." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'guided',
      title: 'Require agreement before committing',
      brief: [
        "Model the coordination cost using the same mechanic you just learned: a synchronously-replicated write already can't be considered done until a second copy confirms it — which is exactly what 2PC demands across two depots.",
      ],
      startingGraph: l6StartGraph,
      unlockedKinds: ['client', 'database', 'replica'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(20), writeFraction: 1 },
      slo: { maxErrorRate: 0, minThroughputRps: 18, maxWriteP99Ms: 450 },
      guidedSteps: [
        { instruction: 'Drag a Ledger Copy onto the map — this stands in for the second depot the coordinator has to get agreement from.' },
        { instruction: 'Select it and set its replication mode to Synchronous — nothing is final until both sides confirm.' },
        { instruction: 'Drag a Ledger onto the map and wire Ledger Copy → Ledger.' },
        { instruction: 'Wire Customers → Ledger Copy.' },
        { instruction: 'Press ▶ Run.' },
      ],
      debrief: {
        successBody: [
          'Every write in that run had to wait for both depots to confirm before it counted as done — check the write latency number against what you saw in the replication level\'s asynchronous run. That gap is the real, measurable cost of requiring agreement.',
          "This is the honest trade: 2PC buys you a real guarantee (both books genuinely agree, always), and it charges you latency on every single write to do it.",
        ],
        failureBody: [
          'Make sure the Ledger Copy is set to Synchronous, not Asynchronous — async would skip the agreement this level is about.',
        ],
        readmeQuote: {
          text: 'In other words, all the nodes must commit, or all must abort and the entire transaction rolls back. This is why we need distributed transactions.',
          source: 'Chapter II · Distributed Transactions',
        },
        realWorldExamples: ['A booking system reserving inventory and charging a card as one atomic unit'],
        interviewPhrase: '"Two-phase commit gives a real all-or-nothing guarantee across services, but it\'s a blocking protocol — if the coordinator or any one participant is unreachable, every transaction waiting on it stalls, not just the one that was in flight."',
        ruleOfThumb: 'Agreement across two systems is never free — the cost shows up as latency on every write, not just the ones that fail.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is a well-known problem with the two-phase commit protocol?',
      options: [
        { id: 'a', label: 'It is a blocking protocol — if the coordinator crashes, participants can be left waiting indefinitely', correct: true, feedback: 'Right — straight from the README\'s own list of 2PC problems.' },
        { id: 'b', label: 'It cannot guarantee that all nodes commit together', correct: false, feedback: "That all-or-nothing guarantee is exactly what 2PC provides when it works — its problem is what happens when a node or the coordinator crashes." },
      ],
    },
    {
      id: 'q2',
      question: 'Why does a distributed transaction need special coordination that a single-database transaction doesn\'t?',
      options: [
        { id: 'a', label: 'Multiple independent databases must all agree to commit or all abort together, across a network', correct: true, feedback: 'Right — a single database can guarantee this internally; multiple databases need a protocol like 2PC to do it together.' },
        { id: 'b', label: 'It doesn\'t — a distributed transaction works exactly like a local one, with no extra coordination', correct: false, feedback: 'Coordinating commit/abort across separate databases over a network is exactly the hard part a local transaction doesn\'t have to deal with.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 7 -- The Regional Sorting Desks (Sharding)
// ---------------------------------------------------------------------------

const l7StartGraph: SimGraph = {
  nodes: [
    client(),
    shardRouter('desk', 'Sorting Desk', 280, 160, 1.5),
    database('shard-0', 'Ledger A', 500, 60, { capacityRps: 90, writeCapacityRps: 45 }),
    database('shard-1', 'Ledger B', 500, 140, { capacityRps: 90, writeCapacityRps: 45 }),
    database('shard-2', 'Ledger C', 500, 220, { capacityRps: 90, writeCapacityRps: 45 }),
    database('shard-3', 'Ledger D', 500, 300, { capacityRps: 90, writeCapacityRps: 45 }),
  ],
  edges: [
    edge('client', 'desk'),
    edge('desk', 'shard-0'),
    edge('desk', 'shard-1'),
    edge('desk', 'shard-2'),
    edge('desk', 'shard-3'),
  ],
}

const ch2Sharding: Level = {
  id: 'ch2-sharding',
  chapterId: 'ch2',
  order: 13,
  title: 'The Regional Sorting Desks',
  realConcept: 'Sharding',
  analogyName: "Splitting the ledger by parcel ID",
  stages: [
    {
      kind: 'situation',
      title: 'One ledger, one popular customer',
      body: [
        "You've split parcel records across four ledgers by ID to spread the load evenly. Except it isn't even at all — one enormous shipping account alone generates more traffic than any other single ledger can absorb, and its ledger is buckling while the other three sit half-idle.",
      ],
    },
    {
      kind: 'teach',
      title: 'Sharding',
      body: [
        '**Sharding** (horizontal partitioning) splits one table\'s rows across multiple smaller databases called shards, each holding the same schema but a distinct, independent slice of the data. It\'s cheaper to scale this way than to keep buying bigger single machines.',
        "The catch is real traffic isn't evenly distributed. Some keys — a popular account, a trending item — get asked for far more than others, and if your sharding rule happens to route a hot key's traffic onto one shard, that shard runs hot no matter how evenly you split the *data*. This is sharding's own listed weakness: **rebalancing**, when load isn't uniform across shards.",
      ],
      diagram: {
        steps: [
          { icon: '🧭', label: 'Sorting Desk' },
          { icon: '📕', label: 'Ledger A (hot)' },
          { icon: '📗', label: 'Ledger B' },
          { icon: '📘', label: 'Ledger C' },
        ],
        caption: 'Even split by rule, uneven in practice — a popular key can still overload one shard.',
      },
      readmeQuote: {
        text: 'Rebalancing: If the data distribution is not uniform or there is a lot of load on a single shard, in such cases, we have to rebalance our shards so that the requests are as equally distributed among the shards as possible.',
        source: 'Chapter II · Sharding (Disadvantages)',
      },
      realWorldExamples: ['A celebrity account overwhelming one shard in a social app', 'Instagram\'s early sharding-by-user-ID hot-shard issues'],
      check: {
        question: 'Why can one shard run hot even when a sharding rule splits keys evenly across shards?',
        options: [
          { id: 'a', label: 'Real traffic isn\'t evenly distributed across keys — a single popular key can dominate whichever shard it lands on', correct: true, feedback: 'Right — an even split of keys isn\'t the same as an even split of traffic.' },
          { id: 'b', label: 'It can\'t — an even split by rule always produces even traffic', correct: false, feedback: "That's exactly the assumption that breaks in practice, which is why rebalancing is a real, named problem." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Find and fix the hot shard',
      brief: [
        'One depot in this pool is running hot from an uneven key. Find the overloaded shard on the dashboard and give it enough capacity to absorb its real share.',
      ],
      startingGraph: l7StartGraph,
      unlockedKinds: ['client', 'database', 'shardRouter'],
      lockedNodeIds: ['desk', 'shard-0', 'shard-1', 'shard-2', 'shard-3'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(300), writeFraction: 0.2 },
      slo: { maxErrorRate: 0.01, minThroughputRps: 280 },
      debrief: {
        successBody: [
          'One key alone was worth nearly half the total traffic, and it landed entirely on one shard — turning that shard\'s capacity up was the only real fix, since the traffic itself can\'t be split any finer than "which shard owns this key."',
          "The other three shards never came close to their limit the whole time. That imbalance — not total traffic — was the actual problem.",
        ],
        failureBody: [
          'Check the dashboard for which shard is showing errors — that\'s the hot one. Select it and turn its capacity up.',
        ],
        readmeQuote: {
          text: 'The justification for data sharding is that, after a certain point, it is cheaper and more feasible to scale horizontally by adding more machines than to scale it vertically by adding powerful servers.',
          source: 'Chapter II · Sharding',
        },
        realWorldExamples: ['Manually over-provisioning a known hot shard ahead of a product launch'],
        interviewPhrase: '"Sharding assumes roughly uniform access patterns — the moment one key gets disproportionately popular, you either over-provision that shard specifically or split that key out entirely."',
        ruleOfThumb: 'Sharding splits data evenly. It does not split traffic evenly — those are two different problems.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is sharding, in one line?',
      options: [
        { id: 'a', label: 'Splitting one table\'s rows across multiple databases, each holding the same schema but a distinct subset of the data', correct: true, feedback: 'Right — horizontal partitioning, straight from the definition.' },
        { id: 'b', label: 'Splitting a database into separate databases by function (e.g. billing vs. orders)', correct: false, feedback: "That's federation — sharding splits ONE function's data by key, not by function." },
      ],
    },
    {
      id: 'q2',
      question: 'Which of these is a genuine disadvantage of sharding?',
      options: [
        { id: 'a', label: 'Joins across shards become inefficient or infeasible, since data now lives on separate machines', correct: true, feedback: 'Right — straight from the README\'s listed disadvantages.' },
        { id: 'b', label: 'It makes horizontal scaling impossible', correct: false, feedback: "Sharding is specifically a way to enable horizontal scaling, not prevent it." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Level 8 -- Adding a Fifth Desk (Consistent Hashing)
// ---------------------------------------------------------------------------

const l8StartGraph: SimGraph = { nodes: [client()], edges: [] }

const ch2ConsistentHashing: Level = {
  id: 'ch2-consistent-hashing',
  chapterId: 'ch2',
  order: 14,
  title: 'Adding a Fifth Desk',
  realConcept: 'Consistent Hashing',
  analogyName: 'Moving as few parcels as possible',
  stages: [
    {
      kind: 'situation',
      title: 'Growth means a new desk',
      body: [
        "Business is growing, and four sorting desks aren't enough — you need a fifth. Simple enough, except: the moment the desk count changes, `key % desk count` changes for almost every key at once. Nearly the entire ledger has to be reshuffled just to add one desk.",
      ],
    },
    {
      kind: 'teach',
      title: 'Consistent hashing',
      body: [
        "The plain hashing you've used so far routes a key by `hash(key) mod N`. The moment `N` changes — a desk added or removed — that formula gives almost every key a new answer, meaning the majority of your data has to move, just to grow by one machine.",
        '**Consistent hashing** fixes this by placing nodes *and* keys on a hash ring instead: a key routes to the nearest node clockwise from it. Add or remove a node, and only the keys in that node\'s own slice of the ring move — everyone else\'s answer stays exactly the same. **Virtual nodes** (each physical shard claiming several smaller slices of the ring instead of one big one) smooth out the remaining unevenness.',
      ],
      diagram: {
        steps: [
          { icon: '⭕', label: 'Hash ring' },
          { icon: '🖥️', label: 'Nodes placed on it' },
          { icon: '➡️', label: 'Key → nearest node clockwise' },
        ],
        caption: 'Adding a node only steals a slice of the ring — not the whole thing.',
      },
      readmeQuote: {
        text: 'The problem with this is if we add or remove a node, it will cause N to change, meaning our mapping strategy will break as the same requests will now map to a different server... Using consistent hashing, only K/N data would require re-distributing.',
        source: 'Chapter II · Consistent Hashing',
      },
      realWorldExamples: ['Data partitioning in Apache Cassandra', 'Load distribution in Amazon DynamoDB'],
      check: {
        question: 'What is the actual, defining benefit of consistent hashing over plain `hash(key) mod N` routing?',
        options: [
          { id: 'a', label: 'Adding or removing a node only moves a small fraction of keys, instead of reshuffling almost everything', correct: true, feedback: "Right — that's the whole problem it was invented to solve." },
          { id: 'b', label: 'It automatically balances hot keys evenly across shards', correct: false, feedback: "It doesn't fix hot keys by itself — a popular key is still pinned to one node either way. Its benefit is specifically about resize cost." },
        ],
      },
    },
    {
      kind: 'build',
      mode: 'solo',
      title: 'Route with consistent hashing',
      brief: ['Build a sorting desk with three depots behind it, using consistent hashing as the routing strategy.'],
      startingGraph: l8StartGraph,
      unlockedKinds: ['client', 'database', 'shardRouter'],
      workload: { durationMs: 6000, tickMs: 250, trafficCurve: constantTraffic(60), writeFraction: 0.2 },
      slo: { maxErrorRate: 0, minThroughputRps: 50 },
      debrief: {
        successBody: [
          'Wired up and running — from the traffic\'s point of view, a consistent-hashing desk behaves just like the modulo one you built earlier. The difference it buys you doesn\'t show up in this run at all.',
          "Here's the number that matters instead, measured directly from this game's own routing engine: growing a 4-desk pool to 5 under plain modulo routing reshuffles about 80% of all keys. Under consistent hashing, the same resize moves only about 22%. Same growth, radically less disruption — and it costs nothing while traffic is flowing normally, like just now.",
        ],
        failureBody: ['Wire Customers → Sorting Desk → three depots, and make sure the desk\'s routing strategy is set to Consistent Hashing.'],
        readmeQuote: {
          text: 'This helps us reduce the probability of hotspots... Makes rapid scaling up and down more predictable.',
          source: 'Chapter II · Consistent Hashing (Virtual Nodes, Advantages)',
        },
        realWorldExamples: ['Adding a node to a Cassandra ring without a full cluster rebalance'],
        interviewPhrase: '"Consistent hashing doesn\'t fix an uneven key distribution — what it buys you is a cluster that can grow or shrink without reshuffling almost everything, every time."',
        ruleOfThumb: 'Modulo routing is simplest until the day you need to resize — then consistent hashing is the difference between moving a slice of your data and moving almost all of it.',
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What are virtual nodes for, in consistent hashing?',
      options: [
        { id: 'a', label: 'Giving each physical node several smaller slices of the ring instead of one big one, smoothing out uneven load distribution', correct: true, feedback: 'Right — straight from the definition.' },
        { id: 'b', label: 'Creating backup copies of the data for durability', correct: false, feedback: "That's what replication factor / data replication handles — virtual nodes are specifically about ring placement and load smoothing." },
      ],
    },
    {
      id: 'q2',
      question: 'Does consistent hashing, by itself, fix a single hot key overwhelming one shard?',
      options: [
        { id: 'a', label: 'No — a hot key is still pinned to whichever node owns it either way; consistent hashing addresses resize cost, not key-level imbalance', correct: true, feedback: 'Right — this is the distinction the teach stage draws directly.' },
        { id: 'b', label: 'Yes — it automatically spreads any single key\'s traffic across multiple nodes', correct: false, feedback: "A single key still maps to one node under consistent hashing — it doesn't split a key's own traffic." },
      ],
    },
  ],
}

// Full pedagogical order, matching the source README's own Chapter II
// sequence: the database primitive itself, then SQL/NoSQL/comparison,
// replication, indexes, normalization, ACID/BASE, CAP, PACELC,
// transactions, distributed transactions, sharding, consistent hashing,
// and federation to close the chapter.
const [sql, noSql, sqlVsNoSql, acidBase, pacelc, transactions, federation] = CHAPTER_2_EXTRA_LEVELS

export const CHAPTER_2: Chapter = {
  id: 'ch2',
  order: 2,
  title: 'Chapter II · Data',
  subtitle: 'Databases, replication, and the shapes data takes at scale',
  levelIds: [
    ch2Db.id,
    sql.id,
    noSql.id,
    sqlVsNoSql.id,
    ch2Replication.id,
    ch2Indexes.id,
    ch2Normalization.id,
    acidBase.id,
    ch2Cap.id,
    pacelc.id,
    transactions.id,
    ch2DistributedTransactions.id,
    ch2Sharding.id,
    ch2ConsistentHashing.id,
    federation.id,
  ],
}

export const CHAPTER_2_LEVELS: Level[] = [
  ch2Db,
  sql,
  noSql,
  sqlVsNoSql,
  ch2Replication,
  ch2Indexes,
  ch2Normalization,
  acidBase,
  ch2Cap,
  pacelc,
  transactions,
  ch2DistributedTransactions,
  ch2Sharding,
  ch2ConsistentHashing,
  federation,
]
