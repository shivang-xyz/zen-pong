# Brief 18 — App Shell + Idle Screen + Surface Selector + Live Doodle

First port brief. Read `PORT-PLAN.md` for the whole arc and the hard build
constraints. Read the approved idle-screen design (attached) and `DESIGN.md`
(updated) for every visual value.

**Dependencies must hold before starting:** chalkboard merged to `main` (brief
17), designs approved, DESIGN.md updated. If any is not true, stop and flag.

Build on a new branch `feature/v3-app` off `main`. Do NOT touch root
`index.html` yet — build the v3 app as a separate file (`v3/app/index.html` or
similar) until the whole product is proven. Docs to `main`.

---

## Task 1 — Screen-state machine

Three states only: `idle`, `playing`, `results` (per root game and DESIGN.md
§8). Build the state scaffold and transitions now; `playing`/`results` can be
stubs this brief — idle is what's built out here.

## Task 2 — Engine integration

Import the engine modules (`simulate.js`, the surface renderers `surface.js` /
`chalkboard.js` / `paint.js`, `palette.js`, `rng.js`, `physics.js`) into the
app. The app is a consumer — no engine code copied in. Confirm the app can
run a live simulation and render a stroke through each of the three surface
renderers.

## Task 3 — Idle screen

Per the approved design: intro card (inline SVG logo, never text — root CLAUDE.md
rule), tagline, start affordance (space / click / touch), and the surface
selector. All values from DESIGN.md. Page background `#383838`, canvas warm
cream, 48px radius, DOM paddles, grey frame ring.

## Task 4 — Surface selector

Three options: Paper / Chalkboard / Paint. Selecting one changes the live doodle
behind the card in real time (Task 5). Styling per the approved design's
component spec. This selector ships as product UI.

## Task 5 — Live surface-aware doodle (the hard part)

Replace the old paper-only idle doodle with a live simulation rendered through
the *selected* surface's renderer.

- A continuous idle simulation runs behind the intro card (ball + trail
  accumulating), same spirit as the live game's `startDoodle()` but rendered in
  the chosen surface's style — real paper/chalk/paint strokes, not a generic
  line.
- **Seamless surface switch:** on changing surface, do NOT reset. Re-render the
  already-committed stroke data through the new surface's renderer and continue
  simulating from the current ball state. Strokes are data; the surface is only
  how they're drawn. The persistent-canvas architecture supports this directly.
- Keep it calm and sparse — this is the first screen, it sets the tone. Cap
  accumulated strokes so it stays light and never turns into a dense end-game
  painting while idling (loop/fade or reset gently at a threshold).
- Performance note: chalk/paint renderers do per-stroke offscreen work built for
  static end-of-game render. At idle stroke counts this is fine; keep the cap
  low enough that a live re-render on surface switch stays smooth.

## Verification

- All three surfaces render live in the idle doodle and switch seamlessly with
  no reset and no visible stall.
- Engine modules unmodified (paper/chalk/paint still deterministic in the lab;
  hash paper against `main`).
- No external libraries, no remote assets, inline SVG logo.
- Every visual value traceable to DESIGN.md.
- Root `index.html` untouched.

## Done looks like

The idle screen from the approved design, live: pick Paper / Chalkboard / Paint
and watch the doodle behind the card redraw itself in that medium and keep going,
calm and sparse, ready to start a game.
