# Zen Pong v3 — Operating Contract

You are building Zen Pong 3.0 — a generative art game. The ball's trail lines
accumulate into a painting. The game is the brush; the artwork is the product.

## Session protocol
- Read the assigned brief in `v3/briefs/` in full before touching any code.
- `index.html` at repo root is the LIVE build and reference implementation.
  NEVER modify it. NEVER modify anything outside `v3/` unless a brief says so.
- One feature per session, one branch per feature. Verify end-to-end before done.
- When the brief conflicts with this file, stop and flag it to Shivang.
- Do not invent product decisions. If the brief is ambiguous, ask — don't assume.

## Immutable engineering rules
- Pure vanilla JS in `v3/engine/` — zero React, zero libraries, zero DOM access.
  Engine modules must run headless (callable without a canvas or a browser event).
- Engine files are ES modules. Labs and app import them; never copy-paste engine
  code into a consumer.
- Physics is deterministic when seeded. All randomness in engine code goes
  through the injected `rng()` function — never `Math.random()` directly.
- No base64-embedded audio. No external JS libraries anywhere in v3.
- Rendering: trail strokes are persistent — committed strokes are never cleared
  except by explicit reset. Paper/surface texture is never removed as an
  optimisation.

## Immutable design rules (from DESIGN.md — look values up, never guess)
- Page background always #383838. Canvas always warm cream (#FFF5E5 family),
  never #ffffff. Canvas border-radius 48px. 4pt spacing grid.
- Paddles are DOM divs, never drawn on canvas.
- All UI controls use `.ctrl-chip` (height 48px, radius 12px, #464646).
- Colours, fonts, spacing, radii: read DESIGN.md or the brief. Never guess.

## Permanently settled — do not revisit
- BGM loads via `new Audio()` + `createMediaElementSource()`. NEVER
  fetch()+decodeAudioData (breaks with browser extensions).
- BGM cannot autoplay from mousemove — browser policy, not a bug. Unlock
  gestures: click / spacebar / touchstart.
- Chalk SFX fires exactly once per paddle hit, inside the paddle-hit branch.
  Never on a frame clock.

## Lab controls are calibration instruments, not product UI
- Every lab control (stroke width, chalk width, age fade + newest/oldest,
  weight/opacity ranges, palette pickers, density scrubber, surface/mode
  toggles) is a calibration instrument for reaching a locked default — NONE of
  it ships as end-user-facing UI in the live game. Once a surface/mode is
  approved in the lab, its tuned values get frozen into fixed constants when
  ported to the product. The sliders themselves never ship.

## Reference map (current live build, repo-root index.html)
- Constants: W=1000 H=630 PW=8 PH=64 BR=6 CR=40, BASE_SPD=5.2, MAX_SPD=2.2x, WIN=3
- Physics: mkBall (4-edge spawn), wallHit (rounded-corner reflect + jitter),
  enforceMinAngle (min PI/10 from horizontal), sweptHit (swept paddle collision,
  angle from hit offset *0.62, paddle-velocity spin transfer), ballBall,
  spin applied per-frame perpendicular to velocity with 0.997 decay,
  per-frame speed cap at BASE_SPD*1.6 (known quirk — port faithfully, do not fix)
- Art: traceCR (Catmull-Rom), drawStroke (2-pass: wide 0.22a + core 0.88a),
  commitStroke (perpendicular sine jitter), strokes commit on paddle hit /
  wall hit / score / 500-pt overflow; per-ball wt 1.0-2.4, op 0.50-0.68
- Faithful extraction means: same numbers, same formulas, same commit points.

## Docs live on `main`, code lives on branches — settled 2026-07-20
- `PROJECT-LOG.md`, `BACKLOG.md`, `ARCHITECT.md`, `CLAUDE.md`, `PAINT-MODE.md`
  and everything in `briefs/` are committed to `main` ONLY, never to a feature
  branch — even when they describe work that lives on that branch.
- Feature branches carry engine/lab code and nothing else.
- Rebase the feature branch on `main` after a doc commit so the session reads
  the current brief.
- Why: brief 10's log entry was committed to `feature/chalkboard-surface`,
  `main` went stale, and a later session loaded an 11-day-old snapshot of the
  project's own state and planned against it. A doc on a branch is a doc
  nobody reads.

## Workflow habits
- Plan mode for any extraction or refactor session.
- Small commits with clear messages. Do not reformat code you aren't changing.
- Keep this file under 100 lines. Update it only when a decision is settled.
- Architect chat: every brief handed to Shivang follows the same two-step
  process, every time, no exceptions, don't wait to be asked — (1) write/
  save the brief file into `v3/briefs/`, (2) then give the exact Claude
  Code prompt to run it.
