# Brief 07 — Chalkboard Surface Renderer

**Branch:** `feature/chalkboard-surface` — new branch off `main` (NOT off
`feature/fill-regions` — chalkboard has zero dependency on fill and should
stay mergeable independent of fill's status).
**Goal:** Add a second surface style — chalkboard — alongside the existing
paper surface. New engine module, new lab controls, paper path completely
unchanged. Judged in `art-lab.html` before anything merges, same gate as
every prior art brief.

**Design intent (Shivang, locked, from reference images):**
- Background = the deep near-black "recently erased" smudge/grain look
  (reference: chalk ampersand construction photo) — cloudy low-frequency
  smudging plus fine grain, NOT the lighter graphite tone and NOT the
  dust-speckle look of the golden-ratio reference (that image is for line
  quality only, see below).
- Stroke line quality = the golden-ratio reference: clean-ish, continuous,
  moderate-thin lines with a little chalk roughness at the edge — NOT the
  thick ragged multi-pass look of the ampersand's bold strokes. Do not build
  a heavy "dust cloud" stroke renderer; the target is closer to a real
  clean chalk line than a scribble.
- Two colour modes: White chalk (default) and a 3-colour mode (blue / pink
  / yellow). The bubbles-painting reference is a PALETTE/CONTRAST reference
  only — its literal composition (white outline ring + interior colour arc
  + highlight dabs) is explicitly OUT OF SCOPE for this brief. Trails stay
  single line-strokes, same as today, just chalk-textured and in these 3
  colours for tri mode.
- Chalk stroke thickness must be a lab control (independent thicker/thinner
  knob), and chalk strokes must respect the EXISTING age-fade system
  exactly as paper strokes do — no second age-fade implementation.

---

## Architecture rules (from v3/CLAUDE.md — do not violate)
- New module `v3/engine/chalkboard.js`. Zero DOM/audio elsewhere in engine —
  this file is allowed to touch a canvas 2D context because its whole job is
  producing surface texture and stroke pixels, exactly the same carve-out
  `surface.js` already documents for itself. Do not add DOM access anywhere
  else.
- All randomness through the injected `rng()` — never `Math.random()`
  directly. Determinism holds: same seed + same params → identical
  chalkboard render, background included.
- Do not modify `v3/engine/surface.js` or `v3/engine/strokes.js`. Paper stays
  exactly as it is today — this is additive, not a refactor.
- Do not touch root `index.html`.

---

## Task 1 — Chalkboard surface texture
`export function buildChalkboardSurface(w, h, rng)` in `chalkboard.js`,
same signature/return shape as `buildSurface` (offscreen `<canvas>`).

- Base fill: near-black, not pure black. Start around `#1A1A1E`, tune by eye
  against the ampersand reference.
- Large-scale cloudy smudge: layer several (roughly 5–12) soft, large,
  low-opacity blobs/gradients at rng-seeded positions/radii/tone to read as
  uneven "partially erased" texture — this is the dominant visual feature of
  the reference, more important to get right than fine grain.
- Fine grain on top: a per-pixel noise pass, same technique family as
  `buildPaper()`'s loop but subtler amplitude and no warm tint (this is a
  cool near-black surface, not warm paper).
- Light vignette toward the edges (same technique as `buildPaper`'s edge
  gradients, values tuned for this darker base).
- Do NOT port the dashed centre-line — that's paper-specific.
- Do NOT add the golden-ratio reference's fine white dust speckle — the
  ampersand reference (which this task follows) has essentially none.
- Document the final base/smudge/grain/vignette values used in a code
  comment, same style as `surface.js`'s header comment.

## Task 2 — Chalk stroke renderer
`export function renderChalkStroke(ctx, pts, col, wt, op, chalkWidthMult = 1.0)`
in `chalkboard.js`.

- Target look: golden-ratio reference's line quality — continuous, fairly
  clean, moderate-thin, with a little roughness/grain at the edge. Not a
  flat smooth vector line (too clean), not the ampersand's thick ragged
  strokes (too rough/heavy).
- Reasonable approach: reuse `traceCR` for the path, keep a two-pass
  wide-soft + narrow-core structure similar to `renderStroke`'s shape, but
  add a texture pass so the stroke doesn't read as flat vector paint — e.g.
  compositing a small seeded static grain texture onto the stroke via
  `source-atop` after stroking, or modulating alpha along the path with a
  seeded noise function. Pick whichever is cheap enough to run per committed
  stroke without a frame-rate cost once this eventually reaches the live
  game. Document the technique chosen and why.
- `chalkWidthMult` scales the whole stroke thicker/thinner — this is the
  standalone "make chalk strokes thicker" control. It multiplies width only,
  stacking on top of the ball's own per-stroke `wt` (which the caller has
  already resolved through age-fade/speed-weight before calling this
  function — see Task 4). Do not have this function touch opacity/age logic
  itself.
