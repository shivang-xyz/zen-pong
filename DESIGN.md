# Zen Pong — Design Specification

> Source of truth for all visual decisions.
> All values confirmed from Figma variable export + visual analysis.
> Reflects stable build: index.html (formerly zen_pong_v13.html)
> Last updated: 2026-06-23

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

Never use values like 7px, 9px, 13px, 17px, 18px, 20px. Always use the nearest token.

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

---

## 9. Canvas Paper Texture

The warm cream canvas has a visible paper-grain texture generated in JS at init. This is not optional — it is core to the aesthetic.

`buildPaper()` generates:
- Random pixel noise (grain) over the `#FFF5E5` base
- Subtle sine-wave variation (paper fibre feel)
- Soft vignette gradients on all four edges
- A faint dashed centre-line mark

Preserve `buildPaper()`, `paperCv`, and `initDraw()` exactly. The noise canvas is generated once and reused — never regenerated per frame.

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
