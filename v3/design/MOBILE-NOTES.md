# Mobile screens — implementation notes

Two screens. Both are portrait-only, single-fold, no scroll. Reference exports:

| File | Screen |
|---|---|
| `export/1d-mobile-share.html` | 1d · shared artwork, viewed on a phone |
| `export/5-mobile-gate.html`   | Desktop gate — what a phone visitor to the game itself gets |

Mockup: `Zen Pong Mobile Screens.dc.html` (both in 390×844 frames, 1a → 1b flow live).

---

## 1. Routing

- Any phone/tablet-width visitor to the **game** gets the gate (`5-mobile-gate`). The game never attempts to run on touch.
- A **shared artwork link** always renders (`1d-mobile-share`) — it is the one thing mobile is allowed to do.
- The gate's primary button is the only path off the artwork page: `paint/play your own` → gate.
- Detect on pointer capability, not width: `(hover: none) and (pointer: coarse)`. A narrow desktop window should still get the game.

## 2. New mobile-only tokens (DESIGN.md §5/§7 addition)

```css
--radius-mobile-canvas: 24px;   /* steps down from --radius 48px */
--frame-mobile:         5px;    /* steps down from the 8px frame */
--gutter-mobile:        16px;   /* --space-xm — artwork never bleeds to the edge */
--tap:                  56px;   /* min interactive height */
```

The 48px radius and 8px frame do not survive at 358px wide — the corners eat the
artwork. Ratify these two stepped values, or define the frame and radius as a
ratio of canvas width.

## 3. Layout rule — one centred cluster

Both screens are a single vertical cluster, vertically centred, with all slack
above and below it. Never distribute slack between elements: the gaps inside the
cluster are fixed, so the stack reads identically on a 667pt and an 932pt phone.

```
Screen 1d                          Gate
──────────                         ────
logo                               logo
16                                 16
"tap to view"                      "make uncertainty your play"
24                                 32
artwork (aspect 1000/630)          demo canvas (aspect 1000/630)
24                                 32
haiku                              message card
32                                 32
[paint/play your own]  56px        [copy link]  56px
12                                 12
[download] [copy link] 56px        hint line
```

Vertical padding is `24px + env(safe-area-inset-*)`. Nothing is fixed-height, so
if a very short viewport does overflow, it overflows symmetrically.

## 4. Screen 1d — shared artwork

- **Artwork is an object on a page, not a bleed.** 16px gutter, `aspect-ratio: 1000/630`, stepped radius and frame.
- **Tap to open full screen.** The artwork is landscape and the phone is portrait, so full screen means *rotated*: the piece fills the display instead of letterboxing. The overlay clones the artwork node, rotates it 90°, and sizes it to `min(innerHeight - 32, (innerWidth - 32) × 1000/630)`.
  - The rotated element's layout box overflows horizontally on purpose — it is positioned absolute/centred, **not** a shrinkable flex item, or it collapses to the line width.
  - Close on: tap anywhere, the ✕ (44px, top right, inside the safe area), or Esc.
  - Recompute on `resize`/`orientationchange`. If the device is already landscape, skip the rotation and fit width.
  - Consider `screen.orientation.lock('landscape')` where supported; treat failure as fine — the rotation already works without it.
- **Buttons stacked, 56px.** Primary alone on its row (hairline gradient + PAINT/PLAY word swap, same spec as desktop §6). `download` and `copy link` share the row below — both are utilities, neither is a step. `copy link` swaps its label to `copied` for 2.2s.
- Download on iOS Safari will not save silently; expect to open the PNG in a new tab with a "press and hold to save" line, or use the Web Share API where present.

## 5. Screen 2 — desktop gate

The design intent: a dead end becomes a hand-off. Three things carry it —
show the reason, state it, then give the one action a phone can actually do.

- **The canvas demonstrates the constraint.** A rally plays by itself with the cursor glyph riding the left paddle, so "the paddle follows your hand" is shown before it is read.
  - **FLAG — animation parity.** The exported motion is a CSS stand-in: stroke set, weights and stagger match the idle doodle, the paddle keyframes are a 4.5s ease-in-out loop. CSS cannot reproduce the engine's actual output frame for frame. **Recommendation: run the real engine here, read-only** — no input binding, no scoring, looping — at the reduced canvas size. It already exists; the CSS version is only a placeholder for weight and density.
  - Respect `prefers-reduced-motion`: hold a completed still.
  - Paddle bars sit **on** the frame rim, `z-index` above the frame ring or they render under it.
  - **Mobile deviation:** the detached 12px handle dot (DESIGN-DELTA §2b) is dropped at this scale — it would hang outside the canvas into the screen gutter. The cursor glyph takes its position. Needs ratifying.
- **Copy is fixed, verbatim:** headline "this one needs a mouse"; body "the paddle follows your hand — best on a desktop or laptop. come back and play."
- **One action.** `copy link` (primary), with "copy the link to shift to your desktop" beneath. On tap: `navigator.clipboard.writeText`, label → `link copied`, hint → "paste it into your desktop browser", both revert after 3.2s. Fall back to a selectable input if clipboard write is blocked.
- Worth adding later, not designed yet: a QR code for desktop-to-phone is backwards here, but "email me the link" would be a real second option if the product has an email path.

## 6. Open questions for the design owner

1. Stepped mobile radius (48→24) and frame (8→5) — token or ratio?
2. Rotated full-screen view — a new pattern; does it become the standard way artwork is viewed on mobile?
3. Dropping the paddle handle dot below a canvas-width threshold — what threshold?
4. Gate canvas: real engine loop (recommended) or accept the CSS placeholder?
