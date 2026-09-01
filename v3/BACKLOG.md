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
- ~~**Doc drift — `DESIGN.md` §11 draws the logo as text.**~~ **Resolved,
  brief 36** (2026-08-29): §11 now correctly states the exported PNG draws
  the inline SVG mark (`buildArtworkExportCanvas`/`preloadLogoImage`),
  never text — confirmed against the actual export code before writing
  the correction.
  *Surfaced: brief 26 spec, 2026-08-24. Resolved: brief 36, 2026-08-29.*

- ~~**Doc drift — `DESIGN.md` bans the glow the game actually uses.**~~
  **Resolved, brief 36** (2026-08-29): §1 now names the `#game-frame`
  point/game-over glow as one deliberate, scoped exception rather than
  banning it outright; §6 carries the real, current box-shadow values
  (brief 35's rolled-back numbers, not brief 34's original ones — the doc
  is caught up to the LATEST live values, not just any past value).
  *Surfaced: brief 27 spec, 2026-08-24. Resolved: brief 36, 2026-08-29.*
- ~~**`swoosh.mp3` is referenced by nothing.**~~ **Resolved, brief 36**
  (2026-08-29): deleted (confirmed unused by root `index.html` and the v3
  app before removal) — missed being struck here at the time, caught in
  passing during brief 38's own docs pass; file confirmed still gone.
  *Surfaced: brief 27 spec, 2026-08-24. Resolved: brief 36, 2026-08-29.*
- **BGM ducking under the reveal.** `sndGameOver` is a 2.5s decaying tone that
  plays over the ground wipe and into the haiku. Dipping the BGM under it would
  give the reveal more air. Real idea, deliberately out of brief 27's scope.
  *Surfaced: brief 27 spec, 2026-08-24.*
- **Port root's `touchmove` paddle control.** v3 shipped (brief 30) with no
  touch paddle control at all — root has `cv.addEventListener('touchmove',
  ...)`; v3 only wires `touchstart` as a generic start-gesture. This is why
  brief 30's mobile detection couldn't be a width breakpoint: a touch device
  above 600px (an iPad) would otherwise get no overlay and a paddle that
  never moves. `isTouchDevice()` (width OR `matchMedia('(hover: none) and
  (pointer: coarse)')`) correctly blocks every touch device behind
  `#mobile-overlay` for now, so nothing is silently broken — but "blocked"
  is the whole mobile experience today. Real touch play is a real feature,
  not a bug fix. *Surfaced: brief 30 review, 2026-08-25.*
