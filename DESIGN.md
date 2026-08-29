# Zen Pong — Design Specification

> Source of truth for all visual decisions.
> All values confirmed from Figma variable export + visual analysis.
> Reflects stable build: index.html (formerly zen_pong_v13.html)
> §§2/4/5/7/8/9/10/13 also carry v3 screen additions (surface selector,
> timeline scrubber, chalkboard/paint tokens, transitions) — v3 is not yet
> in the live build; items marked UNRESOLVED or ⚠ OPEN CONFLICT are
> proposals, not decisions.
> Last updated: 2026-08-24

---

## 1. Design Philosophy

Zen Pong is calm, minimal, and art-forward. The trail lines are the product — the game is just the mechanism for making them. Every visual decision reinforces this.

**Claude must never:**
- Use `#ffffff` as any background — page is charcoal, canvas is warm cream
- Use filled rectangles for paddles — they are DOM div elements, not canvas shapes
- Draw paddles on the canvas — they are always HTML `<div>` elements (see CLAUDE.md §7)
- Clear trail lines between frames — trails persist the entire session
- Use Space Grotesk or any geometric sans-serif for body copy
- Apply neumorphic shadows (outer offset + inset offset double combo) anywhere except `.ctrl-chip`
- Add a NEW glow or coloured drop shadow to any game element beyond the one
  named exception below — this is not a blanket licence to add more
- Make buttons bright or prominent — all controls are dark and understated

**One deliberate, approved exception (brief 27, reconfirmed brief 34/35):**
`#game-frame` gets a soft amber `box-shadow` flash (`rgba(255,215,140,·)`,
diffused/layered blur, no hard ring) on a point and at game over — ported
back from the live v2 build on Shivang's explicit request. Scoped to
`#game-frame` only; no other element gets this treatment. See §6 for the
exact values.

---

## 2. Colour Tokens

All values confirmed from Figma variable collection.

```css
/* ── Page ── */
--color-bg:               #383838;   /* dark charcoal — full viewport */
--color-cta:              #464646;   /* all control chip backgrounds */
--color-disabled:         #777777;   /* disabled states, muted icons */
--color-lightest-grey:    #C5C5C5;   /* secondary text, icon colour */

/* ── Canvas ── */
--color-canvas:           #FFF5E5;   /* warm cream — the play area */
--color-canvas-border:    #888888;   /* 8px solid border on canvas + frame ring */

/* ── Intro Card ── */
--color-card-bg:          rgba(245, 205, 142, 0.24);  /* warm amber 24% — frosted.
  PARKED 2026-08-24: superseded by the opaque .ctrl-chip treatment (§10) as
  a stylistic choice "for now" — kept defined, not deleted, in case of a
  future revert. Not referenced by any current screen. */

/* ── Player Colours — paddles, dots, trails, labels ── */
--color-pink:             #FF68AE;   /* player 1 — left paddle */
--color-blue:             #689AFF;   /* player 2 — right paddle */

/* ── Accent Palette — colour picker options ── */
--color-green:            #8CFFB4;
--color-orange:           #FFAE68;
--color-cyan:             #68D7FF;
```

### v3 — surface & state tokens

The v3 engine has three surfaces (paper, chalkboard, paint); the block above
only covers the paper ground. New tokens below.

```css
/* ── v3 Surface Grounds ── */
--color-canvas-chalk:      #1A1A1E;     /* chalkboard ground — RESOLVED, brief 31 */
--color-canvas-paint-base: #FFF5E5;     /* paint ground before reveal = paper (--color-canvas) */

/* ── v3 Control State ── */
--color-chip-selected:     #383838;     /* RESOLVED — shipped as proposed, v3/app/index.html:53 */

/* ── v3 Primary CTA ── */
--gradient-primary: linear-gradient(90deg, #FF68AE, #689AFF, #8CFFB4, #FFAE68, #68D7FF, #FF68AE);
```
`--gradient-primary`'s stop order matches this section's existing player +
accent order (pink, blue, green, orange, cyan), wrapped back to pink so the
loop is seamless. Used as a 1px hairline only — see `.rbtn-primary`, §10 —
never as a fill.

