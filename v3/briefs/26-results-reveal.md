# Brief 26 — Results / Reveal Screen

The payoff. Continue on `feature/v3-app`. Docs to `main`.

Read: `v3/design/3-results-reveal.html` (the fidelity reference — it carries the
full motion spec and the slider primitives), `DESIGN.md` §8 Screen 3 / §10 /
§11 / §13, and `PAINT-MODE.md` §4.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/art-lab.html`
byte-identical to `main`. Root `index.html` untouched — but read it, it has two
things worth porting (Tasks 5 and 7).

---

## Task 0 — Two carry-over fixes from brief 25

Small, do them first.

1. **Mute is rendering as two buttons side by side.** It is one button with two
   icons; only the active one is visible. Hide the inactive icon
   (`display: none`), don't lay them out next to each other.
2. **Guardrails sit on the corner curve.** They're at `PAD_MIN - 2` (canvas y
   38) and `PAD_MAX + PH` (y 590), but the canvas `border-radius` is **48px**,
   so the frame's straight section only runs from y 48 to y 582. A horizontal
   8px bar cannot sit flush against a curve — that is the remaining
   misalignment. Move both pairs inward onto the straight section:

   | | Was | Now |
   |---|---|---|
   | Top marks | y `38` | y **`48`** |
   | Bottom marks | y `590` | y **`580`** |

   Derive from the canvas `border-radius` (48) and height, not literals. The
   mark is now ~8px off the true paddle limit; that's under 1.5% of canvas
   height and invisible as an affordance, whereas a bar overhanging a curve is
   not. Deliberate trade.

---

## Task 1 — Screen layout

Per `v3/design/3-results-reveal.html` and `DESIGN.md` §8 Screen 3.

```
logo (white, inline SVG, 98x19 — same reduced size as playing)
24px
canvas 1000x630, 48px radius, 8px #888888 frame
  no paddles, no ball, no guardrails, no serve dot
32px
haiku          DM Serif italic 14px #C5C5C5, centred
24px
#post-row (1000px, space-between)
  LEFT:  #timeline-chip
  RIGHT: [SAVE ARTWORK] [SHARE] [PLAY AGAIN]   .rbtn, gap 16px
```

Results is taller than playing by roughly 60px. Apply brief 25's fit approach;
if it doesn't clear 1:1 on a 13", the uniform whole-`.screen` `scale()`
fallback handles it. Do not reintroduce `max-width` compression.

---

## Task 2 — The reveal

`DESIGN.md` §13 and the design file agree; take the design file's timings
verbatim:

| Step | Timing |
|---|---|
| Paddles, ball, score, guardrails leave | on the final frame, no fade |
| Ground wipes in downward behind the marks | 900ms linear (`clip-path: inset(0 0 100% 0)` → `inset(0)`) |
| Committed strokes go to 100% opacity | with the wipe |
| Haiku fades in | 400ms, starting 1300ms |
| `#post-row` fades in | 400ms, starting 1700ms |

**Marks never move or re-draw.** The strokes layer from brief 24 is already
final pixels — the ground composites *underneath* it. That layer split exists
for exactly this; do not re-render strokes through a different path.

**Only paint has a ground to reveal.** Paper and chalkboard were already on
their real ground during play, so for those two the reveal is: chrome leaves,
strokes come to 100%, haiku and controls arrive on the same timings. No wipe,
no ground swap. Don't fake one.

---

## Task 3 — The paint ground

`DESIGN.md` §2 flags the paint reveal ground UNRESOLVED and the design file
stands in `rgba(245,205,142,0.24)` amber. **Both are superseded — resolve it
here.** The ground is the engine's real one:

- **Plain mode** (`PAINT_DEFAULT_GROUND_MODE`): `buildPaintSurface(W, H, rng,
  palette.ground)` — `palette.ground` is Cream (`#F4EBD4`), the approved
  default from brief 21 / `PAINT-MODE.md` §3.
- Build it from the per-game seed, per `PAINT-MODE.md` §3.1 (LOCKED): the
  ground is seeded with the game and reads the committed stroke set. Do not
  give it an independent random source.

**No ground-colour picker this brief.** `PAINT-MODE.md` §3 says plain-mode
colour is user-chosen, but no approved screen has a control for it. Ship the
approved default; the control is a separate decision. Log it in `BACKLOG.md`.

**Patches mode is out of scope.** `buildPatchGround` exists and works, but
plain is the frozen default and adding a second ground path here doubles the
review surface. Note it as available for a later brief.

---

## Task 4 — Blotches at the reveal, and no second splatter pass

Brief 24 added live splatter during the rally. The lab also runs two
end-of-simulation passes over the finished stroke set. Decide once, here:

