# Brief 23 — Paint Stroke Character + Paddle Guardrails

Review pass on brief 22's playing screen. Continue on `feature/v3-app`. Docs to
`main`. Four changes: one piece of UI chrome, three to how paint draws.

Renumber the port sequence in `PORT-PLAN.md`: results/reveal → 24, share → 25,
integration polish + audio + ship → 26.

**Scope.** `v3/app/index.html` only. `v3/engine/` stays byte-identical to
`main` — Task 2 in particular is a change to values that also exist inside
`paint.js`, and it is deliberately made app-side only; read that task's note
before touching anything. Do not touch `v3/labs/art-lab.html`. Root
`index.html` untouched.

Tasks 2, 3 and 4 all modify the same shared paint machinery
(`makePaintTracker`, `drawPaintRibbon`). Read all three before writing any
code — they compose, and doing them in isolation will produce three
overlapping rewrites of the same twenty lines.

---

## Task 1 — Paddle travel guardrails

**Problem.** The canvas has 48px rounded corners and the paddle travels only in
the straight section (`PAD_MIN = CR = 40` to `PAD_MAX = H - CR - PH = 526`).
Nothing on screen tells the player where the paddle stops and the wall begins,
so a ball heading into the corner region is unreadable — the player can't tell
whether it's a shot they can reach or a bounce they can't.

The live v2 build has this affordance already: `drawSlits()` in root
`index.html` (~line 1033), four 3×16px rounded marks at `PAD_MIN - sh` and
`PAD_MAX + PH` on both sides, `rgba(100,95,88,0.50)`. **Take its positions,
not its treatment.** Shivang's call for v3 is a simpler 2px grey line.

**Build — exact geometry, canvas coordinate space (1000 × 630):**

| Mark | x | y | w | h |
|---|---|---|---|---|
| top-left | `0` | `38` | `16` | `2` |
| bottom-left | `0` | `590` | `16` | `2` |
| top-right | `984` | `38` | `16` | `2` |
| bottom-right | `984` | `590` | `16` | `2` |

- `y = 38` is `PAD_MIN - 2` — the mark sits flush above the paddle's highest
  position, so the paddle never covers it. `y = 590` is `PAD_MAX + PH` — flush
  below the paddle's lowest bottom edge. Derive both from the `physics.js`
  constants, do not hardcode 38/590.
- Colour `#888888` — `--color-canvas-border`, the same grey as the frame ring.
  Full opacity, no radius, no shadow.
- Same on all three surfaces. `#888888` reads on cream and on the chalkboard's
  near-black; do not special-case per surface.

**These are chrome, not artwork — this is the part that is easy to get wrong.**
They must NOT be drawn into `gamePersistCv`. That canvas is the painting: the
save/share output (briefs 25, `DESIGN.md` §11) renders from it, and four grey
ticks baked into someone's artwork is a bug that will not surface until much
later. Build them as DOM divs inside `.stage`, consistent with
`DESIGN.md` §12 rule 4's treatment of paddles, above the canvas and below the
frame ring in z-order.

**Playing screen only.** Not idle (the idle paddles are static, so the
affordance means nothing there) and not results (`drawSlits` returns early on
results for the same reason — the game is over, the artwork is the subject).

---

## Task 2 — Paint stroke max width down 60%

The frozen product width is crowding the canvas. Current worst case:

```
ball.wt(max 2.4) × PAINT_WIDTH_BASE(6.0) × GAME_PAINT_WIDTH_VAR_MAX(4.0) = 57.6px
```

57.6px of ink on a 630px-tall canvas is a bar, not a brush stroke.

**Change `GAME_PAINT_WIDTH_VAR_MAX` from `4.0` to `1.6`** (`v3/app/index.html`
~line 866). New worst case:

```
2.4 × 6.0 × 1.6 = 23.04px   — a 60.0% reduction
```

`GAME_PAINT_WIDTH_VAR_MIN` stays `0.15` for now, giving a thinnest stroke of
`1.0 × 6.0 × 0.15 = 0.9px`. That may now read as a hairline rather than a brush
at the thin end, since the range it sits in has compressed. Tune it by eye
against a recorded rally and **report the final value** — this is a calibration
number, not a derived one.

**Why this is app-side and stays app-side.** `GAME_PAINT_WIDTH_VAR_MIN/MAX`
were introduced in brief 22 as a *mirror* of `paint.js`'s private
`WIDTH_VAR_MIN`/`WIDTH_VAR_MAX` (0.15/4.0), which carry a "do not change
(brief 15)" comment and are not exported. After this task they are no longer a
mirror — they deliberately diverge.

