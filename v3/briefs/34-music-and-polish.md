# Brief 34 — Music, Palette Behaviour, Mobile & In-Game Polish

Branch off `main` as `feature/v3-music-polish` (33 is merged). Docs to `main`.

Root `index.html` is generated. Edit `v3/app/index.html`, then `node v3/build.js`.
Never hand-edit the root file.

**Scope.** `v3/app/index.html` and the `Oolong.mp3` asset swap. `v3/engine/`
and `v3/labs/art-lab.html` byte-identical to `main` — every palette change here
goes through the **existing** `buildPalette` / `hexToOklab` / `oklabDeltaE`
exports, never by editing `palette.js`.

**Before starting:** confirm the source already carries briefs 31–33 (grep
`shadow-glow`, `screen-mobile-gate`, `PAPER_PALETTE`). Wrong baseline → stop.

---

## Task 1 — Music: swap the track, add the credit

The licensed track is now in the repo. `Oolong.mp3` at the root has been
replaced with a clean 160kbps encode of the artist's FLAC master (same song,
same 2:37 length). **No audio-loader code changes** — the path is unchanged, so
`initOolong()` and the build's path rewrite still work as-is. Just confirm it
plays after the build.

**Credit line — idle screen, subtle.** Add one line of text at the **bottom of
the idle screen** (`#screen-idle`), below everything else:

> Music by Omni Gardens — Oolong

- Font: **Space Mono** (the mobile body-copy font), ~11px, letter-spacing to
  match the other mono captions.
- Colour `--color-disabled` (~`#777`) so it's quiet — present, not shouting.
- Link the text to the artist's Bandcamp page (open in a new tab,
  `rel="noopener"`). **Shivang to confirm the exact URL** — use the *Moss King*
  album page on `omnigardens.bandcamp.com` as the placeholder.
- It shows in **both** idle steps (attract and armed) — it's a standing credit,
  not part of the reveal in Task 2.

---

## Task 2 — Idle: hide the controls, reveal them sliding down

Right now the surface selector slides *up* (`zp-slide-up`, 400ms) and the colour
pill is visible in attract. Change both:

- **Attract state: both the surface selector (`#surface-chip`) and the colour
  pill (`#pal-pill`) are entirely hidden** — not just faded, gone. Only the
  title card and the "press space or click" line show.
- **On arming** (space / click), **both** slide **down into place from under
  the title card** — starting tucked up behind the card, sliding down to rest.
  A new `zp-slide-down` keyframe: `translateY(-16px)` + `opacity 0` → `0` +
  `opacity 1`, and make sure the card sits above them in the stack so they read
  as emerging from underneath it.
- **Same speed for both**, **600ms** (inside your 0.5–0.75s window), same
  easing. Slow enough to notice — that's the point.
- Wrap in `@media (prefers-reduced-motion: reduce)` and just show them, no slide.

---

## Task 3 — Make the shuffle actually re-colour (idle + paper + chalk)

Two real bugs here, same root: the shuffle doesn't generate new colour schemes.

**3a — The idle shuffle isn't wired to anything.** `#idle-shuffle` currently does
nothing (the idle pill is a static preview — see the code comment near
`renderIdlePalPill`). Wire its click to actually re-roll the idle doodle's
palette and repaint the pill, the same way the playing-screen shuffle drives the
game.

**3b — Paper and chalk shuffle only re-order the same three colours.** Confirmed
in the shuffle handler (paper/chalk "re-roll the assignment ORDER" while only
paint draws a genuinely new scheme). Change paper and chalk to **generate a new
scheme on every shuffle**, exactly like paint already does:

- Call the existing `buildPalette` with a **random scheme** (see Task 4c for the
  50-50 rule), a **random base hue**, matched L and C, and the surface's own
  ground: cream (`#F4EBD4`/the paper ground) for paper, `#1A1A1E` for chalk.
- **Keep the guards** — this is what stops a generated set going ugly or
  invisible:
  - pairwise accent ΔE ≥ `MIN_ACCENT_DE` (0.15)
  - triadic or split-complementary spacing (the rule already asserted for paint)
  - **ground contrast:** paper accents clear a sensible ΔE against cream; chalk
    accents clear **ΔE ≥ 0.55** against `#1A1A1E` (the brief-31 chalk guard).
  - Generate-and-check with a capped retry loop; if it can't satisfy the guards
    in N tries, fall back to the current approved fixed triad rather than
    shipping a bad set.
- The **opening** palette for paper and chalk stays the current approved triad
  (paper `#F2716A`/`#54B85B`/`#6D9AFF`, chalk `#E6B816`/`#00D8F6`/`#F695EE`) —
  a game opens on the known-good set; **shuffle** is what rolls new ones.
- Same logic serves both the idle shuffle (3a) and the playing-screen shuffle.

Result: shuffling on any surface, on idle or in-game, produces a genuinely
different, still-legible colour scheme — not the same three colours reordered.

---

## Task 4 — Paint

**4a — More splatter.** Brief 31 set ~10–18 marks a game (cooldown ~24 frames).
Raise it: target **~18–28 a game**, drop the cooldown to **~16 frames**. Keep
the mid-flight-only, never-on-a-hit rule. Tune by eye; report the numbers shipped.

**4b — The finished artwork is too dark.** This is the *final render*, not
in-game. At game end the paint strokes composite at full strength
(`gameStrokesAlpha = 1.0`). Bring the **finished** paint strokes down ~12–15%
(to ~**0.86**). Paper and chalk finished opacity unchanged; in-game paint
opacity (0.88 during the rally) unchanged. Only the finished paint piece gets
lighter.

