# Brief 31 — Palette System, Paint, Sound, Text

First post-ship pass. Branch off `main` as `feature/v3-polish`. Docs to `main`.

Root `index.html` is a **generated artifact** — all changes go to
`v3/app/index.html` (or `v3/engine/`), then `node v3/build.js`. Never hand-edit
the root file.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/art-lab.html`
byte-identical to `main`. Mobile is brief 32 — don't start it here.

---

## Task 1 — Palette rule: triadic or split-complementary, all three modes

The rule is now: **every mode's three stroke colours sit at a triadic
(120°/120°/120°) or split-complementary (150°/60°/150°) spacing in OKLCh**, at
matched lightness and chroma so they read as one family.

Hues below are **OKLCh**, not HSL. `palette.js` already has `hexToOklab` /
`oklabToHex` / `oklabDeltaE` — use them to verify, don't eyeball.

### 1a — Paper: the current three cannot satisfy either rule

Measured: pink `#FF68AE` is at hue **354.2**, blue `#689AFF` at **263.0** — a
91° gap. That is neither 120 nor 150/60. And green `#8CFFB4` is at L **0.913**
against the other two at **0.70–0.73**, which is exactly why it disappears on
cream: it isn't "a bit light", it's a whole tonal register brighter.

So one of them has to move. **Ship a true triad at hues 25 / 145 / 265, L 0.70,
C 0.16:**

| Slot | Hex | OKLCh | ΔE vs cream |
|---|---|---|---|
| red | `#F2716A` | L 0.701 · C 0.160 · H 25.2 | 0.310 |
| green | `#54B85B` | L 0.701 · C 0.161 · H 144.9 | 0.313 |
| blue | `#6D9AFF` | L 0.700 · C 0.157 · H 264.6 | 0.328 |

Pairwise ΔE 0.274 / 0.275 / 0.278 — all well clear of `MIN_ACCENT_DE` 0.15.

Two things that make this the right trade rather than a compromise:

- **The blue is the blue.** `#6D9AFF` is ΔE **0.005** from the existing
  `#689AFF` — perceptually the same colour. The paddle token is untouched and
  nothing looks like it moved.
- **The red stays in the pink family.** ΔE from the paddle's `#FF68AE` is
  **0.104** — *below* the 0.15 separation floor, meaning it reads as the same
  hue family rather than a near-miss clash. That matters: a coral that sat at
  ΔE 0.2 from the paddle would look like a mistake. This one doesn't.

Paddle colours (`--color-pink`, `--color-blue`) do **not** change. Only the
stroke palette does.

### 1b — Chalkboard: rebuild for the black ground

Current chalk hue spacing is 101° / 93° / 166° — neither rule. Contrast against
the `#1A1A1E` ground is also uneven: yellow ΔE 0.647, blue and pink only ~0.46.

**Ship a triad at base hue 90, L 0.80, C 0.16:**

| Slot | Hex | ΔE vs ground `#1A1A1E` |
|---|---|---|
| gold | `#E6B816` | 0.605 |
| cyan | `#00D8F6` | 0.607 |
| pink | `#F695EE` | 0.600 |

Pairwise ΔE 0.258–0.277. Contrast against the ground is now even across all
three, and the higher L (0.80 vs the old 0.65–0.84 spread) is what makes them
read as chalk on a board rather than ink.

Add a **ground-contrast guard** alongside the existing accent guard: every
chalk colour must clear **ΔE 0.55** against `#1A1A1E`. Assert it in code, don't
just check it once by hand — it is what stops a future palette edit going
invisible on the board.

### 1c — Paint: pin the default to the approved screenshot

The reference is `scheme: 'triadic'`, `baseIndex: 0`, ground **Cream**
(`#F4EBD4`), which resolves through `HUE_LIBRARY` to Crimson `#D92D3C` /
Yellow `#F5C518` / Cyan-blue `#2E9BD4`. Pass those explicitly to `buildPalette`
as the default rather than letting it draw.

**Shuffle now selects only from `triadic` and `split-complementary`** —
`analogous` and `complementary + minor` stop being reachable. Restrict the pick
in the app; `SCHEMES` in `palette.js` keeps all four (the lab still uses them).

---

## Task 2 — Paint marks

### 2a — Blotches out, splatter up

- **Remove the `buildIntersectionBlotches` call at the reveal** (brief 26 Task
  4). It reads as random rather than composed. The engine function stays; the
  app stops calling it.
- **More splatter during the rally.** Brief 24 targeted 3–8 marks a game; go to
  **10–18**. Drop the cooldown from ~40 frames to ~24. Keep the physics-driven
  trigger and the mid-flight-only rule — **never on a paddle or wall hit**
  (brief 02's boundary-pinning mistake, recorded in `splatter.js`'s own header).