That divergence is real and it is the honest outcome, not a workaround.
`paint.js`'s 4.0 was approved at brief 14/16 in the lab, on twelve static
seeded artworks. It has now been seen for the first time in a live rally at
1000×630 with a moving ball, and it is wrong there. Shivang's eye on the real
product supersedes his eye on the lab tile.

So: change the app constant, **do not** change `paint.js`, and update the
comment block above the constants to say these are the *product* values and
that `paint.js`'s frozen pair is now superseded and pending reconciliation —
not that they mirror it. A future reader who sees "mirrors paint.js's private
range" next to a number that doesn't match will helpfully "fix" it back.
Add the reconciliation to the existing `BACKLOG.md` promotion item.

---

## Task 3 — The trail must emerge from the ball

**The observed problem.** In paint mode the ball is invisible. Its marker is
drawn in the same colour as the stroke it is laying, and at product width the
ribbon is several times the ball's diameter (`BR * 0.9` ≈ 5.4px radius), so the
ball is simply inside its own trail. The width undulating as the ball travels
makes it worse — there is no stable silhouette to track.

**The behaviour wanted.** The ink comes *out of* the ball. At the ball itself
the stroke is nothing; it widens to its full width over a short distance
behind. The ball is the wet tip of a brush and the trail is what it has already
laid down. Whether that stroke is thick or thin, it always begins at zero at
the ball, so the ball is always a clean solid dot with ink flowing out behind
it — never a lump inside a ribbon.

Same treatment at the stroke's other end, so a stroke is thin → full → thin
along its length rather than a ribbon with two blunt cut ends.

**Build.** Add an **emergence taper** — a second width multiplier, applied
inside `drawPaintRibbon` (~line 729), computed per point from its distance
along the polyline to the *nearer* end:

```
taper(d) = smoothstep(clamp(d / PAINT_TAPER_LEN, 0, 1))
halfW    = 0.5 * wt * bakedW * taper(distanceToNearerEnd)
```

- `PAINT_TAPER_LEN = 28` px — starting value, tune by eye and report.
- `smoothstep(t) = t * t * (3 - 2 * t)`. If the ball still reads soft against
  the ink at review, try `t * t` (stays thinner nearer the tip) before changing
  anything else. Report which you shipped.
- This is a **draw-time** factor, deliberately *not* baked into `.w`. The baked
  per-point width from brief 19/20 is untouched — the two multiply.

**Why this does not reintroduce brief 20's commit pop, which is the whole
question.** Brief 19 set the rule "a given physical point's width must be
constant across every frame it exists." This taper knowingly bends it, and the
bend is safe for a specific reason worth being precise about:

- The tail taper is measured back from the polyline's **last point**. While the
  stroke grows, that point is the ball, so the taper region travels with the
  ball and the ink behind it fills out to full width — which *is* the feature.
- At the frame the stroke commits, the polyline's last point becomes the
  stroke's permanent end. The live render on that frame and the committed
  render use the identical function over the identical array, so they produce
  identical pixels. **There is no discontinuity at commit** — the shape the
  player watched settle is exactly the shape that is kept.
- `DESIGN.md` §13's reveal contract ("marks never move or re-draw") therefore
  still holds: the finished artwork is pixel-identical to the last frame of the
  rally.

The width of a point is now a function of the stroke's live extent for a
bounded window (`PAINT_TAPER_LEN`) and permanently frozen after that. Say this
in a comment at the taper, in these terms. The next reader will otherwise
correctly identify it as the bug briefs 19 and 20 spent two sessions killing.

**The one seam, named.** The 500-point overflow commit (`v3/CLAUDE.md`'s
reference map — a commit point, ported faithfully, not up for change) splits
one continuous line into two strokes at an arbitrary boundary. Set
`taperTail: false` on an overflow commit and `taperHead: false` on its
continuation, so the line does not visibly pinch in the middle for no reason.
That does mean the last `PAINT_TAPER_LEN` px of the committed piece fills from
tapered to full over one frame at the seam. Accepted deliberately: it happens
only at a non-event boundary (~8s of unbroken travel, rare in a real rally), it
resolves outward into ink on a line that is continuing anyway, and the
alternative is a permanent pinch at a meaningless boundary. Flag it at review
if it turns out to be visible.

