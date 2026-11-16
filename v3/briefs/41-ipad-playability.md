# Brief 41 — iPad / tablet playability (touch control + responsive fit + gate to phones-only)

Build on `feature/v3-ipad-41` off `main`. Root `index.html` is generated — edit
`v3/app/index.html`, then `node v3/build.js`. `v3/engine/` stays byte-identical to
`main`. Docs to `main`.

**Ship model:** build it, self-verify each task against the evidence named, merge
to `main` (`--no-ff`), push, reply with the live URL + the screenshots/numbers.
Each task below names the exact code and the exact change.

---

## Why this is more than a breakpoint change (read first)

The iPad is not blocked by a width rule. `isTouchDevice()` (~line 3338) returns
true for `document.documentElement.clientWidth <= 600` **OR**
`matchMedia('(hover: none) and (pointer: coarse)').matches`, and
`isMobileBlocked()` gates on that. The second clause catches every
touch-with-no-hover device at any width — which is why an iPad (768–1024px, well
above any pixel breakpoint) is blocked.

That block is deliberate, because v3 has no touch paddle control at all — the
paddle only follows `mousemove` (the handler at ~line 5020 sets `gameMouseY` from
`e.clientY`). The in-code comment at ~line 3329 states this explicitly: without
touch input, letting a tablet through would show "a paddle that never moves —
silently unplayable."

So making iPad playable is three coupled changes, in this order:

1. Add touch/pen paddle control (the enabler) — Task 1.
2. Make the fixed-1000px layout fit tablet widths/orientations — Task 2 (an iPad
   mini portrait is 768px wide; the 1000px board overflows without this).
3. Open the gate to tablets, keep it for phones — Task 3.

A raw width cutoff (e.g. "< 800px") is wrong on its own: iPad-mini portrait is
768px while an iPhone Pro Max landscape is 932px, so a width line can't separate
them. The reliable separator is the shorter viewport side: every iPad is ≥768px on
its short side; every phone is ≤~430px. Threshold 700 sits safely between the two
and is orientation-proof.

---

## Task 1 — Touch / pen paddle control (the enabler)

The paddle must follow a finger or stylus during play, exactly as it follows the
mouse.

Current: one `mousemove` listener on `document` (~line 5020), gated to
`screenState === 'playing'`, mapping
`gameMouseY = (e.clientY - r.top) * (H / r.height)` where
`r = gameCanvas.getBoundingClientRect()`.

Change: unify on Pointer Events so mouse, touch and pen all drive the paddle
through one path. Replace the `mousemove` listener with a `pointermove` listener
(same body, same `screenState === 'playing'` gate, same rect-based mapping —
`getBoundingClientRect()` already returns the on-screen (scaled) rect, so Task 2's
scale transform is handled for free). Keep reading `clientY` (PointerEvent has it).

- Add `e.preventDefault()` in the handler only while playing, so a finger drag
  moves the paddle instead of scrolling/rubber-banding the page. The listener must
  be registered `{ passive: false }` for preventDefault to take effect.
- Do not also keep a separate `mousemove` handler — one `pointermove` covers all
  three input types; a second handler would double-fire on mouse.
- The idle "tap to begin", surface tiles, HUD chips (home/restart/mute) and the
  results timeline already work on touch (they're click / existing pointer
  handlers) — leave them.

**Evidence:** in a touch emulation (or a real iPad), start a game and drag — the
paddle tracks the finger across the full court; the page does not scroll under the
drag. Mouse play on desktop is unchanged (same tracking, no regression).

---

## Task 2 — Fit the fixed layout to tablet width AND height

The desktop layout is a fixed 1000px width (`.stage` is `width:1000px;
height:630px`, ~line 167). `fitScreenToViewport()` (~line 3421) currently scales
the whole `.screen` down by height only, and early-returns for touch devices
(`if (isTouchDevice()) return;`, ~line 3429). On an iPad that path never runs, so
the 1000px board overflows an 768–834px portrait screen.

Change `fitScreenToViewport()` to clamp by BOTH axes, and to run for tablets:

- Replace `if (isTouchDevice()) return;` with `if (isPhone()) return;` (Task 3
  defines `isPhone()`). Phones keep using the fluid gate/share screens and need no
  fit; tablets and narrow desktops now get the fit.
- Compute a single uniform scale from the tighter of the two axes:

```
const availW = document.documentElement.clientWidth  - horizontalBodyPad;
const availH = window.innerHeight - vPad;            // vPad as today
const rect   = visible.getBoundingClientRect();      // measured after resetting transform
const scale  = Math.min(availW / rect.width, availH / rect.height, 1);
if (scale < 1) { apply scale + transformOrigin 'top center' + the negative-margin
                 flow-height correction already used for the height-only case; }
```

  Keep the existing reset-before-measure and the `marginBottom` flow-height fix —
  just drive them off the two-axis `scale` instead of the height-only one.
  `transform-origin: top center` keeps it centred horizontally.
- Keep the results-screen exemption (`if (screenState === 'results') return;`) —
  results is allowed to scroll. (Note: on a phone, results is reached only via a
  shared link / the share path; on a tablet, results now renders the normal
  desktop results, scaled if needed.)
- The canvas internal resolution stays 1000×630 (crisp); only the CSS scale
  changes. Paddle/guardrail DOM positions are px inside the stage and scale with
  the transform — nothing to recompute.

Also fire the fit on rotation: add
`window.addEventListener('orientationchange', fitScreenToViewport);` (today only
the full-share overlay listens to `orientationchange`, ~line 6682; the main
screens only listen to `resize`, ~line 3456 — iOS does fire `resize` on rotate,
but add the explicit `orientationchange` too so the re-fit is immediate and
reliable).

