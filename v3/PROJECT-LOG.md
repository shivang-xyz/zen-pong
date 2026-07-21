# PROJECT-LOG.md — Zen Pong v3 Living State

Newest entries at top. Each session appends where it left off. A fresh chat
reads this to know exactly where the project stands.

---

## 2026-07-21 — Brief 15: refinement (splatter mass, curved patches, blotch clusters)

Opened with a real doc collision: two different `v3/briefs/15-*.md` files
existed uncommitted (`15-paint-refinement.md`, `15-splatter-scale-and-patch-
curves.md`), both numbered 15. Committed both to `main` (docs go to main
regardless of which gets built), flagged the collision, built
`15-paint-refinement.md` per explicit instruction — did not silently pick
one or merge them.

### Task 1 — pooling removed entirely, not reduced
Brief 14 cut pooling's peak; brief 15's own postmortem on that: "any amount
clusters at the boundary, because direction change only ever happens at a
paddle or a wall." Correct — there's no partial fix here, only gone or not.
Deleted `POOL_PEAK_*`/`POOL_WINDOW_*`/`poolMultAt`/`poolStart`/`poolEnd`
from `renderPaintStroke` outright (`paint.js`). The `POOLING STRENGTH`
slider is relabelled **Blotch size** and now feeds
`buildIntersectionBlotches`' `sizeMult` instead — a build-time input now,
so that control moved from `renderAll()` to `resimulateAll()` in the lab.

### Task 2 — splatter given real visual mass
Second size pass (brief 14 already raised it once, still read as specks).
Drop radius 1-9px → 4-20px (large end now approaches a fat stroke's actual
width: `PAINT_WIDTH_BASE 6.0 × WIDTH_VAR_MAX 4.0`). Flung length 14-34px →
26-60px, head radius 3-7px → 7-15px (satellites scale off head radius, so
they grew with it). Count 24-50 → 32-64. Placement logic untouched — brief
was explicit this is a size/count change, not a placement change.

### Task 3 — patches: closed Catmull-Rom, not straight edges
Added `traceClosedCR` to `strokes.js` (paper-path file — purely additive,
existing `traceCR`/`renderStroke`/`jitterPath` untouched, verified paper
still hash-identical). Same t=0.5 Catmull-Rom-to-bezier math as `traceCR`,
neighbour indices wrap modulo instead of clamping, so it closes smoothly.
`buildPatchGround`'s wobble-jittered vertices now trace through this
instead of `lineTo` — smooth lobed silhouette, still a hard opaque fill
(smooth outline ≠ soft edge).

