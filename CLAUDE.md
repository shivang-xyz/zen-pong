# Zen Pong — Project Instructions

> **`index.html` at repo root is a GENERATED file as of brief 30 (v3 ship).**
> It is produced by `node v3/build.js` from `v3/app/index.html` +
> `v3/engine/` and carries its own `GENERATED FILE — do not edit` header
> comment at the top confirming this. **Never hand-edit it.** Every rule
> below that talks about reading, changing, or writing `index.html`
> (Sections 1, 3, 14 especially) now means: make the change in
> `v3/app/index.html` or `v3/engine/`, then run `node v3/build.js` to
> regenerate root `index.html` — never edit the generated output directly,
> the next rebuild silently overwrites it. See `v3/CLAUDE.md` for the full
> engine/app source-of-truth contract this file now defers to.

## 1. Before You Do Anything

1. Read this file completely.
2. Read `DESIGN.md` completely. All visual decisions live there. Never guess a colour, font, spacing, or radius — look it up in DESIGN.md.
3. Read `index.html` in full before making any changes.

If DESIGN.md and this file conflict on a visual matter, DESIGN.md wins.
Never make changes based on assumptions — if something is unclear, ask.

---

## 2. Project Identity

**Zen Pong** is a single-file HTML5 canvas pong game with a generative art angle. The ball's trail lines accumulate into a painting over the course of a game. The aesthetic is calm and intentional — not gamified, not arcade. Every design decision reinforces stillness.

---

## 3. Architecture — Non-Negotiable

| Rule | Detail |
|---|---|
| Single file | Output is always one self-contained `index.html` — never split into separate CSS or JS files |
| No external JS libraries | No CDN JS links, no npm, no imports — pure vanilla JS only |
| No remote assets | No audio or fonts loaded from remote URLs |
| Local assets allowed | `Oolong.mp3` and `Zen_Pong_Logo.svg` live in the same folder as `index.html` |
| Logo | Always inline SVG — never rendered as text. Two versions exist in the HTML: white fill for header, dark `#1E1914` fill for intro card |

---

## 4. Audio System — Two Components, Both Protected

### BGM — two-track crossfading player (GoldenPothos.mp3 + Oolong.mp3)

**Loading method: `new Audio()` + `createMediaElementSource()`, PER TRACK — NOT fetch/decodeAudioData.**

This was changed deliberately. The original `fetch()` + `decodeAudioData()` approach was
broken by browser extension interference (confirmed via console on GitHub Pages). The
`new Audio()` route is resilient to this and works correctly on HTTPS.

**Updated brief 35 (2026-08-28) — corrected here, brief 36:** this section
described a single-track player (`ooAudio`/`ooGain`/`initOolong()`) until
brief 35 replaced it with a genuine two-track player: `GoldenPothos.mp3`
and `Oolong.mp3` alternate with a 4-second crossfade, coin-flip start
(never always Oolong), no silent gap. The **protected rules below are
unchanged and still binding** — only the concrete implementation shape
changed, from one `Audio`/`Gain` pair to one pair PER TRACK feeding a
shared bus gain. Full implementation lives in `v3/app/index.html`
(`initBGMBus`/`initBGMSlot`/`crossfadeToNext`/`startBGM`/`stopBGM`/
`setBGMLevel`) — not re-pasted here so this doc can't drift from the real
code a second time; read it directly rather than trusting a second copy.

Protected rules, unchanged by the two-track rework:
- `startBGM()` must be `async` and must `await actx.resume()` before touching any track
- Each track's own init function must guard against re-creating an already-live `Audio`/`Gain` pair
- Fades in on game start (2.5s), fades out on game end (2.5s) — the SHARED bus level, not a per-track gain
- Per-track `Audio.loop` is `false` — the two-track SET loops via the crossfade alternation, not each file individually
- Respects the mute toggle
- **Never revert to fetch/decodeAudioData**

### SFX — Web Audio API synthesis only

All sound effects are synthesised in real-time. No external files. These 7 functions must always be preserved:

| Function | Trigger |
|---|---|
| `sndScratch()` | Paddle hit |
| `sndThud()` | Wall bounce |
| `sndCollide()` | Ball collision |
| `sndPoint()` | Point scored |
| `sndLevelUp()` | Level up |
| `sndChalk()` | Drawing sound (every 18 frames) |
| `sndGameOver()` | Game over |

These are intentionally minimal and will be expanded. Do not merge, simplify, or remove any of them.

Current `sndChalk()` values (correct, do not change):
- Noise amplitude: `(Math.random()*2-1)*0.018`
- Gain: `0.028` → ramp to `0.001` over `0.055s`
- Filter: bandpass at 2800Hz, Q 2.5

### BGM and mousemove — Permanently Settled

BGM CANNOT be triggered by mousemove. This is a browser-enforced Web Audio API autoplay policy — mousemove is explicitly excluded from the gesture events that can unlock AudioContext in all major browsers (Chrome, Firefox, Safari). The tryStartBGM() call on mousemove should remain as a soft keepalive guard only (if already unlocked, ensure it is running) — never as the primary trigger. Primary triggers are: spacebar, canvas click, touchstart. This is permanently settled — do not attempt to fix this in future sessions.

