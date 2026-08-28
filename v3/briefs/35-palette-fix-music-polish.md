# Brief 35 — Real Palette Generation, Second Track, Splatter Variety, Polish

Branch off `main` as `feature/v3-palette-music` (34 is merged). Docs to `main`.
Root `index.html` is generated — edit `v3/app/index.html`, then `node v3/build.js`.

**Scope.** `v3/app/index.html` only, plus two audio assets (`GoldenPothos.mp3`
added, `Oolong.mp3` already present). **`v3/engine/` stays byte-identical to
`main`** — this whole brief, including the palette rewrite, is done app-side
using the engine's existing OKLCh exports. Do **not** edit `palette.js`.

**Before starting:** confirm 31–34 are present (grep `SHUFFLE_SCHEMES`,
`Omni Gardens`, `arrivedViaShare`). Wrong baseline → stop.

---

## Task 1 — Fix palette generation properly (the root cause)

This has been wrong three times. Here is why, and the real fix.

**The cause.** `buildPalette` picks accents as **indices into `HUE_LIBRARY`**,
a fixed set of 12 unevenly-spaced hues, and the `SCHEMES` are index *offsets*.
Because the hues are unevenly spaced, an index offset is not a real angle — so
a true **triadic (120°) is essentially unreachable**, and only ~14% of
`buildPalette({scheme})` calls even pass the triadic/split-complementary rule.
Brief 34 worked around this by locking `SHUFFLE_SCHEMES` to
`['split-complementary']` (the one pattern that sometimes works) — which is why:
- **paper** changes only occasionally, then the guard fails and it falls back to
  the fixed triad, so you see the same three colours *re-ordered* ("reshuffles
  in position");
- **chalk** never changes — split-comp + the ΔE≥0.55 black-ground guard almost
  never both pass, so it falls back to the fixed set **every** time;
- **paint** circulates the same few colours — it's drawing from only 12 fixed
  hues in only one scheme.

**The fix — generate in colour space, not by index.** Build accents by rotating
hue directly in OKLCh, using the engine's existing `hexToOklab` / `oklabToHex`
(add `oklabToHex` to the import line — the only import change; no engine edit).

New app-side generator, one helper used by every surface (idle shuffle, game
shuffle, paint's per-game draw):

- Pick a **random base hue** 0–360°, a **random L** and **random C** inside
  pleasant ranges — and **vary L across a real range** so shuffles produce
  lighter *and* darker sets, not one brightness. (Chalk needs higher L to hold
  on black; paper a mid L to hold on cream — pick the L range per surface.)
- Place the three accents at the scheme's **real angular spacing**: triadic
  120°/120°/120°, split-complementary 150°/60°/150°, around the base hue.
- Convert each to hex via `oklabToHex`.
- **Keep the guards:** pairwise accent ΔE ≥ `MIN_ACCENT_DE` (0.15); ground ΔE —
  paper vs **`#FFF5E5`**, chalk vs **`#1A1A1E`** ≥ 0.55. Because spacing is now
  real degrees and L/C vary freely, these pass easily, so fallback is rare
  instead of constant.
- **Restore both schemes, 50-50:** `SHUFFLE_SCHEMES = ['triadic',
  'split-complementary']`, picked evenly. Both are now genuinely reachable.

The fixed opening defaults (paper/chalk approved triads, the doodle's pinned
paint reference) stay as they are — a game still *opens* on the known-good set;
shuffle now rolls genuinely varied, legible schemes across the full hue circle
and a real light/dark range.

**Verify:** shuffle each surface 20× on the idle screen — paper and chalk each
produce a **different, legible** set nearly every time (not a re-order, not a
no-op); paint shows wide variety including lighter and darker sets; both schemes
appear ~50-50; print the measured pass-rate and a sample of generated hexes.

---

## Task 2 — Splatter shape variety

The marks read as the same shape repeated (a teardrop with a neat line of
satellites). Sizes already vary (brief 34); the **silhouette** doesn't. Make
every mark genuinely its own, always:

- **Irregular, rotated blobs** — randomise the blob's vertices/radii and rotate
  it, so no two drops share an outline.
- **Varied flung marks** — vary the teardrop head shape and asymmetry, rotate
  the whole mark, and **scatter the satellites irregularly** (not a straight
  line): random count, sizes, offsets and spread.
- Vary the drop-vs-flung mix per mark (already partly done) and consider an
  occasional third silhouette (a short streak / multi-lobe) so the vocabulary
  isn't just two shapes.
- Goal, stated plainly: no two marks in a finished piece read as siblings. Tune
  by eye against a finished paint canvas; screenshot it.

App-side only (`renderSplatterMarkPaint` + the live mark builder). `splatter.js`
untouched.

---

## Task 3 — Music: second track, random start, crossfade

`GoldenPothos.mp3` (encoded from the artist's FLAC, same album) is in the repo
root alongside `Oolong.mp3`.

- **Two-track player.** Both tracks play as a loop, one after the other, with a
  smooth **crossfade** between them (a few seconds) so there is **never a silent
  gap**. Keep root `CLAUDE.md` §4's protected audio pattern: `new Audio()` +
  `createMediaElementSource()` per track (never fetch/decode), each through its
  own gain into the existing BGM bus; crossfade by ramping the two gains.
- **Random first track.** On each arrival, which track starts is a **coin flip**
  — it must **not** always be Oolong. Then they alternate.
- Mute/duck behaviour (brief 28) applies to the whole music bus exactly as now.
- Built to extend: adding a third track later should be adding it to the
  playlist array, not re-plumbing.

---

## Task 4 — Music credit: reposition, shorten

- Text becomes just **"Music by Omni Gardens"** — drop the track name (there are
  multiple tracks now).
- Move it to the **very bottom of the idle screen**, a few px above the bottom
  of the fold — right now it collides with the palette colours. Pin it to the
  bottom, clear of everything else. Same quiet Space Mono / `--color-disabled`
  styling, still linked to the Bandcamp page.

---

## Task 5 — Point glow: roll it back a touch

Brief 34's diffused point glow is a little too loud. Reduce **both spread and
opacity** a notch — keep the soft diffused character, just less shout. The
game-over glow scales with it, staying the stronger of the two. Tune by eye.

---

## Task 6 — Mobile top padding: 40px max

On **both** the mobile share screen and the gate screen, the space above the
Zen Pong logo is still too much. Cap the top padding at **40px** from the top
(inside the safe-area inset), so every element sits within the fold. Keep values
on the 4/8px grid. Re-confirm both screens hold in one fold at 375×667 and
430×932.

---

## Verification

- Palette: 20 shuffles per surface — paper and chalk each change to a new
  legible set nearly every time (not reorders, not no-ops); paint shows wide
  variety with light and dark sets; schemes ~50-50; guards hold (numbers
  printed). Chalk never invisible on black, paper never washed on cream.
- Splatter: a finished paint canvas shows marks of clearly different shapes and
  sizes — no two siblings. Screenshot it.
- Music: on repeated loads the starting track alternates (not always Oolong);
  tracks crossfade with no silent gap; mute/duck still work.
- Credit reads "Music by Omni Gardens", pinned at the bottom, not colliding.
- Point glow softer than brief 34 but still clearly a diffused bloom.
- Both mobile screens: ≤40px above the logo, one fold at both sizes.
- Desktop full game, nothing regressed. `node v3/build.js` twice byte-identical.
  `git diff --stat main -- v3/engine/ v3/labs/` empty.

## Done looks like

Every shuffle actually repaints the canvas in a fresh, legible scheme across the
whole colour range — light and dark, both rules, all three surfaces — splatter
that never repeats a shape, two tracks trading off from a random start with no
silence between them, and a credit line that sits quietly at the foot of the
idle screen.
