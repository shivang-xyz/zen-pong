# Brief 21 — Idle Doodle Fixes, Round 3

Third doodle pass on the idle screen (`feature/v3-app`). Three refinements.
Docs to `main`. Doodle/surface only.

Renumber the port sequence in `PORT-PLAN.md`: playing → 22, results/reveal →
23, share → 24, integration → 25.

---

## Task 1 — Chalkboard ground: neutralise the blue/denim cast

The chalkboard ground currently reads bluish — like denim. It should be a
neutral dark **grey**. Keep it dark and keep the grain/texture from brief 20;
just remove the blue/purple tint so the board reads as slate grey, not fabric.

Diagnose where the cast comes from before changing values:
- If it originates in `chalkboard.js` (base colour or a tinted grain), fix it
  there — but that file is shared with the lab, so after the change **verify the
  lab chalk still looks right and stays neutral** (chalk was approved and frozen
  at near-black neutral `#1A1A1E`). Don't regress the lab.
- If the cast is a doodle-side overlay or background fill, fix it there and
  leave `chalkboard.js` alone.

Target: dark neutral grey, grain clearly felt, zero blue/denim.

## Task 2 — Paint doodle: cream ground by default + approved palette

The paint doodle defaults to a lavender/blush ground. It must default to
**Cream (`#F4EBD4`)** — the approved paint ground from `PAINT-MODE.md` / the lab.

Colours: match the approved lab paint look (screenshot reference — cream ground,
harmonious scheme like blue/yellow/orange). Use the existing paint palette scheme
system in `palette.js` exactly as the lab renders it — do NOT swap in the
5-colour game palette, and do NOT invent colours. If the doodle is already using
`palette.js`, this may be only the ground-default fix; confirm the colours are
coming from the scheme system and look like the lab tile.

## Task 3 — Higher density before reset

Brief 20 made the doodle accumulate then hard-reset. Raise the density threshold
so the canvas fills up nicely before it clears — a fuller, more satisfying
build-up, still a clean reset to zero (no fade). Tune the threshold by eye
against the reference so it reads as a real rally filling the canvas, not a
sparse loop.

## Verification

- Chalkboard doodle reads neutral dark grey, no blue; lab chalk unchanged and
  still neutral (hash/screenshot check if `chalkboard.js` was touched).
- Paint doodle default ground is cream; colours match the approved lab paint
  look via `palette.js`.
- Doodle fills to a fuller density before the clean reset.
- Engine modules otherwise unchanged; paper still deterministic in the lab.
  Root `index.html` untouched.

## Done looks like

Paint doodle on cream with the approved scheme colours, a slate-grey chalkboard
with no denim cast, and a canvas that fills up richly before restarting.
