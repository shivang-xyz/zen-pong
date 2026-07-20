# PROJECT-LOG.md — Zen Pong v3 Living State

Newest entries at top. Each session appends where it left off. A fresh chat
reads this to know exactly where the project stands.

---

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
