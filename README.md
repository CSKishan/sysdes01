# 📦 Packet & Post

An interactive game for learning system design, built around
[karanpratapsingh/system-design](https://github.com/karanpratapsingh/system-design).

You run **Packet & Post**, a delivery company that grows from one courier to a
planet-scale network. Every level teaches a real system design concept
first (in plain language, with an analogy and the actual term), then has
you build it on a canvas and run real traffic through it — with a
deterministic, tested queueing simulation underneath, not a scripted
pass/fail. Wrong designs visibly melt; the debrief always closes with the
verbatim passage from the source README that covers what just happened.

## Status

The full curriculum is built: Chapter 0 (6 levels) through Chapter IV (10
levels) — 58 levels in total across networking, caching, databases,
messaging/architecture, and operations/security — plus Chapter V's Case
Study mode (5 open-ended designs: URL Shortener, WhatsApp, Twitter,
Netflix, Uber, each with requirements gathering, a back-of-the-envelope
estimation calculator, an open canvas, and a rubric-based review instead of
a binary pass/fail). Every level follows situation → teach → guided build
→ solo build → twist, scored against the same real simulation engine
throughout.

The engine models both reads and writes through thirteen primitives
(client, server, load balancer, cache, database, replica, shard router,
queue, broker, API gateway, service, rate limiter, circuit breaker), with
consistent hashing, replication lag/staleness, write durability, shard
imbalance, retries/backoff, and multi-region failover all live-simulated
rather than scripted. Sandbox has a chaos toggle (traffic spike, node
outage, network partition) for poking at failure scenarios outside of an
authored level, plus named save/load, JSON export/import, and PNG export of
a design.

Beyond the campaign: a decision journal, quiz mode with a question bank
covering every level, an SM-2 spaced-repetition review flow (the same
question bank rescheduled by what you're actually about to forget, plus
glossary flashcards and an interview-phrase practice deck), a progress
dashboard (coverage heatmap, weak-area detection, streaks), a Challenge-mode
leaderboard, and achievements tied to real simulation results. Routing is
real (every screen is a linkable, bookmarkable URL under `/level/:id`,
`/sandbox`, `/review/*`, `/progress`, `/library/*`, etc.), and progress data
can be exported and re-imported from Settings.

**`/library`** is a second, ungated way into every level's content — browse
or full-text search (Ctrl/Cmd-K) every topic, an inline-linked glossary, a
"numbers every engineer should know" reference, print-friendly per-chapter
cheat sheets, and an attribution page — without needing to play through the
campaign first.

**Read `/library/attribution` (or `AttributionPage.tsx`) before publishing
or sharing this project further.** The source curriculum this project is
built on is licensed CC BY-NC-ND 4.0, which does not permit distributing
derivative works — whether this project counts as one, and whether its own
distribution counts as non-commercial, hasn't been resolved.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine + content correctness tests (Vitest)
npm run typecheck
npm run lint        # oxlint
npm run build       # production build to dist/
```

The `scripts/*.mjs` files are manual Playwright smoke tests (not part of
`npm test`) that drive the real app in a browser end to end:

```bash
npx playwright install chromium   # once
npm run dev                       # in one terminal
node scripts/playtest.mjs         # in another, once the dev server is up
node scripts/playtest-v02.mjs
```

## Architecture

```
src/
  engine/      # pure TypeScript simulator -- no React. Deterministic
               # queueing model: utilization -> latency, Zipf-modeled cache
               # hit rates, load-balancer routing algorithms, replication
               # lag/staleness, consistent hashing, availability and
               # durability math straight from the source README's own
               # formulas.
  content/     # levels as data: chapters, levels, stages, decision cards,
               # plus the glossary, numbers reference, and search index
               # that power /library
  game/        # zustand stores (progress, decision journal, quiz history,
               # spaced repetition, leaderboard, achievements, streak,
               # sandbox designs, display settings) + scoring + rubrics
  ui/
    teach/     # lesson player + comprehension checks
    guided/    # step-by-step build narration
    canvas/    # React Flow-based build surface + palette + inspector
    dashboard/ # live metrics, latency chart, simulation playback
    debrief/   # decision cards, scorecard + README-quote debrief
    campaign/  # level player, chapter map
    casestudy/ # requirements/estimation/design/rubric flow, Chapter V
    sandbox/   # free build, chaos toggle, save/load, JSON/PNG export
    journal/   # the player's own accumulated decision log
    review/    # spaced-repetition quiz + flashcards + interview phrases
    progress/  # coverage dashboard, achievements, streak, toast
    settings/  # reset/export/import progress, theme, reduced-motion
    library/   # ungated topic/glossary/numbers/cheat-sheet/attribution
               # pages + search
```

The engine is the one part of this app that has to be right: every number
the player sees comes from `runSimulation`, never from scripted per-level
outcomes. See `src/engine/__tests__` and `src/content/__tests__` — the
latter runs each level's actual numbers through the real engine to confirm
the intended failure and intended fix both really happen.
