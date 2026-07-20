# Brief 11 — Paint Surface Foundation

First brief of the paint arc. Read `v3/PAINT-MODE.md` in full before starting —
it holds the palette system, ground modes, and mark taxonomy this brief builds
against. Read `v3/CLAUDE.md` for the engineering contract.

**Scope discipline:** this brief builds the palette module, the canvas ground
(plain mode only), and the variable-width paint stroke renderer. Nothing else.
If the stroke doesn't read as paint, nothing built on top of it will save it —
so this brief exists to answer that one question and stop.

**Explicitly NOT in this brief:** splatter emission events, drips, patch
grounds, region fills, the reveal transition. Do not build them. Do not
scaffold for them beyond keeping the module boundaries clean.

---

## Branch

Branch off `main`, not off `feature/chalkboard-surface`:

```
git checkout main
git checkout -b feature/paint-surface
```

Chalk is parked at a review gate and must stay untouched. Paint is independent
of both chalk and fill, exactly as chalk was independent of fill.

---

## Task 1 — `v3/engine/palette.js` (new, pure, headless)

Pure ES module. Zero DOM. All randomness through the injected `rng()`.

Export:

- `HUE_LIBRARY` — the 12 entries from `PAINT-MODE.md` §2.1, each
  `{ name, hex, hue }`.
- `GROUND_LIBRARY` — the 4 plain grounds from §3, each `{ name, hex }`.
- `INK_HEX` — `'#16120E'`.
- `SCHEMES` — the four rules from §2.5, expressed as index offset triples.
- `buildPalette(rng, opts)` → 
  ```js
  {
    ground: '#F4EBD4',
    ink:    '#16120E',
    accents: [
      { hex, name, weight: 0.55 },   // A dominant
      { hex, name, weight: 0.30 },   // B secondary
      { hex, name, weight: 0.15 }    // C minor
    ],
    scheme: 'split-complementary',
    baseIndex: 4
  }
  ```
  `opts` accepts `{ scheme, baseIndex, groundHex }` — any omitted value is
  drawn from `rng`. Passing all three must be fully deterministic.

Requirements:

- Scheme index arithmetic is mod 12.
- A/B/C assignment across the three picked hues is **seeded, not positional** —
  the base hue must not always end up dominant.
- Separation guard: each accent must be perceptually distinguishable from the
  resolved ground. **Use OKLab ΔE (euclidean distance in OKLab), not WCAG
  relative luminance.** This is a muddiness guard, not a legibility one, and
  the distinction matters: yellow on cream has very low luminance contrast and
  is the single best-loved pairing in the reference set — it works because it
  separates on *chroma*, not lightness. A luminance-only metric cannot see
  that axis and would either ban yellow outright or have to be set so low it
  passes everything. Implement sRGB → linear → OKLab inline; it's ~30 lines
  and adds no dependency.

  **Resolved by evidence (2026-07-20):** the 12 × 4 matrix shows Yellow/Cream
  at ΔE 0.1687 is the global minimum — and it is also the best-loved pairing
  in the reference set. There is therefore no bad accent-vs-ground combination
  in the current library; a floor that rejects the worst pairing would reject
  the thing we're trying to produce. Two consequences:

  **Ground floor — `MIN_GROUND_DE = 0.16`, dormant by design.** It rejects
  nothing in today's library and is not expected to fire. It exists solely as
  a tripwire if a pale, low-chroma hue is added to `HUE_LIBRARY` later.
  Comment it in the source as exactly that. Do not tune it upward to make it
  "do something," and do not special-case any approved combination to bypass
  it — carving out the best pairing to satisfy a guard is proof the guard is
  measuring the wrong relationship.

  **Accent-vs-accent separation is the guard that does real work.** Two
  accents landing close together collapses the three-colour structure and
  makes the 0.55/0.30/0.15 weighting meaningless. This can genuinely occur:
  analogous is `i, i+1, i+3`, which at 30° hue spacing can select e.g.
  Vermilion / Orange / Amber. Add `MIN_ACCENT_DE`, applied pairwise across
  the three accents.

  **Setting `MIN_ACCENT_DE` — evidence first, again.** Compute pairwise
  accent ΔE for all four schemes across all 12 base indices, report the
  distribution, then propose a floor. If analogous fails at a large fraction
  of base indices, that is a signal the scheme offsets are mis-specified
  rather than that the floor is too high — say so and propose a widening
  (e.g. `i, i+2, i+4`) instead of quietly lowering the threshold. Mark
  PROVISIONAL.

- On failure of either guard: cycle the base index deterministically, bounded
  at 12 attempts, falling back to the best worst-case ΔE if none clears.
  Never return a failing palette, never loop unbounded.
- Exactly three accents. Never more. Do not add a parameter for more.

Verify: same seed → identical palette, hash-compared across at least 6 seeds.

---

