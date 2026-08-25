# Brief 25 — In-Game Screen: Final Polish

Last pass on the playing screen. Continue on `feature/v3-app`. Docs to `main`.
Five changes, then this screen is done.

Renumber `PORT-PLAN.md`: results/reveal → 26, **new brief 27 — in-game feel
(SFX + hit/score interactions)**, share → 28, integration + ship → 29.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/art-lab.html`
stay byte-identical to `main`. Root `index.html` untouched.

Tasks 1 and 5 are the same bug seen from two ends — read them together.

---

## Task 1 — The layout is being squashed, and that is why the slits look wrong

**Diagnosis first, because the guardrail geometry is already correct in code.**

`.stage` is `width: 1000px; height: 630px; max-width: 100%`. On a 13" MacBook
the page is taller than the viewport, and the stage's `max-width: 100%` lets it
compress horizontally below 1000px. Measured off the attached full screenshot,
the canvas is rendering at roughly **900 CSS px wide, not 1000** — about 0.9×.

Everything inside is `position: absolute; inset: 0`, so it compresses with it:

- The canvas bitmap (1000×630) is scaled down non-uniformly — squashed on one
  axis only, so the artwork is subtly distorted.
- The 2px guardrail lands on a fractional device pixel. Measured off the
  current-build screenshot it renders as **~1.3px tall with a soft gradient
  from `#828282` to `#C5C5C5` across its length**, instead of a flat 2px
  `#C5C5C5` bar. That blur is the "not aligned, not tucked in" problem — the
  geometry is right, the pixel grid is not.
- Paddles (fixed 8px) don't compress, so they fall out of proportion with
  everything that does.

**Fix, in this order:**

1. **Remove `max-width: 100%` from `.stage`.** Non-uniform compression is never
   correct here — the canvas is a fixed-aspect artwork surface.
2. Same for `#ctrl-row`'s `max-width: 100%`.
3. Make the screen actually fit at 1:1 (Task 5).
4. Only if the viewport is still too small after that, scale the **entire
   `.screen`** uniformly with `transform: scale()` and
   `transform-origin: top center`. Uniform, whole-screen, both axes — never one
   axis, never one child.

**Then verify the slit against the reference.** Target, measured off Shivang's
design image at 2×:

| Property | Value |
|---|---|
| Colour | `#C5C5C5`, flat — no gradient, no opacity, no blur |
| Height | `2px`, crisp, on whole device pixels |
| Length | `8px`, starting at the **outer** edge of the frame ring |
| Left marks | canvas x `0` → `8` |
| Right marks | canvas x `992` → `1000` |
| Top y | `PAD_MIN - 2` |
| Bottom y | `PAD_MAX + PH` |

In the reference the mark reads as a clean light notch set into the grey ring,
flush with its outer edge. Where the corner is still curving, a sliver of frame
grey remains inboard of the mark — that is correct and comes for free from the
geometry above; don't chase it.

Screenshot a corner at 1:1 (no browser zoom, no page scaling) and compare
against the reference before calling this done. If it is still soft, the
element is on a fractional offset — find it, don't nudge it.

---

## Task 2 — Mute button needs two states

`#pg-mute` toggles the `muted` flag and calls `stopBGM`/`startBGM`, but the
icon never changes — it is permanently the crossed-out speaker. So the control
shows "muted" while the music is playing.

- **Unmuted (default):** plain speaker icon, no cross. This is the state the
  button sits in when the game starts.
- **Muted:** speaker with the cross — the icon currently in the markup.

Both 18×18px SVG, `#C5C5C5`, opacity 0.8, hover 1.0 (`DESIGN.md` §10). Inline
both and toggle visibility; no icon fonts, no external assets.

Also set `aria-pressed` and swap `aria-label` between "Mute" and "Unmute" so
the control is honest to a screen reader, not just to the eye.

---

## Task 3 — Every palette chip shows 3 dots

Chalk and paint already resolve to three colours. **Paper does not — it uses
`DEFAULT_PALETTE`, which is five** (pink, blue, green, orange, cyan). So making
the chip three dots everywhere is not purely a UI change: it means paper drops
from five stroke colours to three.

That is the change specced here, because a chip showing three dots while the
canvas paints five is a lying control. Paper's game palette becomes the **first
three of `DEFAULT_PALETTE` — pink, blue, green.** Pink and blue are the paddle
colours and cannot be dropped; green is next in the existing order, so nothing
is invented.

Apply to:

- The playing screen's `#pg-pal-pill` — already dynamic, just resolves to 3 now.
- **The idle screen's `#pal-pill`**, which is currently five hardcoded `<i>`
  dots in the markup. Make it render from the same source as the playing
  screen's, so the two can never drift.

Shuffle behaviour unchanged.

**Flag at review:** this visibly changes the paper artwork — orange and cyan
stop appearing. If that reads as a loss, the alternative is keeping paper at
five and letting the chip vary per surface, which is what it did before.
Shivang's call, but he should see it side by side.

---

## Task 4 — Playing-screen logo 30% smaller

`.app-header`'s inline SVG is `width="140" height="27"`. Make it **`98 × 19`**
(30% down, aspect preserved — the `viewBox` stays `0 0 140 27`).

Playing screen only for now. The idle card's logo and the results header keep
their current size until those screens are reviewed.

---

## Task 5 — Fit on a 13" MacBook with no scroll

The playing screen scrolls on a 13", which pushes the canvas off-centre. Task 1
removes the squashing; this makes the content genuinely fit.

Current vertical stack:

```
32   body padding-top
27   logo
24   .app-header margin-bottom
630  canvas
24   gap
48   #ctrl-row
32   body padding-bottom
---
817px
```

A 13" MacBook gives roughly 760–800px of viewport height after browser chrome.
817 doesn't fit. After Task 4's logo cut it is 809 — still doesn't fit.

**Target: the whole screen fits inside 760px.** Get there by tightening the
vertical rhythm, staying on the 4pt grid (`DESIGN.md` §4 — no arbitrary
values):

```
16   body padding-top     (--space-xm)
19   logo                 (Task 4)
16   header margin-bottom (--space-xm)
630  canvas
16   gap                  (--space-xm)
48   #ctrl-row
16   body padding-bottom  (--space-xm)
---
761px
```

That is the shape; tune the exact tokens by eye so it still breathes. Then:

- No vertical scrollbar at 1280×800 or 1440×900.
- The canvas group reads as centred, not pushed down.
- Everything still lands on whole pixels — check a guardrail after resizing.
- Only if a viewport is still too short does the uniform `scale()` fallback
  from Task 1 kick in.

Idle and results keep their current spacing; they'll get the same treatment
when reviewed.

---

## Verification

- No page scroll at 1280×800 and 1440×900. Canvas renders at exactly 1000 CSS
  px wide — measure it, don't eyeball it.
- Guardrails: flat `#C5C5C5`, crisp 2px × 8px, all four positions. Screenshot a
  corner at 1:1 next to the reference.
- Mute button shows a plain speaker when unmuted and a crossed speaker when
  muted, and `aria-pressed`/`aria-label` follow.
- All three surfaces show exactly 3 dots, on both idle and playing. Paper paints
  in 3 colours.
- Playing logo measures 98×19.
- Paint rendering, splatter, guardrail positions and the game loop are otherwise
  unchanged — this is a layout and chrome pass.
- `git diff --stat main -- v3/engine/ v3/labs/ index.html` empty.

## Done looks like

Open it on a 13" and the whole game sits centred in the window with no scroll,
nothing squashed, four crisp light notches tucked into the frame, a mute button
that tells the truth, and three colour dots on every surface.
