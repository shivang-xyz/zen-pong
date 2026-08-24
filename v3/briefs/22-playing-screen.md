# Brief 22 — Playing Screen

The rally, for real. Continue on `feature/v3-app`. Docs to `main`.

Read first, in full: `PORT-PLAN.md` (the arc and the hard build constraints),
`v3/CLAUDE.md` (engineering contract), the approved design
`v3/design/2-playing.html`, and `DESIGN.md` §7/§8 Screen 2/§10. Every visual
value comes from `DESIGN.md` — never guess a colour, radius, or gap.

Brief 18 built the shell and the idle screen; briefs 19–21 fixed the idle
doodle and it is approved. `screen-playing` is still a labelled stub. This
brief replaces it with the real game.

**Scope discipline.** Do not touch the idle screen, the surface selector, the
intro card, or the doodle. Do not touch `v3/labs/art-lab.html`. Do not modify
any file in `v3/engine/` — this brief is a pure consumer of the engine as it
stands on `main`. Root `index.html` stays untouched. If you believe an engine
change is genuinely required, stop and flag it rather than making it.

---

## Task 1 — One paint stroke renderer for the whole product

Do this first; Task 4 depends on it and it is the only architectural decision
in this brief.

Briefs 19 and 20 established that a *growing* paint stroke cannot be drawn by
`paint.js`'s `renderPaintStroke`: that function derives each sample's width
from the stroke's current total arc length, which changes every frame, so the
ribbon rewrites itself continuously and then snaps at commit. The doodle's fix
was `drawPaintRibbon` + the bake-on-append helpers (`startBallTrail`,
`appendBallPoint`, `paintWidthMultAt`) — one renderer for a stroke's whole
life, driven by pre-baked per-point `.w`.

The live game has the identical problem, plus a worse consequence. `DESIGN.md`
§13 states the reveal's contract explicitly: **"Marks never move or re-draw."**
If the rally is drawn one way and the finished artwork re-rendered another, the
painting changes shape at the exact moment it is revealed. That is not
acceptable and it is not fixable later.

**Do:**
- Generalise the existing doodle helpers in `v3/app/index.html` into one
  shared, parameterised path used by *every* paint stroke the app draws —
  idle doodle, live rally, and (from brief 23) the finished artwork.
- The only thing that varies between consumers is the width base:
  the doodle keeps `DOODLE_PAINT_WIDTH_BASE = 3.0` and its 0.15–2.2 variation
  range (brief 20, approved by eye); the **game** uses `paint.js`'s frozen
  product constants — `PAINT_WIDTH_BASE` 6.0 and the full 0.15–4.0 variation
  from `PAINT_DEFAULT_WIDTH_VARIATION` (brief 16, approved 2026-07-21).
  Import those; do not re-declare the numbers in the app.
- Verify by construction, not by inspection: it must be impossible for a paint
  stroke to be drawn by two different functions at two points in its life.

**Do not** move this into `v3/engine/paint.js` in this brief. It is engine-grade
logic and it will eventually belong there, but promoting it means touching a
frozen, merged engine file and re-verifying paper and paint hashes, which is
not this brief's job. It is logged in `BACKLOG.md` for the brief-25 integration
pass. Keep it in the app, keep it clean enough to move.

## Task 2 — Screen chrome and layout

Per `v3/design/2-playing.html` and `DESIGN.md` §8 Screen 2. Reuse the app's
existing tokens and `.ctrl-chip`; add nothing bespoke.

```
logo (white fill, inline SVG — never text)
24px
canvas 1000×630, 48px radius, 8px #888888 frame ring, DOM paddles
24px
#ctrl-row — 3-column grid, 1000px wide
  LEFT:   #pal-pill    (Task 5)
  CENTRE: #score-pill  0 · 3, Space Mono 700 18px #FFFFFF, gap 32px, min-width 120px
  RIGHT:  #restart-pill  #mute-pill   gap 16px
```

- The **surface selector does not appear here.** Surface is chosen at idle and
  locked for the rally. Carry the idle screen's current selection into the game.
- Paddles are DOM divs (`DESIGN.md` §12 rule 4/5): left pink with the "you"
  label, right blue, dots hanging into the dark area. Reuse the idle markup.
