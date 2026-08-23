# Zen Pong — UI Design Brief Context

Hand this to the UI design chat cold. It has none of the build history; this
doc is its entire briefing. It designs screens, not engine — the art system is
done and is an input to the UI, not something the UI chat touches.

---

## 1. What Zen Pong is

A generative art game. Two paddles, a ball; the ball's trail accumulates into a
painting as you play. The pong is the hook, the artwork is the point — the game
is the brush, the finished piece is why people come back. The whole product
exists to remove the anxiety from making art: the ball is responsible for the
outcome, not the player.

Tone: calm, intentional, still. Not arcade, not gamified. No neon, no pixel
fonts, no score-dominant HUD, no juice-for-juice's-sake.

## 2. What already exists (do not redesign)

- **Visual language** — fully specified in `DESIGN.md`: colour tokens,
  typography (self-hosted Basier Circle), 4pt spacing grid, radii, the
  `.ctrl-chip` control elevation, exact canvas/paddle/ball dimensions. Treat
  `DESIGN.md` as law. Every colour, font, radius, spacing value comes from it —
  never invent one.
- **Three game states** — idle, playing, results. `DESIGN.md` §8 already lays
  out all three screens for the *current* single-surface game. Your job extends
  these, it does not start from zero.
- **The art engine** — three surfaces exist and are locked: **paper**,
  **chalkboard**, **paint**. Each renders a different painting from the same
  rally. The UI's job includes letting the player choose a surface and revealing
  the finished artwork.

## 3. What the UI work must deliver

The v3 engine (3 surfaces) has never been dressed in real product screens — the
live game is still the old single-surface v2. Design the screens for the full
v3 product:

1. **Idle / start screen** — intro, the surface selector (paper / chalkboard /
   paint), start affordance. `DESIGN.md` §8 Screen 1 is the current baseline;
   the new element is surface selection.
2. **Playing screen** — score, the density scrubber (lets the player tune how
   dense the finished painting is — essential, since longer games overshoot the
   good composition zone), mute. `DESIGN.md` §8 Screen 2 is the baseline.
3. **Results / reveal screen** — the finished artwork revealed (in paint mode
   the coloured ground composites in at game end — the "reveal"), plus save and
   play-again. `DESIGN.md` §8 Screen 3 is the baseline.
4. **Share page** — how a finished piece is shown/shared outside the game. Only
   a rough spec exists; this is the greenfield screen.

## 4. Hard product principles (reject anything that violates these)

Every feature must serve one of: quality of the artwork, joy of the game, or
the ability to share what you made. If it serves none, cut it.

Explicitly rejected — do not design these in: levels, XP, streaks, achievements,
leaderboards, accounts, multiplayer, a gallery. They import the anxiety the
product exists to remove.

## 5. Surface selector — the one genuinely new decision

Three surfaces need a selector on the idle screen. Open design question for you
to solve: does the player see a live preview of each surface, static swatches,
sample artworks, or names only? It must feel like choosing a material to paint
on, not picking a difficulty. Keep it calm — this is the first screen, it sets
the tone.

## 6. The reveal — a moment, not just a screen

At game end the artwork resolves: in paint mode a coloured ground appears
beneath the marks (either plain chosen colour or seeded random patches). This
transition is undesigned and is yours — hard cut, cross-fade, wipe? It's the
emotional peak of a session (the painting you didn't know you were making,
appearing). Treat it as the product's signature moment.

## 7. Constraints that will affect layout

- The game canvas is a fixed 1000×630 with a 48px radius and a grey frame ring
  (`DESIGN.md` §7/§9). Paddles are DOM divs outside the canvas edges, not drawn
  on it — layout must leave room for them.
- Page background is always `#383838`. Canvas ground is warm, never pure white.
- Everything is a single self-contained build eventually; design with that in
  mind but don't let it constrain the design thinking now.

## 8. Deliverable from the UI chat

Screen designs / mockups for idle (with surface selector), playing (with density
scrubber), results/reveal, and share — consistent with `DESIGN.md`, ready to
hand back to the build track to port into the live `index.html`. Flag any point
where a screen needs a `DESIGN.md` value that doesn't exist yet, rather than
inventing it.
