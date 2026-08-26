# Brief 32 — Mobile Screens

Two real mobile screens, replacing brief 30's placeholder overlay. Continue on
`feature/v3-polish` after brief 31 lands. Docs to `main`.

**Read first:** `v3/design/1d-mobile-share.html`, `v3/design/5-mobile-gate.html`,
and `v3/design/MOBILE-NOTES.md` — all three are the fidelity reference and the
notes carry decisions this brief adopts.

Root `index.html` is generated. Edit `v3/app/index.html`, then
`node v3/build.js`.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/art-lab.html`
byte-identical to `main`.

---

## Task 1 — Mobile tokens

New, mobile-only, per `MOBILE-NOTES.md` §2. A 48px radius and an 8px frame do
not survive on a 358px-wide canvas — the corners eat the artwork.

```css
--radius-mobile-canvas: 24px;   /* steps down from --radius 48px */
--frame-mobile:          5px;   /* steps down from the 8px frame */
--gutter-mobile:        16px;   /* --space-xm — artwork never bleeds to the edge */
--tap:                  56px;   /* minimum interactive height */
```

Ship these as fixed tokens, not a ratio. A ratio sounds tidier but produces
fractional radii and frame widths at arbitrary widths, and this codebase has
already lost a day to 2px marks landing on fractional pixels (brief 25). Two
stepped values are legible and land on whole pixels. This also closes
`MOBILE-NOTES.md` open question 1.

Both screens: portrait, single fold, no scroll. Vertical padding is
`24px + env(safe-area-inset-*)`. One centred cluster with all slack above and
below it — never distributed between elements, so the stack reads identically
on a 667pt and a 932pt phone (`MOBILE-NOTES.md` §3 has the exact stacks).

Routing is unchanged from brief 30 and already correct: detect on
`(hover: none) and (pointer: coarse)`, gate the game, never gate the share
screen.

---

## Task 2 — Mobile share screen

Replaces the current desktop share screen scaled down (which works but sits
flush to both edges — already logged in `BACKLOG.md`).

Per `1d-mobile-share.html`:

- Logo → 16 → "tap to view" → 24 → artwork → 24 → haiku → 32 → actions.
- Artwork is an **object on a page, not a bleed**: 16px gutter,
  `aspect-ratio: 1000/630`, stepped radius and frame.
- **Tap opens full screen, rotated.** The artwork is landscape and the phone is
  portrait, so full screen means rotated 90° — the piece fills the display
  instead of letterboxing. Clone the artwork node into the overlay, rotate,
  size to `min(innerHeight − 32, (innerWidth − 32) × 1000/630)`.
  - The rotated element must be absolutely positioned and centred, **not** a
    shrinkable flex item — a rotated element's layout box overflows
    horizontally by design and a flex item will collapse to the line width.
  - Close on tap anywhere, the ✕ (44px, top right, inside the safe area), or
    Esc. Recompute on `resize` and `orientationchange`. If the device is
    already landscape, skip the rotation and fit width.
  - `screen.orientation.lock('landscape')` where supported; treat failure as
    fine, the rotation works without it.
- Actions stacked at 56px: primary alone (hairline gradient + PAINT/PLAY word
  swap), then `download` and `copy link` sharing a row.
- `copy link` label swaps to **"Copied!"** for 3s — same behaviour as brief 31
  Task 5, one implementation shared by both screens, not two.
- **iOS download caveat:** Safari will not silently save a canvas PNG. Open it
  in a new tab with a "press and hold to save" line, or use the Web Share API
  where present. Do not let the button appear to do nothing.

The rotated full-screen view is a new pattern (`MOBILE-NOTES.md` open question
2). Ship it here; whether it becomes the standard way artwork is viewed on
mobile is a later call, not one this brief needs to settle.

---

## Task 3 — The gate, running the real doodle

Per `5-mobile-gate.html`: logo → 16 → tagline → 32 → canvas → 32 → message card
→ 32 → copy link (56px) → 12 → hint line.

**Shivang's question — run the real idle doodle inside the gate's canvas rather
than the CSS stand-in — is right, and the design's own notes recommend the same
thing (`MOBILE-NOTES.md` §5, and open question 4). Build it that way.**

The reasoning worth keeping: the gate's job is to *show* why a phone can't play
before it says so. A CSS stroke-dash loop shows a decoration; the real engine
shows the actual game, and it already exists and runs read-only. Frame-accurate
parity with the engine is not achievable in CSS, so shipping the placeholder
would mean maintaining a second, worse renderer forever — the same
two-algorithms trap briefs 19–20 spent two sessions escaping.

### Make the paddles real, not decorative

The design animates the paddles on a 4.5s loop with a cursor glyph riding the
left one. Do not layer that animation *over* a doodle whose paddles are static —
the ball would visibly bounce off nothing while the visible paddles move
elsewhere, which is worse than the CSS version.

Instead, **drive the doodle's own paddle objects from the same motion.** The
doodle already passes `paddleL` / `paddleR` into `advanceBall`; animate their
`.y` on the design's keyframe timings and position the DOM paddles from those
same values each frame. The ball then genuinely bounces off the paddle the
cursor is dragging. That is the whole point of the screen, and it is a few
lines because the seam already exists.

- Paddle bars sit **on** the frame rim, `z-index` above the frame ring, scaled
  to the small canvas (5 × 38px per the design).
- The detached handle dot is dropped at this size — it would hang outside the
  canvas into the gutter. The cursor glyph takes its position. (Adopting
  `MOBILE-NOTES.md`'s deviation as specced; open question 3's threshold is
  answered by "mobile gate only", not a width rule.)
- **Paper surface only.** Chalk and paint renderers do per-stroke offscreen
  work; paper is the cheapest and matches the design's cream canvas. This is a
  phone.
- `prefers-reduced-motion`: hold a completed still, no loop.

### Copy and action

Copy is fixed, verbatim: headline **"this one needs a mouse"**, body **"the
paddle follows your hand — best on a desktop or laptop. come back and play."**

One action: `copy link` as the primary, hint "copy the link to shift to your
desktop" beneath. On tap: label → "link copied", hint → "paste it into your
desktop browser", both reverting after 3.2s. Fall back to a selectable input if
the clipboard write is blocked.

Copy the **current page URL**, not a hardcoded domain — the design file
hardcodes `https://zenpong.xyz`, which is a mockup placeholder and would break
the moment the URL differs from wherever it is actually served.

---

## Verification

Test in a real mobile viewport, not a narrowed desktop window.

- Gate: real doodle animating, ball bouncing off the moving paddles, cursor
  riding the left one, at a sensible frame rate on a mid-range phone.
- Reduced motion holds a still on both screens.
- Share: artwork inset by the gutter with the stepped radius and frame; tap
  opens the rotated full-screen view; close works by all three routes; landscape
  device skips the rotation.
- Both screens hold in one fold with no scroll at 375×667 and 430×932, and the
  cluster stays centred at both.
- Copy link works on both screens and copies the real current URL.
- Download does something visible on iOS Safari.
- A share link on a phone still renders the artwork; the gate never intercepts
  it.
- Desktop is untouched — play a full desktop game and confirm nothing regressed.
- `node v3/build.js`; two runs byte-identical. `git diff --stat main --
  v3/engine/ v3/labs/` empty.

## Done looks like

Someone opens a shared painting on their phone, taps it, and it fills the
screen. They tap "play your own", land on a canvas quietly playing a real rally
with a cursor dragging the paddle, understand instantly why they need a mouse,
and copy the link to their desktop.
