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

Chapter 0 (6 levels), Chapter I (15 levels, from IP addressing through
caching, CDN, availability, and scalability), and Chapter II (15 levels,
from the database primitive through replication, indexes, ACID/BASE, CAP,
PACELC, transactions, sharding, consistent hashing, and federation) are
complete: situation → teach → guided build → solo build → twist, the
canvas, live dashboard, decision journal, quiz mode with a question bank
covering every level, and a free-build sandbox. Routing is real
(`/level/:id`, `/journal`, `/sandbox`, `/quiz`, `/settings`, `/library/*`)
so any screen is linkable, and progress/journal/quiz data can be exported
and re-imported from Settings.

The engine models both reads and writes through seven primitives (client,
server, load balancer, cache, database, replica, shard router), with
consistent hashing, replication lag/staleness, write durability, and
shard-imbalance all live-simulated rather than scripted. The Sandbox has a
chaos toggle (traffic spike, node outage, network partition) for poking at
failure scenarios outside of an authored level.

**`/library`** is a second, ungated way into all 36 levels' content —
browse or full-text search (Ctrl/Cmd-K) every topic, an inline-linked
glossary, a "numbers every engineer should know" reference, and
print-friendly per-chapter cheat sheets — without needing to play through
the campaign first.

**Chapters III–V of the source curriculum are not yet built** — messaging
and service architecture (Chapter III), resilience and security
(Chapter IV), and the system design case studies (Chapter V). Chapter III
onward needs async primitives (queue, broker, API gateway, service) and a
sequence-diagram teaching primitive the engine and UI don't have yet. That
work is scoped but not started.

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
               # display settings) + scoring
  ui/
    teach/     # lesson player + comprehension checks
    guided/    # step-by-step build narration
    canvas/    # React Flow-based build surface + palette + inspector
    dashboard/ # live metrics, latency chart, simulation playback
    debrief/   # decision cards, scorecard + README-quote debrief
    campaign/  # level player, chapter map
    sandbox/   # free build, no objectives, chaos toggle
    journal/   # the player's own accumulated decision log
    settings/  # reset/export/import progress, reduced-motion toggle
    library/   # ungated topic/glossary/numbers/cheat-sheet pages + search
```

The engine is the one part of this app that has to be right: every number
the player sees comes from `runSimulation`, never from scripted per-level
outcomes. See `src/engine/__tests__` and `src/content/__tests__` — the
latter runs each level's actual numbers through the real engine to confirm
the intended failure and intended fix both really happen.
