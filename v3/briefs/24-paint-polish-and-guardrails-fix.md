# Brief 24 — Paint Polish + Guardrail Fix

Second review pass on the playing screen. Continue on `feature/v3-app`. Docs to
`main`. Six changes.

Renumber `PORT-PLAN.md`: results/reveal → 25, share → 26, integration + ship → 27.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/art-lab.html`
stay byte-identical to `main`. Root `index.html` untouched.

Tasks 2, 3, 4 and 6 all touch the paint render path. Read them together before
writing code — Task 6's splatter draws into the layer Task 4 creates.

---

## Task 1 — Guardrails: contain them in the frame, make them lighter

Brief 23 built the marks 16px long spanning canvas x `0` → `16`, in `#888888`.
The frame ring only covers the outer 8px, so the other 8px pokes into the cream
and reads as the frame breaking into the canvas. Wrong.

**The mark must sit entirely within the 8px frame border. No part of it enters
the cream, no part of it enters the dark page area.** It is a lighter tick
*on* the frame, not a notch *through* it.

Measured off Shivang's reference image:

| Property | Value |
|---|---|
| Colour | `#C5C5C5` — `--color-lightest-grey`, deliberately lighter than the `#888888` frame it sits on |
| Height | `2px` |
| Length | `8px` — exactly the frame border's thickness |
| Left marks | span canvas x `0` → `8` |
| Right marks | span canvas x `992` → `1000` |
| Top y | `PAD_MIN - 2` |
| Bottom y | `PAD_MAX + PH` |

The contrast comes entirely from tone: a light grey tick on the mid-grey frame.
That is what Shivang's "much lighter grey for it to stand out" meant, and it is
why brief 23's `#888888` was invisible — same colour as the thing it sat on.

**Z-order matters here.** The frame ring is `z-index: 2`. These marks paint on
top of it, so they need to be above it — same layer as the paddles
(`z-index: 3`). If they land under the frame they will not be visible at all.

Everything else from brief 23 Task 1 stands: positions derived from
`physics.js` constants (`PAD_MIN`, `PAD_MAX`, `PH`, `CR`), DOM chrome, never
drawn into the persistent artwork canvas, playing screen only.

---

## Task 2 — Paint strokes thinner again

Brief 23 cut the max width 60% (`GAME_PAINT_WIDTH_VAR_MAX` 4.0 → 1.6, worst
case 23.0px). Still too heavy. This time cut the **base**, not the range.

Introduce `GAME_PAINT_WIDTH_BASE = 3.5`, app-side, and use it instead of
`paint.js`'s imported `PAINT_WIDTH_BASE` (6.0) in the game's
`renderGameStrokeAs` call.

```
new worst case:  ball.wt(2.4) × 3.5 × 1.6 = 13.4px   (was 23.0px)
```

Tune by eye and report the shipped value. Reference point worth knowing: the
lab's own BASE WIDTH slider currently sits at **4.5**, not the 6.0 frozen in
`paint.js` — so the engine's frozen constant is already out of step with where
the lab was last judged. That is more evidence for the divergence brief 23
recorded, not a reason to hesitate.

`GAME_PAINT_WIDTH_BASE` joins `GAME_PAINT_WIDTH_VAR_MIN/MAX` as a product
value that deliberately differs from `paint.js`. Same comment treatment; add it
to the same `BACKLOG.md` reconciliation item. Do not touch `paint.js`.

---

## Task 3 — Kill the taper, use a gap instead

**Remove the emergence taper entirely.** Brief 23's `PAINT_TAPER_LEN` /
`smoothstep` factor inside `drawPaintRibbon` comes out — both ends, doodle and
game. It solved the ball-visibility problem but at the cost of making every
single stroke thin-at-both-ends, which is exactly the uniformity Task 4 of
brief 23 was trying to break. A stroke should be allowed to just start and stop
at full width.

**Replace it with a gap.** When drawing the **live, growing** stroke, don't
draw the last few pixels of it. The ball sits in that gap, clear of the ink,
reading as the head of the stroke rather than a lump inside it.

- `PAINT_BALL_GAP = 10` px of arc length, measured back from the ball. Starting
  value — tune by eye and report.
- Live render only. The committed stroke is drawn complete.
- Implement by trimming the tail for the draw call, not by mutating `ball.pts`.
  The baked per-point `.w` values and the stroke's own data are untouched.