- **`buildIntersectionBlotches` — yes.** These are the compound wet-colour
  clusters where two strokes crossed, and they only make sense over a finished
  composition. They're a large part of why the lab tiles read the way they do.
  Build at the reveal from the finished strokes, the game palette, and a salted
  game-seed rng — the same call shape `art-lab.html` uses.
- **`buildSplatter` — no.** Live splatter already put marks on the canvas. A
  full density-placed pass on top would double the mark count and read as busy.

Blotches draw into the strokes layer, beneath nothing and above the ground,
before the wipe starts — so they're part of the finished image the wipe reveals,
not something that appears afterward.

**Flag at review.** This is the one aesthetic call in the brief that hasn't been
seen. If the finished canvas reads too busy, blotches come out; if it reads
sparse next to the lab, the splatter pass goes back in.

---

## Task 5 — Haiku

Port the `QUOTES` array from root `index.html` (~line 566) verbatim — ten
quotes, unchanged text and attributions.

Pick with the **per-game seed**, not `Math.random()`. A finished artwork must
reproduce identically, quote included, or the share page (brief 28) can't show
the same piece twice.

---

## Task 6 — Timeline scrubber

`#timeline-chip`, results only. Selects which frame of the accumulated painting
to keep — a property of the artwork, not a game control.

Primitives from the design file (`DESIGN.md` §10 lists them as UNRESOLVED; the
design file resolves them — use it):

```
track   320 x 4px, radius 4px, #383838
fill    #C5C5C5
thumb   16px circle, #FFF5E5, box-shadow 0 4px 24px rgba(0,0,0,0.29)
label   "TIMELINE", Space Mono 11px, 0.12em, uppercase, #C5C5C5
chip    .ctrl-chip, padding 0 16px, gap 16px
```

Behaviour: position maps to a stroke count — 100% is every committed stroke,
50% is the first half of the rally. Re-render the strokes layer with
`strokes[0..n]`. Default 100%, at the right end.

- Ground and blotches stay put; only strokes are clipped by the scrubber.
  (Blotches are placed from the *full* stroke set — recomputing them per
  scrubber position would make the control feel unstable and cost a rebuild
  per frame. Note the compromise in a comment.)
- Keyboard: arrow keys step one stroke, Home/End jump to the ends. Focus ring
  per browser default — `DESIGN.md` doesn't define one and this brief isn't
  the place to invent it.
- What SAVE and SHARE export is whatever the scrubber currently shows.

---

## Task 7 — Save artwork

`DESIGN.md` §11 — 2× PNG. Root `index.html` (~line 1249) has the working
implementation; port its geometry.

```
background   #383838
canvas area  PAD 32px margin, border-radius 96px (48 x2), ground + artwork
haiku        DM Serif italic 14px@2x, #C5C5C5, centred below
logo         below the haiku
```

**One deviation from §11, deliberately.** §11 and root both draw the logo as the
text string `| ZEN • PONG |`. The project's standing rule is that the logo is
**never** rendered as text — always the inline SVG. Render the SVG into the
export canvas instead (draw it via an offscreen image from a serialised SVG
blob, no remote asset). §11's text approach is stale; flag it as doc drift in
`BACKLOG.md`.

Filename `zen-pong-<seed>.png` — the seed, not a timestamp, so a saved file
names the artwork it actually is.

---

## Task 8 — Play again, and share

- **PLAY AGAIN** — back to a fresh game on the same surface: new seed, cleared
  canvas, score 0-0, level 1. Same path as brief 22's restart. Not back to idle.
- **SHARE** — render the button per the design, wired to nothing. Brief 28
  builds that screen. Leave a comment saying so; do not hide or disable it, the
  layout is being reviewed as a whole.

---

## Verification

- Play a full 3-point game on each surface and land on results. The reveal runs
  in order, on the specced timings.
- Paint: ground wipes downward beneath the marks; strokes are pixel-identical
  before and after the wipe — capture the last rally frame and the settled
  results frame and diff the stroke pixels.
- Paper and chalk: no wipe, no ground change, strokes come to full, haiku and
  controls arrive.
- Blotches present on paint. Screenshot a finished canvas next to a lab tile.
- Timeline scrubs strokes; 100% by default; SAVE exports what's shown.
- Save PNG matches §11's geometry, with the SVG logo, named by seed.
- Same seed → same haiku.
- Mute is one button. Guardrails sit on the straight edge at y 48 / 580.
- No scroll at 1280x800. `git diff --stat main -- v3/engine/ v3/labs/
  index.html` empty. No `Math.random()` outside the one seeded line.

## Done looks like

You win or lose, the game furniture drops away, and the ground pours in behind
your painting. A line of Dōgen fades up, then the controls. You scrub back
through the rally, find the moment you liked, and save it.
