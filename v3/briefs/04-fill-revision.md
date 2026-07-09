# Brief 04 — Fill Aesthetic Revision

**Branch:** `feature/fill-regions` (continue existing branch — this is a
revision of Brief 03, not a new feature)
**Goal:** Fix the four aesthetic problems Shivang identified in Brief 03's
fill pass. Mechanism (region detection, filtering, cap) is sound and does
NOT need rework. Only the rendering/selection quality needs to change. Do
not add new capabilities beyond what's listed here.

**Design intent (Shivang, locked, unchanged from Brief 03):** Fills must
belong to the same hand as the strokes — translucent pigment pooled inside
the lines, grain and underlying strokes showing through. A fill that reads
as a flat opaque shape dropped on top is WRONG.

**Judged at its worst preset.** Brief 03 was reviewed with lab defaults
that happened to be opaque/mono/inset/clustered — the worst possible
combination — and that's a fair test, not bad luck. This revision must hold
up at default settings, not just when hand-tuned. Test defaults, don't just
expose better sliders.

**Target, in numbers:** ~0.3 opacity washes, each region a distinct
palette hue, filling clean to the stroke edge with no halo gap, evenly
spread across the canvas (not bunched in one region), grain and lines
visible through the wash.

---

## Architecture rules (from v3/CLAUDE.md — unchanged, do not violate)
- Region DETECTION stays in `v3/engine/fill.js`, headless, pure, zero DOM.
- All randomness (colour assignment, spread selection) through injected
  `rng()`. Determinism holds: same seed + params → identical fills.
- Rendering (wash draw, blur, mask) may live in the lab/render helper.
- Do not touch root `index.html`.

---

## Task 1 — Fix opacity default
Lab default is currently 0.8 (near-opaque). Change default to **0.32**, per
the original PRD spec that Brief 03 built but didn't wire up as the
default. Cap the slider's usable range so it can't casually drift back
toward opaque — suggest max ~0.5. Confirm at default the wash is visibly
translucent: paper grain and any underlying stroke crossing the region must
read through it.

## Task 2 — Fix inset gap / halo
Root cause per Brief 03 retro: half-resolution mask + blur eats the
boundary, leaving a gap between the fill and the strokes that bound it.
Fix by one or both:
- Run region detection at full canvas resolution instead of half-res (check
  perf; if too slow, downsample the mask build but upsample/dilate the
  result before rendering — do not let the final rendered edge sit at
  half-res).
- Dilate the fill mask by 1–2px before drawing so the wash edge tucks
  under the stroke rather than stopping short of it. Remember draw order
  is paper → fills → strokes, so slight over-fill under the stroke is
  invisible and desirable; under-fill (the current bug) is not.
Verify: zoom into a filled region's boundary in the lab and confirm no
visible cream/paper ring between wash and line.

## Task 3 — Distinct colour per region
Currently every fill is `blend(palette[0], palette[1])` — same colour
everywhere. Change to: each region gets assigned one distinct colour from
the active palette (not a blend of two), with variety across regions in the
same artwork.
- Assignment rule: cycle or randomly sample (via `rng()`) from the active
  palette such that adjacent/nearby regions don't repeat the same colour
  back-to-back. Simple approach: shuffle the active palette per artwork,
  assign in region order (largest to smallest or spatial order — pick one,
  document it), avoid same colour on two regions whose bounds are within
  some proximity threshold.
- Keep `fill.blend` param but repurpose or drop it — document the decision.
  If dropped, note it in the brief's completion summary since Brief 03
  exposed it as a lab control.
- Determinism holds: same seed → same colour assignment.

## Task 4 — Fix clustering / spread
Current spacing rule lets fills bunch on one side, leaving canvas halves
empty. Strengthen the selection rule in the existing filter/cap step
(`fill.maxCount`):
- When more candidate regions exist than the cap, bias selection toward
  spatial spread, not just area. Suggested approach: divide canvas into
  quadrants (or a coarser grid, e.g. 3×3), and when picking up to
  `maxCount` regions, prefer taking the best candidate from each
  under-represented quadrant before allowing a second pick from any
  quadrant that already has one. Fall back to pure area-ranking only if a
  quadrant has no candidates.
- Document the exact selection rule chosen (this is a taste-relevant
  decision — write it plainly enough that Shivang can evaluate it without
  reading code).
Verify across several seeds that fills are visibly distributed rather than
clumped.

## Task 5 — Lab verification pass
No new lab controls required — Task 1–4 are default/algorithm fixes to
existing controls, not new UI. But:
- Confirm "Copy settings" JSON still reflects the corrected defaults.
- Re-check density scrubber + fill interaction still recomputes correctly
  (this worked in Brief 03; just confirm it isn't broken by Task 2/4
  changes).
- If `fill.blend` is dropped per Task 3, remove its now-dead lab control
  and copy-settings key.

---

## Acceptance criteria
Evaluate at **default settings**, not hand-tuned:
1. Opacity reads as a translucent wash (~0.3), grain/strokes visible
   through it — not a flat opaque shape.
2. No visible gap/halo between a fill and the stroke that bounds it.
3. Within a single artwork with 2+ fills, at least two different palette
   colours appear (no more single-colour-everywhere).
4. Fills are visibly spread across the canvas across multiple seeds/artworks
   — not clustered in one corner or half.
5. Determinism holds (same seed + params → identical fills, same colours,
   same selection).
6. Engine region-detection code stays headless/pure (grep: no DOM/audio in
   `fill.js`).
7. Root `index.html` untouched.
8. Brief 03's original acceptance criteria (fill OFF = identical to main,
   style control still moves soft↔painterly, min/max area + cap respected)
   still hold — this is a revision, not a rewrite.

## Git / serve automation (one link, no middle steps)
- Continue on `feature/fill-regions`, commit per task, small scoped
  messages.
- When complete and self-verified against all 8 acceptance criteria above,
  push the branch to origin.
- Start the local server yourself and reply with the exact URL
  (`http://localhost:8000/v3/labs/art-lab.html`) plus a one-line summary of
  what changed in the defaults and the colour/spread rule chosen.
- Do NOT merge to main — Shivang re-reviews fills in the lab, this time at
  default settings, before any merge decision.

## Out of scope (do not build)
- Composition-aware ink bloom (separate future brief).
- Chalk/canvas surfaces, spin-shape drops, suggested-moment ticks, the
  product results-screen "Fill Shapes" button.
- New style modes beyond the existing wash↔painterly control.