- **No black splatter.** The app's mirrored colour weights currently include
  `INK_HEX` at 0.15, matching `splatter.js`'s `splatterColorWeights`. Drop the
  ink entry — splatter draws only from the three accents, at their own weights.
  (The ball marker stays black; that is a separate legibility decision from
  brief 24 and is not affected.)
- **Wider variation in shape and size.** Widen the drop radius and flung
  length/head ranges so no two marks read as siblings, and vary the
  drop/flung mix rather than holding a fixed 60/40. Tune by eye; report the
  ranges shipped.

### 2b — Paint opacity down 12%

Paint currently renders fully opaque — `drawPaintRibbon` sets
`globalAlpha = 1.0` and `renderSplatterMark` does the same internally.

Take **both** to 0.88.

- Strokes: set the alpha in `drawPaintRibbon`.
- Splatter: `renderSplatterMark` is engine code and forces its own
  `globalAlpha`, so setting it outside won't hold. Set
  `ctx.filter = 'opacity(88%)'` before the call and `'none'` after — the filter
  survives the function's internal `save()`/`restore()` where `globalAlpha`
  does not.

Paper and chalkboard opacity are unchanged.

---

## Task 3 — Game-over sound: two notes

`sndGameOver` is one bell. Make it two — a **"da-DUM"**: a shorter, higher
strike answered by a lower, heavier one.

| | Strike 1 | Strike 2 |
|---|---|---|
| Onset | 0 ms | **+380 ms** |
| Fundamental | **293.66 Hz** (D4) | **196.00 Hz** (G3) |
| Gain | 0.72× the current level | **1.15×** |
| Decay | 1.8 s | 5.0 s |

A falling perfect fourth: unambiguous as two notes, but not a melody — one bell
answering itself, which keeps the zen register. Keep everything else from brief
28's bell (inharmonic partials at ×2.74 / ×5.4, the ×1.004 beat partner, the
noise strike transient, the sub) and apply it to both strikes, scaled.

The second strike's 5s tail means it is still ringing under the 900ms ground
wipe and into the haiku at 1300ms. That overlap is intended. Do not shorten it.

---

## Task 4 — Timeline defaults to 70%

`#timeline-chip` currently defaults to 100%. Default it to **70%**, so the
finished piece opens a little sparser than its full state and pulling the
scrubber right visibly adds to it. Save and share still export whatever the
scrubber currently shows.

---

## Task 5 — Copy link

- The copied string must be the **full absolute URL including the `#a=…`
  fragment** — the link that opens the artwork. Verify by pasting it into a
  fresh browser, not by reading the code.
- The button does nothing else: no navigation, no overlay. Its label swaps to
  **"Copied!"** for **3 seconds**, then reverts to "Copy link".
- If `navigator.clipboard.writeText` rejects (insecure context, permission
  denied), fall back to a hidden selectable input + `execCommand('copy')`, and
  only show "Copied!" on actual success.

---

## Task 6 — Idle text

### 6a — Attract state

Copy: **"press space or click to begin"**

- Colour **`#FFF5E5`** (`--color-canvas`) — not `--color-disabled`. It sits on
  the `#464646` card, so cream reads as the brightest thing on the screen,
  which is the point.
- **Gentle float**: vertical drift of about ±3px on a slow ease-in-out loop
  around 3.2s, alternating. It should register peripherally, not animate.
  Nothing else on the card moves.
- Wrap it in `@media (prefers-reduced-motion: reduce)` and hold it still.

### 6b — Armed state

Copy changes to: **"Choose a surface, then press space or click to begin"**

Same cream, same float. Keep the string exactly as written, sentence case
included.

---

## Verification

- All three modes' palettes pass their rule and their guards, asserted in code:
  triadic or split-complementary spacing, pairwise ΔE ≥ 0.15, ΔE vs ground
  ≥ 0.16, and chalk additionally ≥ 0.55 against `#1A1A1E`. Print the measured
  numbers in the session output.
- Paper's green is visibly darker and holds against cream at a glance.
- Paint's default game matches the reference screenshot's palette.
- Shuffle produces only triadic and split-complementary schemes — spin it 20
  times and confirm.
- No blotches at the reveal. Splatter count 10–18 per game, none at a contact
  point, no black marks. Screenshot a finished paint canvas.
- Paint strokes and splatter both render at 0.88; paper and chalk unchanged.
- Game over reads as two notes; the second is still ringing during the wipe.
- Timeline opens at 70%.
- Copy link: copied URL opens the artwork; label reverts after 3s.
- Idle text is cream, floats gently, and says exactly the two strings above.
- `node v3/build.js` regenerates root `index.html`; two runs byte-identical.
- `git diff --stat main -- v3/engine/ v3/labs/` empty.

## Done looks like

Three modes that each read as one deliberate set of three colours, a paper
green you can actually see, a paint canvas that's lighter and busier with
speckle instead of blobs, and a game that ends on two bells instead of one.