### sndChalk() — Protected Spec

sndChalk() fires ONCE PER PADDLE HIT only. Called inside sweptHit() at the moment of direction reversal — once in the left paddle branch, once in the right paddle branch. Never called on a frame clock. No external file dependency.

Spec (do not change these values):
- White noise buffer: 0.055s, amplitude (Math.random()*2-1)*0.018
- Filter: bandpass, 2800Hz, Q 2.5
- Gain: 0.028 → linearRamp to 0.001 over 0.055s
- Stop: currentTime + 0.06

Do not revert to swoosh.mp3 or any external audio file. Do not move this call back to the frame clock.

---

## 5. Game States

Exactly three states. No others.

```
idle      →  spacebar or click card  →  playing
playing   →  point scored            →  playing (score increments)
playing   →  score reaches WIN(3)    →  results
results   →  play again button       →  idle
```

**Idle:** Intro card visible over canvas. Colour picker centred below canvas. No score. Idle doodle animation runs. BGM not playing.
**Playing:** Card hidden. Score visible. Paddles active. Trails accumulating. BGM playing.
**Results:** Full artwork visible. No paddles. No ball. Haiku text below canvas. Two CTA buttons. BGM faded out.

---

## 6. Systems That Must Always Be Preserved

Never remove, simplify, or rewrite these without explicit instruction:

**Paper texture system**
`buildPaper()` generates a static off-screen canvas (`paperCv`) with grain noise, vignette gradients, and a faint centre-line dashed mark. It is the base layer drawn on `drawCv` at game start. Preserve `buildPaper()`, `paperCv`, and all references to them.
**Resolved, corrected brief 36:** the two `getImageData` loops this line
used to ask for as an open TODO are already merged — confirmed against
`v3/engine/surface.js` (the v3 port of `buildPaper()`), whose own comment
states there is "nothing left to merge, ported as-is": grain/wave is a
single pixel loop, vignette/centre-line are gradient fills, never a second
pixel loop. No further action needed; this line previously read as a
standing TODO for work that was already done.

**Persistent drawing canvas**
Trail lines are drawn to an off-screen canvas (`drawCv`) and composited each frame. Never cleared mid-game. Only cleared at new game start via `initDraw()`, which redraws `paperCv` as the base.

**Spin physics system**
The ball has spin/angular momentum (`b.spin`) affecting deflection angle on paddle hit. This produces the non-linear trail geometry. Never replace with simple angle reflection.

**BGM system**
`initOolong()`, `startBGM()`, `stopBGM()` — keep intact. See Section 4.

**SFX system**
All 7 functions listed in Section 4 — keep intact.

**Idle doodle animation**
`startDoodle()` and the idle timer loop — keep intact.

---

## 7. Ball Physics — Purposeful Unpredictability

The ball should feel intentional but never predictable. Two rules enforce this:

### Spawn angle
**Corrected brief 36** — this formula didn't match the live engine and was
caught by `BACKLOG.md`'s own doc-drift note (found brief 10, 2026-07-20,
never fixed until now). All physics randomness is seeded via an injected
`rng()` (see `v3/engine/rng.js`), never bare `Math.random()` — v3's own
immutable rule (`v3/CLAUDE.md`). Real formula, `v3/engine/physics.js`
`mkBall()`:
```javascript
// Four-edge spawn (left/right/top/bottom chosen by rng()); on each edge:
const a = rng() * 0.55 + 0.18;  // ~10° to ~42° from horizontal
```

### Minimum angle enforcement
After every wall bounce and paddle hit, the ball's angle from horizontal must be
at least 18°. If the resulting angle is shallower, nudge it to exactly 18° while
preserving horizontal direction. This prevents the ball settling into a corridor
resonance (slow horizontal drift, both paddles idle, artwork = parallel lines).

```javascript
function enforceMinAngle(b) {
  const minAngleRad = Math.PI / 10;  // 18 degrees
  const speed = Math.hypot(b.vx, b.vy);
  const angle = Math.abs(Math.atan2(b.vy, b.vx));
  const fromHoriz = Math.min(angle, Math.PI - angle);
  if (fromHoriz < minAngleRad) {
    const sign = b.vy >= 0 ? 1 : -1;
    const hSign = b.vx >= 0 ? 1 : -1;
    b.vx = hSign * Math.cos(minAngleRad) * speed;
    b.vy = sign  * Math.sin(minAngleRad) * speed;
  }
}
```

Call `enforceMinAngle(b)` immediately after every `wallHit()` and `sweptHit()` return true.

### Wall bounce randomisation
On top/bottom wall bounce, add a small controlled angular nudge (±8°) on top of
the clean reflection. This is what creates zen unpredictability — like a stone
skipping on water, not a billiard ball.

```javascript
// Inside wallHit(), after reflecting vy: (rng(), not Math.random() — corrected brief 36, same seeded-randomness note as spawn angle above)
const nudge = (rng() - 0.5) * 0.28;  // ±8° in radians
const spd = Math.hypot(b.vx, b.vy);
const ang = Math.atan2(b.vy, b.vx) + nudge;
b.vx = Math.cos(ang) * spd;
b.vy = Math.sin(ang) * spd;
```

