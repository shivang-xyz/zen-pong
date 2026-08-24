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

### Brief 20 — Idle doodle fixes, round 2
Second doodle-only pass: paint stroke shape stability (no commit/bounce pop, one
renderer for a stroke's whole life, doodle-scoped max width — frozen product
constants untouched), accumulate-then-hard-reset density instead of a rolling
fade, chalkboard's real textured ground, canvas group centered in the viewport.

### Brief 21 — Idle doodle fixes, round 3
Third doodle-only pass: chalkboard ground's blue/denim cast neutralised
(doodle-side compositing fix — a flat brightness() lift was amplifying
chalkboard.js's own tiny, approved, near-invisible-at-native-brightness cool
tint; chalkboard.js itself untouched), paint doodle defaults to the approved
Cream ground (still the real palette.js scheme system for accents, not the
game palette), density threshold raised so the rally fills the canvas before
its clean reset.

### Brief 22 — Playing screen
Score, serve, mouse paddle + AI, live rally rendering through the chosen surface,
palette pill (per-surface, variable dot count) with shuffle, restart, mute. Real
ball physics from the engine driving live trail accumulation. One per-game seed
feeding every rng stream. Paint plays on the neutral substrate — its ground
composites in at the reveal (`PAINT-MODE.md` §4), not during play.

**No density or timeline control during play** — `DESIGN.md` §8 Screen 2, in as
many words, and the approved `v3/design/2-playing.html` has none in its control
row. An earlier version of this line listed a density scrubber here; it was
written before the design delta landed and is corrected (brief 21 review,
2026-08-24). Nothing about the painting is adjustable mid-rally.

### Brief 23 — Results / reveal screen
The reveal moment: finished artwork resolves (paint ground composites in at game
end — plain chosen colour or seeded patches). `#timeline-chip` (`DESIGN.md` §10)
— picks which frame of the accumulated painting to keep; this is a property of
the artwork, not a game control, which is why it lives here and not on playing.
Save artwork, share, play again. Transition per `DESIGN.md` §13 (900ms downward
ground wipe, marks never move or re-draw — binding on brief 22's renderer).

Blocked on three `DESIGN.md` UNRESOLVED items: the paint reveal ground tokens
(§2), the slider primitives for `#timeline-chip` (§10), and ratification of the
§13 motion spec. Resolve them before writing the brief.

### Brief 24 — Share page
The greenfield screen — how a finished piece is shown/shared outside the game.

### Brief 25 — Integration polish + audio + ship
Fold the screens into the final self-contained `index.html`, wire BGM/SFX (the
protected audio systems from root CLAUDE.md §4), full pass, then replace the live
root file. Ship.

## Notes

- Briefs 22–24 get fully specced once designs are approved — their layouts come
  from the mockups. Brief 18 is specced now because its foundation is largely
  design-independent.
- The surface selector (idle), the palette pill + shuffle (playing), the
  ground-colour picker and `#timeline-chip` (results) are the only controls that
  ship as product UI — the documented exception to `v3/CLAUDE.md`'s lab-controls
  rule. Everything else is frozen to constants.
- The **lab's density scrubber currently ships nowhere.** This note previously
  claimed it was a product control; the approved designs place no density
  control on any screen. If it is still wanted it needs its own decision and its
  own screen — not an assumption carried forward here. *(Corrected brief 21
  review, 2026-08-24.)*
