# Brief 03 — Fill Regions

**Branch:** `feature/fill-regions` (new branch off main, AFTER brief 02 merged)
**Goal:** Add a post-game fill pass to the art engine: detect enclosed regions
formed by the accumulated strokes, filter to small/pleasing ones, and fill them
with a translucent pigment wash that reads as the SAME medium as the strokes —
not a shape pasted on top. Preview and tune entirely in `art-lab.html`.

**Design intent (Shivang, locked):** Fills must belong to the same hand as the
strokes. The strokes look like watery pencil-pigment on paper; fills must feel
like that same pigment pooled inside the lines — translucent, papery, letting
grain and underlying strokes show through. A fill that looks like a flat opaque
shape dropped on top is WRONG. Default toward the soft-wash end; expose a style
control so Shivang can push toward more saturated/painterly and judge by eye.

**Calibration context:** Shivang's preferred compositions are sparse (~28–50
strokes, ~10–17% ink, sweet spot 30–35 strokes / 10–12%). Fill looks best on
sparse artworks with real negative space and larger enclosed regions. Tune
defaults so fill reads well in that zone; dense artworks will have few fillable
regions and that is acceptable.

---

## Architecture rules (from v3/CLAUDE.md — do not violate)
- Fill logic lives in `v3/engine/` (new module, e.g. `fill.js`). Zero DOM/audio/
  React in engine files. The region-detection function must be headless and
  pure (takes stroke data + canvas dims, returns fill regions as data).
- All randomness (if any) through injected `rng()`. Determinism holds: same seed
  + same params → identical fills.
- The rendering step (drawing the wash onto a canvas ctx) may live in the lab /
  a render helper, but region DETECTION stays pure engine.
- Do not touch root index.html.

---

## Task 1 — Region detection (`fill.js`, headless)
Detect enclosed regions bounded by the committed strokes. Two acceptable
approaches — implement whichever is more robust; document the choice:

- **(A) Raster flood-fill (recommended for robustness):** rasterize the
  committed strokes to an offscreen mask at (or below) canvas resolution,
  flood-fill from the canvas edges to mark "outside," then every unreached
  connected component is an enclosed region. Measure each region's pixel area.
  This handles curved strokes and messy overlaps far better than vector polygon
  math, which is brittle with Catmull-Rom curves.
- (B) Vector planar-subdivision — only if you're confident; likely overkill.

Output: an array of regions, each with `{ areaFraction, centroid, bounds,
mask or pixel set }`, sorted by area.

## Task 2 — Region filtering
Not every enclosed region should fill — over-filling destroys composition.
- Only fill regions with `areaFraction` below a max threshold (per PRD: under
  ~8% of canvas area) AND above a min threshold (skip tiny slivers that look
  like noise). Params: `fill.minAreaFrac` (default ~0.004), `fill.maxAreaFrac`
  (default 0.08).
- Cap total fills per artwork. Params: `fill.maxCount` (default 6, PRD says
  6–8 max). When more candidates exist than the cap, prefer a pleasing spread —
  bias toward larger regions and/or spatial distribution rather than clustering
  all fills in one corner. Document the selection rule chosen.

## Task 3 — Fill colour
Per PRD: fill colour is a low-opacity blend of the two active palette colours —
a third colour emerging from their meeting.
- Compute the blend of the two currently-active palette colours (for the lab,
  use the first two active palette swatches, or expose which two).
- Params: `fill.opacity` (default ~0.32, PRD says 30–40%), `fill.blend`
  (0 = colour A, 1 = colour B, default 0.5).
- The wash must sit UNDER the strokes so the bounding lines stay crisp on top —
  this is key to "belongs to the painting, not pasted on." Draw order:
  paper → fills → strokes (→ age-fade/speed-weight as already built).

## Task 4 — Fill STYLE control (the taste knob)
Expose a single style parameter so Shivang can judge soft vs painterly by eye:
- `fill.style`: at minimum two modes —
  - **'wash' (default):** flat translucent pigment, papery, grain and strokes
    show through. The soft end.
  - **'textured':** slightly more present — e.g. subtle internal opacity
    variation / soft edge falloff toward the region boundary so it reads more
    like pooled watercolour with denser centres. The painterly end.
- If a continuous slider is cleaner than discrete modes, that's fine — expose
  it as 0 (softest) → 1 (most painterly). Document what the extremes do.
- Whatever the mode, the wash must remain translucent and medium-consistent.
  Do NOT introduce hard edges, gradients that look digital, or opaque fills.

## Task 5 — Lab controls
Add a "Fill" group to the control panel (separate from Enhancements):
- Enable checkbox — **default OFF** (pure strokes is the natural resting state;
  fill is opt-in, matching the product's post-game "Fill Shapes" moment).
- Sliders/inputs: style (wash↔painterly), opacity, blend, maxCount,
  min/maxAreaFrac.
- Live re-render on change. Because region detection may be heavier than the
  render-time overlays, it's acceptable to recompute fills on toggle/slider
  release rather than every input event — keep the grid responsive. Document
  the approach; if detection is fast enough for live updates, prefer that.
- Add fill params to the "Copy settings" JSON.
- Optional but useful: a small per-tile readout of how many regions were filled.

## Task 6 — Interaction sanity
- Fill composes correctly with age fade + speed weight (fills under strokes,
  strokes still age-faded on top). Verify visually.
- Density scrubber + fill: when scrubbing to k% of strokes, fills should be
  computed for the strokes SHOWN at that k%, not the full set — so scrubbing to
  a sparser moment recomputes appropriate enclosed regions. (This is the whole
  point: the player picks a composition moment, then fills THAT.) Confirm this
  works; if it's too slow to recompute per scrub step, recompute on scrub
  release and document it.
- Determinism holds for all param combinations.

---

## Acceptance criteria
1. With fill OFF, grid is identical to current main (fade/speed-weight intact).
2. With fill ON at defaults, sparse artworks (~10–15% ink) show a small number
   (≤ maxCount) of translucent washes inside enclosed regions, sitting under
   the strokes, reading as the same medium — not pasted-on shapes.
3. Style control visibly moves soft↔painterly while staying translucent.
4. Fills respect min/max area thresholds and the per-artwork cap.
5. Determinism holds (same seed + params → identical fills).
6. Engine region-detection code is headless/pure (grep: no DOM/audio in fill.js).
7. Root index.html untouched.

## Git / serve automation (one link, no middle steps)
- Work on `feature/fill-regions`, commit per task, small scoped messages.
- When complete and self-verified, push the branch to origin.
- Start the local server yourself and reply with the exact URL
  (`http://localhost:8000/v3/labs/art-lab.html`) plus a one-line summary of the
  fill defaults and how to toggle style.
- Do NOT merge to main — Shivang reviews fills in the lab first.

## Out of scope (do not build)
- Composition-aware ink bloom (separate future brief; shares region analysis).
- Chalk/canvas surfaces, spin-shape drops, suggested-moment ticks, the product
  results-screen "Fill Shapes" button (this brief is engine + lab preview only).