- **Self-hosting Basier Circle is a type-design decision, not a mechanical
  swap.** The real `.woff2` files already exist in the repo (`fonts/
  BasierCircle-{Regular,RegularItalic,Medium}.woff2`, used by root v2) — brief
  30's Task 2 confirmed this while noting `Oolong.mp3`/the Google Fonts link
  as the two things staying outside the self-contained build. Do **not** treat
  "the files exist" as "wire up `@font-face` and drop the Google Fonts link."
  Basier Circle is a different typeface from DM Serif Display + Space Mono —
  the pair every v3 screen was actually designed and approved against
  (`DESIGN.md` §3's interim substitute). Self-hosting it changes the
  product's typography everywhere it appears, not just removes a network
  request. Needs Shivang's actual call on the typeface before anyone touches
  this, not a cleanup pass. *Surfaced: brief 30 spec, 2026-08-25.*
- **`Oolong.mp3` stays a sibling file, not embedded.** Root `CLAUDE.md` §4
  forbids base64-embedded audio, and ~2.5MB of base64 sitting inline in the
  HTML would be absurd regardless of that rule. The shipped build is one
  HTML file plus two sibling assets (`Oolong.mp3`, and the Google Fonts
  link above) — "self-contained" means "opens and runs from one file
  reference," not "literally zero other bytes on disk." Neither blocks
  ship; both are pre-existing. *Surfaced: brief 30 Task 2, 2026-08-25.*

- ~~**Share screen sits flush edge-to-edge on mobile.**~~ **Resolved, brief
  32** (2026-08-26): the mobile share screen is now a real, dedicated
  section with its own `--gutter-mobile: 16px` inset, not a contain-scale
  of the desktop layout.
  *Surfaced: architect verification of brief 30, 2026-08-26.*
- **Gate/mobile-share landscape is scroll-reachable but not laid out for
  it.** Brief 32 exempted landscape from the single-fold scroll lock after
  finding below-fold content (message card, buttons) genuinely
  unreachable at 812×375 — that fix restores reachability but the layout
  itself is still the portrait single-fold design, just scrollable now.
  Worth a real landscape-specific layout if this becomes a common path
  (an iPad defaults to landscape). *Surfaced: brief 32 verification,
  2026-08-26.*
- **Mobile export paths still not fully verified in a real browser.**
  Brief 32's Web Share (`navigator.share`/`canShare`) branch remains
  entirely untestable here — this sandbox has no Web Share API at all.
  Partially narrowed by brief 33 (2026-08-27): a real trusted click
  proved the underlying clipboard mechanism genuinely works (see the
  resolved copy-link item above), which the gate and mobile share's own
  copy buttons share — but the Web Share download path and a real device
  pass are still open. *Surfaced: brief 32 verification, 2026-08-26.*
- ~~**Doc drift — `DESIGN.md` doesn't carry paper/chalk's new stroke
  hexes.**~~ **Resolved, brief 36** (2026-08-29): §2 now has a real "v3
  surface stroke palettes" subsection with paper's/chalk's actual fixed
  opening triads and resolves the three old UNRESOLVED ground/selected-
  chip notes (all three had already shipped, unnoticed). Also notes that
  a SHUFFLED palette is generated in real OKLCh (brief 35), not drawn
  from a fixed set, so it has no single hex worth documenting.
  *Surfaced: brief 31 spec, 2026-08-26. Resolved: brief 36, 2026-08-29.*
- ~~**Copy link's real-clipboard success path is unverified.**~~ **Resolved,
  brief 33** (2026-08-27): a real trusted click (not a JS-dispatched one)
  on the results screen's share button produced an actual OS clipboard
  write — confirmed by the sandbox's own synthetic-input warning — with
  the "Copied!" label showing and reverting correctly. Desktop share and
  mobile share's copy buttons share the identical `copyLinkToClipboard`/
  `shareCopyButtonHandler` core that button uses, so the mechanism itself
  is proven; the gate's own button (different callback, same core) and a
  real device weren't separately click-tested this session.
  *Surfaced: brief 31 verification, 2026-08-26.*
- ~~**`palette.js`'s `SCHEMES.triadic` never produces a real triad against
  `HUE_LIBRARY`.**~~ **Resolved, brief 35** (2026-08-28): fixed at the
  root rather than continuing to route around it — generation moved off
  `HUE_LIBRARY`'s index space entirely (`generateOklchAccents`, app-side,
  real OKLCh degrees) for every generated palette, so this specific
  index/offset mismatch no longer applies to anything the app draws from.
  `palette.js`'s own `SCHEMES.triadic` offsets are UNCHANGED and still
  latently mismatched against `HUE_LIBRARY` (left as-is per this brief's
  scope — `v3/engine/` untouched) — only relevant now to the lab or any
  future code path that still calls `buildPalette({scheme:'triadic'})`
  directly. `SHUFFLE_SCHEMES` restored to a genuine 50-50
  triadic/split-complementary draw; verified live, both patterns roughly
  balanced across 20 generations per surface.
  *Surfaced: brief 34 verification, 2026-08-28. Resolved: brief 35,
  2026-08-28.*