- Paint only. Paper and chalk are thin enough that the ball already reads.

**What changes at commit, and why it's fine.** At the frame a stroke commits,
the gap fills in — the last ~10px of ink appears. Nothing that was already
drawn moves or changes width; the stroke only completes. That is a different
thing from brief 20's pop, where committed strokes were re-rendered by a second
algorithm and visibly changed shape. Note this distinction in a comment so
nobody later "fixes" the gap by baking it in.

**Ball colour in paint mode: solid black.** Use `INK_HEX` (`#16120E`) from
`palette.js` — the system's locked near-black, and already the paint palette's
ink slot, so it is not a new colour. Paint only; paper and chalk keep the
current stroke-coloured ball.

Between the gap and the black ball, the ball should be unmistakable on every
paint stroke regardless of that stroke's width or colour.

---

## Task 4 — Committed strokes dim during play, full at the end

Make the live stroke easier to follow: everything already laid down sits back,
the stroke being drawn right now is at full strength.

| State | Committed strokes | Live stroke |
|---|---|---|
| Playing | **70%** opacity | 100% |
| Game over | 100% | — |

All three surfaces, one mechanism.

**Build it as a layer split, not a per-stroke alpha.** Right now
`gamePersistCv` holds ground and committed strokes composited together. Split
it into two offscreen canvases:

- `groundCv` — the surface ground, opaque.
- `strokesCv` — committed strokes only, transparent background.

Per frame: draw `groundCv` at alpha 1.0, then `strokesCv` at the current dim
alpha, then the live stroke at 1.0, then the ball.

Two reasons this is the right shape rather than dimming each stroke as it is
committed:

1. Per-stroke alpha double-darkens wherever strokes overlap, so a busy area
   goes muddy rather than evenly dimmed. Compositing the whole layer once
   doesn't.
2. Going to 100% at game end becomes a one-line alpha change instead of a full
   re-render — and brief 25's reveal needs exactly this split anyway, since the
   paint ground has to composite in *underneath* the marks. Build the seam now
   rather than unpicking `gamePersistCv` next brief.

70% is a starting value. Tune and report.

---

## Task 5 — Paint palette pill shows 5, not 3

The paint `#pal-pill` shows 3 dots. The lab shows 5 per artwork, and the lab is
right: a finished paint piece has five colour slots (`PAINT-MODE.md` §2.3) —
ground, ink, and three accents. Show all five, in that order:

```
palette.ground · palette.ink · accent A · accent B · accent C
```

**Stroke colours do not change.** The rally keeps cycling the three accents,
which is what `art-lab.html`'s `weightedPaletteArray` does and what has been
approved in every paint review. The ink appears in the artwork as splatter and
blotch colour, which brief 25 composites at the reveal — the pill is showing
the artwork's palette, not the stroke cycle.

Shuffle behaviour is unchanged: it re-rolls the scheme, so the three accent
dots change and ground and ink hold.

