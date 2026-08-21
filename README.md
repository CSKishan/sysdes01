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

This is **v0.1**, a vertical slice: the full engine, the five-stage teaching
loop (situation → teach → guided build → solo build → twist), the canvas,
live dashboard, decision journal, and Chapter 0 (5 levels) + Chapter I
(5 levels, ending on caching and its invalidation twist), plus a free-build
sandbox. Chapters II–V are not yet built.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine + content correctness tests (Vitest)
npm run typecheck
npm run build       # production build to dist/
```

## Architecture

```
src/
  engine/      # pure TypeScript simulator -- no React. Deterministic
               # queueing model: utilization -> latency, Zipf-modeled cache
               # hit rates, load-balancer routing algorithms, availability
               # math straight from the source README's own formulas.
  content/     # levels as data: chapters, levels, stages, decision cards
  game/        # zustand stores (progress, decision journal) + scoring
  ui/
    teach/     # lesson player + comprehension checks
    guided/    # step-by-step build narration
    canvas/    # React Flow-based build surface + palette + inspector
    dashboard/ # live metrics, latency chart, simulation playback
    debrief/   # decision cards, scorecard + README-quote debrief
    campaign/  # level player, chapter map
    sandbox/   # free build, no objectives
    journal/   # the player's own accumulated decision log
```

The engine is the one part of this app that has to be right: every number
the player sees comes from `runSimulation`, never from scripted per-level
outcomes. See `src/engine/__tests__` and `src/content/__tests__` — the
latter runs each level's actual numbers through the real engine to confirm
the intended failure and intended fix both really happen.
