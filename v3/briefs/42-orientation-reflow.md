# Brief 42 — Orientation reflow (re-fit timing, results scaling, mid-rally pause)

Build on `feature/v3-orient-42` off `main`. Root `index.html` is generated — edit
`v3/app/index.html`, then `node v3/build.js`. `v3/engine/` stays byte-identical to
`main`. Docs to `main`.

**Ship model:** build it, self-verify each task against the evidence named, merge
to `main` (`--no-ff`), push, reply with the live URL + the screenshots.

---

## Diagnosis (confirmed in the shipped file)

**Bug A — the re-fit measures stale dimensions on rotate.**
`fitScreenToViewport()` (line 3442) runs synchronously on `orientationchange` and
`resize` (lines 3498/3501). On iPadOS/iOS, `window.innerHeight`,
`document.documentElement.clientWidth` and `getBoundingClientRect()` still report
the pre-rotation viewport for one or more frames after those events fire. So
`availW`/`availH` are the old orientation's, the `scale` is wrong, and the board
ends up over/under-scaled and offset — "zooms into one part / centre, stuck,
glitchy." Nothing re-measures after the viewport settles.

**Bug B — results never scales.** `fitScreenToViewport()` early-returns for results
(line 3460, `if (screenState === 'results') return;`). On a tablet in portrait
(768–834px wide) the fixed 1000px results screen is wider than the viewport with
nothing scaling it down → it clips/zooms in every orientation. The exemption was
written for desktop (where results is ≤ viewport width and just scrolls); it's
wrong on tablet.

**Mid-rally rotation has a third, UX problem on top:** even with A fixed, the ball
keeps moving through the ~0.3–1s rotation while the player can't control the
paddle, so a point can be lost to the act of rotating.

---

## Task 1 — Orientation-safe re-fit (fixes Bug A)

Stop calling `fitScreenToViewport()` directly from the viewport events. Route
everything through a scheduler that waits for the viewport to settle and
re-measures.

- Add `scheduleFit()`:
  - Cancels any pending scheduled fit (one rAF handle + one timeout handle at
    module scope).
  - Runs `fitScreenToViewport()` on the second animation frame
    (`requestAnimationFrame(() => requestAnimationFrame(fitScreenToViewport))`) so
    layout has settled one frame past the event.
  - Also schedules a trailing `fitScreenToViewport()` ~300ms later (clear the
    previous trailing timeout first) — iPadOS frequently reports correct
    dimensions only after a late settle, so a single rAF is not enough on its own.
- Rewire the listeners (lines 3498/3501) from `fitScreenToViewport` to
  `scheduleFit`. Keep the initial direct `fitScreenToViewport()` call (line 3503)
  as-is.
- Prefer `window.visualViewport` as the dimension source when present: inside
  `fitScreenToViewport()`, compute
  `availH = (visualViewport?.height ?? window.innerHeight) - vPad` and
  `availW = (visualViewport?.width ?? document.documentElement.clientWidth) - hPad`.
  `visualViewport` tracks the real visible area through rotation and the iOS
  dynamic toolbar more reliably than `innerHeight`. Also subscribe
  `visualViewport?.addEventListener('resize', scheduleFit)` (guarded for absence).
- `fitScreenToViewport()` is already idempotent (it resets
  transform/transformOrigin/marginBottom at the top before measuring), so running
  it 2–3× per rotation is safe — do not remove those resets.

**Evidence:** on a real iPad (or iPadOS emulation), rotate portrait↔landscape
repeatedly on idle and during play — the board re-fits correctly every time (no
zoom-into-centre, no stuck or clipped layout), within a few hundred ms of the
rotation completing.

---

## Task 2 — Results scales to fit width in every orientation (fixes Bug B)

Replace the results exemption with a width-only clamp, so results never overflows
horizontally but is still free to be taller than the viewport and scroll.

- Remove `if (screenState === 'results') return;` (line 3460).
- Branch the scale for results:

  ```js
  const scale = (screenState === 'results')
    ? Math.min(availW / fitW, 1)                       // width-only, never clamp height
    : Math.min(availW / fitW, availH / rect.height, 1);
  ```