All three items previously marked UNRESOLVED here have shipped and are now
correct as written above (corrected brief 36, several briefs of doc drift
behind the live code): chalkboard ground shipped at `#1A1A1E` (brief 31),
the selected-chip colour shipped exactly as proposed, and the paint
reveal ground is covered in the next subsection.

### v3 — surface stroke palettes (paper/chalk fixed defaults, paint generated)

Paper and chalk each open on a fixed, hand-picked, genuinely triadic
default; every surface's shuffle (idle and in-game) now **generates** a
fresh palette directly in OKLCh — real angular hue spacing (triadic
120°/120°/120° or split-complementary 150°/60°/150°), not a pick from a
fixed set (brief 35 Task 1, replacing brief 31's original fixed-array-only
design). The values below are the fixed opening defaults only; a shuffled
palette is different every time by design and has no single "correct" hex
to document.

```css
/* ── Paper — fixed opening triad (brief 31), red/green/blue ── */
--paper-accent-a: #F2716A;
--paper-accent-b: #54B85B;
--paper-accent-c: #6D9AFF;
/* ground: --color-canvas, #FFF5E5 */

/* ── Chalk — fixed opening triad (brief 31), gold/cyan/pink ── */
--chalk-accent-a: #E6B816;
--chalk-accent-b: #00D8F6;
--chalk-accent-c: #F695EE;
/* ground: --color-canvas-chalk, #1A1A1E */

/* ── Paint — ground only; accents always generated, never fixed ── */
/* ground: Cream, #F4EBD4 (v3/engine/palette.js GROUND_LIBRARY[0] —
   a distinct constant from --color-canvas/#FFF5E5, coincidentally close) */
```

Shuffle range per surface (paper/chalk/paint each have their own pleasant
L/C window, chosen so chalk stays light enough to read on its near-black
ground and paper/paint can go both lighter and darker than their fixed
default) — see `v3/app/index.html`'s `PAPER_L_RANGE`/`CHALK_L_RANGE`/
`PAINT_L_RANGE` and their `_C_RANGE` counterparts for the exact numbers;
not duplicated here since they're tuning values, not design tokens.

---

## 3. Typography

**Target font:** Basier Circle Medium Italic (commercial, to be self-hosted when files are sourced).

