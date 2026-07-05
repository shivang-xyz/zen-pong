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

## Workflow habits
- Plan mode for any extraction or refactor session.
- Small commits with clear messages. Do not reformat code you aren't changing.
- Keep this file under 100 lines. Update it only when a decision is settled.
