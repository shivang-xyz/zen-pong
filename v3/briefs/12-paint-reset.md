# Brief 12 — Paint Reset: Opaque Ground + Opaque Stroke

Brief 11's Tasks 3–4 shipped a stroke that reads as translucent paper trail on
graph paper. Both failures are corrected here. Tasks 1–2 of brief 11
(`palette.js`, and `paint.js`'s function contract) stand — only the weave and
the stroke render path are replaced.

Continue on `feature/paint-surface`. Docs to `main`, code to the branch.

Splatter and patches are NOT in this brief. Brief 13.

---

## Task 1 — Kill the weave

The tile-based basket weave reads as a drafting grid at every size. It is not
tunable into correctness — a repeating tile with regular pitch will always read
as ruled paper. Delete `buildWeaveTile` and the pattern fill entirely.

Replace with: flat `groundHex`, plus a faint **non-repeating** tooth — sparse
irregular specks and very low-amplitude blotches at random positions across the
full canvas, drawn from the passed `rng`. No tile, no pattern, no repeat, no
grid, no directional structure of any kind. If a regular interval is visible
anywhere in the output, it's wrong.

Keep it subtle enough that it reads as primed canvas rather than noise. Keep
the existing weak vignette.

Evaluate at native 1000×630 and at ~312px grid size, as before.

## Task 2 — Opaque paint stroke, own render path

The stroke is currently going through paper's two-pass translucent pipeline
(`PASS-1 ALPHA 0.22` / `PASS-2 ALPHA 0.88`, opacity range 0.50–0.68). That is
why it looks like watercolour. Paint does not use that pipeline.

Write `renderPaintStroke` as an independent path in `paint.js`:

- **Fully opaque.** `globalAlpha = 1.0`. No two-pass. No opacity range. Later
  strokes cover earlier ones completely — overlap must read as one colour
  sitting on top of another, never as a blend. Reference: the flat poster
  colours in the attached splatter images.
- **Sever the enhancement overlays.** Age fade and the weight/opacity ranges
  must not apply to paint. If age fade is on, paint ignores it. Those controls
  belong to paper.
- **Variable width, visibly.** Current output is uniform. Widen the range —
  start `0.4×`–`2.0×` of base — and make the modulation low-frequency enough
  to read as a brush loading and unloading across a single stroke, not as
  jitter. It must be obvious at 312px, not just at native.
- **Pooling at direction change**, per brief 11 §3c, and it must actually be
  visible in the output. Currently it isn't.
- Clean edges. No grain, no halo, no soft falloff.

## Task 3 — Lab

Remove the paint-irrelevant controls from the Paint group's reach: age fade,
weight range, opacity range, and both pass alpha/width multipliers must be
inert or hidden when Surface = Paint. Leaving them live implies they do
something.

Keep: scheme, ground, base width, pooling strength, width variation.

## Verification

Paper byte-identical to `main`. Chalk untouched. Paint deterministic. No
`Math.random()` in engine. Both display sizes screenshotted.

## Done looks like

Twelve seeded artworks: flat opaque colour strokes of visibly varying width
with pooled knots at the turns, on a clean untextured ground with no visible
grid, at 312px. Nothing translucent anywhere.