---

## 8. DOM Paddle Architecture — Critical

**Paddles are HTML `<div>` elements, not canvas drawings.**

This is an intentional architectural decision. Do not move paddles back onto the canvas under any circumstances.

### Structure
```html
<div id="wrap">                    <!-- 1000×630px, canvas coordinate space -->
  <div id="frame"></div>           <!-- border ring overlay, inset:0, z-index:2 -->
  <canvas id="c"></canvas>         <!-- game canvas, z-index:1 -->
  <div id="paddle-left">           <!-- z-index:4, right:calc(100% - 8px) -->
    <div class="paddle-bar"></div>
    <div class="paddle-dot"></div>
    <div id="you-label">you</div>
  </div>
  <div id="paddle-right">          <!-- z-index:4, left:calc(100% - 8px) -->
    <div class="paddle-bar"></div>
    <div class="paddle-dot"></div>
  </div>
</div>
```

### Paddle geometry
- Bar: 8px wide × 64px tall, `border-radius:4px`
- `#paddle-left` at `right:calc(100% - 8px)` — bar left edge aligns to canvas left edge
- `#paddle-right` at `left:calc(100% - 8px)` — bar right edge aligns to canvas right edge
- Dot: 8px × 8px circle, `top:28px` (vertically centred on bar), at outer side of bar
- Left dot at `left:0` of its wrap (dot hangs left of bar into dark area)
- Right dot at `right:0` of its wrap (dot hangs right of bar into dark area)

### Paddle JS
`updateDOMPaddles()` runs every frame. It sets `domPaddleLeft.style.top = player.y + 'px'` and `domPaddleRight.style.top = ai.y + 'px'` directly — no scaling factor needed because paddles are inside the same scaled `#gc` container as the canvas.

### Paddle clamping
`PAD_MIN = CR = 40`, `PAD_MAX = H - CR - PH = 526` — paddles stay within the straight section of the canvas, never reaching the corner curve areas.

---

## 9. Canvas Dimensions

```
Canvas:        1000px × 630px
JS constants:  W=1000, H=630
Border-radius: 48px
Border:        8px solid #888888 (on #frame div)
Position:      centred on page inside #gc scaled container
```

The `#frame` div is a separate absolutely-positioned overlay with `border:8px solid #888888` and `border-radius:48px` — it provides the visible grey ring. The canvas `#c` has matching `border-radius:48px` for content clipping.

---

## 10. Controls Architecture

All controls use the `.ctrl-chip` class for unified elevation:
```css
height: 48px;
border-radius: 12px;
background: #464646;
box-shadow: 0 4px 24px rgba(0,0,0,0.29), inset 0 0 5px rgba(0,0,0,0.52);
```

Four elements use `.ctrl-chip`: `#pal-pill`, `#score-pill`, `#restart-pill`, `#mute-pill`.

**State-specific layout:**
- Idle: colour picker centred, score and icon buttons hidden
- Playing: 3-column grid (picker left | score centre | icons right)
- Results: entire `#ctrl-row` hidden

---

## 11. Colour Picker Behaviour

Five palette presets. Changing colour mid-game must not clear the trail canvas.

```
1. Pink + Blue    (#FF68AE + #689AFF)   default
2. Blue + Cyan    (#689AFF + #68D7FF)
3. Green + Pink   (#8CFFB4 + #FF68AE)
4. Orange + Green (#FFAE68 + #8CFFB4)
5. Cyan + Orange  (#68D7FF + #FFAE68)
```

Shuffle icon randomises the active combination.

---

## 12. Visual Layer — Always Defer to DESIGN.md

Never make visual decisions from memory or defaults. Reference DESIGN.md for:
- Any colour → Section 2
- Any font, size, weight, tracking → Section 3
- Any spacing → Section 4
- Any border-radius → Section 5
- Any shadow or blur → Section 6
- Game element dimensions → Section 7
- Screen layouts → Section 8
- Canvas texture → Section 9
- Component styles → Section 10

**The design is not:**
- Neumorphic — no double box-shadow (outer offset + inset offset combo) on any element except `.ctrl-chip`
- White background — page is always `#383838`
- Arcade UI — no neon, no pixel fonts, no score-dominant layout

---

## 13. Planned Features — Do Not Remove

These are intentionally present and will be expanded:
- BGM system (Oolong.mp3) — see Section 4 for correct implementation
- SFX system — all 7 functions, future session will enhance
- Idle doodle animation — keep as-is
- Canvas-glow flash — keep as-is
- Save artwork function — keep as-is

---

## 14. How to Approach Any Change Request

1. Read `index.html` in full.
2. Identify the minimal diff needed — do not refactor unrelated code.
3. Check DESIGN.md for any affected visual tokens.
4. Make the change. Output the complete updated single-file `index.html`.
5. Do not add speculative features — only what was asked.
6. Write to disk. Say done when complete.