- ~~**Chalk's shuffle is wired but non-functional — its own ground-
  contrast floor is unreachable via generation.**~~ **Resolved, brief 35**
  (2026-08-28): the 0.55 `MIN_CHALK_GROUND_DE` floor (kept intact,
  unweakened — this was never the problem) is now easily clearable
  because chalk's generated L range moved to 0.72-0.92, well past
  `HUE_LIBRARY`'s brightest-ever member (Yellow, L 0.842) — free OKLCh
  generation was never limited to the library's fixed L values.
  Verified live: 20/20 shuffles generated a genuinely new palette (0
  fallback to the fixed default), versus brief 34's measured 0/10.
  *Surfaced: brief 34 verification, 2026-08-28. Resolved: brief 35,
  2026-08-28.*
- **BGM playback (and now crossfade timing) unverifiable in this
  sandbox — traced to `data:` URI serving, not the code.** Unchanged
  limitation from brief 34, now also covering brief 35's two-track
  crossfade: local files outside this sandbox's project root are served
  as inlined `data:` URIs (`location.protocol` confirmed `"data:"`),
  which breaks relative-path resolution AND audio `duration`/
  `currentTime` regardless of what the code does — a crossfade trigger
  keyed on `duration - currentTime` can never fire in this sandbox no
  matter how correct the code is. The bus/per-track gain architecture,
  coin-flip start, and start/stop/duck code paths were all verified
  directly instead (no exceptions, correct gain values, `bgmActiveIdx`
  genuinely randomized). Needs one real click-through + a full track
  listen-to-crossfade in an ordinary browser.
  *Surfaced: brief 34 verification, 2026-08-28. Extended: brief 35
  verification, 2026-08-28.*
- **Paint's share-link palette encoding had the same silent-corruption
  bug paper/chalk had in share format v1 — found and fixed before it
  ever shipped.** Paint's accents were encoded as indices into
  `HUE_LIBRARY`, safe only while `buildPalette` always drew from that
  fixed 12-hue set (index always valid by construction). Brief 35 Task 1
  switched paint's GENERATION to free OKLCh hexes, which broke that
  invariant: `HUE_LIBRARY.findIndex` returns -1 for a generated hex, and
  the old encoder silently wrote index 0 (Crimson) for every accent
  regardless of the real colour. Fixed the same way brief 34 fixed the
  identical bug class for paper/chalk: raw RGB bytes for all three
  surfaces now (`SHARE_FORMAT_VERSION` 2→3). Any share link encoded by a
  pre-brief-35 build stops decoding rather than showing wrong colours —
  accepted, pre-launch, same tradeoff as brief 34's bump. No further
  action needed; logged per Shivang's standing "log the format break"
  instruction from brief 34.
  *Surfaced & resolved: brief 35 verification, 2026-08-28.*

## Engine-wide / Product

Carried forward from `PROJECT-LOG.md`'s 2026-07-10/11 entries — status not
re-verified, check before picking up:

- ~~Stale `feature/art-lab` branch never deleted (merged long ago).~~
  **Resolved, brief 36** (2026-08-29): branch no longer exists — already
  deleted at some point before this cleanup pass, confirmed via `git
  branch -a`. No action needed.
