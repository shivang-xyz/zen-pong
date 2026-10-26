# Brief 40 — Live Fixes (gate freeze, splatter, results styling, surface order)

Build on `feature/v3-fixes-40` off `main`. Root `index.html` is generated —
edit `v3/app/index.html`, then `node v3/build.js`. `v3/engine/` and `v3/labs/`
stay byte-identical to `main`. Docs to `main`.

**Ship model:** build it, self-verify each task with the evidence named, merge to
`main` (`--no-ff`), push, reply with the live URL + the screenshots/numbers. Each
task below names the exact code and the exact change — there is no ambiguity to
resolve. Do not leave any item partially done.

---

## Task 1 — Gate animation freezes when switching to mobile mid-game

**Confirmed root cause.** `doodleLoop()` runs its whole body only
`if (screenState === 'idle')`. When the viewport switches to mobile *while a game
is playing* (screenState is `'playing'`), the gate screen shows (via
`updateMobileScreens()` on resize) but the doodle loop skips everything, so the
gate canvas never animates — frozen. It only reproduces via resize-mid-game
(real phones can't play, so they never hit it), which is exactly what Shivang
sees.

**Fix:** run the gate animation whenever the gate is active, regardless of
`screenState`. Restructure `doodleLoop()` (currently ~line 2920) to:

```js
function doodleLoop() {
  const gateActive = isMobileBlocked();
  if (gateActive) {
    if (!wasGateActive) gateFrameFrozen = false; // re-arm on (re)entry
    wasGateActive = true;
    if (prefersReducedMotionMQ.matches) {
      if (!gateFrameFrozen) { fastForwardDoodleForStill(); drawGateFrame(); updateGatePaddleDOM(); gateFrameFrozen = true; }
    } else {
      stepDoodle(); drawGateFrame(); updateGatePaddleDOM();
    }
  } else {
    wasGateActive = false;
    if (screenState === 'idle') { stepDoodle(); drawFrame(); }
  }
  requestAnimationFrame(doodleLoop);
}
```

So the gate's doodle runs whether you arrive at the gate from idle **or** by
resizing in mid-game. Desktop idle behaviour is unchanged (gate inactive →
`screenState === 'idle'` path, identical to today).

**Evidence:** in a real browser window, start a desktop game, then narrow the
window below ~600px mid-rally — the gate appears **and its doodle animates**
(not frozen). Confirm a normal desktop game and a cold mobile gate both still
work.

---

## Task 2 — Splatter: fewer, and matched to the live stroke colour

Two changes in the paint splatter.

**2a — Colour matches the current live stroke.** Today `buildLiveSplatterMark()`
(~line 3230) sets `colorHex = weightedPick(rng, gameSplatterColorWeights(palette))`
— a *random* palette pick, so a splatter can be red while the ball is painting
green. Change it to use **the colour of the stroke the ball is currently
painting** — the same accent the live trail is being rendered with (the current
`gameStrokeIndex` → its resolved accent hex; use whatever value
`renderGameStrokeAs`/the live trail uses for the active stroke). The mark's
`colorHex` must equal that. Drop the `weightedPick`/`gameSplatterColorWeights`
path for the live mark colour.
- The share encoder stores the mark colour as an index into `paletteWithInk`
  (~line 4383). Since the live stroke colour is always one of the 3 accents,
  `indexOf` still resolves cleanly — no share-format change, no version bump.

**2b — Fewer splatters.** They fire too often. Tone down from the brief-34
levels:
- `GAME_SPLATTER_COOLDOWN_FRAMES` 16 → **30**
- `GAME_SPLATTER_CAP` 28 → **14**
- `GAME_SPLATTER_BASE_P` 0.115 → **~0.06** (tune so a typical game lands around
  **8–12** marks, down from ~20)
- Keep the mid-flight-only, never-on-a-hit rule and the shape variety from brief
  35 — only the rate and the colour change.

**Evidence:** play a paint game; report the measured splatter count (target
~8–12) and confirm, on a screenshot, that each splatter sits in the colour of
the stroke it came off (no mismatched colours).

---

## Task 3 — Results PLAY AGAIN becomes the primary rainbow button

`#btn-play-again` (results, ~line 41) is currently `.rbtn`. Make it the primary
rainbow-bordered button, matching the other `.rbtn-primary` CTAs (e.g.
`#btn-share-cta`). Change the markup to the primary structure:

```html
<button class="rbtn-primary" id="btn-play-again"><span class="inner">play again</span></button>
```

- It keeps the travelling hairline-gradient border + the warm press/hover from
  `cta.css`, static label (no word-swap — consistent with the other primaries).
- Its click handler and routing are unchanged (still goes to idle-armed). Only
  the class/markup changes.
- Check it still sits correctly on the left of `#post-row`; adjust only spacing
  if the primary's padding shifts the row.

---

## Task 4 — Idle surface order: paper, paint, chalkboard

The surface tiles (~lines 1298–1306) are currently **paper, chalk, paint**.
Reorder the three `<button class="tile">` blocks to **paper, paint, chalk**
(paint second, chalkboard third). Paper keeps `aria-pressed="true"` as the
default. No JS depends on DOM order (handlers read `data-pick`), so this is a
pure markup reorder — verify selecting each still switches correctly.

---

## Task 5 — Results: "…of calm, gained" in a subtle pill

Wrap the gained line (`#results-gained`, the `.gained` element in `#gained-row`,
~line 32) in a **subtle, slightly-darker-than-background pill** so it reads as
distinct from the page — light-touch, not a loud chip.

- A gentle fill darker than `--color-bg` (#383838) — e.g. `rgba(0,0,0,0.16)` or
  ~`#2E2E2E` — `border-radius: var(--radius-small)`, padding ~`6px 14px`,
  `inline-block` so it hugs the text. No hard border (an optional 1px
  `rgba(255,255,255,0.04)` hairline is fine). Keep it quiet — just enough to lift
  it off the bg.
- **Keep the travelling cream gradient sweep on the text** (the `background-clip:
  text` treatment) working *inside* the pill — the pill is a background behind
  the text, the text keeps its own gradient.
- Keep `#gained-row` balanced: the pill (left) and the haiku (right) should still
  sit cleanly on one row; switch the row to `align-items: center` if the pill's
  padding throws off the baseline.

**Evidence:** screenshot the results screen showing the pill + the rainbow PLAY
AGAIN.

---

## Verification (self-check, then ship)

- Item 1: real-window resize-mid-game → gate animates (not frozen); desktop +
  cold-gate unchanged.
- Item 2: splatter count ~8–12/game; every mark matches its stroke's colour
  (screenshot). `git diff --stat main -- v3/engine/` empty.
- Item 3: PLAY AGAIN is the rainbow primary; still routes to idle-armed.
- Item 4: order is paper, paint, chalk; all three select correctly.
- Item 5: gained line sits in a subtle pill, gradient sweep intact; row balanced
  (screenshot).
- `node v3/build.js` twice byte-identical. Desktop full game, no regressions, no
  console errors. Then merge to `main` (`--no-ff`), push, reply with the live URL
  + the Task 1 / Task 2 / Task 5 evidence.