**Ball marker.** No colour or size change this brief. The taper is the fix; the
ball is already drawn after the live stroke, so it sits on clean ground.
If it still doesn't read at review, the fallback is a 1px ground-coloured ring,
not a different fill colour — but do not build that pre-emptively.

---

## Task 4 — Per-stroke width profiles, not one behaviour for every stroke

**The problem.** Every paint stroke currently gets the same treatment: a sine
undulation with a seeded phase and 0.5–1.5 cycles per 500px. So every stroke
wobbles the same way, and the composition reads as machine-made — the variety
is all in the *phase*, none in the *character*.

**What's wanted.** Strokes should differ from each other in kind, not just in
offset. Most strokes plain and even; some swelling and thinning within
themselves; some doing one confident thing across their whole length — starting
thick and finishing thin, or the reverse.

**Build.** In `makePaintTracker`'s `startTrail` (~line 670), seed a **profile
type** per stroke, store it on the ball alongside `_paintPhase` /
`_paintWavelength`, and branch on it in `widthMultAt`:

| Profile | Weight | Behaviour |
|---|---|---|
| `flat` | **0.40** | One constant multiplier for the whole stroke. No variation along its length. |
| `ramp` | **0.35** | Monotonic from `wA` to `wB` across `cfg.refLen` px of absolute arc length, clamped past it. Direction seeded 50/50 — thick→thin or thin→thick. |
| `wave` | **0.25** | The existing sine undulation, unchanged. |

Weights are calibration targets for Shivang's eye, not derived values — tune
and report what shipped. The intent behind them: the canvas should read as
mostly calm strokes, with enough character strokes to feel hand-made.

**Per-profile magnitudes** (multiplier space, within
`[GAME_PAINT_WIDTH_VAR_MIN, GAME_PAINT_WIDTH_VAR_MAX]`):

- `flat` — draw the constant from the **middle** of the range, roughly the
  0.35–0.80 band of it. A whole stroke pinned at the range floor is a hairline,
  and at the ceiling is a slab; neither is a stroke.
- `ramp` — draw both endpoints across the full range, then **enforce a minimum
  separation of ~0.4 of the range** and re-draw or push apart if they land too
  close. A ramp between two near-identical widths is just a `flat` that cost
  more, and you'd get a lot of them by chance.
- `wave` — unchanged.

**Determinism invariant — do not break this.** `startTrail` must draw a
**fixed number** of rng values on every call regardless of which profile is
selected: draw them all unconditionally, then branch on the results. The
existing comment on `paintWidthRng` explains why (the stream must not depend on
the player's surface-switching path, or the doodle's identical-geometry
guarantee across surfaces desyncs). A conditional draw inside a profile branch
silently breaks that, and it will not show up in any obvious way.

**This applies to the doodle too.** `makePaintTracker` is shared, by design
(brief 22 Task 1) — one mechanism, two configs. The idle screen's paint doodle
will therefore change appearance. That is correct and intended: it is the same
material, and forking the profile logic to keep the doodle frozen would
reintroduce exactly the two-algorithms problem brief 20 was spent eliminating.
Review the idle paint doodle alongside the game.

---

## Verification

- Guardrails: present at all four positions on the playing screen, on all three
  surfaces; derived from `PAD_MIN`/`PAD_MAX`/`PH`/`CR`, not hardcoded; absent
  on idle and results. **Confirm they do not appear in `gamePersistCv`** —
  export or inspect the persist canvas directly and check it is clean.
- Width: widest observed paint stroke measures ~23px, not ~58px. State the
  final `GAME_PAINT_WIDTH_VAR_MIN`.
- Taper: screen-record a paint rally. The ball is a clearly visible solid dot
  at all times with ink emerging behind it. No shape change at any commit —
  re-run brief 22's pixel-diff across a real commit event and confirm ~0
  changed pixels beyond the pre-existing jitter wiggle.
- Profiles: across one full 3-point rally, all three types are visibly present.
  Screenshot the finished paint artwork and state the observed rough mix.
- Idle paint doodle still runs, restyles across surface switches, and shows the
  new profiles.
- `git diff --stat main -- v3/engine/ v3/labs/ index.html` is empty. No
  `Math.random()` outside the one commented per-game seed line. Paper and chalk
  rendering unchanged on both screens.

## Done looks like

A rally you can actually read: the paddle's reach is obvious at a glance, the
ball is a bright point with paint flowing out behind it, and the finished
canvas is a set of strokes that look like a hand made them — some plain, some
swelling, some running thick to thin — instead of one brush repeating itself at
different offsets.
