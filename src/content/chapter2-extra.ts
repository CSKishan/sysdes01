// Chapter II -- the teach-only topics: SQL, NoSQL, SQL vs NoSQL, ACID vs
// BASE, PACELC, Transactions, and Federation. None of these have a natural
// traffic/cost mechanic of their own (they're either a database *flavor*,
// a *consistency model*, or a *split-by-function* pattern) -- the build
// levels that DO have a mechanic (the ledger, replication, indexes,
// normalization, CAP, distributed transactions, sharding, consistent
// hashing) live in chapter2.ts.

import type { Level } from './types'

// ---------------------------------------------------------------------------
// SQL databases
// ---------------------------------------------------------------------------

const ch2Sql: Level = {
  id: 'ch2-sql',
  chapterId: 'ch2',
  order: 2,
  title: 'The Bound Ledger',
  realConcept: 'SQL databases',
  analogyName: 'Every page has its place',
  stages: [
    {
      kind: 'situation',
      title: 'A ledger with rules',
      body: [
        "Your ledger isn't just a pile of paper — every entry follows a strict form. A parcel record always has an ID, a sender, a recipient, a weight, and a price, in that order, on every single page. Nothing gets written any other way.",
      ],
    },
    {
      kind: 'teach',
      title: 'SQL (relational) databases',
      body: [
        'A **SQL database** is a collection of data items with pre-defined relationships between them, organized as tables of columns and rows. Every row in a table can carry a unique **primary key**, and rows in different tables can be linked together with **foreign keys** — which is what makes it "relational."',
        "Because every row in a table follows the same fixed shape, SQL databases are simple, accurate, and consistent — but that same fixed shape makes the schema expensive to change later, and spreading a rigid, related structure across many machines (horizontal scaling) is genuinely hard.",
      ],
      readmeQuote: {
        text: 'A SQL (or relational) database is a collection of data items with pre-defined relationships between them. These items are organized as a set of tables with columns and rows.',
        source: 'Chapter II · SQL databases',
      },
      realWorldExamples: ['PostgreSQL', 'MySQL', 'Amazon Aurora'],
      check: {
        question: 'What specifically makes a SQL database "relational"?',
        options: [
          { id: 'a', label: 'Rows in different tables can be linked together via primary/foreign keys', correct: true, feedback: "Right — that linking between tables is exactly what \"relational\" refers to." },
          { id: 'b', label: 'It stores everything in a single giant table', correct: false, feedback: "The opposite — relational databases split data across multiple related tables." },
          { id: 'c', label: 'It never uses a fixed schema', correct: false, feedback: "SQL databases specifically DO enforce a fixed schema — that's a NoSQL trait." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which of these is a genuine disadvantage of SQL databases, per the trade-off?',
      options: [
        { id: 'a', label: 'Difficult to scale horizontally, and schema changes are expensive', correct: true, feedback: 'Right — the rigid, related schema that gives SQL its consistency also makes it harder to reshape or spread across machines.' },
        { id: 'b', label: 'They cannot guarantee data consistency', correct: false, feedback: "Data consistency is specifically one of SQL's core strengths, not a weakness." },
      ],
    },
    {
      id: 'q2',
      question: 'What connects a row in one SQL table to a row in another?',
      options: [
        { id: 'a', label: 'A foreign key referencing the other table’s primary key', correct: true, feedback: 'Right — that reference is the relationship.' },
        { id: 'b', label: 'Physical proximity on disk', correct: false, feedback: "Relationships are logical (via keys), not about where bytes happen to sit on disk." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// NoSQL databases
// ---------------------------------------------------------------------------

const ch2NoSql: Level = {
  id: 'ch2-nosql',
  chapterId: 'ch2',
  order: 3,
  title: 'The Loose-Leaf Ledger',
  realConcept: 'NoSQL databases',
  analogyName: 'Any page, any shape',
  stages: [
    {
      kind: 'situation',
      title: 'Not everything fits a form',
      body: [
        'A courier radios in a delivery-attempt note: a photo, a timestamp, a free-text remark, maybe a signature — and no two notes look quite the same. Forcing this into the bound ledger\'s fixed columns would mean leaving most of every page blank.',
      ],
    },
    {
      kind: 'teach',
      title: 'NoSQL databases',
      body: [
        '**NoSQL** is a broad category for any database that doesn\'t use SQL as its primary access language — data doesn\'t have to conform to a pre-defined schema. Types include document, key-value, graph, time-series, and wide-column stores, each suited to a different shape of data and query.',
        "The trade-off mirrors SQL's in reverse: a flexible, schema-less shape scales out easily across machines and adapts to messy real-world data, but usually at the cost of the strict consistency guarantees a relational database gives you for free.",
      ],
      diagram: {
        steps: [
          { icon: '📄', label: 'Document' },
          { icon: '🔑', label: 'Key-value' },
          { icon: '🕸️', label: 'Graph' },
        ],
        caption: 'Same broad family, very different shapes of data.',
      },
      readmeQuote: {
        text: "NoSQL is a broad category that includes any database that doesn't use SQL as its primary data access language... Unlike in relational databases, data in a NoSQL database doesn't have to conform to a pre-defined schema.",
        source: 'Chapter II · NoSQL databases',
      },
      realWorldExamples: ['MongoDB (document)', 'Redis (key-value)', 'Amazon DynamoDB (key-value)', 'Neo4j (graph)'],
      check: {
        question: 'A delivery-attempt note where every entry has different fields (a photo here, a signature there) is a natural fit for which kind of database?',
        options: [
          { id: 'a', label: 'A schema-less NoSQL database', correct: true, feedback: 'Right — no pre-defined shape means each record can differ from the next.' },
          { id: 'b', label: 'A strict SQL table', correct: false, feedback: "A fixed-column SQL table would force every note into the same shape, wasting space on blank columns." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the defining trait shared by every kind of NoSQL database?',
      options: [
        { id: 'a', label: "Data doesn't have to conform to a pre-defined schema", correct: true, feedback: 'Right — the one thing document, key-value, graph, etc. all share.' },
        { id: 'b', label: 'They are always faster than SQL databases', correct: false, feedback: "Speed depends on the workload — schema flexibility, not raw speed, is the defining trait." },
      ],
    },
    {
      id: 'q2',
      question: 'A key-value store like Redis is best described as...',
      options: [
        { id: 'a', label: 'One of the simplest NoSQL types — data saved as key-value pairs, optimized for fast lookups', correct: true, feedback: 'Right — simple, fast, and a natural fit for caching and session data.' },
        { id: 'b', label: 'A database that enforces relationships between tables via foreign keys', correct: false, feedback: "That's describing a relational (SQL) database, not a key-value store." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// SQL vs NoSQL databases
// ---------------------------------------------------------------------------

const ch2SqlVsNoSql: Level = {
  id: 'ch2-sql-vs-nosql',
  chapterId: 'ch2',
  order: 4,
  title: 'Choosing the Ledger',
  realConcept: 'SQL vs NoSQL databases',
  analogyName: "Bound book, or a box of loose notes?",
  stages: [
    {
      kind: 'situation',
      title: 'Two ledgers, two jobs',
      body: [
        "You're setting up a new branch and need to decide: a strict bound ledger for parcel records with clear relationships (sender, recipient, price), or a flexible box of notes for something messier, like customer feedback that never looks the same twice.",
      ],
    },
    {
      kind: 'teach',
      title: 'Picking between them',
      body: [
        'Neither SQL nor NoSQL is universally "better" — they were built for different requirements. SQL databases are vertically scalable and ACID-compliant by default, which suits structured data, complex relationships, and transactions. NoSQL databases scale horizontally far more easily and drop the fixed schema, which suits dynamic, high-volume, less-relational data.',
        "In practice: reach for SQL when you have structured data, need complex joins, or need real transactions. Reach for NoSQL when your schema will keep changing, your data isn't very relational, or you need very high throughput more than you need strict consistency.",
      ],
      readmeQuote: {
        text: 'Relational databases are structured and have predefined schemas while non-relational databases are unstructured, distributed, and have a dynamic schema.',
        source: 'Chapter II · SQL vs NoSQL databases',
      },
      realWorldExamples: [
        'A bank\'s transaction ledger (SQL — needs ACID transactions)',
        'A social feed\'s activity log (NoSQL — high volume, flexible shape)',
      ],
      check: {
        question: 'A system needs to guarantee that money debited from one account is always credited to another, with no in-between state ever visible. Which is the safer default?',
        options: [
          { id: 'a', label: 'SQL — ACID transactions guarantee this kind of all-or-nothing consistency', correct: true, feedback: 'Right — this is exactly the scenario ACID transactions exist for.' },
          { id: 'b', label: 'NoSQL — its flexible schema handles this better', correct: false, feedback: "Schema flexibility isn't the relevant property here; transactional guarantees are, and SQL databases are built around them." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which scaling pattern is most associated with NoSQL databases?',
      options: [
        { id: 'a', label: 'Horizontal scaling — adding more (often cheap, commodity) machines', correct: true, feedback: 'Right — NoSQL databases are generally built to distribute across servers easily.' },
        { id: 'b', label: 'Vertical scaling only, on a single powerful machine', correct: false, feedback: "That's more characteristic of traditional SQL deployments." },
      ],
    },
    {
      id: 'q2',
      question: "You need complex joins across strictly related, structured data. Which is the better default?",
      options: [
        { id: 'a', label: 'SQL', correct: true, feedback: 'Right — complex joins over structured, related data is squarely SQL’s strength.' },
        { id: 'b', label: 'NoSQL', correct: false, feedback: "NoSQL databases generally aren't built for complex cross-table joins." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// ACID and BASE consistency models
// ---------------------------------------------------------------------------

const ch2AcidBase: Level = {
  id: 'ch2-acid-base',
  chapterId: 'ch2',
  order: 8,
  title: 'Two Promises',
  realConcept: 'ACID and BASE consistency models',
  analogyName: 'A promise kept exactly, or kept eventually',
  stages: [
    {
      kind: 'situation',
      title: 'What can you promise a customer?',
      body: [
        'A customer pays for shipping. You can promise "the moment you pay, every single record — the ledger, the receipt, the tracking page — shows the new balance, guaranteed, or none of them do." Or you can promise "it\'ll all be correct in a few seconds, we promise." Those are very different promises.',
      ],
    },
    {
      kind: 'teach',
      title: 'ACID and BASE',
      body: [
        '**ACID** — Atomicity, Consistency, Isolation, Durability — is the strict promise: a transaction\'s operations all succeed or all roll back, transactions don\'t interfere with each other, and once committed, a write survives a crash. This is the default for relational databases.',
        '**BASE** — Basically Available, Soft state, Eventual consistency — is the looser promise many NoSQL databases make instead: the system is available most of the time, replicas don\'t have to agree instantly, and reads may return stale data for a while, but it converges to correct eventually. Trading strict consistency for availability and scale.',
      ],
      readmeQuote: {
        text: 'The term ACID stands for Atomicity, Consistency, Isolation, and Durability. ACID properties are used for maintaining data integrity during transaction processing.',
        source: 'Chapter II · ACID and BASE consistency models',
      },
      realWorldExamples: ['A bank transfer (ACID)', 'A social media like-count that catches up a moment later (BASE)'],
      check: {
        question: "A \"like\" count on a post is briefly wrong right after you tap it, then corrects itself a second later. What consistency model is this?",
        options: [
          { id: 'a', label: 'BASE — eventual consistency', correct: true, feedback: "Right — briefly stale, then converges. That's the whole idea of eventual consistency." },
          { id: 'b', label: 'ACID — atomicity', correct: false, feedback: "ACID's atomicity is about all-or-nothing transactions, not about tolerating a temporarily-stale read." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which ACID property means a transaction\'s writes survive even a crash right after it commits?',
      options: [
        { id: 'a', label: 'Durability', correct: true, feedback: 'Right — once committed, it stays committed.' },
        { id: 'b', label: 'Isolation', correct: false, feedback: "Isolation is about transactions not interfering with each other, not about surviving a crash." },
      ],
    },
    {
      id: 'q2',
      question: 'What does the "soft state" in BASE actually mean?',
      options: [
        { id: 'a', label: "Stores don't have to be instantly write-consistent, and different replicas don't have to agree at all times", correct: true, feedback: "Right — replicas are allowed to briefly disagree under BASE." },
        { id: 'b', label: 'Data is stored only in memory, never on disk', correct: false, feedback: "That's not what \"soft state\" refers to here — it's about consistency looseness, not storage medium." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// PACELC Theorem
// ---------------------------------------------------------------------------

const ch2Pacelc: Level = {
  id: 'ch2-pacelc',
  chapterId: 'ch2',
  order: 10,
  title: 'The Other Half of the Trade-off',
  realConcept: 'PACELC Theorem',
  analogyName: "What if nothing's even broken?",
  stages: [
    {
      kind: 'situation',
      title: 'No outage, still a trade-off',
      body: [
        "CAP told you what happens when the network between depots breaks. But most days, nothing is broken at all — and you still have to decide how tightly your depots stay in sync. That's a different question, and CAP doesn't answer it.",
      ],
    },
    {
      kind: 'teach',
      title: 'PACELC',
      body: [
        'CAP only speaks to what happens *during* a **P**artition: choose **A**vailability or **C**onsistency. **PACELC** extends it: **E**lse — even when the system is running normally, with no partition at all — you still have to choose between **L**atency and **C**onsistency.',
        "This is exactly the choice you already made with async vs. sync replication: sync gives you consistency at the cost of waiting for every replica to confirm (higher latency); async gives you low latency by not waiting, at the cost of replicas briefly disagreeing. PACELC just gives that everyday trade-off its name.",
      ],
      readmeQuote: {
        text: 'PACELC extends the CAP theorem by introducing latency (L) as an additional attribute of a distributed system. The theorem states that else (E), even when the system is running normally in the absence of partitions, one has to choose between latency (L) and consistency (C).',
        source: 'Chapter II · PACELC Theorem',
      },
      realWorldExamples: ['Choosing synchronous vs. asynchronous replication with no outage in sight', 'DynamoDB\'s tunable consistency vs. latency settings'],
      check: {
        question: 'A team turns on synchronous replication for extra consistency, and their write latency goes up — even though nothing failed. What does PACELC say this trade-off is called?',
        options: [
          { id: 'a', label: 'The "Else" (E) trade-off: latency vs. consistency during normal operation', correct: true, feedback: 'Right — this is exactly the everyday-operation half of PACELC.' },
          { id: 'b', label: 'The CAP trade-off between availability and partition tolerance', correct: false, feedback: "CAP's trade-off only applies during an actual network partition — nothing failed here." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What key limitation of the CAP theorem does PACELC address?',
      options: [
        { id: 'a', label: 'CAP makes no provision for latency/performance when the system is healthy', correct: true, feedback: 'Right — CAP is silent on the common case where nothing is partitioned.' },
        { id: 'b', label: 'CAP doesn\'t apply to distributed systems at all', correct: false, feedback: "CAP is specifically about distributed systems — PACELC extends it, doesn't replace its domain." },
      ],
    },
    {
      id: 'q2',
      question: 'Under PACELC, what do you trade for lower write latency when nothing is partitioned?',
      options: [
        { id: 'a', label: 'Consistency', correct: true, feedback: 'Right — the "L vs C" choice is the heart of the Else clause.' },
        { id: 'b', label: 'Partition tolerance', correct: false, feedback: "Partition tolerance is CAP's concern during an actual partition, not PACELC's everyday-operation trade-off." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

const ch2Transactions: Level = {
  id: 'ch2-transactions',
  chapterId: 'ch2',
  order: 11,
  title: 'One Unit of Work',
  realConcept: 'Transactions',
  analogyName: "All of it happens, or none of it does",
  stages: [
    {
      kind: 'situation',
      title: 'Halfway through',
      body: [
        'A shipment record needs two updates at once: subtract the parcel from the origin depot\'s count, add it to the destination depot\'s count. Power flickers right after the first update. If nothing protects this, the parcel now exists in neither depot\'s books — or in both.',
      ],
    },
    {
      kind: 'teach',
      title: 'Transactions',
      body: [
        'A **transaction** is a series of database operations treated as one single unit of work: either all of them succeed, or all of them are rolled back as if none had happened. This is exactly what protects the two-depot update above from leaving the books half-changed.',
        'A transaction moves through states as it runs: **Active** while executing, **Partially committed** after its last operation, **Committed** once every effect is permanently established, or — if a check fails — **Failed** and then **Aborted**, where the recovery manager rolls back every write it made.',
      ],
      diagram: {
        steps: [
          { icon: '▶️', label: 'Active' },
          { icon: '✅', label: 'Committed' },
          { icon: '↩️', label: 'or: Aborted' },
        ],
        caption: 'A transaction only ever lands on one of two final outcomes — never half-done.',
      },
      readmeQuote: {
        text: 'A transaction is a series of database operations that are considered to be a "single unit of work". The operations in a transaction either all succeed, or they all fail.',
        source: 'Chapter II · Transactions',
      },
      realWorldExamples: ['A bank transfer debiting one account and crediting another', 'An order that must both charge a card and reserve inventory'],
      check: {
        question: 'Power cuts out midway through a transaction, after only some of its operations completed. What should happen?',
        options: [
          { id: 'a', label: 'The recovery manager rolls back every write the transaction made, restoring the prior state', correct: true, feedback: 'Right — an incomplete transaction gets aborted and undone, never left half-applied.' },
          { id: 'b', label: 'Whatever completed before the outage stays, and the rest is simply skipped', correct: false, feedback: "That's exactly the half-done state a transaction exists to prevent." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What does it mean for a transaction to be in the "Committed" state?',
      options: [
        { id: 'a', label: 'All its operations succeeded and its effects are now permanently established', correct: true, feedback: 'Right — committed means done, and done for good.' },
        { id: 'b', label: 'It is currently in the middle of executing', correct: false, feedback: "That's the \"Active\" state, not \"Committed.\"" },
      ],
    },
    {
      id: 'q2',
      question: 'Which kind of database usually supports ACID transactions by default?',
      options: [
        { id: 'a', label: 'Relational (SQL) databases', correct: true, feedback: "Right — though it's worth remembering there are exceptions on both sides." },
        { id: 'b', label: 'All NoSQL databases, universally', correct: false, feedback: "Most non-relational databases loosen ACID guarantees in exchange for scale, though a few exceptions exist." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Database Federation
// ---------------------------------------------------------------------------

const ch2Federation: Level = {
  id: 'ch2-federation',
  chapterId: 'ch2',
  order: 15,
  title: 'Separate Books, One Front Desk',
  realConcept: 'Database Federation',
  analogyName: 'Splitting the ledger by department',
  stages: [
    {
      kind: 'situation',
      title: 'One ledger is doing too many jobs',
      body: [
        'Your single ledger now tracks parcels, billing, and staff schedules all at once — three very different kinds of records, all fighting over the same book. A billing query slows down a parcel lookup that has nothing to do with it.',
      ],
    },
    {
      kind: 'teach',
      title: 'Federation',
      body: [
        '**Federation** (or functional partitioning) splits one database up **by function** — parcels in one database, billing in another, schedules in a third — rather than splitting the same table across machines the way sharding does. A federation architecture makes several distinct physical databases appear as one logical database to whoever is asking.',
        'Because each piece is now smaller and dedicated to one job, federation buys you more write bandwidth and lets you scale, cache, and tune each piece for exactly what it does — at the cost of losing easy joins *across* functions, and needing application logic to know which database holds what.',
      ],
      readmeQuote: {
        text: 'Federation (or functional partitioning) splits up databases by function. The federation architecture makes several distinct physical databases appear as one logical database to end-users.',
        source: 'Chapter II · Database Federation',
      },
      realWorldExamples: ['A separate billing database from a product-catalog database', 'A large e-commerce platform splitting orders, inventory, and users into distinct databases'],
      check: {
        question: 'How does federation differ from sharding?',
        options: [
          { id: 'a', label: 'Federation splits a database by function (e.g. billing vs. parcels); sharding splits ONE function\'s data across machines by key', correct: true, feedback: 'Right — federation cuts along function, sharding cuts along key range within one function.' },
          { id: 'b', label: 'They\'re the same technique with different names', correct: false, feedback: "They solve related but distinct problems — splitting by function vs. splitting one table's rows." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the main cost of splitting a database by function (federation)?',
      options: [
        { id: 'a', label: 'Joins across the different functional databases become difficult or impossible', correct: true, feedback: 'Right — once billing and parcels live in separate databases, joining across them isn\'t simple anymore.' },
        { id: 'b', label: 'It makes the system slower for every single query, with no benefit', correct: false, feedback: "Federation genuinely helps scale and reduce contention within each function — the cost is specifically cross-function queries." },
      ],
    },
    {
      id: 'q2',
      question: 'A large app splits its "orders" data and "user profile" data into two separate databases. What is this an example of?',
      options: [
        { id: 'a', label: 'Federation (functional partitioning)', correct: true, feedback: 'Right — split by function/domain, exactly what federation means.' },
        { id: 'b', label: 'Sharding', correct: false, feedback: "Sharding would be splitting ONE of those (e.g. orders) across multiple machines by key, not separating by function." },
      ],
    },
  ],
}

export const CHAPTER_2_EXTRA_LEVELS: Level[] = [
  ch2Sql,
  ch2NoSql,
  ch2SqlVsNoSql,
  ch2AcidBase,
  ch2Pacelc,
  ch2Transactions,
  ch2Federation,
]
