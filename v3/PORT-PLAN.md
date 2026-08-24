# PORT-PLAN.md — v3 App Port Roadmap

The engine and all three art surfaces live in `v3/engine/`, judged in the lab.
The live `index.html` at repo root is still v2 (single surface, old code). This
plan ports the v3 engine into a real product: the four designed screens, wired
to the engine, as one self-contained build.

## Dependencies — must be true before the port starts

1. **Chalkboard merged to `main`** (brief 17) — so all three surfaces exist in
   one place.
2. **Designs approved** in the Claude Design chat, HTML/CSS exported.
3. **DESIGN.md updated** with the design-delta (new tokens, surface selector,
   density scrubber, screen layouts, transitions) — committed to `main`.

Do not start the port briefs until all three hold. The design HTML/CSS is
attached to each port brief as the fidelity reference; briefs build against the
engine, never by pasting the design chat's standalone file.

## Build target — non-negotiable (from ARCHITECT.md / v3/CLAUDE.md)

- One self-contained file eventually; pure vanilla JS; no external libraries;
  no remote assets. Engine modules are the source of truth — the app consumes
  them, never copy-pastes them.
- Root `index.html` is not touched until the v3 app is proven; build the app on
  `feature/v3-app`, review screen-by-screen, merge when whole.
- Every visual value from DESIGN.md. Paddles are DOM divs. Canvas fixed
  1000×630, 48px radius.

## Brief sequence

Each is one brief, one review, same rhythm as the paint arc.

### Brief 18 — App shell + idle screen + surface selector + live doodle
The foundation. Screen-state machine (idle / playing / results). Engine wired
in. Idle screen with the intro card and the surface selector. The live
surface-aware doodle: a continuous idle simulation rendered through the selected
surface's renderer, continuing seamlessly when the surface is switched (re-render
existing stroke data through the new renderer, keep simulating — no reset). This
is the meatiest brief; the doodle is the hard part.

### Brief 19 — Idle doodle fixes
Doodle-only fixup pass on brief 18's idle screen: fixed-seed simulation, every
surface transition continues (none resets, paint included), chalk doodle in
colour (not mono), ball visible at all times, and the paint stroke morphing fix
(per-point width baked once at absolute arc length on append, never recomputed
as the stroke grows).

### Brief 20 — Playing screen
Score, live rally rendering through the chosen surface, density scrubber (product
control — tunes finished composition density, default ~37%), mute. Real ball
physics from the engine driving live trail accumulation.

### Brief 21 — Results / reveal screen
The reveal moment: finished artwork resolves (paint ground composites in at game
end — plain chosen colour or seeded patches). Save artwork, play again. Design
the transition per the approved design (hard cut / cross-fade / wipe).

### Brief 22 — Share page
The greenfield screen — how a finished piece is shown/shared outside the game.

### Brief 23 — Integration polish + audio + ship
Fold the screens into the final self-contained `index.html`, wire BGM/SFX (the
protected audio systems from root CLAUDE.md §4), full pass, then replace the live
root file. Ship.

## Notes

- Briefs 20–22 get fully specced once designs are approved — their layouts come
  from the mockups. Brief 18 is specced now because its foundation is largely
  design-independent.
- The density scrubber and ground-colour picker are the only lab-style controls
  that DO ship as product UI (calibration rule exception) — everything else
  frozen to constants.