- The playing screen keeps the same vertical centering treatment brief 20 gave
  the idle screen — the cluster reads as one centred unit, not top-anchored.
- Serve indicator: grey `#888888` ball outside the canvas top-left, shown
  between points while the next ball is pending (`DESIGN.md` §7). It is not
  shown while a ball is in flight.

## Task 3 — The game loop

Port the live game's loop faithfully from `v3/engine/simulate.js` and root
`index.html`. `simulate.js` is the reference for the *bookkeeping the engine
deliberately leaves to its caller* — read its header comment before starting; it
documents its own known deviations from `index.html` and which ones are
artifacts of being headless.

- **Left paddle: mouse-driven.** Clamp to `PAD_MIN`/`PAD_MAX` from `physics.js`.
  Compute `padVelL` as this frame's delta and pass it into `advanceBall` — the
  paddle-velocity spin transfer in `sweptHit` is a core physics behaviour, not
  a detail.
- **Right paddle: AI.** `pickTargetY(balls, 'R')` + `updatePaddleAI`. Use real
  wall-clock time for the jitter term, matching root `index.html`
  (`Math.sin(Date.now() * 0.002) * 3`) — `simulate.js`'s `tVirtual` exists only
  because a headless sim has no wall clock, and its `PHASE_OFFSET_L` /
  `REACTION_DELAY_FRAMES` apply only to its player *stand-in*. Neither belongs
  in the live game. Note this in a comment so the next reader doesn't "fix" it.
- **Scoring and difficulty:** `WIN = 3` from `physics.js`. Replicate
  `simulate.js`'s `checkLevel` exactly — every 2 total points, `lv++`,
  `aiSpd = Math.min(2.6 + lv * 0.40, 7.5)`, `levelUp(balls)`. One ball at a
  time (`MAX_B = 1`), as in the live build.
- **Stroke commits** fire on exactly the same events as the engine: paddle hit,
  wall hit, score, and 500-point overflow. Colour advances per commit through
  the active surface's palette (Task 5).
- **Ball out of play** (`x < -30` / `x > W + 30`): commit, score, then a short
  serve beat with the serve indicator showing before the next ball spawns.
  Keep the beat brief — this is a rally game, not a menu.
- **Win** (`ps >= WIN || as >= WIN`): commit the in-flight stroke as `gameEnd`,
  then transition to the results screen, which stays a stub this brief. Hand it
  the finished stroke data and the game seed (Task 6) — brief 23 builds the
  reveal on top of exactly that handoff, so get the shape of it right now even
  though nothing consumes it yet.

## Task 4 — Live rally rendering, per surface

Same persistent-canvas architecture the doodle already uses and the same one
root `index.html` uses: an offscreen canvas holds ground + all committed
strokes, never cleared except on a new game; the in-flight stroke and the ball
are drawn on top each frame.

**Per-surface ground during play — read this carefully, it is easy to get
wrong by reusing the doodle's code:**

| Surface | Ground during play |
|---|---|
| Paper | `buildSurface` — the real paper ground |
| Chalkboard | `buildChalkboardSurface` — the real board |
| Paint | **Neutral substrate, not the paint ground** |

Paint is the exception and it is deliberate. `PAINT-MODE.md` §4 (LOCKED):
"The ground does not exist during play. The player paints on a neutral
substrate; at game end the artwork re-renders with the ground composited
beneath the marks." The neutral substrate is `--color-canvas-paint-base`
(`DESIGN.md` §2) = `#FFF5E5`, i.e. the paper ground. The chosen paint ground
composites in at the reveal — brief 23's job, not this one.

The doodle's `brightness(2.4) grayscale(1)` filter on the chalk ground is a
**doodle-only** presentational hack (briefs 20 and 21). Decide deliberately
whether the live game needs it at all: the doodle is behind a card at ambient
scale, the game is the foreground. Whatever you choose, do not silently
inherit it — state the decision in a comment.

## Task 5 — `#pal-pill` on the playing screen

The design's own source comment is the spec's first line: **"Dot count is
per-surface and VARIABLE — never assume five."** The pill shows the active
surface's real palette:

| Surface | Source | Dots |
|---|---|---|
| Paper | `DEFAULT_PALETTE` (`simulate.js`) | 5 |
| Chalkboard | `CHALK_PALETTE` (`chalkboard.js`) | 3 |
| Paint | the three accents from `buildPalette` | 3 |

