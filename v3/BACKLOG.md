# BACKLOG.md — Zen Pong v3 Deferred Items

This is the place for things we've decided are real but not now — noticed
mid-brief, intentionally deferred rather than chased in the moment. It is
NOT the same as `PROJECT-LOG.md` (chronological narrative of what happened)
or `v3/briefs/` (specs for what's actively being built). An item lives here
until it's picked up, at which point it becomes a numbered brief and gets
struck through (don't delete — keep the trail).

Read this at the start of every session, alongside `PROJECT-LOG.md`.

**Adding an item:** short title, what/why, which brief or session surfaced
it, date. Don't polish it into a full brief here — that happens when it's
picked up.

**Picking up an item:** write the actual brief in `v3/briefs/`, then strike
the backlog line (`~~...~~`) with the brief number, don't delete it.

**When to sweep this list:** per Shivang, once every current surface/mode is
built and the game is "fitted together" — that's the checkpoint for
triaging this whole list, not before.

---

## Chalkboard

- ~~Diagnostic: brief 10's density smudge tuned too faint to read
  (`SMUDGE_ALPHA = 0.055` peak, radius `6–16px`).~~ **Resolved, brief 17**
  (2026-08-24): retuned and approved at the merge review — `SMUDGE_ALPHA`
  0.14, `SMUDGE_PROB` 0.6, radius base 8-22px, now frozen product constants.
- **Mode-aware smudge colour** (still open). Smudge colour should follow
  chalk mode: white mode keeps the current pale neutral dust, colour mode
  should render smudge tinted toward the local stroke colour(s) instead of
  staying neutral — revises brief 09/10's "always pale neutral, never a
  colour blend" call, scoped specifically to tri-colour mode. A lab slider
  for smudge intensity was also floated alongside this but never built —
  worth reconsidering now that the constants are dialed in and merged;
  may not be needed if the frozen defaults hold up in the product port.
  *Surfaced: brief 10 follow-up, 2026-07-20.*

## Canvas / Paint

- **Product port.** Merged to `main` and values frozen as of brief 16
  (2026-07-21) — `paint.js`'s `PAINT_DEFAULT_*` constants. Re-tune at the
  product port; the lab (`art-lab.html`) keeps its own sliders live for
  that pass, this isn't a one-way freeze of the lab itself.
  *Surfaced: brief 16, 2026-07-21.*

## App port (v3)

- **Promote the app's baked-width paint ribbon renderer into `paint.js`.**
  Briefs 19-21 built `drawPaintRibbon` + the bake-on-append helpers in
  `v3/app/index.html` because `renderPaintStroke` cannot draw a *growing*
  stroke (width derived from current total arc length). Brief 22 generalises it
  to product width values for the live rally. It is engine-grade logic living
  in a consumer — the wrong side of `v3/CLAUDE.md`'s "labs and app import the
  engine, never copy engine logic into a consumer". Deliberately not moved in
  brief 22: promoting it means touching a frozen merged engine file and
  re-verifying paper/paint hashes. Do it in the brief-26 integration pass.
  **Extended, brief 23:** the app's `GAME_PAINT_WIDTH_VAR_MIN/MAX` no longer
  mirror `paint.js`'s private `WIDTH_VAR_MIN`/`WIDTH_VAR_MAX` — they
  deliberately diverge (max 4.0 → 1.6, a 60% cut). `paint.js`'s 4.0 was
  approved in the lab on twelve static seeded artworks; it was wrong the first
  time it was seen in a live rally at 1000×630. The product value wins at
  reconciliation, and `paint.js` + the lab move to it — not the reverse. The
  per-stroke width profiles (flat/ramp/wave) travel with the same promotion.
  **Extended again, brief 24:** base width also diverges —
  `GAME_PAINT_WIDTH_BASE` 3.5 vs `paint.js`'s frozen `PAINT_WIDTH_BASE` 6.0.
  Note the lab's own BASE WIDTH slider sits at 4.5, so `paint.js`'s 6.0 already
  matches neither the lab nor the product. Brief 23's emergence taper was
  removed in brief 24 and is not part of the promotion. *Surfaced: brief 22
  spec, extended briefs 23 and 24, 2026-08-24.*
- **Doc drift — `PAINT-MODE.md` §2.2 says ink is the line colour.** "Every
  reference in the restrained family uses a near-black line; this is not a
  variable." The lab has always drawn lines from the three accents and used ink
  only for splatter/blotches, and that is what has been approved through briefs
  11-16. Live code wins (`ARCHITECT.md`), so the app matches the lab. Either
  the spec sentence is stale or a near-black line variant was never built —
  decide which before the artwork spec is treated as settled.
  *Surfaced: brief 24 spec, 2026-08-24.*
- **The lab's density scrubber ships nowhere.** `PORT-PLAN.md` asserted it was
  a product control on the playing screen; `DESIGN.md` §8 Screen 2 and the
  approved design both say no control adjusts the painting mid-rally. Corrected
  in PORT-PLAN. Open question: does the density scrubber ship at all, and if so
  on which screen? Needs a product decision, not an inherited assumption.
  *Surfaced: brief 21 review, 2026-08-24.*
- **`DESIGN.md` UNRESOLVED items now on the critical path.** Not doc drift —
  real open decisions that block briefs 23-24: `--color-canvas-chalk` (§2, the
  placeholder borrows the page background; the app currently sidesteps it by
  using `chalkboard.js`'s own `CB_BASE`), the paint reveal ground tokens (§2),
  the share canvas size (§7), the slider primitives for `#timeline-chip` (§10),
  `.rbtn-primary`'s label alternation (§10), and the whole §13 motion spec
  (every value a proposal, including the reveal wipe). Sweep them in one pass
  before brief 23. *Surfaced: brief 22 spec, 2026-08-24.*

- **Paint ground-colour picker never got a screen.** `PAINT-MODE.md` §3 says
  plain-mode ground colour is user-chosen and exempt from the lab-controls rule,
  but no approved design places a control anywhere. Brief 26 ships the approved
  Cream default and no picker. Decide whether it ships, and where.
  *Surfaced: brief 26 spec, 2026-08-24.*
- **Patches ground mode unused in the product.** `buildPatchGround` is built,
  approved (brief 13/15) and reachable, but brief 26 ships plain only —
  `PAINT_DEFAULT_GROUND_MODE` is `'plain'` and a second ground path doubles the
  review surface. Available whenever it's wanted.
  *Surfaced: brief 26 spec, 2026-08-24.*
- **Doc drift — `DESIGN.md` §11 draws the logo as text.** The save-artwork PNG
  spec (and root `index.html`'s implementation) render the string
  `| ZEN • PONG |` in Space Mono. The standing project rule is that the logo is
  never text, always the inline SVG. Brief 26 renders the SVG and deviates from
  §11; §11 should be corrected.
  *Surfaced: brief 26 spec, 2026-08-24.*

## Engine-wide / Product

Carried forward from `PROJECT-LOG.md`'s 2026-07-10/11 entries — status not
re-verified, check before picking up:

- Stale `feature/art-lab` branch never deleted (merged long ago). Simple
  housekeeping.
- Doc drift, several spots — fix in one pass, not one-off:
  - `DESIGN.md` §12 rule 12 says BGM loads via fetch+decodeAudioData —
    wrong, live code uses `new Audio()` + `createMediaElementSource()`.
  - Root `CLAUDE.md` §7 spawn-angle formula doesn't match live
    `index.html` (live is `Math.random()*0.55+0.18`).
  - Root `CLAUDE.md`'s "merge the two getImageData loops" note is stale —
    already true of live code.
  - `v3/CLAUDE.md`'s reference map mentions a `#gc` scaled container that
    doesn't exist in the current live build — canvas is `#wrap`, fixed
    1000×630, no scale transform. *(Found: brief 10, 2026-07-20.)*
- Composition-aware ink bloom — bloom at dense intersection knots rather
  than paddle hits (the original hit-triggered version was cut for reading
  wrong). Reuses region-analysis machinery `fill.js` already built.
- Spin-shape drops, swerve/loop ball physics — Shivang's ideas, logged and
  endorsed, not yet briefed.
- Fill's rectangle-clip fix — small follow-up brief, blocks
  `feature/fill-regions` → `main` merge. Confirm still open before
  assuming so.
- Open product decisions pending Shivang: font (self-hosted Basier Circle
  vs. a Google Font), 12 palette hex values, onboarding State-1
  surface-selector sketch, share-page spec.
