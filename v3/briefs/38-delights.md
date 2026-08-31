# Brief 38 — Delights (attribution, ball ramp, time-gained results)

**Ship this one directly — no plan-review step.** Build on a branch off `main`
(`feature/v3-delights`), self-verify against the checklist at the end, then merge
to `main` with `--no-ff`, push, and reply with the live URL. Small, fully-specced
changes; don't wait for approval.

Root `index.html` is generated — edit `v3/app/index.html`, then `node
v3/build.js`. `v3/engine/` and `v3/labs/` stay byte-identical to `main`
(including the ball ramp — see Task 2). Docs to `main`.

---

## Task 1 — Attribution + contact line (all screens)

Replace the current music-credit line with a single attribution line, shown on
**every screen**: idle, results, desktop share, mobile share, and the gate.

Exact content and order:

> Created by **Shivang Joshi** &nbsp;|&nbsp; **Contact** ✉ &nbsp;✦&nbsp; Music by **Omni Gardens**

- **"Shivang Joshi"** links to `https://www.shivangjoshi.xyz` (`target="_blank"
  rel="noopener"`).
- **"Contact"** + the envelope icon together are one `mailto:` link:
  `mailto:hello@shivangjoshi.xyz?subject=Zen%20Pong`. Envelope sits right after
  the word.
- **"Omni Gardens"** links to `https://omnigardens.bandcamp.com/album/moss-king-2`
  (new tab). Note the correct spelling — **Gardens**, plural.
- Separators exactly as shown: a pipe `|` between the name and Contact, and the
  `✦` between Contact and Music. Keep the spacing airy.

**Envelope icon** — inline SVG in the same house style as the other icons
(stroke `currentColor`, round caps), sized to sit on the ~11px line (~14px box):

```html
<svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="2" y="4" width="14" height="10" rx="1.5"/><path d="M2.5 5 L9 10 L15.5 5"/>
</svg>
```

**Styling:** same as today's credit — Space Mono, ~11px, `--color-disabled`,
letter-spacing to match. Links may warm/lighten a touch on hover, otherwise
quiet. The whole thing is one line.

**Placement:**
- Desktop (idle, results, desktop share): pinned at the bottom-centre, exactly
  where the idle credit sits now.
- Mobile (mobile share, gate): as the final element in the screen's column,
  centred, inside the fold and **clear of the action buttons** — it may wrap to
  two lines on a narrow phone, which is fine; keep it legible and never
  overlapping a control.
- One shared implementation, not five copies.

---

## Task 2 — Gentle ball-speed ramp (app-side, engine untouched)

Games run long (easy opponent, long rallies), so the canvas over-fills. Add a
**gentle per-rally speed ramp** so long points resolve and a natural game lands
at a good fill — while staying calm, never arcade-frantic.

- The ramp is a function of **time since the current serve** (reset to 0 on every
  serve): `factor = 1.0` for the first **30s**, then linear up to **1.5×** by
  **60s**, capped at **1.5×**.
- Apply it **app-side**, in the game loop, to the app-owned `gameBall`: each
  frame of a live rally, scale the ball's velocity magnitude to `baseSpeed ×
  factor` (preserve direction — only change speed). Do **not** edit
  `v3/engine/`. The engine still handles bounces/spin; this only rescales the
  resulting speed.
- Reset the ramp on each new serve so every point opens calm and only a dragging
  rally speeds up.
- Keep it subtle — tune the cap by feel if 1.5× reads as too much; report the
  final numbers. If, and only if, this genuinely cannot hold app-side because the
  engine re-normalises speed in a way the app can't rescale, apply the scale at
  the app's own post-hit speed assignment (still app-side) rather than touching
  the engine.

---

## Task 3 — Results "time gained" redesign

Implement the results screen exactly per the provided mockup,
`v3/design/3c-results-time-gained.html` (committed with this brief) — lift its
CSS verbatim where it applies.

**New line — the time-gained claim:**
- Copy template: **"<duration> of calm, gained"**. Duration = the game's length,
  from the first serve to game-over. If **≥ 60s**, show minutes to one decimal:
  *"1.5 minutes of calm, gained"*. If **< 60s**, whole seconds: *"45 seconds of
  calm, gained"*.
- Treatment is the mockup's exactly: same face/size as the haiku (14px), **no**
  container/border/shadow/hover — the *only* distinction is a narrow cream
  highlight travelling through the letters on a **7s** loop
  (`background-clip: text`, the `gained-sweep` keyframes and gradient from the
  mockup). Keep the grey fallback colour for engines without `background-clip:
  text`, and the `prefers-reduced-motion` rule that holds the sweep at 30% (no
  animation). Execute this sweep to the letter.

**Layout changes (per mockup):**
- `#gained-row` (width 1000px, `space-between`): the **gained claim on the left**,
  the **existing haiku on the right**, both flush to the canvas edges. (Keep
  whatever haiku/quote the game already shows — only its position moves.)
- `#post-row` (width 1000px, `space-between`): **PLAY AGAIN alone on the left**;
  the utility cluster on the right = **timeline chip, save artwork, share**, in
  that order. The timeline **track shrinks to 240px** (from 320) so the three fit
  inside 1000px.
- Everything keeps its current behaviour — timeline scrub (amber, no white
  outline), save PNG, and the brief-33 "share copies the link + Copied!" (no
  navigation). Only layout and the new line change; don't regress those.
- Reveal timing: the gained line fades in with the same beat the mockup uses
  (`#gained-row` at 1300ms, `#post-row` at 1700ms) — i.e. after the ground wipe
  settles, matching the existing reveal choreography.

This is desktop results only (mobile is gated from play, so it never reaches
results) — no mobile results work needed.

---

## Task 4 — Sentry → backlog (no build)

Add to `BACKLOG.md`:

> - **Remote error visibility — add Sentry (free tier).** Brief 37 added global
>   error/unhandledrejection handlers that log to the console, but nothing
>   surfaces errors remotely (Cloudflare's free Web Analytics is page-views
>   only). Sentry's free tier (~5k events/mo) gives a real dashboard with stack
>   traces + browser/device, and slots straight into the existing handlers — a
>   ~10-min add whenever error visibility is wanted before/around a wider
>   launch. *Surfaced: brief 38, 2026-08-29.*

---

## Verification (self-check, then ship)

- Attribution line shows on idle, results, desktop share, mobile share, and gate;
  all three links work (site, mailto, Bandcamp); envelope matches the icon style;
  one line on desktop, wraps cleanly on mobile, never overlaps a button.
- A long rally visibly speeds up after ~30s and resolves; early rallies feel
  unchanged; the ramp resets each serve. `git diff --stat main -- v3/engine/`
  empty (ramp is app-side).
- Results matches the mockup: gained claim (left) with the travelling sweep +
  haiku (right); PLAY AGAIN left, timeline(240px)+save+share right; reveal
  timing intact; scrubber/save/share still work; reduced-motion holds the sweep.
- Duration copy: a ~90s game reads "1.5 minutes of calm, gained"; a ~45s game
  reads "45 seconds of calm, gained".
- `node v3/build.js` twice byte-identical. Desktop full game start→finish, no
  regressions, no console errors.
- Then **merge to `main` (`--no-ff`), push, and reply with the live URL.**