- Colour handling: the function always strokes in whatever `col` it's
  given — mode selection (white vs tri) happens by what the CALLER passes
  as `col`, not inside this function. Keep it dumb and reusable.

## Task 3 — Chalk palette (tri mode)
- New export, e.g. `export const CHALK_PALETTE = ['#3E8EF7', '#E8478E', '#F5C518'];`
  (blue / pink / yellow, sampled off the bubbles reference as a starting
  point — Shivang will eyeball-correct exact hexes in the lab, do not treat
  these as final).
- White mode: every stroke renders in a single warm off-white — start at
  `#EFEAE0` (not pure `#FFFFFF`, which reads plastic against the grain).
  Document final value if tuned.
- Tri mode: strokes use the colour already assigned to each ball/stroke by
  `simulateGame`'s existing colour-cycling — just pass `CHALK_PALETTE` as
  the `palette` option instead of `DEFAULT_PALETTE`. No changes needed in
  `simulate.js`; it already supports an arbitrary palette array.
- Whichever mode is active, simulate with `CHALK_PALETTE` regardless (so
  switching White ↔ Tri in the lab doesn't force a reroll) — white mode
  simply overrides colour at render time. Document if you choose differently
  and why.

## Task 4 — Age-fade / speed-weight compatibility (reuse, don't rebuild)
- `art-lab.html` already resolves each stroke's render-time `wt`/`op` via
  `ageFadeMultiplier` / `speedWeightMultiplier` before calling `renderStroke`
  (see current lines ~413–414). For chalkboard, route through the exact same
  resolved `wt`/`op` into `renderChalkStroke` — do not add a second
  age/opacity system.
- The existing "Age fade" checkbox and newest/oldest sliders (already in the
  Enhancements panel, ON by default) must affect chalk strokes exactly as
  they affect paper strokes today. No new toggle needed for this — it's the
  existing one, just also wired to the chalk render path.

## Task 5 — Lab wiring (`art-lab.html`)
- Add a "Surface" selector to the controls panel: **Paper** (existing,
  default) / **Chalkboard**. Paper path must remain byte-identical when
  selected — this is a pure addition, not a refactor of the existing render
  path.
- When Chalkboard is selected, reveal a small "Chalk" control group:
  - Mode: White / 3-Colour (radio or select).
  - Chalk stroke width (slider driving `chalkWidthMult`, range ~0.5–3,
    default 1.0).
- Route every draw call site to the chalk path when Surface = Chalkboard:
  main grid tiles, the lightbox render, and the reference/parity render (grep
  `buildSurface`/`renderStroke` call sites in `art-lab.html` — there are
  three: main grid + lightbox share one path around the committed-stroke
  render loop, and a separate reference render near the parity-check
  button). Don't miss one — a surface toggle that only half-applies is worse
  than no toggle.
- Add chalk params (surface, mode, chalkWidthMult) to the "Copy settings"
  JSON output.

---

## Acceptance criteria
1. Surface = Paper: grid renders byte-identical to current main. Zero
   regression — this is the top acceptance bar.
2. Surface = Chalkboard, mode = White: background reads as deep near-black
   cloudy smudge (ampersand reference), strokes read as clean-ish lightly
   textured off-white lines (golden-ratio reference) — not flat vector, not
   a ragged mess. Width slider visibly thickens/thins strokes live.
3. Surface = Chalkboard, mode = 3-Colour: identical background/line
   treatment, strokes coloured from `CHALK_PALETTE` instead of white.
4. Age fade toggle + sliders visibly affect chalk strokes exactly as they do
   paper strokes (older strokes fainter when ON, uniform when OFF).
5. Determinism holds: same seed + same params → pixel-identical chalkboard
   render, background included.
6. `chalkboard.js`'s only DOM/canvas touches are its two exported functions
   (mirrors `surface.js`'s existing documented carve-out). All randomness
   through injected `rng()` — grep confirms no bare `Math.random()`.
7. Root `index.html`, `surface.js`, `strokes.js` untouched.

## Git / serve automation (one link, no middle steps)
- Work on `feature/chalkboard-surface`, branched off `main`. Commit per
  task, small scoped messages.
- When complete and self-verified, push the branch to origin.
- Start the local server yourself and reply with the exact URL
  (`http://localhost:8000/v3/labs/art-lab.html`) plus a one-line summary of
  the chalk defaults (base/smudge/grain values, white hex, tri palette
  hexes) and how to switch Surface/Mode.
- Do NOT merge to main — Shivang reviews chalkboard in the lab first,
  same gate as fill.

## Out of scope (do not build)
- Bubbles-reference literal composition: white outline ring + interior
  colour arc + highlight dabs. Explicitly deferred — may become its own
  future "painted" render mode, not this brief.
- Canvas-weave surface (separate future brief).
- Composition-aware ink bloom, spin-shape drops, fill-region interaction
  with chalkboard (fill isn't merged yet and this brief doesn't need it).
- Root index.html / live game — engine + lab only.
