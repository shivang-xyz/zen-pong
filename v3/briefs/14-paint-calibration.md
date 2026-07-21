# Brief 14 — Paint Calibration: Hard Patches, Extreme Width, Intersection Blotches

Continues `feature/paint-surface` after brief 13. Docs to `main`, code to the
branch. Splatter placement (density-weighted, brief 13) is correct and stays.

---

## Task 1 — Patches: hard-edged, wildly varied, count-controlled

Current patches are soft radial glows. Wrong on every axis.

- **Hard edges.** Same edge quality as the strokes — a patch is a mass of
  opaque paint, not a gradient. No radial falloff, no blur, no feather. The
  boundary should be as crisp as a stroke boundary.
- **Irregular shape.** Not circles. Build each patch as a closed irregular
  polygon or blob path with seeded vertex jitter, so the silhouette reads as
  spilled/swiped paint. Some should be broadly round, some elongated, some
  lobed.
- **Extreme size variation.** Range from small — comparable to a large
  splatter drop — up to fields covering a third of the canvas. Heavy-tailed
  distribution: mostly mid and small, a few very large. Current output is all
  one size band.
- **Count slider** in the lab, roughly 0–12, seeded placement within that
  count.
- Still composited beneath all marks, still drawn from the A/B/C accent
  weights, still seeded off the game seed and placement-aware of the stroke
  set per `PAINT-MODE.md` §3.1.

## Task 2 — Stroke width: push the range hard

`WIDTH VARIATION` at 1.0 currently produces a barely-perceptible wobble. The
range is far too conservative.

- Widen the multiplier range to roughly `0.15×`–`4.0×` of base at full
  variation. Thin passages should be near-hairline; thick passages should be
  genuinely fat — several times the current maximum.
- The modulation stays low-frequency: a stroke should thin and swell across
  its length like a loaded brush running out, not vibrate. One or two
  transitions per stroke, not many.
- The slider must sweep from uniform at 0 to that full extreme at 1, so the
  usable point can be found by eye.

## Task 3 — Splatter/stroke balance is inverted

Right now the ball frequently crosses the canvas leaving little more than
scattered dots, and proper strokes are the exception. The references are the
opposite: confident continuous lines carry the image, splatter accents it.

- The continuous trail is **always on** and is the dominant visual element —
  per `PAINT-MODE.md` §5A, this is non-negotiable and must not be interrupted.
- Verify nothing in the current build is suppressing or fragmenting the trail
  in favour of dots. If splatter density is visually competing with the line,
  the line wins.
- Separately: raise total splatter **count** meaningfully — more marks, but
  concentrated at the dense knots, not spread evenly. More splatter and more
  line at once; these are not trading against each other.

## Task 4 — Blotches move to intersections, and mix colour

The blotches currently ringing the canvas edge are the pooling knots from
brief 11 §3c. Pooling fires at direction change; direction change only happens
at a paddle or a wall; both are at the boundary. So edge-clustering is
structural, not a bug — and it is exactly the failure that killed ink bloom in
brief 02.

**Change the rule.**

- **Reduce pooling at paddle/wall hits substantially** — keep a small amount
  so turns still read as painted, but it must stop being the dominant mark.
- **Add blotches at stroke self-intersections**, selected by the same
  density-weighted sampling brief 13 built, so they land where the rally was
  busiest.

**Colour of an intersection blotch — think this through carefully.** The
blotch sits where two strokes of different palette colours cross, and must
read as wet paint that has actually mixed at that point:

- Blend the two crossing strokes' colours. Blend in **OKLab**, not sRGB —
  `palette.js` already has the conversion. sRGB blending of saturated
  complements produces dead grey; OKLab keeps the result chromatic and
  plausible as pigment.
- The blend must not be a flat 50/50 wash. Bias it per-blotch with seeded
  jitter so some read as one colour dominating, some the other.
- Fully opaque, hard-edged, irregular silhouette — same paint quality as
  everything else. Not a soft glow, not a multiply blend.
- Size scales with local density and the widths of the two crossing strokes.
- Where three or more strokes cross, blend the two widest contributors rather
  than averaging everything to mud.

## Task 5 — Ground mode selector

Confirm both ground modes are exposed and independent, and that everything
above (strokes, splatter, intersection blotches) renders correctly over both:

1. **Plain** — chosen flat colour, no patches.
2. **Patches** — seeded, no colour choice.

## Verification

Paper byte-identical to `main`. Chalk untouched. Paint fully deterministic
including patches, splatter and intersection blotches. No `Math.random()` in
engine. Screenshot the 12-up grid at 312px in both ground modes, plus one
native lightbox.

## Done looks like

Confident continuous strokes of dramatically varying width carrying the
composition; hard-edged irregular patches of widely varying size behind them;
splatter and colour-mixed blotches concentrated at the busy intersections in
the middle of the canvas rather than ringed around the edge.
