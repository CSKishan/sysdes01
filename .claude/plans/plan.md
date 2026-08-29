# Packet & Post — Roadmap to Full Curriculum Coverage

## Context

`sysdes01` is **Packet & Post**, a React 19 + Vite + TypeScript game that teaches system design by
having you run a delivery company. Each level does situation → teach (with a verbatim quote from
`karanpratapsingh/system-design`) → guided build → solo build → twist, and every number the player
sees comes from a real queueing simulator (`src/engine/simulate.ts`), never from scripted outcomes.

**Goal:** make this the most comprehensive interactive system-design resource available — a learning
path *and* a lookup reference, covering the full curriculum with honest simulation behind it.

**Decisions taken (confirmed with user):**
1. **Depth-first** — finish each chapter to Chapter I's quality bar before starting the next.
2. **Add a browsable reference layer** — ungated Library view with search, glossary, and real URLs.
3. **Extend the engine substantially** — read/write split, persistence, replication, async queues,
   failure injection.

---

## Status — all ten phases delivered (branch `expand-v0.3`, `e80b1e0`)

**Where it stands today (135 source files, ~21.3k LOC):**

- **Full curriculum built.** Chapter 0 through Chapter IV plus Chapter V's Case Study mode
  (5 open-ended designs). Every campaign level follows situation → teach → guided build → solo
  build → twist and is scored against the real engine; `src/content/__tests__/chapterN.test.ts`
  runs each build level's real numbers through the engine to assert the intended failure *and* the
  intended fix both occur.
- **13 engine primitives** (`src/engine/types.ts:4`): `client`, `server`, `loadBalancer`, `cache`,
  `database`, `replica`, `shardRouter`, `queue`, `broker`, `apiGateway`, `service`, `rateLimiter`,
  `circuitBreaker` — with read/write split, consistent hashing, replication lag/staleness, write
  durability, shard imbalance, retries/backoff, circuit-breaker state machine, and multi-region
  failover all live-simulated.
- **`IncidentWindow` is active** — traffic spike, node outage, and network partition are wired into
  authored levels and into the Sandbox chaos toggle.
- **Real routing** — `src/App.tsx` is route-based with per-route lazy loading; every screen is a
  linkable URL (`/level/:id`, `/sandbox`, `/library/*`, `/review/*`, `/progress`, `/casestudy/*`).
- **Reference Library** (`/library`) — ungated topic pages, full-text search (`⌘K`/`Ctrl-K`),
  inline-linked glossary, numbers reference, per-chapter print cheat sheets, attribution page.
- **Mastery layer** — SM-2 spaced repetition, glossary flashcards, interview-phrase deck, progress
  dashboard (coverage heatmap, weak-area detection, streaks), Challenge leaderboard, achievements
  tied to real simulation results.
- **Settings** — reset / export / import progress + journal as JSON, light/dark theme,
  reduced-motion toggle. Zustand stores are versioned with migrations.
- **CI** — `.github/workflows/ci.yml` runs typecheck + lint + test + build on every PR.
- **Verification:** `npm test` → 26 files, 460 tests, all green. `npm run typecheck` /
  `npm run lint` / `npm run build` all clean.

### Phase-by-phase

