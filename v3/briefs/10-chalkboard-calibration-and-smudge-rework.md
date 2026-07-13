# Brief 10 — Chalkboard Calibration Fix + Density-Based Smudge (final)

**Branch:** `feature/chalkboard-surface`, except Task 0 which lands on `main`
directly first (it's a repo-wide contract rule, not chalk-specific — same
pattern as the two-step brief-handoff rule).
**Goal:** This is intended to be the LAST chalk brief. Fix how we evaluate
chalk (native resolution, not an upscaled lightbox), fix the real
wide-stroke rendering issue that evaluation was hiding/distorting, and
replace intersection-based smudge with density-based ambient smudge per
Shivang's correction. After this, chalkboard goes to final review and we
move to the canvas/paint surface.

---

## Task 0 — Record the calibration-instrument rule (on `main`, before anything else)

Add to `v3/CLAUDE.md` (new short section near the other settled rules):

> Every lab control (stroke width, chalk width, age fade + newest/oldest,
> weight/opacity ranges, palette pickers, density scrubber, surface/mode
> toggles) is a calibration instrument for reaching a locked default — NONE
> of it ships as end-user-facing UI in the live game. Once a surface/mode is
> approved in the lab, its tuned values get frozen into fixed constants when
> ported to the product. The sliders themselves never ship.

Commit and push to `main` directly. Then check out/rebase
`feature/chalkboard-surface` on top so it has this commit before continuing.

## Task 1 — Fix lab evaluation to match true game resolution

Confirmed by reading root `index.html`: the live canvas (`#wrap`) is fixed
`1000×630px` with no CSS scale transform — that's the true, final, only
resolution that matters. `v3/CLAUDE.md`'s reference-map mention of a
"`#gc` scaled container" doesn't exist in the current live build — note the
drift in a comment, don't chase it further (out of scope here).

The lab's lightbox currently draws the 1000×630 bitmap into an
identically-sized canvas element, then CSS stretches it to `max-width:88vw;
max-height:78vh` — on most screens this is a significant upscale, and
browser upscale interpolation softens/blurs exactly the fine grain texture
we're trying to evaluate. This is misleading Shivang's review, independent
of any real rendering issue.

Fix: cap the lightbox display size at native resolution — it should never
render larger than `1000×630` CSS pixels (e.g. `max-width:1000px;
max-height:630px` instead of the vw/vh values), so what's reviewed there is
always 1:1 with what the live game will actually show. If a smaller preview
is still useful for fitting more on screen, that's fine, but it must never
exceed native size. Document this clearly in a comment so a future session
doesn't reintroduce an upscaled "enlarge" view for canvas/paint work either.

## Task 2 — Fix wide-stroke rendering (the real bug, separate from Task 1)

With evaluation now happening at true native resolution, re-examine chalk
strokes across the practical width range (`wt` 1.0–2.4 × `chalkWidthMult`
up to the slider's max). Current suspicion, worth checking first: the halo
pass (`HALO_MULT=2.1`, low base alpha) gets proportionally fainter and more
diffuse relative to its own width as strokes get wide, reading as a soft
translucent glow rather than chalk — this would be true even independent of
Task 1's viewing fix. Rebalance halo width/alpha and/or grain bite so the
"chalk" read holds up consistently across the width range you expect to
actually ship (once locked per Task 0's rule, this will be a small fixed
set of values, not the full slider range — but check the range broadly now
since we haven't locked anything yet). Tune by eye at native resolution,
document final values.

## Task 3 — Replace intersection smudge with density-based ambient smudge

Per Shivang directly: smudge should be a general, roughly-random dust
feel driven by local LINE DENSITY across the canvas — not precise
per-crossing-point placement, and nothing tied to individual stroke/ball
events. The current `findStrokeIntersections`/`renderIntersectionSmudges`
approach (brief 09) is also concretely failing in clustered areas — this
redirect fixes that at the root rather than patching intersection detection
further.

Recommended approach (adjust if you find something more robust — document
whichever you land on):
- Build a coarse density grid over the canvas (e.g. 20–40px cells). For
  each stroke's already-strided point sequence, mark which cells its
  segments pass through, weighted by the stroke's `wt` — this can reuse
  most of the existing bbox/stride machinery from `findStrokeIntersections`
  rather than being built from scratch. Stays pure/headless, no rng needed
  for the density pass itself — purely geometric, deterministic by
  construction.
- Using a fixed-seed `makeRng()` (same discipline as the grain tile),
  scatter smudge blobs with placement probability/opacity/size weighted by
  each cell's local density — dense knots reliably get dust, sparse/empty
  areas get none, and there's enough randomness that it reads as ambient
  rather than mechanical.
- Reuse the SAME smudge visual (`renderIntersectionSmudges`'s pale
  neutral radial-blob technique) — that part read fine; only the WHERE
  changes, not the visual language.
- Remove the now-superseded intersection-specific code
  (`findStrokeIntersections`, `segIntersect`, etc.) rather than leaving it
  as dead weight — keep the engine lean, matching the speed-weight removal
  precedent from brief 08.
- Optional, only if it's genuinely simple to layer in: weight density by
  age (older ink contributes more to "smudge-worthy" density than fresh
  ink), reinforcing the same "age costs crispness" idea from brief 09. Skip
  it if it complicates the density pass — this is a nice-to-have, not a
  requirement for this brief.

---

## Acceptance criteria
1. `v3/CLAUDE.md` has the calibration-instrument rule, committed to `main`.
2. Lightbox never displays chalkboard (or paper) larger than native
   1000×630 — verify by inspecting rendered size, not just the CSS rule.
3. Wide chalk strokes (near the top of the practical width range) still
   read as chalk, not a translucent glow — checked at native resolution.
4. Smudge appears generally across dense/clustered areas of the artwork,
   including the specific clustered case that was previously missing it —
   and does NOT track individual stroke crossings or ball events.
5. Determinism holds throughout (grid density pass, smudge placement,
   stroke rendering — same seed/params → identical render).
6. Paper surface completely unaffected.
7. Dead intersection-specific code removed, not left unused.

## Git / serve automation
- Task 0 on `main`, pushed, then continue Tasks 1–3 on
  `feature/chalkboard-surface`, one commit per task.
- Push when done, self-verify against acceptance criteria, start the local
  server, reply with the URL and the final values/approach for Tasks 2–3.
- Still do NOT merge — final review happens after this lands, then the
  merge decision, then move to canvas/paint.

## Out of scope
- Canvas/paint surface — right after this, once approved.
- The `#gc` doc-drift note in `v3/CLAUDE.md`'s reference map — flag it,
  don't fix it here.
- Locking final chalk constants into the product — that happens once this
  is approved, as a separate, later step.
