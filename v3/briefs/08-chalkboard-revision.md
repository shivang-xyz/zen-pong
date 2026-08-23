# Brief 08 — Chalkboard Revision (stroke texture + cut speed-weight)

**Branch:** `feature/chalkboard-surface` (continue on the same branch — this is
a revision pass on unmerged work, same pattern as fill's Brief 03 → Brief 04).
**Goal:** Two independent fixes before chalkboard goes to composition review.

**Design intent (Shivang, from live review):**
1. Chalk strokes currently read as visually identical to paper strokes — too
   clean, not thick enough. Target is between current and the ampersand
   reference (`v3/briefs/07-chalkboard-surface.md`'s reference image) — NOT
   as heavy/ragged as the ampersand's bold strokes, but clearly rougher and
   chunkier than what's there now.
2. Speed-weight enhancement doesn't do anything distinguishable from age
   fade in practice — both just modulate how much ink a stroke reads as
   having. Cut it entirely: engine, lab UI, and the per-stroke `speed`
   field that only existed to feed it. One less thing to calculate, per
   "build lean."

---

## Task 1 — Chalk stroke roughness/thickness (`v3/engine/chalkboard.js`)

Root cause (confirmed by reading the current implementation): the grain
punch (`destination-out` + shared grain tile) is only ever applied to the
HALO pass, which sits at `op * HALO_ALPHA` (0.20) — low enough to be nearly
invisible against the chalkboard base. The CORE pass, which is what
actually reads as "the line," is drawn perfectly clean at `CORE_MULT = 0.75`
— which happens to be the *identical* width multiplier `renderStroke` uses
for paper's core pass. That's why it looks the same as a paper stroke: it
effectively is, dimensionally, and the only textured part is nearly
invisible.

Fix, starting deltas (tune by eye, these are a starting point not a
mandate — hold the result up against both the current build and the
ampersand reference and land in the middle, per the design intent above):

- **Widen the default silhouette.** Bump `CORE_MULT` from `0.75` toward
  roughly `0.95–1.05` — chalk's resting line should read visibly chunkier
  than paper's by default, not identical. `HALO_MULT` can come up slightly
  too (currently `1.9`) if the wider core makes the halo look
  disproportionately thin.
- **Make roughness visible on the CORE, not just the halo.** Add a second,
  lighter grain-punch pass on the core itself, using the same shared grain
  tile, but at reduced strength so the core stays mostly solid/continuous —
  e.g. apply the `destination-out` pattern fill at a lower `globalAlpha`
  (~0.35–0.5) rather than full strength, so only a fraction of what the raw
  tile would remove actually gets removed. This is what should make the
  line read as "chalk" rather than "clean vector with a faint halo."
  Full-strength grain (what the halo currently gets) is closer to the
  ampersand's ragged intensity — the core needs less than that, calibrated
  to the "clean-ish rough" bar from Brief 07's original intent.
  - **Do not remove the existing halo grain** — it's the more that Brief 07
        wanted the vibe from that image, but the change moves the texture from
    "only on an invisible pass" to "visible where the line actually is."
  - **Do not lose determinism** — same shared fixed-seed grain tile,
    same rng() discipline as the rest of the module.
- **Verify `chalkWidthMult` (the lab slider) still works as a clean
  multiplier on top of the new baseline** — it should still scale both
  passes, just from a chunkier resting point than before.
- Iterate visually (serve the lab, screenshot or describe what you see)
  until the result sits clearly between "current build" and "ampersand
  reference intensity" — don't just apply the deltas above and assume
  it's right; that's a starting point for your own eye to tune from.

## Task 2 — Remove speed-weight entirely

Full removal, not a UI hide — engine, lab, and the now-unused `speed` field:

- `v3/engine/enhancements.js`: remove `speedWeightMultiplier` and its entry
  in `DEFAULT_ENHANCEMENTS`. Remove `computeMeanSpeed` too — confirmed
  (grep) it has no other caller once `speed` is gone.
- `v3/engine/simulate.js`: remove the `computeMeanSpeed` import and the
  `speed: computeMeanSpeed(ball.pts)` field on committed strokes (line ~93).
- `v3/labs/art-lab.html`: remove the Speed Weight UI group (checkbox +
  min/max sliders) from the Enhancements panel, its `bindEnhCheckbox`/
  `bindEnhSlider` wiring, and the `st.wt * speedWeightMultiplier(...)` line
  in the wt/op resolution — `wt` just becomes `st.wt` unconditionally now
  (age fade still applies to `op` as before, untouched). Remove speed-weight
  params from the "Copy settings" JSON output if present.
- Age fade is untouched — still the only enhancement, still ON by default.

---

## Acceptance criteria
1. Chalkboard, both colour modes: default stroke reads visibly rougher and
   chunkier than the current build and than a paper stroke at equivalent
   `wt` — texture is visible on the line itself, not just a faint halo.
   Not as heavy as the ampersand reference — land in between.
2. `chalkWidthMult` slider still scales chalk strokes thicker/thinner
   correctly from the new default.
3. Determinism holds — same seed/params → identical chalk render.
4. Paper surface completely unaffected (regression check).
5. `speedWeightMultiplier`, `computeMeanSpeed`, `DEFAULT_ENHANCEMENTS.speedWeight`,
   the `speed` stroke field, and the Speed Weight UI group are all gone —
   grep confirms zero remaining references anywhere in `v3/`.
6. Age fade still works exactly as before (regression check — this is the
   one enhancement left, don't touch its logic).

## Git / serve automation
- Continue on `feature/chalkboard-surface`, one commit per task.
- Push when done. Start the local server, reply with the URL plus the final
  `CORE_MULT`/`HALO_MULT`/core-grain-strength values you landed on and a
  one-line note on how they compare to the two reference points.
- Still do NOT merge — next stop after this is composition/density review
  in the lab, then the merge decision.

## Out of scope
- Canvas/paint surface (next brief, after chalkboard closes out).
- Composition or density review (separate step, after this lands).