**Current interim substitute:**
- All body, heading, label, haiku text: `DM Serif Display` italic (Google Fonts)
- Score numbers and button labels: `Space Mono` (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@1&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

**Never use Space Grotesk. Never use DM Mono. Never use any upright geometric sans-serif for body text.**

When Basier Circle woff2 files are available: add a self-hosted `@font-face` block and remove the Google Fonts import. One CSS swap, no other changes needed.

**Usage by element:**

| Element | Family | Size | Colour |
|---|---|---|---|
| `\|ZEN•PONG\|` header | DM Serif Display italic | 18px | #FFFFFF |
| `\|ZEN•PONG\|` intro card | DM Serif Display italic | 18px | #FFF5E5 (changed 2026-08-24, v3 — was #1E1914, see §10 `#intro-card`) |
| Tagline "make uncertainty your play" | DM Serif Display italic | 14px | #C5C5C5 |
| Card subtitle "space to begin…" | DM Serif Display italic | 14px | #777777 |
| Score numbers | Space Mono 700 | 18px | #FFFFFF |
| Haiku text | DM Serif Display italic | 14px | #C5C5C5 |
| Button labels | Space Mono 400 | 11px | #FFFFFF |
| "you" player label | DM Serif Display italic | 12px | #FF68AE |

Letter spacing: 10% on logo, score, buttons. Body text: normal.

---

## 4. Spacing System

4pt base grid. Use only these named values — never arbitrary pixels.

```css
--space-xs:   4px;
--space-s:    8px;
--space-xxm:  12px;
--space-xm:   16px;
--space-m:    24px;
--space-l:    32px;
--space-xl:   40px;
--space-xxl:  48px;
--space-xxxl: 56px;
```

**Applied spacing map:**

| Location | Token | px |
|---|---|---|
| Gap between colour picker dots | `--space-s` | 8 |
| Gap between score numbers | `--space-l` | 32 |
| Gap between icon buttons | `--space-xm` | 16 |
| Score chip padding horizontal | `--space-xm` | 16 |
| Score chip padding vertical | `--space-s` | 8 |
| CTA button padding horizontal | `--space-m` | 24 |
| CTA button padding vertical | `--space-xxm` | 12 |
| Gap between result buttons | `--space-xm` | 16 |
| Header top margin from viewport | `--space-l` | 32 |
| Header bottom to canvas | `--space-m` | 24 |
| Canvas bottom to controls bar | `--space-m` | 24 |
| Canvas bottom to haiku (results) | `--space-l` | 32 |
| Haiku to result buttons | `--space-m` | 24 |
| Intro card padding horizontal | `--space-xl` | 40 |
| Intro card padding vertical | `--space-m` | 24 |
| v3 — Title tile to surface selector (inside canvas) | `--space-xm` | 16 |
| v3 — Surface chip outer padding | `--space-s` | 8 |
| v3 — Surface tile gap | `--space-s` | 8 |
| v3 — Surface swatch to label | `--space-s` | 8 |
| v3 — Timeline label to track | `--space-xm` | 16 |
| v3 — Share canvas bottom to haiku | `--space-l` | 32 |
| v3 — Share haiku to action row | `--space-l` | 32 |

Never use values like 7px, 9px, 13px, 17px, 18px, 20px. Always use the nearest token.
No new spacing tokens were needed for v3 — the 4pt grid covered every measurement.

---

## 5. Border Radius

Four values. Two core (canvas/frame geometry), two for controls nested
inside a `.ctrl-chip` — added 2026-08-24 when v3 introduced the surface
selector and timeline scrubber. Nothing else.

```css
--radius:        48px;   /* canvas frame ring, score badge */
--radius-small:  12px;   /* all ctrl-chip elements, intro card, result buttons */
--radius-nested: 8px;    /* v3 — nested tile inside a ctrl-chip (surface selector) */
--radius-track:  4px;    /* v3 — slider track (timeline scrubber) */
```
`--radius-nested` is a genuinely new pixel value. `--radius-track`'s `4px`
already existed in this doc for paddle bars (below) but was never
tokenized; promoted to a named token now that the timeline scrubber's track
reuses the same value.

| Element | Radius |
|---|---|
| Canvas `#c` | 48px |
| Frame ring `#frame` | 48px |
| Score badge `#score-pill` | 12px (uses ctrl-chip) |
| Colour picker chip `#pal-pill` | 12px (uses ctrl-chip) |
| Icon button chips | 12px (uses ctrl-chip) |
| Intro overlay card | 12px |
| Result CTA buttons | 12px |
| Paddle bars | 4px |
| v3 — Surface selector tile (`#surface-chip .tile`) | 8px (`--radius-nested`) |
| v3 — Timeline scrubber track (`#timeline-chip` track) | 4px (`--radius-track`) |

---

## 6. Elevation and Effects

### Unified control elevation — `.ctrl-chip`
Applied to all four control elements: `#pal-pill`, `#score-pill`, `#restart-pill`, `#mute-pill`.
```css
height: 48px;
border-radius: 12px;
background: #464646;
box-shadow: 0 4px 24px rgba(0,0,0,0.29), inset 0 0 5px rgba(0,0,0,0.52);
```

### Intro title card
**Changed 2026-08-24 (v3):** now uses the same elevation as `.ctrl-chip`
above — `box-shadow: 0 4px 24px rgba(0,0,0,0.29), inset 0 0 5px
rgba(0,0,0,0.52)`, `background: #464646`, no backdrop blur. See §10 for the
full current spec. The block below is the superseded frosted-glass
treatment, kept for reference:
```css
backdrop-filter: blur(9px);
-webkit-backdrop-filter: blur(9px);
box-shadow: 0 4px 24px rgba(0,0,0,0.16);
background: rgba(245, 205, 142, 0.24);
```

### Canvas frame
```css
box-shadow: 0 4px 24px rgba(0,0,0,0.28);
```

### Result CTA buttons
```css
box-shadow: 0 4px 24px rgba(0,0,0,0.16), inset 0 0 5px rgba(0,0,0,0.32);
```

### `#game-frame` point/game-over glow — the one named exception to §1
Diffused, layered amber bloom, no hard ring — flashed on `#game-frame` only,
900ms on a point / 1400ms at game over (`flashGameFrame`, brief 27, values
retuned brief 34 Task 6b then rolled back a notch brief 35 Task 5):
```css
#game-frame.canvas-glow-point {
  box-shadow: 0 0 36px 8px rgba(255,215,140,0.42), 0 0 74px 22px rgba(255,215,140,0.24);
}
#game-frame.canvas-glow-gameover {
  box-shadow: 0 0 46px 11px rgba(255,215,140,0.46), 0 0 90px 27px rgba(255,215,140,0.28);
}
```

No other elements receive shadows or blur beyond what's specified above. No neumorphic double-shadow pattern (outer offset + inset offset) except where specified above.

---

## 7. Game Elements — Exact Dimensions

### Canvas
```
width:          1000px
height:         630px
JS:             W=1000, H=630
border-radius:  48px
border:         8px solid #888888
background:     #FFF5E5 + paper texture (see Section 9)
box-shadow:     0 4px 24px rgba(0,0,0,0.28)
```

### Frame ring (separate div, not the canvas)
```
position:       absolute, inset:0
border-radius:  48px
border:         8px solid #888888
pointer-events: none
z-index:        2
```

### Paddles (DOM divs — see CLAUDE.md §7 for full architecture)
```
Bar:      8px wide × 64px tall, border-radius:4px
Position: bar left edge = canvas left edge (left paddle)
          bar right edge = canvas right edge (right paddle)
CSS:      #paddle-left  { right: calc(100% - 8px) }
          #paddle-right { left:  calc(100% - 8px) }
Dot:      8px × 8px circle, top:28px (vertically centred on bar)
          left dot at left:0 of wrap (hangs into dark area)
          right dot at right:0 of wrap (hangs into dark area)
Range:    PAD_MIN=40, PAD_MAX=526 (stays in straight section, not corners)
```

### Ball
```
diameter:  ~10px (BR=6 collision radius)
fill:      active player colour
idle/serve: grey #888888, shown outside canvas top-left
```

### Corner collision radius
```
CR = 40px — ball bounces before the 48px canvas corners
```

### v3 — Share canvas (size UNRESOLVED)
The share screen (§8 Screen 4, new) needs its own canvas size — the main
canvas above is fixed at 1000×630 and §11's save-artwork output is a
separate 2× PNG derivation; neither covers this. A mockup uses **800×504**,
keeping border (`8px`) and radius (`48px`) fixed rather than scaling down
with the canvas. Not confirmed — needs a decision, then folding in as a real
value here.

---

## 8. Screen-by-Screen Layout

### Screen 1 — Idle
```
[page: #383838]
  32px gap

  "make uncertainty your play"    14px DM Serif italic, #C5C5C5, centred

  24px gap

  [canvas: 1000×630, #FFF5E5, 48px radius, 8px border]
    [frame ring overlay: 48px radius, 8px border #888888]
    [idle doodle trails — generative preview animation]

    [intro card: centred over canvas, 420px wide]
      #464646, radius 12px, box-shadow 0 4px 24px rgba(0,0,0,0.29),
      inset 0 0 5px rgba(0,0,0,0.52)    (changed 2026-08-24, v3 — see §10)
      ← 40px padding →
      SVG logo (cream version, #FFF5E5 fill — changed 2026-08-24, was dark)
      8px gap
      "space to begin • mouse to move"    14px DM Serif italic, #777777

    16px gap    (v3 — new)

    [v3 — #surface-chip: centred, matched to intro card width]
      3 tiles: PAPER · CHALKBOARD · PAINT — see §10

    [paddle-left: pink bar + dot, right:calc(100% - 8px)]
    ["you" label: pink italic, left of paddle]
    [paddle-right: blue bar + dot, left:calc(100% - 8px)]

  24px gap

  [#ctrl-row: 1-column centred on idle]
    [#pal-pill ctrl-chip: centred]
      ● ● ● ● ●  ⇄    8px gaps, 10×10px dots
```

### Screen 2 — Playing
```
[page: #383838]
  32px gap

  SVG logo (white fill)    centred

  24px gap

  [canvas: 1000×630, active game, trails accumulating]
    [frame ring]
    [paddle-left: moves with mouse]
    [paddle-right: AI-controlled]
  [ball indicator: grey circle outside canvas top-left = serving]

  24px gap

  [#ctrl-row: 3-column grid, 1000px wide]
    LEFT:   [#pal-pill ctrl-chip]  ● ● ● ● ●  ⇄
    CENTRE: [#score-pill ctrl-chip]  0     3   (Space Mono 700 18px, gap 32px)
    RIGHT:  [#restart-pill ctrl-chip] [#mute-pill ctrl-chip]  (gap 16px)
```
v3 — explicitly: **no density or timeline control during play.** Tuning
happens on results (Screen 3) only.

### Screen 3 — Results
```
[page: #383838]
  32px gap

  SVG logo (white fill)    centred

  24px gap

  [canvas: 1000×630, full accumulated artwork]
  [no paddles, no ball, no card]

  32px gap

  haiku text    DM Serif italic 14px, #C5C5C5, centred

  24px gap

  [row: 1000px wide, space-between]    (changed 2026-08-24, v3 — was a
                                         centred 2-button row; adopted the
                                         delta as-is, see below)
    LEFT:  #timeline-chip                                          (§10)
    RIGHT: [ SAVE ARTWORK ] [ SHARE ] [ PLAY AGAIN ]   gap 16px
    all three: .rbtn — #464646, radius 12px, padding 12px 24px,
    Space Mono 11px uppercase, box-shadow 0 4px 24px rgba(0,0,0,0.16),
    inset 0 0 5px rgba(0,0,0,0.32). Not `.rbtn-primary` — that hierarchy is
    reserved for the share screen's single CTA (Screen 4).
```
Share now has its own entry point from results, alongside the new
timeline-chip control for picking which frame of the painting to keep.

### Screen 4 — Share (new, v3)
```
[page: #383838]
  32px          logo, cream, centred
  32px
  [canvas 800×504, radius 48px, border 8px #888888, artwork + reveal ground]
                ⚠ size unresolved — see §7
  32px          haiku, DM Serif italic 14px, #C5C5C5, centred
  32px
  [row: 800px wide, space-between]
    LEFT:  [PAINT/PLAY YOUR OWN]  .rbtn-primary
    RIGHT: [DOWNLOAD PNG] [COPY LINK]   .rbtn, gap 16px
```
No score, no controls, no author, no date, no seed — one row of actions so
the page holds in a single fold.

---

## 9. Canvas Paper Texture

The warm cream canvas has a visible paper-grain texture generated in JS at init. This is not optional — it is core to the aesthetic.

`buildPaper()` generates:
- Random pixel noise (grain) over the `#FFF5E5` base
- Subtle sine-wave variation (paper fibre feel)
- Soft vignette gradients on all four edges
- A faint dashed centre-line mark

Preserve `buildPaper()`, `paperCv`, and `initDraw()` exactly. The noise canvas is generated once and reused — never regenerated per frame.

**v3 note.** Per-surface stroke rendering (paper, chalkboard, paint) is owned
by the v3 engine (`v3/engine/`), not by design mockups. Any stroke appearance
shown in a design file is a placeholder for weight, density, and contrast
only — chalkboard's real rendered appearance differs materially from the
design mockups.

---

## 10. Components

### `.ctrl-chip` (unified — applied to all four controls)
```css
height:     48px;
border-radius: 12px;
background: #464646;
box-shadow: 0 4px 24px rgba(0,0,0,0.29), inset 0 0 5px rgba(0,0,0,0.52);
display:    flex;
align-items: center;
```

### `#pal-pill` (colour picker)
```css
padding:    0 16px;
gap:        8px;
/* no additional background or shadow beyond ctrl-chip */
```
Dots: 10×10px circles, `border-radius:50%`. No hover state on the pill itself — only dots scale on hover.

### `#score-pill`
```css
gap:        32px;
padding:    0 24px;
justify-content: center;
min-width:  120px;
```
Score text: Space Mono 700, 18px, #FFFFFF, letter-spacing 0.1em.

### `#restart-pill`, `#mute-pill`
```css
padding:    0 14px;
```
Icons: 18×18px SVGs, opacity 0.8. Hover: opacity 1.0.

### Result buttons `.rbtn`
```css
background:     #464646;
border-radius:  12px;
padding:        12px 24px;
font-family:    'Space Mono', monospace;
font-size:      11px;
text-transform: uppercase;
letter-spacing: 0.12em;
color:          #FFFFFF;
box-shadow:     0 4px 24px rgba(0,0,0,0.16), inset 0 0 5px rgba(0,0,0,0.32);
```
Hover: opacity 0.85.

### Intro card `#intro-card`
```css
width:         420px;
background:    #464646;
border-radius: 12px;
padding:       24px 40px;
box-shadow:    0 4px 24px rgba(0,0,0,0.29), inset 0 0 5px rgba(0,0,0,0.52);
text-align:    center;
```
**Changed 2026-08-24 (v3, stylistic choice for now):** swapped from the
frosted amber-glass treatment to the opaque `.ctrl-chip` treatment, so the
card reads as one object with the new surface selector below it
(`#surface-chip`) and stays legible over any of the three surface grounds.
Width (420px) is new — matched to the surface selector. Card logo is now
the cream (`#FFF5E5`) SVG, not the dark (`#1E1914`) version — see §3. The
old `rgba(245,205,142,0.24)` frosted treatment (backdrop blur 9px, single
shadow) is superseded here but the `--color-card-bg` token (§2) is kept
parked, not deleted, since this is stated as the current choice, not a
permanent one.

### v3 — `#surface-chip` (surface selector)
New in v3. Sits **inside** the canvas, directly under the intro card,
matched to the card's width.
```css
#surface-chip {
  /* .ctrl-chip: height 48px, radius 12px, #464646,
     0 4px 24px rgba(0,0,0,0.29), inset 0 0 5px rgba(0,0,0,0.52) */
  width:   420px;
  padding: 0 8px;
  gap:     8px;
}
#surface-chip .tile {
  flex:          1;
  height:        32px;
  border-radius: var(--radius-nested);   /* 8px — see §5 */
  gap:           8px;
  background:    transparent;   /* selected: --color-chip-selected, UNRESOLVED — see §2 */
  cursor:        pointer;
}
#surface-chip .tile span {
  font: 11px 'Space Mono';
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #C5C5C5;   /* selected: #FFFFFF */
}
#surface-chip .swatch { width:12px; height:12px; border-radius:4px; }
```
Swatch fills: paper `#FFF5E5`, chalkboard = UNRESOLVED chalk ground (§2),
paint `#FFAE68`.

**Behaviour.** Selecting a surface re-grounds the live canvas and re-renders
the idle doodle in that material. It does **not** clear or restart the
doodle — see §13, Surface switch.

### v3 — `#timeline-chip` (timeline scrubber)
New in v3. Lives on the **results** screen only, not playing (§8 Screen 2) —
it selects which frame of the accumulated painting to keep, so it's a
property of the artwork, not a game control.
```css
#timeline-chip {
  /* .ctrl-chip */
  padding: 0 16px;
  gap:     16px;
}
#timeline-chip label {
  font: 11px 'Space Mono';
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #C5C5C5;
  /* label reads "TIMELINE" — no end labels, no percentage readout */
}
```

**UNRESOLVED — slider primitives.** This doc has no existing slider spec to
extend; every value below is still a mockup proposal, not a decision, except
track radius (resolved, §5):

| Part | Proposed |
|---|---|
| Track width | 320px |
| Track height | 4px (`--space-xs`) |
| Track radius | `--radius-track` (4px) — resolved, see §5 |
| Track colour | `#383838` |
| Fill colour | `#C5C5C5` |
| Thumb | 16px circle, `#FFF5E5`, `0 4px 24px rgba(0,0,0,0.29)` |

Also undefined: keyboard step, focus ring, and disabled appearance.

### v3 — `.rbtn-primary` (button hierarchy)
`.rbtn` above defines one button with no hierarchy. The v3 share screen
(§8 Screen 4) needs a primary; `.rbtn` stays exactly as-is for secondary
actions.
```css
.rbtn-primary {
  /* 1px hairline wrapper */
  padding:       1px;
  border-radius: 12px;
  background:    var(--gradient-primary);
  background-size: 200% 100%;
  animation:     flow 12s linear infinite;   /* 0% → 200% background-position, see §13 */
  box-shadow:    0 4px 24px rgba(0,0,0,0.16);
}
.rbtn-primary > .inner {
  /* standard .rbtn minus the outer shadow */
  background:    #464646;
  border-radius: 12px;
  padding:       12px 24px;
  box-shadow:    inset 0 0 5px rgba(0,0,0,0.32);
}
```
Hierarchy comes from the hairline alone — no fill change, no size change,
nothing bright.

**Needs ratifying — label alternation.** The primary label's first word is
proposed to swap between `PAINT` and `PLAY` every 3s (hard cut,
`steps(1, end)`) while "YOUR OWN" holds still, in a fixed 44px word slot so
nothing reflows. Not yet a confirmed permitted behaviour.

### Trail lines
```
strokeStyle:  player colour at 0.7 opacity
lineWidth:    1.5px
lineCap:      round
lineJoin:     round
persistence:  drawn to drawCv — NEVER cleared between frames
              drawCv only cleared on new game start (initDraw redraws paperCv)
```

---

## 11. Save Artwork Output

When "SAVE ARTWORK" is pressed, a PNG is generated at 2× resolution:

```
Background:   #383838
Canvas area:  PAD=32px margin, border-radius:96px (48×2), cream fill + artwork
Haiku text:   DM Serif italic, 14px@2×, #C5C5C5, centred below canvas
Logo:         the inline Zen Pong SVG mark (preloaded once, drawn via
              buildArtworkExportCanvas), NEVER text — corrected here brief
              36; this section previously specced a text string
              ("| ZEN • PONG |", Space Mono), which the live implementation
              (brief 26 onward) never actually did, per §1's standing
              "logo is always the inline SVG, never text" rule
              positioned 60px below canvas bottom (after haiku)
```

---

## 12. Immutable Rules — Must Never Drift

1. `--color-bg: #383838` — page is always dark charcoal, never white, never near-black `#272727`
2. `--color-canvas: #FFF5E5` — canvas is always warm cream, never `#ffffff` or grey
3. Canvas border-radius `48px` — always large rounded, never less, never sharp
4. Paddles are always DOM `<div>` elements — never drawn on canvas
5. Paddles always outside canvas: bar overlaps canvas edge, dot hangs into dark area
6. Trail lines always persistent — never cleared between frames, only on new game
7. Font: DM Serif Display italic for all body/heading text, Space Mono for scores/buttons
8. Never use Space Grotesk. Never use any upright geometric sans-serif for body text.
9. Spacing always on 4pt grid — no arbitrary pixel values
10. Paper grain texture always present on canvas — never removed as "optimisation"
11. All controls use `.ctrl-chip` class — **every new control added to the game must use this class**. Never define custom elevation on individual controls. The class provides height:48px, radius:12px, #464646, and the exact shadow. If a control needs different sizing it can override only the dimension, never the shadow or colour.
12. BGM — a two-track crossfading player (`GoldenPothos.mp3` + `Oolong.mp3`,
    brief 35), always present, always loaded via `new Audio()` +
    `createMediaElementSource()` per track — **never** `fetch()` +
    `decodeAudioData()` (corrected brief 36; this rule previously named the
    exact method that's explicitly banned — see root `CLAUDE.md` §4)
13. All 7 SFX functions — always present, never removed or merged
14. No neumorphic double-shadow on anything except `.ctrl-chip` (which uses inset intentionally)

---

## 13. Motion & Transitions (v3, new — all UNRESOLVED)

This doc previously had no motion spec at all: no durations, no easing, no
named transitions. Everything below is a mockup proposal, not a ratified
decision.

### Surface switch (idle)
The idle doodle is a live animated state, not a still. On switch it must
**not** clear, restart, or re-seed.

| Property | Value |
|---|---|
| Ground colour | 400ms linear cross-fade |
| Stroke colour | 400ms linear |
| Stroke weight | 400ms linear |
| Doodle progress | untouched — the same stroke keeps drawing through the switch |

### The reveal (game end → results)
The signature moment. Proposal:

| Step | Timing |
|---|---|
| Rally ends; paddles, ball and score leave | on the final frame, no fade |
| Ground wipes in behind the marks, top to bottom | 900ms |
| Painting holds alone | ~400ms |
| Haiku fades in | 400ms |
| Timeline chip and buttons fade in | 400ms, after the haiku |

A downward wipe rather than a cut or a cross-fade: the ground appears to be
poured in behind the marks, the way the paint would have been laid first.
Marks never move or re-draw.

### Primary CTA
Hairline gradient (`.rbtn-primary`, §10): 12s linear loop, infinite. Label
word swap: 3s hold, hard cut — also needs ratifying, see §10.
