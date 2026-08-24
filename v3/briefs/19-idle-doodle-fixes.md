# Brief 19 — Idle Doodle Fixes

Brief 18 shipped the idle screen; the doodle behind the card needs five fixes.
Continue on `feature/v3-app`. Docs to `main`. This is doodle-only — do not touch
the card, selector, or audio.

The playing-screen brief is renumbered to 20; update `PORT-PLAN.md`.

---

## Task 1 — Fixed-seed doodle (do this first; it enables Tasks 2 & 5)

The idle doodle must use a single fixed seed, identical every load — not a fresh
random simulation each time.

Rationale: with one seed, all three surfaces render the *same* stroke geometry,
so a surface switch is a pure restyle of identical lines. That is what makes the
transition seamless (Task 2), it's cheaper, and it makes the paint morphing
easier to reason about (Task 5). The doodle is ambiance, not the artwork —
determinism is a feature here.

## Task 2 — Every surface transition continues, none resets

Currently some switches continue the doodle and some restart it. The rule:
**any** surface change (paper↔chalk↔paint, both directions) keeps the current
stroke data and ball state and simply re-renders through the new surface's
renderer. Never re-initialise the simulation, never clear committed strokes, for
any surface — paint included (that's the path that currently resets). With
Task 1's fixed seed this is a restyle of identical geometry.

## Task 3 — Chalk doodle in colour, not mono

The chalk doodle renders in white/mono mode. Switch it to tri-colour
(`CHALK_PALETTE` in `chalkboard.js`), matching how chalk was approved in the lab.

## Task 4 — Ball visible at all times

The doodle currently shows only trails. Draw the ball marker every frame in all
three surfaces — without it the animation reads as meaningless. Keep it simple
and on-brand; it's the moving point that makes the doodle legible as a rally.

## Task 5 — Fix the paint stroke morphing

The paint doodle strokes writhe — each stroke's width profile rescales every
frame, so a stroke is a fat wedge one frame and a thin ribbon the next.

**Cause:** the variable-width profile is computed against the stroke's normalized
length (or recomputed over the whole polyline each frame). As the live stroke
grows, every earlier point gets a new width every frame → the ribbon rewrites
itself continuously. The lab render is correct only because it computes width
once over a finished stroke.

**Fix:** bake each sample's width once, at the moment the point is appended,
keyed to **absolute arc length** (or fixed point index) with a fixed seed. Never
recompute earlier samples — append only. Apply the same anchoring to pooling:
anchor it to the committed point, not the moving stroke end. After the fix, a
given physical point's width must be constant across every frame it exists.

Do not change the paint look itself — the frozen constants from brief 16 stand.
This is about *when/how* width is computed in a live growing stroke, not the
values.

## Verification

- Doodle identical every load (fixed seed).
- All six surface transitions (paper↔chalk, chalk↔paint, paper↔paint) continue
  without reset — verify each direction.
- Chalk doodle is tri-colour.
- Ball visible in all three surfaces every frame.
- Paint strokes hold shape — no per-frame width morphing. Screen-record paint
  for a few seconds to confirm.
- Engine modules unchanged and still deterministic in the lab (hash paper vs
  `main`). Root `index.html` untouched.

## Done looks like

A calm, fixed idle doodle with the ball always visible, that restyles seamlessly
between paper, colour chalk, and paint on every switch, with paint strokes that
hold their shape instead of writhing.
