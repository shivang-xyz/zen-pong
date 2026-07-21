# Brief 15 — Paint Refinement: Splatter Mass, Curved Patches, Blotch Clusters

Continues `feature/paint-surface` after brief 14. Docs to `main`, code to the
branch. Stroke width variation is now correct — do not change it.

---

## Task 1 — Pooling at paddle/wall hits: remove entirely

Brief 14 said to "reduce substantially, keep a small amount." That was wrong.
Any amount clusters at the boundary, because direction change only ever happens
at a paddle or a wall — so a residual amount still reads as a ring of marks
around the canvas edge.

Remove edge pooling completely. Strokes still swell and thin along their length
(brief 14 Task 2, working correctly), but no blotch is deposited at a hit.
The `POOLING STRENGTH` slider now governs **intersection blotch size only** —
relabel it accordingly.

## Task 2 — Splatter: far more visual mass

Individual drops are currently near-invisible specks. Target roughly **40%
splatter / 60% stroke** by visual mass across the artwork.

- Raise drop sizes substantially across the whole distribution. Keep it
  heavy-tailed — many small, few large — but shift the entire range up so that
  even the small end is clearly legible at 312px, and the large end approaches
  the size of a fat stroke's width.
- Raise count as well.
- Flung marks with tails and satellites (brief 13 Task 2) should be more
  prominent — right now they barely read. Longer tails, larger satellites.
- Splatter placement stays density-weighted. This is a size and count change,
  not a placement change.

## Task 3 — Patches: smooth curves, not polygons

Current patches have visible straight polygon edges and hard corners. Reads as
computer graphics, not paint.

- Build the silhouette as a **closed smooth curve** — run the jittered vertices
  through Catmull-Rom (`traceCR` already exists in the engine) or closed
  bezier, so every boundary is curved. No straight segments, no corners.
- Overall shape should read as roundish/lobed — a spill or a swipe — with
  smooth bulges and inlets, not a faceted blob.
- Keep the hard edge quality (opaque, crisp boundary, no blur) from brief 14.
  Smooth ≠ soft: the outline is curved but the edge is still a clean cut.
- Keep the size range and count slider from brief 14.

## Task 4 — Intersection blotches: clusters, not single ellipses

Blotches are being generated (the metadata counts confirm it) but each renders
as one large smooth ellipse floating mid-canvas. That doesn't read as paint
pooling where two wet strokes crossed.

- **Fewer locations, only the densest.** Restrict to the top few most-dense
  intersection knots per artwork, not a dozen scattered points.
- **Each blotch is a cluster**, not one shape: a main irregular mass with 3–6
  smaller satellite blobs of varying size crowded around and partly overlapping
  it, plus a few flung droplets escaping outward. That irregular clustered
  silhouette is what reads as real pooled paint.
- Smooth curved outlines throughout, same treatment as Task 3.
- **Colour mixing stays as specced in brief 14 Task 4** — OKLab blend of the
  two crossing strokes, seeded bias, never flat 50/50. Apply per element within
  the cluster: the main mass toward the blend, satellites varying toward one
  parent colour or the other. That variation is what sells it as wet paint
  meeting rather than a third colour being painted on.
- Size scales with local density and the crossing strokes' widths.

## Verification

Paper byte-identical to `main`. Chalk untouched. Paint deterministic. No
`Math.random()` in engine. Screenshot the 12-up grid at 312px in both ground
modes, plus one native lightbox showing a blotch cluster close up.

## Done looks like

No marks ringing the canvas edge. Legible splatter carrying real visual weight
against the strokes. Patches with smooth curved silhouettes and crisp edges.
Two or three convincing clustered, colour-mixed blotches sitting at the busiest
crossings in the middle of the composition.
