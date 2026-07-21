# Brief 15 — Splatter Scale + Curved Patch Silhouettes

Continues `feature/paint-surface` after brief 14. Two focused fixes. Docs to
`main`, code to the branch.

Everything else in the current build is approved — strokes, width variation,
placement, colour. Do not touch them.

---

## Task 1 — Splatter is far too small

Individual drops are currently near-invisible specks. They need to carry real
visual weight alongside the strokes.

- Target roughly **40% splatter / 60% stroke by visual mass** — not by count.
  A large drop should be comparable in area to a fat passage of stroke.
- Scale the whole size distribution up substantially, keeping it heavy-tailed:
  still many small, but the mid band moves up a lot and the large end should
  produce genuine blobs, not dots.
- Flung marks scale with it — the elongated splats and their satellite
  droplets should read clearly at 312px, not only at native.
- Keep placement as-is (density-weighted intersections, brief 13). This is a
  scale change only, not a placement change.

Add a **splatter scale** slider to the lab so the ratio can be found by eye.

## Task 2 — Patch edges must be curved, not polygonal

Brief 14 specified "irregular polygon" and that is exactly what shipped —
visible straight segments and hard corners that read as computer graphics
rather than paint.

- Build patch silhouettes as **closed smooth curves**: generate the jittered
  vertex ring as now, then interpolate through it with a closed Catmull-Rom
  or cubic Bézier so the outline is continuously curved. `traceCR` already
  exists in the engine — reuse it rather than writing a new interpolator, and
  extend it to a closed variant if needed.
- No visible straight segments anywhere on a patch boundary. No corners.
- Silhouettes should still be irregular and varied — lobed, elongated,
  broadly round — but every transition smooth.
- Edges stay **hard** (crisp boundary, no feather, no gradient). Curved and
  hard-edged, not soft.
- Keep the existing size variation and count slider.

## Verification

Paper byte-identical to `main`. Chalk untouched. Paint deterministic. No
`Math.random()` in engine. Screenshot the 12-up grid at 312px in Patches mode,
plus one native lightbox showing a large patch boundary close up.

## Done looks like

Splatter that reads as a real second element next to the strokes rather than
dust, and patches whose outlines are continuously curved — no straight edges,
no corners, still crisp.