**4c — Palettes must be a true 50-50 of triadic and split-complementary.** The
mix leans triadic because the per-game default is pinned to `'triadic'`. Change
every *generated* palette — paint's per-game palette, and paper/chalk from Task
3 — to pick its scheme **50-50 from `['triadic','split-complementary']`**. The
fixed-seed doodle defaults can stay pinned (they're the reference), but a live
game's palette, and every shuffle, draws evenly from both. Spin 20 games/shuffles
and confirm you see both schemes roughly equally.

---

## Task 5 — Mobile

**5a — Tighten the top padding (both screens).** The marked gap above the logo is
too loose. Reduce the screen's top padding from `--space-m` (24px) to
`--space-xm` (16px) — keep the `+ env(safe-area-inset-top)`. Tighten the
header→content gap similarly so the cluster reads snug. **Every value stays on
the 4/8px grid** (16, 12, 8 — never 14, 18, 20). Re-confirm both screens still
hold in one fold at 375×667 and 430×932 afterward.

**5b — "Go back to artwork" on the gate, only when arrived via a share link.**
If a visitor opens a shared artwork on their phone and then taps "play your own"
(landing on the gate), they currently have **no way back to the artwork** — a
dead end. Fix:

- Add a persistent flag set at load when the URL has a `#a=` payload — call it
  `arrivedViaShare`, set **once, never cleared** (distinct from brief 33's
  `landingWithSharePayload`, which we clear so the gate can show).
- Keep the decoded share payload in memory so it can be re-shown without
  re-decoding.
- On the gate, **only when `arrivedViaShare` is true**, show a small **tertiary
  text link** below the copy-link button's hint line: **"go back to artwork"**.
  Not a full button — a quiet link, mono, `--color-disabled`, tap target still
  ≥44px. Tapping it returns to the mobile share screen showing their piece
  (`setScreen('share')` + re-render from the kept payload).
- When they did **not** arrive via a share (a cold gate visit), the link is
  absent.

---

## Task 6 — In-game fixes

**6a — Remove the stray dot.** The dot in the top-left between points is the
`#serve-dot` serve indicator (parked at `left:-32px; top:-40px`). Remove it —
the element, its CSS, and the JS that toggles it (`serveDotEl` references). It
adds nothing and reads as a glitch.

**6b — Diffused point glow.** Replace the point-scored frame glow's hard ring +
tight blur (`0 0 0 6px … , 0 0 48px …`) with a **soft, wide, diffused amber
bloom** in the spirit of the CTA hover shadow — but **bigger and louder** than
the CTA one, since it only flashes for a moment. No hard `0 0 0 6px` ring; use
layered wide blurs, e.g. around `0 0 44px 10px rgba(255,215,140,0.5), 0 0 90px
28px rgba(255,215,140,0.3)` — turn up spread and opacity, tune by eye. Keep amber
`rgba(255,215,140,·)`. Apply the same diffused treatment to the game-over glow,
kept larger/longer as it is now.

**6c — Kill the timeline's white outline.** On first focus the timeline track
shows the browser's default focus ring (white), then not on later focuses. We
never want it — only the amber scrub/focus state from `cta.css`. Add
`outline: none` on the track's `:focus` and `:focus-visible` (the tabbable
`.track` inside `#timeline-chip`), leaving the amber `:focus-within`/`.scrubbing`
state exactly as-is.

**6d — Share CTA becomes static "Play Zen Pong".** The primary CTA on the share
screen (desktop `#btn-share-cta` and mobile `#btn-mobile-share-cta`) currently
runs the PAINT/PLAY word-swap. Replace the inner markup with a plain static
label **"play zen pong"** — no swap `<b>/<i>`, no animation. The hairline
gradient wrapper stays; only the animated label goes. Both desktop and mobile.

**6e — No bell on the winning point.** The final point fires both `sndPoint()`
and `sndGameOver()` — they clash. `isGameEnd` is already computed at the top of
the scoring block, so gate the point bell on it: `if (!isGameEnd) sndPoint();`.
On the winning point only the game-over sound plays. Every other point is
unchanged.

---

## Verification

- BGM plays after the build; credit line shows on idle in Space Mono, quiet,
  links out.
- Idle: both controls hidden in attract; both slide down from under the card at
  the same 600ms on arming; reduced-motion just shows them.
- Shuffle on idle works; paper, chalk and paint each produce genuinely new,
  legible schemes on shuffle (not reordered) — guards asserted in code, numbers
  printed. Chalk never goes invisible on black; paper never washes out on cream.
- Generated palettes are ~50-50 triadic vs split-complementary over 20 spins.
- Paint: more splatter (report count); finished piece visibly lighter than
  before; in-game paint and paper/chalk unchanged.
- Mobile: top padding tighter and on the 4/8 grid, both screens still one fold;
  "go back to artwork" appears on the gate **only** after arriving via a share
  link, and returns to the artwork.
- Stray serve dot gone. Point glow is a soft wide amber bloom, stronger than the
  CTA hover. Timeline shows no white outline on any focus, only amber. Share CTA
  is a static "play zen pong" on desktop and mobile. Winning point plays only
  the game-over sound.
- Desktop full game start→finish, nothing regressed.
- `node v3/build.js` twice byte-identical. `git diff --stat main -- v3/engine/
  v3/labs/` empty.

## Done looks like

The real track plays with a quiet credit under the idle card; the controls rise
into view from under the title when you start; every shuffle genuinely repaints
the palette in a fresh legible scheme, evenly across both colour rules; the paint
piece is lighter and busier; a phone visitor from a shared link can always get
back to the artwork; and a won point lands on a single clean bell instead of two
sounds fighting.