## Task 2 — `v3/engine/paint.js` (new) — canvas ground

`buildPaintSurface(w, h, rng, groundHex)` → offscreen canvas, same shape as
`buildChalkboardSurface` in `chalkboard.js`. Read that function first and
follow its structure; do not invent a different surface contract.

- Flat `groundHex` base.
- **Canvas weave texture** — this is the distinguishing feature and must not be
  a copy of paper's grain. Woven cloth reads as a faint regular cross-hatch
  (two perpendicular sets of soft lines) with irregular thread thickness, not
  as isotropic noise. Build it as a seamless tile, as brief 09 did for chalk,
  and make sure it survives display downscale — brief 09's whole root cause was
  a texture that averaged away at real display size.

  **Evaluate at BOTH sizes, always.** Native 1000×630 *and* ~312px wide, the
  size artworks actually render at in the lab's 12-up grid. Brief 09 failed by
  judging zoomed-in only; judging native-only fails the same way in reverse —
  a weave that reads beautifully at 1000px and vanishes at 312px is a weave
  nobody will ever see, because the grid is the primary review surface. Any
  screenshot evidence for this task must show both.
- Very subtle edge vignette, weaker than chalkboard's.
- No dashed centre line. No dust speckle.

Plain mode only. `groundHex` always comes from `GROUND_LIBRARY` in this brief.

---

## Task 3 — `v3/engine/paint.js` — the paint stroke renderer

`renderPaintStroke(...)`, mirroring `renderChalkStroke`'s signature shape.
Catmull-Rom spine as everywhere else in the engine.

Three things distinguish it from paper and chalk:

**3a. Base width.** Paint is markedly fatter than paper's trail. Paper runs
`wt` 1.0–2.4; paint should sit around `PAINT_WIDTH_BASE = 6.0` before
modulation. Starting point — expect to tune by eye.

**3b. Variable width along arc length.** Width modulates with a low-frequency
signal across the length of the stroke, simulating a brush loading and
unloading. PROVISIONAL: multiplier range `0.55×`–`1.6×`, roughly 1.5–3
undulations across a typical stroke. Fixed-seed so it stays deterministic.
The polyline must be rendered as a **variable-width ribbon** — offset the spine
perpendicular by half-width per sample and fill the resulting outline. A single
`lineWidth` stroke call cannot vary width along its length; do not try.

**3c. Pooling at commit points.** At each commit point (paddle hit, wall hit)
the width spikes, producing the knot visible at the turn of every reference
loop. PROVISIONAL: peak `2.2×`–`3.2×` base, falling off over an arc window of
~8–14px either side of the commit point, smooth (not a step), with a rounded
cap so the knot reads as a blob rather than a bulge.

Pooling magnitude should vary per commit — a seeded jitter within the range —
so every turn doesn't produce an identical dot.

Edges should be clean and slightly glossy, not grainy. Paint is not chalk;
resist reaching for the chalk grain machinery here.

---

## Task 4 — Lab wiring

`v3/labs/art-lab.html`. Additive only.

- Surface selector gains a third option: **Paint**.
- New "Paint" control group, visible only when Paint is selected:
  - Scheme selector — the four rules, plus "Random (seeded)".
  - Ground colour — the four plain grounds.
  - Base width slider — 3.0–10.0.
  - Pooling strength slider — 1.0–4.0.
  - Width variation slider — 0 (uniform) to 1 (full 0.55–1.6 range).
- Display the resolved palette swatches for each artwork so the scheme rules
  can actually be judged.

Every one of these is a calibration instrument per `v3/CLAUDE.md` — none ships
as end-user UI. Ground colour is the one exception in the eventual product, but
it does not ship from the lab; it gets rebuilt as a product control later.

Chalk's existing controls and behaviour must be untouched.

---

## Task 5 — Verification, before declaring done

1. Paper renders **byte-identical to `main`** — hash-compare across seeds 1–6.
2. Chalkboard renders unchanged — chalk is at a review gate and must not move.
3. Paint is deterministic — same seed, same palette, same stroke geometry,
   same pooling, hash-verified across seeds 1–6.
4. `palette.js` is fully pure — no DOM reference anywhere in the file.
5. `paint.js` DOM access is confined to the build/render functions, matching
   how `chalkboard.js` is structured.
6. Texture evaluated at **native resolution**, not upscaled — the lightbox cap
   from brief 10 is already in place, don't reintroduce an enlarged view.
7. No `Math.random()` anywhere in engine code.

---

## What "done" looks like

Twelve seeded artworks in the lab on a cream canvas ground, each with a
three-accent palette from a named scheme, strokes that visibly thicken and thin
along their length and pool into knots at the turns. Judged by eye against the
restrained reference family before anything else is built on top.

---

## Next

Brief 12 — physics-driven emission events (spin → splatter burst, speed → whip
line) and drips off the pools. Do not start it in this session.
