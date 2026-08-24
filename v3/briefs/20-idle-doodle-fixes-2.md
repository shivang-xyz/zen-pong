# Brief 20 — Idle Doodle Fixes, Round 2

Second doodle pass on the idle screen (`feature/v3-app`). Brief 19 fixed the
continuous morphing; four issues remain. Docs to `main`. Doodle + layout only —
do not touch card, selector, or audio.

This inserts ahead of the playing screen. Renumber the port sequence in
`PORT-PLAN.md`: playing → 21, results/reveal → 22, share → 23, integration →
24.

---

## Task 1 — Paint: kill the pop at commit, lower the max width (biggest fix)

Two separate problems:

**a. Stroke changes shape after it lands / the ball bounces.** Pooling is
applied retroactively at the commit point once the stroke commits, so a stroke
that's already drawn visibly inflates and reshapes at its endpoint. This looks
absurd. In the doodle, a stroke must look the same after landing as it did while
being drawn — no retroactive width change at commit. Either bake pooling into
the width as the point is laid down (so it's already there, no pop), or drop
retroactive commit-pooling in the doodle entirely. A committed stroke's geometry
must not change the frame it commits.

**b. Max width too large.** The fat ribbons balloon and read as jarring against
the paper/chalk strokes and the rest of the composition. Lower the paint
stroke's maximum width for the doodle so the heaviest stroke is confident but
not cartoonish. Tune by eye against the recording. The frozen product constants
(brief 16) still stand for the end-game artwork — this is a doodle-scoped cap,
so scope it to the idle doodle, don't overwrite the frozen values.

## Task 2 — Density reset instead of rolling fade

Strokes currently drop off one at a time as new ones appear (a rolling window),
so it never feels like a real rally. Change to: let strokes accumulate until a
density threshold, then clear the canvas to empty and start again from zero.
No per-stroke fade-out. The cycle should read as "a rally builds up, resolves,
a new one begins." Keep the threshold in the calm/sparse range (this is still
ambiance, not an end-game painting) and make the reset a clean restart, not a
fade.

## Task 3 — Chalkboard doodle needs its textured ground

The chalk doodle draws strokes on a flat near-black fill — the real chalkboard
ground (cloudy smudge blobs + neutral grain + edge vignette from
`buildChalkboardSurface`) is missing, so it reads as plain black. Render the
actual chalkboard surface behind the chalk doodle, matching the lab. Bump the
grain/noise presence enough that the board texture is clearly felt behind the
strokes.

## Task 4 — Center the canvas group in the viewport

The canvas sits slightly high — uneven gap above (tagline) and below (palette
dock). Center the whole cluster — canvas plus its satellites (tagline, palette
dock, DOM paddles, "you" label) — both horizontally and vertically in the
viewport, so there's no odd gap above or below at any common window size. It
should read as one centered unit.

## Verification

- Paint: no shape change at commit/bounce; max width toned down. Screen-record
  paint a few seconds to confirm no pop.
- Strokes accumulate then hard-reset to zero; no rolling fade.
- Chalkboard doodle shows the textured board ground, grain clearly felt.
- Canvas group vertically + horizontally centered; check at a couple of window
  sizes.
- Engine modules unchanged, still deterministic in the lab (hash paper vs
  `main`). Root `index.html` untouched.

## Done looks like

A calm centered idle doodle: paint strokes that stay put once drawn at a
sensible weight, rallies that build to a density and cleanly restart, and a
chalkboard that actually looks like a chalkboard.