Worth flagging: `PAINT-MODE.md` §2.2 says the ink is the *line* colour ("every
reference in the restrained family uses a near-black line"). The lab has always
drawn lines in accents and ink only in splatter, and that is what has been
approved through six briefs. Live code wins, per `ARCHITECT.md`; logging it as
doc drift rather than changing either one now.

---

## Task 6 — Live splatter in the game

The lab's paint artworks carry splatter — irregular drops and flung teardrops
with satellites — and none of it appears in the game. `buildSplatter` and
`buildIntersectionBlotches` are never called by `v3/app/index.html`.

**What's wanted.** Marks that aren't part of the trail at all. Occasionally,
mid-rally, the ball throws off ink that just lands on the canvas — a drop, or a
flung streak — separate from the line it is drawing. Rare enough to feel like
an event, not decoration.

### Emit live and mid-flight, never on a hit

This is the part to get right. `buildSplatter`'s own header comment records why
it is density-placed rather than event-triggered: brief 02's hit-triggered ink
bloom pinned every mark to the canvas edges, because paddle and wall hits are
always on the boundary. It was cut for exactly that. **Do not trigger splatter
on a paddle hit, wall hit, or score.** Emit it mid-flight, between bounces,
where the ball actually is.

This is also what `PAINT-MODE.md` §5 D already specifies and endorses —
physics-driven emission, "high spin → splatter burst, thrown perpendicular to
travel." That section has been the plan since brief 11 and has never been
built. Build it now.

### Trigger

Evaluate once per frame while a paint rally is in play:

- Probability scales with `|ball.spin|` and speed — a fast, spinning ball
  sheds ink; a slow straight one doesn't.
- Hard cooldown of at least ~40 frames between marks, plus a per-game cap.
- Target **3–8 marks per 3-point game**. Tune by eye and report the rate you
  actually observed, not the constant you set — the two will differ.

### Placement

Offset the mark from the ball **perpendicular to travel**, far enough that it
lands clear of the trail — this is ink leaving the brush, not ink on the line.
Randomise which side, and the distance. A mark that lands on top of the stroke
reads as a blob in the line and defeats the point.

### Marks

Construct the descriptors app-side and hand them to the engine's exported
`renderSplatterMark(ctx, mark)`. Its shapes, from `splatter.js`:

```
{ type:'drop',  x, y, r, irregularity, seedAngle, colorHex }
{ type:'flung', x, y, dx, dy, headR, length, colorHex, satellites:[{x,y,r}] }
```

- Roughly 60/40 drops to flung, matching the lab's `FLUNG_RATIO` of 0.4.
- High spin favours `flung`, oriented perpendicular to travel. Otherwise `drop`.
- **Scale the sizes down.** The engine's ranges (`DROP_R` 4–20, `FLUNG_LEN`
  26–60, `HEAD_R` 7–15) were sized against a 24px-wide stroke. The game's
  widest stroke is now ~13px, so splatter at lab sizes would dwarf the
  painting. Start at ~0.58× — `DROP_R` 2.5–12, `FLUNG_LEN` 15–35, `HEAD_R`
  4–9 — and tune. These constants are private in `splatter.js` and not
  exported, so they get mirrored app-side, same pattern and same
  `BACKLOG.md` reconciliation item as the width constants.
- **Colour:** ink at weight 0.15 alongside the three accents at their own
  weights — `splatterColorWeights`' shape, which is also private. Mirror it and
  use `weightedPick` from `rng.js`, which *is* exported. The ink weighting is
  what puts occasional black marks on the canvas, and it is the reason the
  lab's artworks read the way they do.
- Own rng stream, salted off the per-game seed like every other stream.

### Where it draws

Splatter is artwork, not chrome — it goes into `strokesCv` (Task 4), so it dims
with everything else during play and comes up to full at game end.

### Note for brief 25

The reveal may also want the lab's density-placed `buildSplatter` /
`buildIntersectionBlotches` over the finished stroke set. **Do not add that
here**, and flag it in the brief-25 handoff: if the reveal adds a full
density-placed pass on top of live splatter, the canvas gets both and will be
too busy. That is a decision for the reveal brief, made knowing live splatter
already exists.

---

## Verification

- Guardrails: `#C5C5C5`, 2px tall, 8px long, sitting entirely on the frame
  border — nothing in the cream, nothing in the dark. Screenshot a corner and
  compare against the reference.
- Widest paint stroke ≈13px. State the shipped `GAME_PAINT_WIDTH_BASE`.
- No taper anywhere — grep confirms `PAINT_TAPER_LEN` and the smoothstep factor
  are gone. Strokes start and end at their own width.
- The ball is solid black in paint and clearly separated from its trail at all
  times. Screen-record a rally.
- Committed strokes visibly sit back during play on all three surfaces, and
  snap to full at game end. Confirm no double-darkening at stroke crossings.
- Paint pill shows 5 dots, ground and ink first. Shuffle changes the last
  three only.
- Splatter: 3–8 marks over a full game, none at a paddle or wall contact point,
  all sitting clear of the trail, sized against the new stroke width. Report the
  observed count and post a screenshot of a finished paint canvas.
- Idle doodle still runs and switches surfaces cleanly (it shares the paint
  path — Tasks 2 and 3 affect it). Splatter is game-only; the doodle stays as
  it is.
- `git diff --stat main -- v3/engine/ v3/labs/ index.html` empty. No new
  `Math.random()`.

## Done looks like

A rally that's easy to read: black ball leading a clean gap, strokes that are
each their own weight instead of all tapering the same way, older marks sitting
back so the live line stands out, four light ticks on the frame showing exactly
how far the paddle reaches — and every so often, a drop of ink flung off the
ball that lands somewhere on its own.