- For results, apply `transform: scale()` + `transform-origin: top center` when
  `scale < 1`, but do not apply the negative-margin height correction and do not
  clamp by height — results must stay scrollable (`#screen-results` already has
  the `overflow-y:auto` fallback, CSS ~line 793). Width-fit removes the horizontal
  overflow; vertical scroll handles height.
- Keep the non-results path exactly as it is today (two-axis clamp +
  negative-margin flow fix).

**Evidence:** reach results, rotate portrait↔landscape at 768×1024, 820×1180,
834×1194, 1024×1366 — the whole results card fits the width with no horizontal
clipping in either orientation; a long haiku still scrolls vertically and reaches
the bottom.

---

## Task 3 — Graceful mid-rally rotation (pause + resume)

A lightweight pause so a rotation never costs a point and the relayout is hidden
behind a calm overlay. This is a pause/resume, not a permission modal, and it
appears only for a live rally on a tablet — never on idle, results, or desktop
resize.

- Add module flag `let gameReorientPaused = false;`.
- On `orientationchange` (a dedicated handler, in addition to `scheduleFit`): if
  `screenState === 'playing'` and the device is a tablet (not a phone, coarse
  pointer: `!isPhone() && matchMedia('(pointer: coarse)').matches`), set
  `gameReorientPaused = true` and show a small centred overlay over the board —
  calm, product voice, e.g. "You rotated — tap to continue" (final copy Shivang's
  call; flag the string in the PR). Do this for an actual orientation change only,
  not plain `resize` (desktop never triggers it).
- `gameLoop()` (line 5401): change `if (screenState === 'playing')` to
  `if (screenState === 'playing' && !gameReorientPaused)`. While paused, physics
  and stroke-commit halt and the last frame stays painted (canvas retains pixels)
  — a clean freeze, not a blank board. `scheduleFit()` still runs in the
  background, so the board is correctly laid out by the time the player taps.
- Resume: tapping the overlay (or the board) sets `gameReorientPaused = false`,
  hides the overlay, and re-serves the current rally's ball from centre with no
  score change, reusing the existing serve-beat delay pattern (the ~550ms
  `spawnGameBall` beat at line 5346) so play doesn't resume with the ball in a
  stale position. Decision: re-serve, don't resume-in-place — the ball's
  pre-rotation position/velocity may be stale or off-screen.
- The overlay element lives in the playing screen (or is `position:fixed` centred
  above it) so it reads centred regardless of the board's current scale;
  `prefers-reduced-motion`: show it with no animation.
- Idle and results get no overlay — they re-fit silently via Tasks 1–2.

**Evidence:** during an iPad rally, rotate — the ball freezes, the "tap to
continue" overlay appears, the board re-fits behind it; tapping resumes with a
fresh serve and no score change. Rotate several times in a row, both directions.
Confirm the overlay never appears on desktop resize, on idle, or on results.

---

## Task 4 — Hygiene

- `scheduleFit()` coalesces the burst of `resize` events iOS fires during a
  rotation (single pending rAF + single pending trailing timeout; clear before
  re-arming).
- No `user-scalable=no` changes to the viewport meta (accessibility); the existing
  `touch-action:none` from brief 41 stays.
- Confirm the brief-41 behaviours still hold: paddle follows finger, phones still
  gated, desktop unchanged.

---

## Verification (self-check, then ship)

- Rotate mid-rally (iPad, both directions, several times): board re-fits correctly
  every time; pause overlay shows; tap resumes with a fresh serve, score intact; no
  zoom/stuck/clip.
- Results on rotation: 768×1024, 820×1180, 834×1194, 1024×1366, both orientations —
  fits width, no horizontal clip, long haiku scrolls.
- Idle on rotation: surface selector re-fits cleanly, no overlay.
- Desktop: resize window — no overlay ever, scaling unchanged, no regression.
- Phone: still gated, unchanged.
- `git diff --stat main -- v3/engine/` empty; `node v3/build.js` twice
  byte-identical; no console errors on desktop or in tablet emulation. Then merge to
  `main` (`--no-ff`), push, reply with the live URL + the Task 1–3 evidence.
