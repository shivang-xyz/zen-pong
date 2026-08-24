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
- Add neon glows or coloured drop shadows to game elements
- Make buttons bright or prominent — all controls are dark and understated

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
--color-card-bg:          rgba(245, 205, 142, 0.24);  /* warm amber 24% — frosted */

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
--color-canvas-chalk:      UNRESOLVED   /* chalkboard ground — see note below */
--color-canvas-paint-base: #FFF5E5;     /* paint ground before reveal = paper (--color-canvas) */

/* ── v3 Control State ── */
--color-chip-selected:     #383838;     /* proposed — see note below */

/* ── v3 Primary CTA ── */
--gradient-primary: linear-gradient(90deg, #FF68AE, #689AFF, #8CFFB4, #FFAE68, #68D7FF, #FF68AE);
```
`--gradient-primary`'s stop order matches this section's existing player +
accent order (pink, blue, green, orange, cyan), wrapped back to pink so the
loop is seamless. Used as a 1px hairline only — see `.rbtn-primary`, §10 —
never as a fill.

**UNRESOLVED — chalkboard ground.** A v3 mockup borrows `#383838`, which is
the page background, so the canvas loses its edge against the page and only
the grey frame ring separates them. Needs its own value, darker or warmer
than the page. Blocking: chalkboard cannot ship without this.

**UNRESOLVED — paint reveal ground.** The paint surface composites a
coloured ground at game end. The engine lab exposes a ground set (cream and
others, see `v3/engine/palette.js`) that was never tokenised here. A mockup
stands in the intro card's `rgba(245,205,142,0.24)` over cream. Needs: the
plain-ground palette as tokens, plus a spec for the seeded random-patch
variant (patch count, size range, whether patches use the accent palette or
their own).

**UNRESOLVED — selected-chip colour.** No control in this doc has a
persistent-selection colour today (§10 gives hover only — opacity, dot
scale). `--color-chip-selected` is proposed for the v3 surface selector's
selected tile and, for consistency, the colour-picker's active dot, which
currently has no selected state either.

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
| `\|ZEN•PONG\|` intro card | DM Serif Display italic | 18px | #1E1914 |
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

Two values only. Nothing else.

```css
--radius:        48px;   /* canvas frame ring, score badge */
--radius-small:  12px;   /* all ctrl-chip elements, intro card, result buttons */
```

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

**⚠ OPEN CONFLICT — v3 nested control radius.** Two v3 components each want
a smaller radius nested inside a 12px `.ctrl-chip`: the surface selector's
selected tile (`#surface-chip .tile`, §10) proposes **8px**, and the timeline
scrubber's track (`#timeline-chip`, §10) proposes **4px**. Both directly
conflict with "Two values only. Nothing else." above — a third and fourth
radius value. Not applied to the rule or table above. Needs a decision:
either name an explicit, scoped nested-control-radius token (e.g.
`--radius-nested`), or find a way to reuse `--radius-small` for both.

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

No other elements receive shadows or blur. No neumorphic double-shadow pattern (outer offset + inset offset) except where specified above.

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

    [intro card: centred over canvas]
      backdrop blur 9px, rgba(245,205,142,0.24), radius 12px
      ← 40px padding →
      SVG logo (dark version, #1E1914 fill)
      8px gap
      "space to begin • mouse to move"    14px DM Serif italic, #777777
      (v3 mockup proposes a `.ctrl-chip`-style restyle + 420px fixed width
      for this card — ⚠ conflicts with the spec above, see §10, not applied)

    16px gap    (v3 — new, only when the surface selector below is present)

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

  [two buttons: centred row, 16px gap]
  [ SAVE ARTWORK ]  [ PLAY AGAIN ]
  both: #464646, radius 12px, padding 12px 24px, Space Mono 11px uppercase
  box-shadow: 0 4px 24px rgba(0,0,0,0.16), inset 0 0 5px rgba(0,0,0,0.32)
```

**⚠ OPEN CONFLICT — v3 results row.** A v3 mockup replaces the row above
with a 1000px-wide `space-between` layout: `#timeline-chip` (§10) on the
left, three buttons on the right (`SAVE ARTWORK`, `SHARE`, `PLAY AGAIN`,
16px gap, using the new `.rbtn`/`.rbtn-primary` hierarchy, §10). This
conflicts with the two-button spec above — not applied. Open question the
mockup itself raises: if the row must stay at exactly two buttons, share
folds into save instead of getting its own button.

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
background:       rgba(245, 205, 142, 0.24);
backdrop-filter:  blur(9px);
-webkit-backdrop-filter: blur(9px);
border-radius:    12px;
padding:          24px 40px;
box-shadow:       0 4px 24px rgba(0,0,0,0.16);
text-align:       center;
```

**⚠ OPEN CONFLICT — v3 `#intro-card` restyle.** A v3 mockup proposes
replacing the treatment above with the `.ctrl-chip` treatment, so the card
reads as one object with the new surface selector below it (see
`#surface-chip` below) and stays legible over any of the three surface
grounds:
```css
#intro-card {
  width:         420px;
  background:    #464646;
  border-radius: 12px;
  padding:       24px 40px;
  box-shadow:    0 4px 24px rgba(0,0,0,0.29), inset 0 0 5px rgba(0,0,0,0.52);
}
```
Not applied — conflicts with the spec above (background, backdrop-filter,
box-shadow all differ; width is new information, not currently specified).
If approved, it also implies: the card logo swaps to the cream (`#FFF5E5`)
SVG instead of the dark (`#1E1914`) version used today, and the
`rgba(245,205,142,0.24)` card token (§2) plus the 9px backdrop blur become
unused everywhere — which would need a deliberate retire, not a silent drop,
since both are still declared as current spec above and in §2/§6.

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
  border-radius: 8px;   /* ⚠ unresolved — conflicts with §5's two-value rule */
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
extend; every value below is a mockup proposal, not a decision:

| Part | Proposed |
|---|---|
| Track width | 320px |
| Track height | 4px (`--space-xs`) |
| Track radius | 4px — ⚠ a fourth radius value, same open conflict as §5 |
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
Logo text:    "| ZEN • PONG |", Space Mono 700 11px@2×, rgba(245,240,230,0.35)
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
12. Oolong.mp3 BGM — always present, always loaded via `fetch()` + `decodeAudioData()`
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