### Task 4 — blotches: clusters, not single ellipses
The one needing actual judgment. Rewrote `buildIntersectionBlotches`
entirely: far fewer locations (2-4, density floor raised 0.15→0.5 — "only
the densest," not splatter's whole-composition pool) and each one is now a
compound `blotchCluster` — one irregular main mass + 3-6 overlapping
satellites + 2-4 droplets flung outward, every element its own
`traceClosedCR` silhouette. Colour: main mass blends near the seeded true
mix (bias 0.35-0.65), satellites/droplets independently skew toward one
parent colour or the other (0-0.35 or 0.65-1.0) — that per-element
variation, not a uniform blend repeated, is what reads as two wet colours
actually meeting rather than a third colour painted on. Considered literal
deterministic top-N by density for "only the densest" (brief's wording
leans that way) but kept the seeded-weighted draw brief 13 established,
just over a much smaller, already-elite candidate pool — abandoning
seed-to-seed variety entirely felt like solving the wrong problem now that
there are only 2-4 slots to begin with.

### Verification
Paper byte-identical (zero-diff on `surface.js`/`simulate.js`/`physics.js`;
`strokes.js` purely additive; hash-confirmed regardless). Full pipeline —
palette, both ground modes, strokes, splatter, blotch clusters —
hash-deterministic across seeds 1-6, all distinct. DOM confined to
`paint.js`'s two build functions; `splatter.js`/`density.js`/`rng.js`/
`strokes.js` stay DOM-free. No `Math.random()`. Screenshotted 312px grid
(both ground modes) + native lightboxes showing blotch clusters and patch
curves close up.

Status: brief 15 done on `feature/paint-surface`, pushed. Awaiting review.

## 2026-07-21 — Brief 14: calibration pass (patches, width, splatter/pooling balance)

Opened by committing docs left uncommitted from the architect side
(`v3/briefs/14-paint-calibration.md`, `v3/ARCHITECT.md`'s new "never hand
Shivang git chores" rule) to `main`, then rebasing the feature branch — the
new rule's own first-line-of-every-prompt pattern, now actually followed.

### Task 4 first, since it's the one with a real failure mode behind it
Read brief 02's ink-bloom postmortem before touching code (PROJECT-LOG.md
2026-07-09): hit-triggered placement put every bloom on the left/right
edges, because paddle/wall hits are structurally always on the boundary —
cut for exactly that reason. Brief 12/13 quietly reintroduced the identical
bug in a different feature: `renderPaintStroke`'s pooling (3c) *also* only
fires at paddle/wall hits, and once strokes went opaque and wide, those
pooling knots became the dominant, edge-ringed mark. Same root cause, new
paint. Fix has two halves, not one:
1. `POOL_PEAK_MIN/MAX` cut from 2.2-3.2x to 1.3-1.8x (`paint.js`) — pooling
   still reads as "the line paused here," stops being the loudest mark.
2. New `buildIntersectionBlotches` (`splatter.js`) fills the gap with marks
   that land where the rally was actually busy — reuses brief 13's
   `findDenseKnots` rather than a fresh intersection detector (dense knots
   already *are* the high-crossing points); `contributingStrokes` then
   answers "which two strokes" at each chosen point. Colour is an OKLab
   blend (`palette.js` gained `hexToOklab` export + new `oklabToHex`/
   `blendOklab`) of the two widest contributors, seeded-biased 0.3-0.7 so
   it's never a flat 50/50 wash — verified non-grey, non-uniform blends
   across a real seed.

### Task 1 — patches rebuilt, not tuned
Brief 13's soft radial-gradient patches were wrong on every axis per
review. New version: hard opaque fills (no gradient anywhere), closed
polygon with a 3-harmonic radius wobble for irregular/lobed silhouettes,
independent x/y scale for round-vs-elongated variety, heavy-tailed size
(`rng()^3.2`, 9px to a third of canvas area). `count` is now a lab slider
(0-12) instead of rng-derived — "seeded placement WITHIN that count," not a
seeded count.

### Task 2 — width range
0.4x-2.0x → 0.15x-4.0x. Also dropped undulation frequency (1.5-3 cycles →
0.5-1.5) since the old cycle count read as vibration at the new amplitude —
brief wanted "one or two transitions, not many." Verified the slider
actually sweeps uniform-at-0 to extreme-at-1, not just extreme-at-1.

### Task 3 — splatter count
12-26 → 24-50. Confirmed nothing in the render path was fragmenting or
skipping the trail — the "dots not lines" read was Task 2 (thin strokes)
and Task 4 (edge-pooling dominating attention), not a suppression bug.

### Verification
Paper zero-diff vs `main`. Full pipeline (palette, both ground modes,
strokes, splatter, blotches) hash-deterministic across seeds 1-6, all
distinct. `oklabToHex` round-trips exactly on all tested hexes. Blotch
colours pixel-checked on a real seed: genuine blends, not pure passthrough,
not flat grey. DOM confined to `paint.js`'s two build functions only —
`palette.js`/`splatter.js`/`density.js`/`rng.js` stay DOM-free. No
`Math.random()`. Screenshotted 312px grid (both ground modes) + one native
lightbox.

Status: brief 14 done on `feature/paint-surface`, pushed. Awaiting review.

## 2026-07-21 — Brief 13: splatter (density-placed) + ground patches

Found an interactive rebase left mid-flight from outside this session
(`.gitignore` conflict — main and the feature branch each independently
added the file, one for `.DS_Store`, one for `.claude/settings.local.json`).
Merged both lines, completed it, force-pushed. `.claude/settings.local.json`
is now untracked+ignored — the recurring dirty-file noise in every prior
session's git status is gone.

### Task 0 — `v3/engine/density.js`, on `main`
`computeLineDensity` (normalised [0,1] field this time, chalkboard.js's
version wasn't) + `findDenseKnots` (greedy local-maxima, minimum-spacing
constraint so results spread across the composition instead of clustering).
Built standalone per the brief — chalkboard.js/fill.js sit on unmerged
branches. Also added `weightedPick`/`weightedSampleWithoutReplacement` to
`rng.js` (purely additive, paper's `makeRng` untouched) since both splatter
and patches need seeded weighted sampling.

### Task 1-2 — `v3/engine/splatter.js` (new)
Placement: density field → `findDenseKnots` → seeded weighted sample (not
top-N, so similarly-busy rallies don't produce identical structure). Two
mark types, both fully opaque (no gradient, no soft edge): irregular blobs
(heavy-tailed size via `rng()^4`) and teardrop-shaped flung marks with 2-5
satellite droplets, oriented along the nearest stroke segment's direction.
Colour: ink at a fixed 0.15 weight alongside the 3 accent weights.

### Task 3 — `buildPatchGround`, `v3/engine/paint.js`
Colours come from the accent palette (not `GROUND_LIBRARY` — Patches mode
has no colour choice, PAINT-MODE.md §3). Composition-aware: field centres
are density-weighted toward busy rally regions, same `density.js` Task 1
uses. "Brush-swipe not circles" via 4-6 overlapping soft-gradient blobs
walking a jittered line per field. Coverage measured short of the 55-85%
target on the first pass (37-53%, pixel-sampled) — soft falloff + blob
overlap both eat into the naive solid-disc area estimate; added a measured
`RADIUS_COMPENSATION` (1.55x) to close the gap, re-verified in range.

### Verification
Paper byte-identical (engine files zero-diff vs `main` except the additive
`rng.js` exports; hash-confirmed anyway). Full paint pipeline — palette,
ground (both modes), strokes, splatter — hash-deterministic across seeds
1-6, all distinct. `density.js`/`splatter.js` DOM-free; `paint.js`'s new
`buildPatchGround` confined to the same carve-out as `buildPaintSurface`.
No `Math.random()`. Screenshotted native + 312px grid, both ground modes.

Not fully resolved by eye: patches read as soft round clouds more than
directional "brush swipes" at default settings — elongation is present but
subtle. Flagging for review rather than continuing to tune blind.

Status: brief 13 done on `feature/paint-surface`, pushed. Awaiting review.

## 2026-07-20 — Brief 12: paint reset (weave + stroke replaced, review-driven)

Brief 11's weave and stroke failed review — read as graph paper + translucent
watercolour, not paint. Brief 12 replaced both; palette.js and paint.js's
function contracts stand.

- **Ground:** `buildWeaveTile`/tile pattern deleted outright — a repeating
  tile can't be tuned into non-grid. Replaced with a non-repeating tooth
  (900 specks + ~15-24 low-amplitude blotches, positioned directly from the
  passed `rng`, no tile). Vignette kept.
- **Stroke:** new independent path, `globalAlpha` hardcoded to 1.0 (`op`
  param kept for signature parity, never read) — no two-pass, no blend on
  overlap. Removed the glossy highlight pass added last session (unrequested
  then, and a translucent layer contradicts "flat poster colour" now).
  Width-wave range widened 0.4×–2.0× (was 0.55×–1.6×). Pooling numbers
  unchanged (brief 11 §3c) — opacity was the reason it wasn't reading, not
  the peak/window values; confirmed visible post-fix, didn't need widening.
- **Lab:** age fade, weight range, opacity range, and both pass mults now
  `disabled` when Surface = Paint (verified both directions). Speed weight
  is not in the brief's severance list — left live for paint intentionally.
- Verified: paper-path files (`surface.js`/`strokes.js`/`simulate.js`/
  `physics.js`/`rng.js`) zero-diff vs `main`. Paint full-pipeline
  hash-deterministic, 6/6 distinct across seeds 1–6. Opaque confirmed at the
  pixel level (overlap = exact top colour, alpha 255, no blend). No
  `Math.random()` in engine. `paint.js` DOM confined to one
  `document.createElement` (`buildPaintSurface`).

Status: brief 12 done on `feature/paint-surface`, pushed. Awaiting review.

## 2026-07-20 — Brief 11 complete: paint stroke renderer + lab wiring (tasks 3-4)

Review gate released same-session ("a bare weave with no strokes on it isn't
reviewable"), so tasks 3 and 4 ran together on `feature/paint-surface`.

### Task 3 — `renderPaintStroke` in `v3/engine/paint.js`
A single `ctx.lineWidth` stroke can't vary width along its length, so this is
a filled ribbon: the Catmull-Rom spine is sampled densely, each sample offset
perpendicular by half the local width, left+right edges filled as one closed
polygon. Width at each sample is `wt` scaled by two independent signals,
combined by `max()` (not multiply, so a pooling knot isn't cancelled by a low
point in the width wave):
- **3b (width wave):** low-frequency sine across arc length, 0.55–1.6× range,
  1.5–3 undulations. Deterministic without threading an `rng` through the
  renderer — undulation count/phase are hashed off the stroke's own start/end
  coordinates, the same technique `strokes.js`'s `jitterPath` already uses
  (`Math.sin(p.x*0.73+p.y*1.31)`) rather than a new pattern.
- **3c (pooling):** peak 2.2–3.2× base over an 8–14px arc window, both
  seeded off the commit point's coordinates, smoothstep falloff (not a step).
  Only fires where `poolStart`/`poolEnd` are true — the caller (the lab)
  computes these from stroke adjacency + `event` type, so only real
  `paddleHit`/`wallHit` commit points pool; `score`/`overflow`/`gameEnd`
  endings (not physical direction changes) don't. Same division of labour as
  `renderChalkStroke` taking `ageFrac` from the caller instead of computing
  it from stroke index itself.
- **Glossy highlight, not in the brief's lettered subtasks:** a second,
  thinner (32% width) fill down the centre in a lightened tint at reduced
  alpha, motivated directly by the brief's "clean and slightly glossy, not
  grainy" line — a flat single-tone fill read as matte poster colour without
  it. Small and reversible if it reads wrong in review.
- Rounded caps at both ends, radius following local half-width, so a pooled
  end reads as a blob per 3c's spec rather than a bulge.

### Task 4 — lab wiring, `v3/labs/art-lab.html`
**Deviation from the brief, flagged not silently resolved:** the brief says
the surface selector "gains a third option: Paint," implying Paper+Chalkboard
already exist as a pair. They don't on this branch — chalk lives only on
`feature/chalkboard-surface` (unmerged), and brief 11 is explicit that paint
must stay independent of chalk and chalk must stay untouched. Building a real
3-way selector would mean pulling chalk code onto this branch, which the
brief's own constraint forbids. Built a 2-way Paper/Paint selector instead —
what's actually real on this branch — and flagging the gap rather than
inventing chalk here or silently shipping "third option" language that isn't
true yet.
- Scheme selector (4 rules + Random), ground colour (4 `GROUND_LIBRARY`
  entries) — both resimulate, since they change the underlying palette/ground.
- Base width / pooling strength / width variation sliders are pure
  render-time multipliers, no resimulate — same pattern as the existing
  Enhancements panel (age fade, speed weight), confirmed by watching stroke
  counts stay identical while dragging them.
- `simulateGame`'s colour cycling is a plain round-robin with no notion of
  accent weight, so the lab (not the engine) builds a 20-slot array with each
  accent repeated proportionally to its weight (11/6/3 for 0.55/0.30/0.15)
  and seed-shuffles it, so cycling doesn't visit dominant/secondary/minor in
  visible blocks. Lab-only glue, no engine change.
- Palette swatches (ground/ink/3 accents) render under each tile per the
  brief's explicit ask, so scheme rules are actually judgeable.

### Verification (Task 5)
1. Paper byte-identical to `main`: `surface.js`/`strokes.js`/`simulate.js`/
   `physics.js`/`rng.js` are untouched this whole brief (confirmed via
   `git diff main`), and the paper code path in `art-lab.html` calls the same
   functions with the same arguments, just now inside an `if/else` — hash
   re-render across seeds 1–6 confirms determinism on top of that.
2. Chalkboard: not on this branch, nothing to move.
3. Paint fully deterministic: palette + ground + stroke geometry + pooling
   hash-compared identical on same-seed re-render, 6/6 distinct across seeds
   1–6 (browser console, full pipeline including `renderPaintStroke`).
4. `palette.js`: still zero DOM references (unchanged this session).
5. `paint.js`: only two `document.createElement` calls in the whole file,
   both inside `buildWeaveTile`/`buildPaintSurface` — `renderPaintStroke` and
   its helpers only touch the passed-in `ctx`, matching `renderChalkStroke`'s
   confinement.
6. Grepped clean: no `Math.random()` anywhere in `v3/engine/`.

Manually exercised in the browser: surface toggle, scheme/ground dropdowns,
all three paint sliders, pooling strength pushed to visible extremes (4.0)
and width variation to uniform (0) to confirm both signals actually drive the
renderer, not just accept parameters silently.

### Status
Brief 11 (all 4 tasks) done on `feature/paint-surface`, pushed. Lab link
given to Shivang for his own-eye review — nothing here is a merge decision,
that's his call per `ARCHITECT.md`.

### Next
Brief 12 — physics-driven emission events (spin → splatter burst, speed →
whip line) and drips off the pools. Blocked on Shivang's review of this
session's stroke renderer landing well; do not start speculatively.

## 2026-07-20 — Brief 11 tasks 1-2 done (palette + paint ground); task 3 deferred to review

### Task 1 — `v3/engine/palette.js` (new, on `feature/paint-surface`)
Built per brief 11, but the brief's own separation-guard spec was revised
mid-session (WCAG relative luminance → OKLab ΔE) after Claude Code's plan
flagged that a WCAG floor would ban Yellow from ever appearing against any
ground — Yellow/Cream only reaches 1.25–1.51 WCAG contrast, well under any
conventional floor, despite being the best-loved pairing in the reference
set. Computing the actual 12×4 OKLab ΔE matrix confirmed the deeper issue:
Yellow/Cream (ΔE 0.1687) is the matrix's global minimum — the approved
pairing IS the worst pairing, so no ground-vs-accent floor can reject bad
combinations without also rejecting the good one. Resolution: `MIN_GROUND_DE
= 0.16` is dormant by design (rejects nothing today, tripwire for a future
low-chroma hue); the guard doing real work is accent-vs-accent
(`MIN_ACCENT_DE = 0.15`), which surfaced that the `analogous` scheme's
offsets `(0,1,3)` were mis-specified — adjacent library hues 30° apart fail
the floor on 9/12 base indices. Widened to `(0,2,4)`, per the brief's own
suggested fix; worst-case ΔE across all 4 schemes × 12 base indices now
0.131–0.328. Verified: deterministic (hash-compared, seeds 1-6, both random
and fully-pinned opts), exactly 3 accents always, no duplicate accent hexes,
A/B/C assignment ~35% base-hue-dominant (not positional), no `Math.random()`,
no DOM reference anywhere in the file.

### Task 2 — `v3/engine/paint.js` (new, ground only)
`buildPaintSurface(w, h, rng, groundHex)` — flat ground + weave texture +
weak vignette, no dashed centre line, no dust speckle. First implementation
read as a hard drafting grid, not woven cloth — a real bug (looping both
wraparound axes for every thread band stacked 2-3 overlapping strokes into
one hard edge). Rebuilt as an actual basket-weave: short alternating dashes
per grid cell (checkerboard on-top order) rather than tile-length ruled
lines, which is what stopped it reading as graph paper. Verified visually at
both native 1000×630 *and* ~312px (the lab's actual grid-tile size) across
all 4 `GROUND_LIBRARY` grounds — texture survives both, per the brief's
revised dual-size evaluation requirement (added mid-session for the same
reason brief 09 had to fix chalk's grain: a texture judged at only one size
can pass while failing at the other, in either direction).

### Housekeeping
- `v3/CLAUDE.md`: new rule — docs (`PROJECT-LOG.md`, `BACKLOG.md`,
  `ARCHITECT.md`, `CLAUDE.md`, `PAINT-MODE.md`, `briefs/`) commit to `main`
  only, never to a feature branch, rebase the branch after a doc commit.
  Root cause: brief 10's log entry landed on `feature/chalkboard-surface`
  instead of `main`, so the next chat loaded an 11-day-stale project state.
  This session's own brief-11 edits (the OKLab pivot above) were made
  directly against the working tree mid-session and needed exactly this
  split — code to `feature/paint-surface`, docs to `main` — to land clean.

### Status
`feature/paint-surface` has `palette.js` + `paint.js` (ground only), pushed.
Task 3 (paint stroke renderer — variable-width ribbon, pooling at commit
points) and Task 4 (lab wiring) not started; brief 11 explicitly gates Task 3
on review since it's the piece that decides whether paint mode works at all.

### Next
Brief 11 Task 3, new session.

## 2026-07-20 — Chalk arc closed pending review; paint/splatter references received; recommending a new chat, on Opus, for paint

### Housekeeping (confirmed landed on `main`)
- `v3/CLAUDE.md`: lab-controls-are-calibration-instruments rule recorded
  (commit `27e3fde`) — no lab slider ever ships as end-user UI; values get
  frozen to constants when a mode is promoted to product.
- `v3/BACKLOG.md` created (commit `393adec`), `ARCHITECT.md` load order
  updated to read it every session, right after `PROJECT-LOG.md`. First
  entry: chalk's density smudge (brief 10) fires correctly but is tuned too
  faint to read (`SMUDGE_ALPHA` 0.055 peak, 6–16px radius) — needs a real
  tuning pass plus a calibration slider, and smudge colour should follow
  chalk mode (white mode = neutral dust, tri mode = colour-tinted), which
  revises brief 09/10's "always pale neutral" call for tri mode
  specifically. Also carried forward the still-open items from the
  2026-07-11 entry (stale `feature/art-lab` branch, doc drift in
  `DESIGN.md`/root `CLAUDE.md`/`v3/CLAUDE.md`, ink bloom, spin-shape drops,
  fill's rectangle-clip fix, open product decisions) — status not
  re-verified, check before picking any up.
- Chalk status unchanged from the 2026-07-13 entry: briefs 07–10 complete
  on `feature/chalkboard-surface`, pushed, NOT merged. Still needs
  Shivang's own-eye review + merge decision — that's independent of the
  backlogged smudge-slider item above, doesn't need to block it.

### Paint/splatter — references received, NOT yet briefed
Shivang supplied 5 references for the next surface (canvas/paint mode),
spanning a wider range than chalk's did:
1. Cream/canvas-textured ground, two large precise black looping-circle
   strokes, a handful of big flat-colour blobs (yellow/orange-red/teal)
   sitting under/around the loops, fine multi-colour speckle across the
   whole surface.
2. A distinct, cleaner sub-style: glossy black squiggle-lines on white,
   with bold flat-colour lens/polygon shapes filling some of the enclosed
   regions between lines — visually very close to what `fill.js`'s
   enclosed-region detection already produces, just with an expressive
   line base instead of clean trail strokes.
3. Thick confident brush-swipe strokes (not just thin drips) over a
   saturated red/blue split ground, heavy layered white + colour spatter
   dots on top.
4–5. Two Adobe Stock references (watermarked) — dense, maximalist,
   6–8 simultaneous colours, drips + blobs + fine spray all at once, white
   ground barely visible through the coverage.

Synthesis — six distinct visual elements recur across the set: (A) warm
canvas-weave ground (nearest existing analog: `surface.js`'s paper
technique, different grain), (B) thick variable-width expressive strokes,
looser/bolder than today's trail render, (C) large flat-colour splat
blobs — closely matches what enclosed-region fill already does (ref #2
especially), (D) fine multi-colour spatter/spray dots at high density —
same shape of problem as chalk's density-scatter smudge, likely directly
reusable machinery, (E) thin gravity-biased drip trails hanging off
strokes/blobs — genuinely novel, no existing engine analog, (F) richer
simultaneous multi-colour palette with real paint-layering/overlap, unlike
chalk's clean 3-colour separation.

Proposed phasing (NOT confirmed with Shivang yet — this is a
recommendation, not a locked plan):
1. Canvas surface + bold variable-width stroke renderer (the foundation,
   same shape as chalk's brief 07).
2. Flat-colour splat blobs, built on `fill.js`'s existing enclosed-region
   detection rather than a new placement system from scratch.
3. Fine spatter/spray dots, adapting brief 10's density-scatter pattern
   (`computeLineDensity`/`scatterDensitySmudges`) to multi-colour dot
   placement instead of ambient smudge.
4. Drip trails — stretch, likely out of v1, no existing engine analog to
   build on, revisit after 1–3 are locked.

### Recommendation for next session
Start a NEW chat for paint/splatter, on Opus rather than Sonnet or Fable —
this mode is bigger in scope and more novel (element E has no existing
engine precedent, unlike everything chalk needed) than anything built so
far, and this project's own model (chats are disposable, the repo carries
continuity) is built exactly for clean handoffs like this one. Fable's
strength is narrative/creative writing, not a fit for this role's actual
work. Load order for the new chat: `ARCHITECT.md` → `v3/CLAUDE.md` →
`v3/PROJECT-LOG.md` (this entry) → `v3/BACKLOG.md` → latest brief. This
entry's synthesis above stands in for the raw reference images — confirm
phasing with Shivang before writing brief 11.

## 2026-07-13 — Chalkboard calibration + density smudge (Brief 10 done, NOT merged)

Intended last chalk brief before the review gate.
- **Task 0 (on `main`, pushed):** Recorded the calibration-instrument rule in
  `v3/CLAUDE.md` — every lab control exists to reach a locked default; none
  ships as end-user UI, values get frozen to constants when ported.
  `feature/chalkboard-surface` was rebased on top of it.
- **Task 1 — evaluate at native res.** Lightbox was CSS-upscaling the 1000x630
  bitmap (88vw/78vh), softening the grain under review. Capped at native:
  `max-width/height: min(1000px,96vw)/min(630px,86vh)` — shrinks on small
  screens, never exceeds native. Verified by measured rendered size (1000x630
  large viewport, 983x619 at 1280w). Noted the `#gc` doc-drift in the brief,
  did not chase it.
- **Task 2 — wide strokes read as chalk, not glow.** At native, wide strokes
  glowed. Halo changed from width-proportional to a ~constant dust fringe
  (core + `HALO_DUST` 3px); grain pattern now scales with stroke width
  (`grainScale = sqrt(width/1.6)`, cap 1.8) so texture stays proportional.
  Final: `HALO_ALPHA` 0.26, `HALO_DUST` 3.0, `CORE_MULT` 1.0,
  `CORE_GRAIN_STRENGTH` 0.6, `GRAIN_REF_WIDTH` 1.6.
- **Task 3 — density-based ambient smudge** replaces intersection smudge (which
  missed clustered/near-parallel bundles). Pure `computeLineDensity` (28px grid,
  wt-weighted) + `scatterDensitySmudges` (fixed-seed rng, placement/size/opacity
  by local density, `DENSITY_FLOOR` 0.16) + reused radial-blob `renderSmudges`.
  Verified: 0 smudges below floor, denser seeds get more; dead intersection code
  removed.
- Verified: paper byte-identical to main, chalkboard deterministic (smudges
  included), chalkboard.js density funcs pure. Still NOT merged — review gate is
  next, then canvas/paint.

## 2026-07-12 — Chalkboard final polish (Brief 09 done, NOT merged)

On `feature/chalkboard-surface`, the last chalk brief before Shivang's review:
- **Task 1 — roughness that survives display size.** Root cause the prior two
  passes missed: the grain tile used per-pixel holes that average away when the
  1000×630 canvas is shown at ~312px (3.2× downscale) — textured zoomed in,
  clean at a glance. Rebuilt the tile with multi-pixel blob holes (300 arcs,
  r 1.4–4px, 128px seamless) that survive the downscale, plus the ~20% presence
  bump: `CORE_GRAIN_STRENGTH` 0.5→0.6, `HALO_ALPHA` 0.20→0.24. Verified at real
  display size, not just zoomed.
- **Task 2 — intersection smudge.** Pure/headless `findStrokeIntersections`
  (bbox-culled pairs, strided polylines, 8px-grid dedup) + a soft radial-blob
  `renderIntersectionSmudges` (pale neutral chalk dust, low opacity, radius off
  local width). Composited once per render. Subtle, not muddy even at 140
  strokes.
- **Task 3 — age-linked smudge.** Threaded the existing age fraction into
  `renderChalkStroke`; older strokes get more core grain + dustier halo, so age
  costs crispness as well as opacity. Same single Age Fade toggle governs both;
  OFF = flat baseline.
- Verified: paper byte-identical to main, chalkboard deterministic (smudges
  included), chalkboard.js finder pure / DOM confined to render+build fns, no
  new lab controls. Still NOT merged — this is the review gate.

## 2026-07-12 — Chalkboard revision (Brief 08 done, NOT merged)

On `feature/chalkboard-surface`, two fixes before composition review:
- **Task 1 — chalk stroke roughness/thickness.** The core was drawn clean at
  the identical width paper uses (0.75), so chalk read as a paper stroke. Now
  `CORE_MULT` 1.0, `HALO_MULT` 2.1, and a second grain punch on the core at
  `CORE_GRAIN_STRENGTH` 0.5 (grain tile also coarsened) so texture is visible
  on the line itself, not just the halo. Tuned by eye to sit between the old
  clean build and the ampersand reference. `chalkWidthMult` still scales.
- **Task 2 — speed-weight removed entirely** (engine + lab + the per-stroke
  `speed` field). Indistinguishable from age fade in practice; cut per
  build-lean. Age fade is now the only enhancement.
- Verified: paper byte-identical to main, chalkboard deterministic, grep-clean
  of speed-weight refs. Still NOT merged — next is composition/density review.

## 2026-07-12 — Chalkboard surface built (Brief 07 done, NOT merged)

### Built but NOT merged — on branch `feature/chalkboard-surface` (off main)
- **Brief 07 (chalkboard surface):** New `v3/engine/chalkboard.js` adds a second
  surface style alongside paper, fully additive — `surface.js`/`strokes.js`/root
  `index.html` untouched, and Paper renders byte-identical to main (hash-verified
  across seeds 1-6). Branched off `main`, independent of fill.
  - `buildChalkboardSurface(w,h,rng)`: near-black `#1A1A1E` base, 5-12 rng cloudy
    smudge blobs, subtle neutral grain (amp 8), darkened edge vignette. No dashed
    centre-line, no dust speckle.
  - `renderChalkStroke(...)`: smooth Catmull-Rom two-pass (soft halo + clean
    core) on a per-stroke bbox offscreen, fixed-seed grain punched into the halo
    for a dusty chalk edge; `chalkWidthMult` scales width only.
  - Tri palette `CHALK_PALETTE` `['#3E8EF7','#E8478E','#F5C518']`; white mode
    `WHITE_CHALK_HEX` `#EFEAE0`. All starting points — Shivang eyeball-tunes.
  - Lab: Surface selector (Paper/Chalkboard) + Chalk group (mode White/3-Colour,
    width slider 0.5-3). Chalk reuses the existing age-fade/speed-weight resolved
    wt/op. Determinism hash-verified.
- **Awaiting Shivang's eye in the lab before merge** (same gate as fill). Likely
  tuning: smudge intensity/count, exact tri hexes, white warmth, chalk edge
  roughness, default width.

### Still open from before (unchanged)
- `feature/fill-regions`: Briefs 03-06 done (edge gap + spread fixed and
  pixel-verified in Brief 06), NOT merged — awaiting Shivang's review.

---

## 2026-07-09 — Fill built, needs aesthetic revision (Brief 03 done, NOT merged)

### Done & merged to main
- **Brief 01 (art-lab):** Engine extracted from root index.html into pure ES
  modules — `v3/engine/rng.js, physics.js, strokes.js, surface.js, simulate.js`.
  Seedable/deterministic. `v3/labs/art-lab.html` renders 12 headless-simulated
  artworks in a grid with metrics (strokes / ink% / crossings), density
  scrubber, palette, copy-settings. Faithful to live build. Merged.
- **Brief 02 (stroke enhancements):** Age fade (defaults newest 1.0 / oldest
  0.55, ON) and speed weight (min 0.8 / max 2.0, OFF) added as render-time
  overlays with lab controls, off-by-default discipline. Ink bloom was built
  then CUT — hit-triggered placement put all blooms on left/right edges
  (predictable, useless). Merged.

### Built but NOT merged — on branch `feature/fill-regions`, needs revision
- **Brief 03 (fill regions):** Raster flood-fill region detection in pure
  `v3/engine/fill.js` (headless, zero DOM — detection returns data; wash
  painting lives lab-side in art-lab.html). Detection works well. Lab "Fill"
  group added, off by default.
- **Shivang's verdict: mechanism great, aesthetic wrong. Four problems:**
  1. Fills render near-OPAQUE (lab default opacity 0.8 — should be ~0.3; spec
     said 0.32). This is the biggest issue — reads as flat digital shape, not
     the specced translucent pigment wash. "Same hand as the strokes" violated.
  2. Fills inset from stroke edges → ugly paper halo/gap (half-res mask + blur
     eating the boundary; needs mask dilation and/or full-res detection).
  3. Single colour — every fill is blend(palette[0],palette[1]). Shivang wants
     each region a DISTINCT palette colour, assigned with variety.
  4. Clustering — spacing rule too weak; fills bunch, leaving canvas halves
     empty. Needs stronger spread / quadrant balancing.
- **Decision: do NOT drop fill. One focused revision pass (Brief 04) first.**
  Judged at its worst preset (opaque/mono/inset/clustered). Target: translucent
  ~0.3 washes, each a distinct palette hue, filling clean to stroke edges,
  evenly spread, grain+lines showing through. Then re-decide keep/drop with
  real evidence.

### Housekeeping pending
- Delete stale `feature/art-lab` branch (merged long ago, never cleaned).
- Doc-drift cleanup commit (do together, low priority): DESIGN.md §12 rule 12
  still says BGM via fetch+decodeAudioData (WRONG — it's new Audio()+
  createMediaElementSource, per CLAUDE.md §4); root CLAUDE.md §7 spawn-angle
  formula doesn't match live index.html (live is Math.random()*0.55+0.18);
  root CLAUDE.md getImageData "two loops → merge" note is stale (already one).

### Calibration locked (Shivang's taste, in numbers)
Preferred compositions: ~28–50 strokes, ~10–17% ink, crossings under ~470.
Sweet spot ~30–35 strokes / 10–12% ink. Real preference is SPARSER than
intuition — high end is "acceptable," low 30s / ~11% is "beautiful." Implication:
5/7-point games overshoot the good zone → density scrubber is essential, and
suggested-moment tick target is ~10–13% ink primary, out to ~17% secondary.

### NEXT UP (start of next chat)
1. Write & run **Brief 04 — fill aesthetic revision** (the 4 fixes above).
   This is the priority; fill is the feature Shivang was most excited about.
2. After fill resolves (keep or drop with evidence), candidate next briefs:
   - Composition-aware ink bloom (bloom at dense intersection knots, not paddle
     hits — needs the region-analysis machinery fill already built).
   - Surfaces: chalkboard + canvas renderers (category change, likely the next
     big "wow" lever alongside fill).
   - Shivang's own ideas, logged & endorsed: spin-shape drops (heavy-spin ball
     drops a mark that makes player skill legible in the art — attacks
     convergence), swerve/loop ball physics (crank spin magnitude/decay, find
     the unhittable ceiling in the lab).
3. Open product items still pending Shivang: font decision (index.html already
   self-hosts Basier Circle — real Q is keep vs Google Font), 12 palette hex
   values, onboarding State-1 surface-selector sketch, share-page spec.