- ~~Doc drift, several spots — fix in one pass, not one-off.~~ **Resolved,
  brief 36** (2026-08-29), all four:
  - ~~`DESIGN.md` §12 rule 12 says BGM loads via fetch+decodeAudioData.~~
    Corrected — rule now states the real (and protected) method,
    `new Audio()` + `createMediaElementSource()` per track, and names
    both tracks (brief 35's two-track player).
  - ~~Root `CLAUDE.md` §7 spawn-angle formula doesn't match live
    `index.html`.~~ Corrected — real formula is `rng() * 0.55 + 0.18`
    (~10°-42° from horizontal) off the engine's seeded `rng()`, not
    `Math.random()`; the old doc value (`0.85+0.28`) was wrong outright,
    not just stale.
  - ~~Root `CLAUDE.md`'s "merge the two getImageData loops" note is
    stale.~~ Rewritten as a resolved/historical note — confirmed already
    true of `v3/engine/surface.js`.
  - ~~`v3/CLAUDE.md`'s reference map mentions a `#gc` scaled container
    that doesn't exist in the current live build.~~ `v3/CLAUDE.md` no
    longer mentions `#gc` at all — confirmed by grep, already cleaned up
    in an earlier revision of that file. No action needed.
    *(Found: brief 10, 2026-07-20.)*
- Composition-aware ink bloom — bloom at dense intersection knots rather
  than paddle hits (the original hit-triggered version was cut for reading
  wrong). Reuses region-analysis machinery `fill.js` already built.
- Spin-shape drops, swerve/loop ball physics — Shivang's ideas, logged and
  endorsed, not yet briefed.
- **Fill-regions (closed-area colour fills) — deferred; branch abandoned
  (brief 36, 2026-08-28).** The idea: detect the closed regions the strokes
  form and flood them with translucent colour, so the piece gains filled
  shapes, not just lines. Built experimentally on `feature/fill-regions`,
  never finished — blocked on a rectangle-clip bug in the region detection
  (`fill.js`'s clip step). Branch deleted on cleanup (dangling, unmerged
  since the early arc); the idea and the blocker live here. Pick it up as a
  fresh brief if wanted — `fill.js`'s existing region-analysis machinery is
  the starting point. *Originally `03-fill-regions.md`.* (Supersedes the
  old "Fill's rectangle-clip fix" line this section used to carry — same
  blocker, consolidated into this one entry now that the branch itself is
  gone.)
- Open product decisions pending Shivang: font (self-hosted Basier Circle
  vs. a Google Font), 12 palette hex values, onboarding State-1
  surface-selector sketch, share-page spec.
- **Remote error visibility — add Sentry (free tier).** Brief 37 added global
  error/unhandledrejection handlers that log to the console, but nothing
  surfaces errors remotely (Cloudflare's free Web Analytics is page-views
  only). Sentry's free tier (~5k events/mo) gives a real dashboard with stack
  traces + browser/device, and slots straight into the existing handlers — a
  ~10-min add whenever error visibility is wanted before/around a wider
  launch. *Surfaced: brief 38, 2026-08-29.*
- **Mobile-gate doodle reported frozen in Chrome devtools device-emulation
  — real-browser reproduction NOT performed, classification still open.**
  Brief 39 Task 6 explicitly required reproducing this on a genuine
  narrow desktop browser window (real Chrome/Firefox/Safari, resized via
  the OS window manager) BEFORE touching any gate/doodle code — this
  session had no such browser available (`list_connected_browsers`
  returned empty; only this sandbox's own emulated preview pane, which
  the brief already named as unable to reliably reproduce the report).
  Gate/doodle code was deliberately NOT changed, per the brief's own
  instruction not to blind-fix. What WAS checked, as real (if partial)
  evidence: (1) in this session's own emulated pane, at the gate's actual
  trigger width (≤600px), the doodle animates correctly — no freeze
  observed, for whatever that's worth given it's a different emulation
  engine than Chrome devtools; (2) reading `doodleLoop()`
  (`v3/app/index.html`) surfaces one concrete, checkable hypothesis:
  the gate deliberately HOLDS a single still frame (no `stepDoodle()`,
  no redraw) whenever `prefers-reduced-motion: reduce` matches — by
  design, not a bug — so if the desktop machine used for the devtools
  test has OS-level "reduce motion" on, EVERY page in that browser
  (emulated or not) would show this held-still behaviour, which could
  read as "frozen." A real iPhone with that setting off would correctly
  animate, matching exactly what Shivang reported. Fast to rule in/out:
  check `matchMedia('(prefers-reduced-motion: reduce)').matches` in that
  same Chrome devtools session, or check the OS's own Reduce Motion
  accessibility setting. If reduce-motion is OFF and the freeze still
  reproduces on a genuine narrow desktop window, it's a real bug (likely
  canvas-sizing or loop-gating around `#screen-idle`'s `display:none`,
  per the brief's own hypothesis) and needs its own fix pass; if it's
  ON, or the freeze doesn't reproduce outside devtools specifically,
  it's a devtools-emulation artifact and this can be closed without a
  code change. *Surfaced: brief 39 Task 6, 2026-08-31.*