**Shuffle** re-rolls the palette **and re-renders the whole painting** through
the new colours — the same restyle-of-identical-geometry architecture the
surface switch already proves out. Committed strokes keep their geometry and
change only their colour. The alternative (new colours from the next stroke
onward) produces a two-palette painting and makes the control read as broken;
rejected.

What "re-roll" means differs by surface, and that asymmetry is honest rather
than a bug to paper over:

- **Paint** — draw a new scheme and base index via `buildPalette` off a fresh
  salt. Genuinely new accents from the curated hue library. Keep the ground
  fixed; ground is a separate control (`PAINT-MODE.md` §3, plain mode) and is
  not part of shuffle.
- **Paper / chalkboard** — the palettes are fixed, approved lists, so shuffle
  re-rolls the *assignment order* across strokes, not the hexes. Never generate
  a colour; `PAINT-MODE.md` §2 is LOCKED on this for the whole product, and the
  paper/chalk palettes are equally hand-picked.

**Performance is a real risk here, not a hypothetical.** A full re-render at
end-of-game stroke counts runs the chalk and paint per-stroke offscreen work
hundreds of times; brief 18 already flagged this at *idle* counts. Measure it
on a full 3-point rally. If a shuffle stalls the frame visibly, say so in the
session and fall back to re-rendering asynchronously or to next-stroke-onward,
rather than shipping a control that hitches the game. Report what you measured.

## Task 6 — Per-game seed

Every rng stream in a game run derives from one per-game seed, generated once
at game start. This is not optional bookkeeping — `PAINT-MODE.md` §3.1 (LOCKED)
requires the patch ground to be driven by the same seed as the game, and the
save/share screens (briefs 23–24) need a finished artwork to be reproducible.

- One seed in, `makeRng` streams out — physics, palette, ground texture — each
  a distinct fixed salt off it, exactly as the doodle does with `DOODLE_SEED`.
- No `Math.random()` anywhere in the render or physics path. (The seed's own
  generation at game start is the one permitted use; keep it to that one line
  and comment it.)
- Carry the seed with the stroke data into the results handoff.

## Task 7 — Restart and mute

- **Restart** — abandon the current game, return to a fresh playing state:
  new seed, cleared canvas, score 0–0, level 1. Same surface. It does not
  return to idle.
- **Mute** — toggles BGM. Brief 18 already wired the protected `startBGM` /
  `stopBGM` pattern (root `CLAUDE.md` §4 — `new Audio()` +
  `createMediaElementSource()`, never fetch+decodeAudioData). BGM should
  continue across idle → playing rather than fading out; brief 18's stub
  `btn-playing-back` fade-down is scaffolding and should go.
- **Paddle-hit SFX is out of scope** — `PORT-PLAN.md` puts full audio in brief
  25. When it lands, root `CLAUDE.md` §4 is binding: the chalk SFX fires
  exactly once per paddle hit, inside the paddle-hit branch, never on a frame
  clock. Do not add it early and do not add a frame-clock placeholder.

---

## Verification

- A full 3-point game is playable end to end on all three surfaces: mouse
  paddle responds, AI plays, score increments, level scaling kicks in, win
  transitions to the results stub.
- Trails accumulate persistently and are never cleared mid-game.
- Paint: no shape change at commit or bounce, at product width — screen-record
  a rally to confirm. Paint plays on the neutral substrate, not a coloured
  ground.
- Chalkboard and paper render through their real engine grounds.
- `#pal-pill` shows the correct dot count per surface (5 / 3 / 3) and shuffle
  restyles the whole painting. Report the measured re-render cost at end-game
  stroke counts.
- Restart resets cleanly; mute toggles BGM; BGM survives idle → playing.
- Same seed reproduces the same rally given the same paddle input — spot-check
  by seeding two runs identically with the mouse held still.
- `v3/engine/` byte-identical to `main`. No `Math.random()` in the physics or
  render path. Paper still deterministic in the lab. Root `index.html`
  untouched. No external libraries, no remote assets, inline SVG logo.

## Done looks like

You press space on idle, pick a surface, and play a real game of pong that
paints itself in that medium — score climbing, ball speeding up, trail
thickening into something worth keeping — and the last frame of the rally is
exactly the painting the reveal will show.
