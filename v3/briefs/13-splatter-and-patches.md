# Brief 13 — Splatter at Intersections + Ground Patches

Continues `feature/paint-surface` after brief 12. Docs to `main`, code to the
branch.

---

## Task 0 — Shared density module on `main`

`computeLineDensity` exists in `chalkboard.js` and region detection exists in
`fill.js`, but both sit on unmerged branches — paint cannot import from either,
and `v3/CLAUDE.md` forbids copy-pasting engine code into a consumer.

Extract a new pure module `v3/engine/density.js` on `main`, standalone (do not
check out either branch to build it):

- `computeLineDensity(strokes, w, h, cellPx)` — grid accumulator, weight by
  stroke width, returns a normalised density field.
- `findDenseKnots(field, opts)` — returns candidate points ranked by local
  density, with a minimum spacing so results don't all bunch in one cluster.

Pure, headless, deterministic, no DOM. Commit to `main` first, rebase the paint
branch onto it, then build the rest of this brief on the branch.

## Task 1 — Splatter placement: density, not events

**The rule changes completely.** Splatter is NOT emitted at paddle hits or wall
bounces. Hit-triggered placement pins every mark to the canvas edges — this
already killed ink bloom in brief 02 and it is the same mistake.

Splatter lands at **density-weighted intersections**: where the ball's own path
crosses itself most, which is wherever the rally was busiest. Placement is
seeded and deterministic.

Use `findDenseKnots` to get candidates, then select a subset by seeded weighted
sampling — higher density, higher probability, but not deterministic top-N, or
every artwork gets the same structure.

## Task 2 — Splatter marks: two kinds, both opaque

Per the references: sometimes a drop, sometimes a flung mark. Both fully
opaque, `globalAlpha = 1.0`, flat palette colour, no blending, no soft edge.

**Drops** — round to slightly irregular blobs. Wide size range: a scatter of
small dots down to a few px alongside occasional large ones. Size distribution
should be heavy-tailed, not uniform — many small, few large. Colour drawn from
the accent weights (0.55/0.30/0.15), plus ink.

**Flung marks** — an elongated splat with a directional tail, oriented along
the local stroke direction at that knot, with 2–5 small satellite droplets
thrown ahead of it. This is what makes it read as thrown paint rather than
printed dots.

Ratio and total count are seeded. Start around 60/40 drops to flung, and tune
count against the density-scrubber calibration — do not carpet the canvas.

## Task 3 — Ground patches

Per `PAINT-MODE.md` §3 mode 2, and §3.1: seeded from the same seed as the game,
placed with knowledge of the committed stroke set — not independent randomness.

- 3–6 large soft-edged fields, 55–85% coverage, area share following the
  A/B/C accent weights.
- Composited **beneath** all marks. The re-render makes this free.
- Soft irregular edges — brush-swipe shaped, not circles, not rectangles.
- Plain mode (brief 11) stays as the other option. Lab gets a ground-mode
  toggle: Plain / Patches.

The reveal transition is not in this brief — build the resolved static image.

## Verification

Paper byte-identical to `main`. Chalk untouched. Paint deterministic including
splatter and patches. `density.js` pure. No `Math.random()` in engine. Screenshot
at 312px grid and native, both ground modes.

## Done looks like

Twelve artworks: opaque strokes over patch grounds, splatter concentrated where
the rally was dense rather than around the edges, a mix of fine drops and flung
directional marks, nothing translucent.
