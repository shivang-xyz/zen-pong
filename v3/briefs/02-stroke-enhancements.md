# Brief 02 — Stroke Enhancements (Sprint 1A / 1B / 1C)

**Branch:** `feature/stroke-enhancements` (new branch off main)
**Goal:** Add the three artwork-enhancement systems from
ARTWORK_ENHANCEMENT_SPRINT.md to the art engine as tunable parameters, each
previewable via new controls in `art-lab.html`. This session ADDS optional
enhancements; it does not alter default output unless a control is moved.

**Non-negotiable:** Every enhancement ships OFF-by-default, meaning defaults
must reproduce the current lab output byte-for-byte. Each is enabled/tuned
only via its lab control. This lets Shivang judge each one in isolation
against the existing calibration seeds.

**Calibration context (informs sensible ranges, not hard rules):**
Shivang's preferred compositions sit at ~28–50 strokes, ~10–17% ink, with a
sweet spot around 30–35 strokes / 10–12% ink. These enhancements should make
each individual stroke richer so sparse compositions read as intentional, not
thin. Bias defaults and slider ranges toward that sparse, gesture-legible zone.

---

## Architecture rules (repeat of v3/CLAUDE.md — do not violate)
- All new logic lives in `v3/engine/` (strokes.js, or a new module if cleaner).
  Zero DOM/audio/React in engine files.
- All randomness goes through the injected `rng()` — never `Math.random()`.
  Determinism must hold: same seed + same params → identical artwork.
- Enhancements are driven by a params object passed into the render/commit
  path, with defaults living in one place. The lab reads/writes these params.
- Do not touch root `index.html`.

---

## Task 1 — 1A: Variable opacity (trail age fade)
Earlier strokes fade as the game progresses; most recent = vivid, oldest =
ghost. Per the sprint doc: range roughly 0.70 → 0.35 across the game.

- Each committed stroke records its commit order / timestamp (stroke index and
  total-strokes-so-far are already known at commit time in simulate.js).
- At final render, a stroke's opacity is scaled by an age factor: newest
  strokes keep full op, oldest are attenuated toward a floor.
- Params: `ageFade.enabled` (bool, default false), `ageFade.newest` (default
  1.0), `ageFade.oldest` (default 0.55). When enabled, map stroke age linearly
  (or with a mild curve) between newest and oldest multipliers.
- Implementation note: because the lab renders finished artworks (not a live
  accumulating canvas), age fade is applied at render time based on each
  stroke's index within the final stroke list — NOT via a per-rally cream
  overlay pass. This is simpler and deterministic. Document this as the chosen
  approach (the sprint doc's "cream overlay per rally" was written for the live
  accumulating canvas; the render-time index approach produces the same visual
  intent in the lab and is portable to the game later).

## Task 2 — 1B: Variable stroke weight (speed-driven)
Fast ball = thicker trail, slow ball = hairline. Per sprint doc: ~0.8px
hairline up to ~2px, interpolated from ball speed.

- Ball speed is available per trail-point (vx, vy already stored per point in
  the sim, or recompute from consecutive points). Compute a per-point or
  per-stroke speed and map it to a weight multiplier.
- Params: `speedWeight.enabled` (bool, default false), `speedWeight.minW`
  (default 0.8), `speedWeight.maxW` (default 2.0), and the speed range to map
  from (`speedWeight.slowSpd`, `speedWeight.fastSpd`) with sensible defaults
  derived from BASE_SPD..MAX_SPD.
- Simplest faithful approach: per-stroke, use the stroke's mean speed to pick
  one weight (avoids intra-stroke width variation, which the two-pass renderer
  doesn't cleanly support). If per-point width is cheap to do well, it may be
  offered, but per-stroke is the acceptable baseline. Document which was built.
- When enabled, this multiplies into the existing per-ball `wt`; when disabled,
  existing `wt` behavior is unchanged.

## Task 3 — 1C: Ink bloom at paddle hit
Soft radial glow at each paddle-hit point — palette colour, low opacity,
~40px radius, drawn ONCE per hit (not a particle system, not animated in the
lab's static render).

- simulate.js already emits `paddleHit` events with x, y. Record bloom marks
  (position, colour, radius) in the stroke/event data.
- At render, before or under the strokes, draw a single radial-gradient circle
  per bloom: palette colour at low centre alpha fading to transparent at edge.
- Params: `bloom.enabled` (bool, default false), `bloom.radius` (default 40),
  `bloom.alpha` (default ~0.12), `bloom.colorMode` ('hitColor' = the ball's
  colour at that hit | 'blend' = mix of the two active palette colours;
  default 'hitColor').
- Draw order: blooms should sit UNDER the strokes so lines stay crisp on top.
  Confirm this reads well; if under looks weak, expose a draw-order toggle.

## Task 4 — Lab controls
Add a clearly grouped "Enhancements" section to the control panel, separate
from the existing stroke-param sliders. For each of 1A/1B/1C:
- An enable checkbox (all default OFF).
- Its sliders/number inputs per the params above, with live re-render.
Add each enhancement's key numbers into the existing "Copy settings" JSON
output so tuned values can be pasted back.

Keep all existing controls (density scrubber, weight/opacity ranges, palette,
seed, win score) working exactly as they are.

## Task 5 — Interaction sanity
- Confirm the three enhancements compose correctly when multiple are enabled
  (e.g. age fade + speed weight + bloom together render without error and look
  coherent).
- Confirm density scrubber still works with enhancements on (scrubbing to k%
  should fade/weight/bloom only the strokes shown).
- Determinism holds with any combination of params (same seed → identical).

---

## Acceptance criteria
1. With all enhancements OFF, the grid is byte-identical to current main output
   for the same seeds (prove by comparing a tile's toDataURL before/after).
2. Each enhancement visibly and correctly changes the artwork when enabled.
3. Determinism holds for every param combination.
4. Engine files contain zero DOM/audio references (grep-verify).
5. Root index.html untouched (`git diff main -- index.html` empty).

## Git / serve automation (do this so Shivang opens one link, no middle steps)
- Do all work on `feature/stroke-enhancements`, committing per task with small
  scoped messages.
- When complete and self-verified, commit everything and push the branch to
  origin (`git push -u origin feature/stroke-enhancements`).
- Then start the local server yourself (`python3 -m http.server` from repo
  root, background it) and reply with the exact URL to open
  (`http://localhost:8000/v3/labs/art-lab.html`) plus a one-line summary of
  each enhancement and its default state.
- Do NOT merge to main — Shivang reviews in the lab first, merge happens only
  after his approval.

## Out of scope (do not build)
- Fill regions (that is Brief 03, against the settled stroke look).
- Chalk / canvas surfaces, wind field, spin-shape drops, suggested-moment ticks.
