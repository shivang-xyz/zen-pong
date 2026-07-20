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

- **Smudge control + mode-aware colour.** Add a lab slider to control
  ambient smudge intensity (calibration instrument only, per the
  lab-controls rule in `v3/CLAUDE.md` — doesn't ship as end-user UI).
  Smudge colour should follow chalk mode: white mode keeps the current pale
  neutral dust, colour mode should render smudge tinted toward the local
  stroke colour(s) instead of staying neutral — this revises brief 09/10's
  "always pale neutral, never a colour blend" call, scoped specifically to
  tri-colour mode.
  Diagnostic note (read the code before starting): brief 10's density
  smudge (`scatterDensitySmudges`/`renderSmudges` in `chalkboard.js`) is
  correctly wired and firing, but tuned too faint to read —
  `SMUDGE_ALPHA = 0.055` peak, radius `6–16px`, further diluted by radial
  falloff. This isn't a repeat of the earlier viewing/upscale problem
  (evaluation was already at native res by the time this landed) — it's
  just genuinely under-tuned. A real visual pass on opacity/radius/
  probability is needed before a slider is even useful to add.
  *Surfaced: brief 10 follow-up, 2026-07-20.*

## Canvas / Paint (future)

*(none yet — will fill in once that surface is underway)*

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
