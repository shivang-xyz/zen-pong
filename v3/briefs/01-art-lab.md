# Brief 01 — Engine Extraction + Art Lab

**Branch:** `feature/art-lab`
**Goal:** Extract the physics and trail-rendering systems from root `index.html`
into pure ES modules under `v3/engine/`, then build `v3/labs/art-lab.html` — a
standalone tool that simulates full games headlessly and renders finished
artworks in a grid with live-tweakable parameters.

**Why this exists:** The art lab lets Shivang judge finished artworks in seconds
instead of playing 4-minute games, tune the art engine with zero token cost, and
calibrate composition metrics. It is also the engine's first consumer and
permanent test rig. Faithfulness to the live build's output is the acceptance
bar — this session ports, it does not improve.

---

## Deliverables

```
v3/
├── engine/
│   ├── rng.js        # seedable PRNG (mulberry32 or similar)
│   ├── physics.js    # ball, walls, paddles, spin, AI — headless
│   ├── strokes.js    # traceCR, drawStroke, commitStroke logic
│   ├── surface.js    # buildPaper port (paper texture generator)
│   └── simulate.js   # runs a full game headlessly → stroke data
└── labs/
    └── art-lab.html  # single file: imports engine, renders grid + controls
```

## Task 1 — Seedable RNG (`rng.js`)
- Export `makeRng(seed)` returning a `rng()` function (0..1, deterministic).
- Every extracted formula that used `Math.random()` takes `rng` as input.
- Same seed → identical game → identical artwork. This is the foundation of
  everything downstream (calibration, daily seed, share replay).

## Task 2 — Physics extraction (`physics.js`)
Port from root `index.html`, preserving every constant and formula exactly:
- `mkBall` (4-edge spawn, speed `BASE_SPD + lv*0.18`, wt/op/spin ranges)
- `wallHit` (rounded-corner circle reflect, 0.92 damping, ±0.28 angle jitter,
  post-bounce vy clamp at sin(0.96))
- `enforceMinAngle` (min PI/10 from horizontal)
- `sweptHit` (swept-segment test, angle = rel*0.62, speed *1.04 player /
  *1.03 AI capped at MAX_SPD, spin = padVel*0.032 + rand*0.14 player side,
  rand*0.20 AI side)
- Per-frame spin: perpendicular velocity nudge, magnitude preserved, decay 0.997
- `ballBall` elastic push + spin exchange
- AI paddle: target rightmost approaching ball, jitter sin(t*0.002)*3, step
  max(aiSpd, 4.2), lag catch-up at >80px, aiSpd = min(2.6+lv*0.40, 7.5)
- Level: every 2 total points, lv++, balls scaled *1.06 capped MAX_SPD
- Per-frame speed cap `BASE_SPD*1.6` — PORT AS-IS (documented quirk)
- min |vx| floor 0.45*BASE_SPD
- No DOM, no audio, no canvas in this file. Hit events are returned/emitted as
  plain data (e.g. `{type:'paddleHit', side:'L', x, y}`) so consumers decide
  what to do with them.

## Task 3 — Stroke rendering extraction (`strokes.js`)
- Port `traceCR`, `drawStroke` (two-pass: lineWidth wt*2.2 @ alpha op*0.22,
  then wt*0.75 @ alpha op*0.88), and the jitter mapping from `commitStroke`
  (perpendicular sine displacement `sin(x*0.73 + y*1.31)*0.5`).
- API: `renderStroke(ctx, pts, col, wt, op, params)` where `params` exposes the
  currently-hardcoded numbers (pass widths, alphas, jitter amplitude) with
  defaults equal to the live build. This is what the lab's sliders drive.

## Task 4 — Surface (`surface.js`)
- Port `buildPaper` (cream ground + grain + vignette) to
  `buildSurface(w, h, rng)` returning a canvas. Paper only for now; the module
  shape anticipates chalk/canvas variants later.

## Task 5 — Headless simulation (`simulate.js`)
- `simulateGame({seed, winScore=3, maxPtsPerStroke=500})` → runs the full game
  loop with a scripted player paddle (see below) until someone reaches winScore.
- Player stand-in: a second AI using the same updateAI logic with slightly
  different jitter phase and a small reaction handicap, so rallies resemble
  human games. Keep it simple; note in code that this is a sim-only stand-in.
- Output: `{ strokes: [{pts, col, wt, op, event}], meta: {seed, score, rallies,
  frames} }` — strokes in commit order. Same commit points as live build
  (paddle hit, wall hit, score, 500-pt overflow).
- Must run without requestAnimationFrame — plain loop, thousands of frames in
  milliseconds. Safety cap ~120,000 frames.

## Task 6 — The lab (`art-lab.html`)
Single self-contained HTML file importing the engine modules. Plain dev
styling is fine (this is an internal tool), but dark page + cream artwork
tiles so artworks are judged in context.

Layout:
- **Grid**: 12 artwork tiles (4×3), each a canvas rendering one simulated game.
  Seed label under each tile. Click a tile → enlarges (lightbox style) with
  its seed shown.
- **Controls panel** (sliders + number inputs, live re-render):
  - Seed field + "reroll all" button
  - Win score: 3 / 5 / 7
  - Stroke params: pass-1 width mult, pass-1 alpha, pass-2 width mult,
    pass-2 alpha, jitter amplitude, wt range (min/max), op range (min/max)
  - **Density scrubber**: 0–100% slider rendering only the first k% of
    committed strokes on every tile — the composition-moment prototype
  - Palette: current 5 colours, editable hex fields
- **Metrics readout** per tile (small text): stroke count, ink coverage %
  (sample the drawing canvas alpha at 1/4 resolution), stroke-crossing estimate
  (segment-intersection count on committed polylines, coarse sampling is fine)
- **"Copy settings" button** → JSON of all current parameter values to
  clipboard, so tuned values can be pasted back into a chat/spec.

## Task 7 — Parity check
- Add a "parity" tile mode: render one simulated game at default parameters
  and visually compare against a screenshot of a real finished game (Shivang
  will supply one; until then, self-review against the reference map in
  v3/CLAUDE.md). Line character, density, colour behaviour, and stroke
  geometry must be indistinguishable in kind. Document any known deviation at
  the top of simulate.js.

---

## Acceptance criteria
1. `art-lab.html` served locally (`python3 -m http.server` from repo root)
   renders 12 artworks in under ~2s on a laptop.
2. Same seed always produces the identical artwork, pixel-for-pixel.
3. Default parameters reproduce the live build's visual character.
4. Density scrubber smoothly re-renders from sparse to full.
5. Coverage % and crossing counts update per tile.
6. Zero libraries, zero React, engine files contain zero DOM/audio references.
7. Root `index.html` untouched (`git diff` outside v3/ is empty).

## Out of scope (do not build)
- Opacity fade (1A), variable weight beyond current ranges (1B), ink bloom (1C)
- Chalk/canvas surfaces, fills, wind field, suggested-moment tick marks
- Any game UI, audio, or React scaffolding
These come in later briefs once the lab exists to evaluate them.