**Evidence:** screenshots of a full game on iPad portrait and landscape at these
sizes — the whole board + HUD is fully visible (no horizontal overflow, no clipped
edges) and centred: 768×1024, 820×1180, 834×1194, 1024×1366 (and each rotated).
Desktop ≥1000px is pixel-unchanged (scale resolves to 1).

---

## Task 3 — Gate detection: phones only

Replace the capability-based block with a phone = small-and-touch rule, so tablets
pass and phones don't.

Add one predicate and use it everywhere the old pair is read:

```
function isPhone() {
  const shortSide = Math.min(document.documentElement.clientWidth,
                             document.documentElement.clientHeight);
  return matchMedia('(pointer: coarse)').matches && shortSide < 700;
}
```

- `(pointer: coarse)` is true on phones and tablets but false on a desktop (fine
  pointer) and on a touchscreen laptop whose primary pointer is its trackpad — so a
  narrow desktop window is never gated, it just scales (Task 2). iPad is coarse but
  its short side is ≥768 ≥700, so it is not a phone. Every current phone is coarse
  with short side ≤430 < 700 → phone.
- Use `document.documentElement.clientWidth/clientHeight` (layout viewport), per the
  existing comment's reasoning at ~line 3339 — not `innerWidth`.

Rewire:

- `isMobileBlocked()` (~line 3366): change its guard from
  `if (!isTouchDevice()) return false;` to `if (!isPhone()) return false;`. Keep
  the `share` and `idle+landingWithSharePayload` exemptions exactly as-is.
- `updateMobileScreens()` (~line 3383): the `mobileShare` line currently reads
  `isTouchDevice() && screenState === 'share'`. Change `isTouchDevice()` →
  `isPhone()` so the rotated phone share screen only shows on phones; an iPad
  opening a share link gets the normal desktop results/share (scaled by Task 2),
  which is correct now that iPad is a full player.
- `fitScreenToViewport()`'s early return (Task 2) uses `isPhone()`.
- Search for any other `isTouchDevice()` call sites and decide per-site: anything
  meaning "this device can't play" becomes `isPhone()`. (The share-decode
  flash-guard and the timeline's "cheap enough not to gate" comment at ~line 6402
  are not playability checks — leave those.) List every `isTouchDevice()` call in
  the PR description with the decision made for each. If nothing else needs the old
  definition, `isTouchDevice()` may be removed; if something non-playability still
  wants "is this a touch device," keep it but do not use it for gating.

**Evidence:** gate shows on iPhone 390×844 and 430×932 (both orientations, incl.
landscape 932 wide — proves it's not a width rule); gate does not show on any iPad
size from Task 2. Desktop never gated, including a window narrowed to 650px (fine
pointer → not a phone).

---

## Task 4 — Gate copy: screen size, not mouse

The gate now only appears for phones, and the reason is screen size, not input —
touch works now. Update the gate screen text (the `#screen-mobile-gate` block,
~line 1170 markup).

- Headline: replace "this one needs a mouse" with a size-based line, e.g. "best on
  a bigger screen".
- Sub: replace "the paddle follows your hand — best on a desktop or laptop. come
  back and play." with something like "Zen Pong wants room to breathe — play on a
  tablet, laptop or desktop. your shared paintings still open here."
- Keep the COPY LINK button, the footer ("Created by Shivang Joshi · Music by Omni
  Gardens · Contact") and the share-still-renders behaviour unchanged.
- Keep the wording calm and in the product's voice; final copy is Shivang's call —
  flag the two strings in the PR so he can tweak.

**Evidence:** screenshot of the phone gate with the new copy.

---

## Task 5 — Touch-play hygiene (no scroll, no zoom, no text-select during play)

So dragging the paddle feels like a game, not a web page:

- Add `touch-action: none;` to the play surface (the `.stage` / `.canvas-wrap` on
  the playing screen) so the browser never claims the gesture for scroll/pinch
  while playing. Scope it so it does not disable normal scrolling on the results
  screen (results must still scroll on a tablet if it overflows).
- Add `user-select: none;` on the playing screen so a fast drag doesn't select the
  "you" label or HUD text.
- Prevent double-tap-to-zoom on the controls during play (the `touch-action: none`
  on the stage covers the board; ensure the viewport `<meta>` already present isn't
  changed — do not add `user-scalable=no` globally, which harms accessibility; the
  targeted `touch-action` is enough).
- Verify the HUD chips (home/restart/mute) and the idle surface tiles are still
  tappable (they're outside the `touch-action:none` stage, or are buttons — confirm
  a tap still fires).

**Evidence:** on a real iPad (or touch emulation), during a rally a vigorous finger
drag moves only the paddle — the page doesn't scroll, zoom, or select text;
HOME/restart/mute still respond to a tap; a two-finger pinch does nothing mid-rally.

---

## Verification (self-check, then ship)

- Playable, fully-visible, centred full game — screenshot each: iPad 768×1024,
  820×1180, 834×1194, 1024×1366, each in both orientations. Paddle tracks a finger
  drag across the whole court in every one.
- Still gated (phone screen, new copy) — screenshot: 390×844, 430×932, and 932×430
  (phone landscape, wider than an iPad-mini short side — proves the short-side
  rule).
- Unchanged — desktop ≥1000px plays exactly as before (mouse tracking, no scale); a
  650px-wide desktop window is not gated and scales to fit.
- Share path intact — a shared `#...` link opened on a phone still renders the
  artwork (gate exempt); the same link on an iPad opens the normal results/share,
  scaled.
- `git diff --stat main -- v3/engine/` is empty. `node v3/build.js` twice is
  byte-identical. No console errors on desktop or in touch emulation.
- Then merge to `main` (`--no-ff`), push, reply with the live URL + the Task 1–5
  evidence and the `isTouchDevice()` call-site list.
