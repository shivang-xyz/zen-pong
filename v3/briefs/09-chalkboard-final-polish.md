# Brief 09 — Chalkboard Final Polish (roughness bump + smudge)

**Branch:** `feature/chalkboard-surface` (continue — same branch as 07/08).
**Goal:** Close out chalkboard. Three changes, then this is the last chalk
brief before Shivang's review gate and the move to canvas/paint.

**Design intent (Shivang, from live review of the tri-colour render):** Still
reads too clean at a glance — bump the existing roughness ~20%. Beyond that,
two new ideas, intentionally left for you to interpret and tune, reference
the ampersand image again for how real chalk behaves:
1. Where lines cross, a little smudge should appear — like chalk dust
   kicking up where a new stroke drags across an existing one.
2. Older strokes should look progressively more smudged, not just fainter.
   Fading opacity alone (current age-fade) isn't enough — age should also
   cost the line some of its crispness.

You have latitude on exact numbers here — use your own eye against the
reference, same as brief 08. Don't over-engineer either addition; both are
meant to be subtle atmospheric detail, not a dominant visual element.

---

## Task 1 — Roughness bump (~20%)

Current landed values from brief 08 (`v3/engine/chalkboard.js`):
`HALO_MULT=2.1, HALO_ALPHA=0.20, CORE_MULT=1.0, CORE_ALPHA=0.92,
CORE_GRAIN_STRENGTH=0.5`. Bump texture presence roughly 20% — likely
`CORE_GRAIN_STRENGTH` toward ~0.6 and/or `HALO_ALPHA` toward ~0.24, whichever
reads better. Also sanity-check the grain tile actually survives at the
canvas's real display size (1000×630) — a 96px tile with fine per-pixel
holes can wash out under browser downscaling/antialiasing even when it looks
right zoomed in. If that's part of why it reads clean, this is the moment to
fix it (e.g. bump hole size/bite in the tile, not just alpha).

## Task 2 — Intersection smudge

Add a pure, headless function to `chalkboard.js` (no DOM — matches the
`fill.js` precedent of pure detection functions) that finds where committed
strokes cross: pairwise segment-intersection test between DIFFERENT strokes'
point arrays. Use a bounding-box pre-check per stroke pair before full
segment testing — skip pairs whose boxes don't overlap, this is the
difference between fast and quadratic-and-slow on a busy artwork.

At render time, after all strokes are drawn, composite a soft, low-opacity
smudge at each intersection point — reuse the same soft-radial-gradient-blob
technique already used for the background's cloud smudges, so it's visually
the same "medium." Pale/neutral tone (don't make it a garish blend of the
two crossing colours), low enough opacity that it reads as atmosphere, not a
blob sitting on top of the crossing. Radius should scale off the local
stroke width, not be a fixed size.

Scope/perf note: this only needs to run once per art-lab render (post-game
static artwork), not per frame — this is not a live-game concern yet. If a
dense artwork produces a lot of intersections and it starts looking muddy
rather than atmospheric, that's a real signal to dial down per-smudge
opacity or add a density-aware cap — use your judgment, don't just crank
numbers if the result looks wrong.

## Task 3 — Age-linked smudge (not just age-linked opacity)

Extend `renderChalkStroke` to accept the same age fraction already computed
for `ageFadeMultiplier` (0 = newest, 1 = oldest — art-lab.html already
computes `index/total` for this, don't recompute it, just thread it
through). When Age Fade is ON, use that fraction to scale up
`CORE_GRAIN_STRENGTH`/`HALO_ALPHA` for older strokes specifically, so age
costs crispness as well as opacity — newest strokes stay closest to a clean
just-drawn chalk mark, oldest strokes look softest/dustiest. When Age Fade
is OFF, every stroke renders at the flat Task 1 baseline — same single
toggle as today, do not add a new control for this.

---

## Acceptance criteria
1. Default chalk render (either colour mode) unmistakably reads as chalk at
   a glance, not "a smooth line with grain" — this is the bar that's been
   missed twice now, hold the result up against the ampersand reference
   before calling it done.
2. Intersections show a subtle smudge — visible on inspection, not a
   dominant blob, doesn't obscure which line is which.
3. Newest strokes read crisper than oldest strokes in a way that's visibly
   more than "the old one is fainter" — texture/softness differs too.
4. Turning Age Fade off removes both the opacity fade AND the age-linked
   smudge scaling (single toggle governs both, as before).
5. Determinism holds: same seed/params → identical render, smudges included.
6. Paper surface completely unaffected. `chalkboard.js`'s DOM-touching
   surface remains confined to its render/build functions; the new
   intersection-finder is pure/headless.
7. No new lab controls added unless you hit a case where one is genuinely
   necessary (e.g. a smudge-density cap) — note it in your reply if so.

## Git / serve automation
- Continue on `feature/chalkboard-surface`, commit per task.
- Push when done, self-verify against acceptance criteria, start the local
  server, reply with the URL, the final Task 1 values, and a one-line note
  on how you approached intersection detection and age-linked smudge.
- Still do NOT merge — this is the last chalk brief before Shivang's review,
  not a merge trigger by itself.

## Out of scope
- Canvas/paint surface — next brief, once chalkboard is approved.
- New lab UI beyond what's strictly needed (see acceptance criterion 7).
- Any change to the live game / root index.html.