| Phase | Scope | State |
|---|---|---|
| **0** | Foundations & debt paydown | ✅ Done — hash routing, store versioning + migrations, Settings view, 1-star scoring band, quiz coverage for every level, `ch1-scalability`, `ch0` "What is system design?", PR CI workflow, Playwright scripts use the standard resolver. |
| **1** | Reference Library | ✅ Done — `LibraryHome` / `TopicPage` / `GlossaryPage` / `NumbersPage` / `CheatSheetPage` / `AttributionPage`, `SearchPalette` client index, `[[term]]` glossary links in `RichText`, deep links, print stylesheet, topic neighbours derived from chapter order. |
| **2** | Engine v2 — writes, persistence, replication | ✅ Done — `opType` read/write split + `writeFraction`, `database` / `replica` / `shardRouter` primitives, sync vs async replication with stale-read rate, consistent hashing with hot-shard imbalance, index as a DB config trade-off, `IncidentWindow` activated, network-partition incident type, new SLO dimensions (`maxReplicationLagMs`, `maxWriteP99Ms`, `maxShardImbalance`, `minDurability`), engine tests expanded. |
| **3** | Chapter II — *Data* | ✅ Done — `chapter2.ts` + `chapter2-extra.ts`: Databases/DBMS, SQL, NoSQL, SQL vs NoSQL, Replication, Indexes, Normalization/Denormalization, ACID & BASE, CAP, PACELC, Transactions, Distributed Transactions, Sharding, Consistent Hashing, Federation. Anchor builds simulate lag/staleness, read/write index trade-off, hot shard, rebalance-on-loss, CAP partition, 2PC coordinator failure. Decision cards used for the genuine forks. `chapter2.test.ts` asserts fail-then-fix. |
| **4** | Engine v2.5 — async, messaging, services | ✅ Done — `queue` (depth, drain rate, backpressure, spike absorption via a real async path), `broker` (pub-sub fan-out, at-most-once vs at-least-once), `apiGateway` (routing/aggregation + hop cost), `service` (dependencies → cascading failure), async metrics with `QueueDepthChart` alongside `LatencyChart`. |
| **5** | Chapter III — *Architecture* | ✅ Done — `chapter3.ts` + `chapter3-extra.ts`: N-tier, Message Brokers, Message Queues, Pub-Sub, ESB, Monoliths vs Microservices, EDA, Event Sourcing, CQRS, API Gateway, REST/GraphQL/gRPC, long polling/WebSockets/SSE. `SequenceDiagramView` built as the second diagram type for protocol/request-pattern comparisons. |
| **6** | Engine v3 — resilience & operations | ✅ Mostly done — `rateLimiter` (token bucket / leaky bucket / sliding window), `circuitBreaker` (closed→open→half-open, visualised live), per-edge retries/timeouts/backoff (retry storm), multi-region topology with cross-region latency and regional failover, SLI/SLO/SLA vocabulary surfaced in the debrief scorecard. **Deviation:** service discovery / registry is modelled as a load-balancer routing mode (`types.ts:58`), not a standalone primitive — health checks and node churn as a first-class simulated primitive were not built. |
| **7** | Chapter IV — *Operations & Security* | ✅ Done — `chapter4.ts` + `chapter4-extra.ts`: Geohashing & Quadtrees, Circuit Breaker, Rate Limiting, Service Discovery, SLA/SLO/SLI, Disaster Recovery, VMs & Containers, OAuth 2.0 & OIDC, SSO, SSL/TLS/mTLS. Security topics are interactive sequence-diagram walkthroughs with a "spot the vulnerability" check; `QuadtreeVisualizer` gives recursive quadtree subdivision on a map grid. |
| **8** | Chapter V — Case Study mode | ✅ Done — `src/content/caseStudies/` (URL Shortener, WhatsApp, Twitter, Netflix, Uber) + `src/ui/casestudy/`: `RequirementsStage` (functional / non-functional scope choices), `EstimationStage` (DAU → RPS → storage → bandwidth calculator feeding the traffic curve), `CaseStudyDesignStage` (open canvas, every primitive available), `RubricReview` (hand-authored checklist per study with per-item explanation and a reference-architecture comparison), timed drill mode (45-minute countdown, transcript → journal). |
| **9** | Mastery & retention | ✅ Done — `SpacedQuizView` (SM-2 over the ~full question bank), `FlashcardsView` off the glossary, `InterviewPhrasesView` deck, `ProgressDashboard` (coverage heatmap / weak-area detection / streaks), Challenge leaderboard with cost-efficiency and time records, achievements tied to real simulation results (`achievements.ts`). |
| **10** | Polish & platform | 🟡 Partial — see "Still outstanding" below. Done: `useSimulationPlayback` / `QuizView` / `CanvasEditor` component tests, keyboard canvas editing + `prefers-reduced-motion`, per-route lazy loading + recharts code-split, named sandbox save/load + JSON/PNG export, attribution & licensing page, `scaffold-level.mjs` + `contentLint.test.ts`. |

---

## Still outstanding

Everything below is Phase 10 "fold in continuously" scope plus one Phase 6 deviation — none of it
blocks the curriculum, and the plan explicitly said to pick these up opportunistically.

| # | Item | Notes |
|---|---|---|
| 6.4 | **Service discovery as a first-class primitive** | Currently a load-balancer routing mode. A dedicated `serviceRegistry` with registration, health checks, and node-churn simulation was not built. Chapter IV's Service Discovery topic is taught on the LB behaviour instead. |
| 10.2 | **Accessibility — finish the pass** | Canvas keyboard editing and reduced-motion are in; still thin on dashboard ARIA, focus management across route transitions, and screen-reader labelling of the live metrics. |
| 10.3 | **Responsive / mobile** | Layouts use `max-w-*` containers but almost no breakpoint-specific work. The canvas + dashboard split still assumes a wide viewport. Target from the plan — "Library and Quiz fully usable on a phone" — is not verifiably met. |
| 10.4 | **Per-chapter content code-splitting** | Route-level lazy loading and the recharts split are done; the content modules (`src/content/*`) still load as one graph and will grow. |
| — | **End-to-end coverage for the new chapters** | `scripts/playtest.mjs` / `playtest-v02.mjs` only walk the early campaign. No Playwright script walks Chapters II–V or Case Study mode end to end (plan verification step 3). |

---

## Verification

Per change:

1. `npm run typecheck && npm test && npm run lint && npm run build` — all must pass (currently green:
   460 tests / 26 files).
2. **Content-truth tests** (`src/content/__tests__/chapterN.test.ts`): every build level runs its real
   numbers through the real engine, asserting the starting graph fails its SLO and the intended fix
   passes it. A level that can't be proven this way isn't finished.
3. `npm run dev` + the Playwright playtest scripts — walk the affected chapter end to end, confirming
   unlock order, canvas interactions, and debrief scoring. **Gap:** scripts don't yet cover
   Chapters II–V / Case Study mode.
4. `npm run build && npm run preview` — verify the GH Pages `base: './'` build and that routes
   survive a hard refresh.
5. Manual: reset progress from Settings and replay from zero to confirm gating and store migrations.

## Open question (still open, not blocking)

Phase 8's rubric review uses a **static, hand-authored checklist per case study** — deterministic and
offline. If that proves too shallow in practice, revisit; but it was not worth starting anywhere else.
