# Brief 27 — In-Game Feel: Audio + Hit/Score Interactions

The juice. Continue on `feature/v3-app`. Docs to `main`.

Everything in this brief already exists and works in root `index.html`. This is
a port, not a design exercise — take root's implementations and its trigger
points, and do not invent new sounds or new motion.

**Read root `index.html` first**, specifically the SFX block (~lines 651–790)
and the six call sites listed below. Also read root `CLAUDE.md` §4 — it is
binding here and names the one rule that has broken this before.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/art-lab.html`
byte-identical to `main`. Root `index.html` untouched.

---

## Task 1 — Port the SFX layer

Port all seven sound functions verbatim, plus their two helpers:

| Function | Root line | Fires on |
|---|---|---|
| `tone()` / `nz()` | 652 / 662 | helpers |
| `sndScratch()` | 673 | paddle hit — sharp click + wooden body resonance |
| `sndChalk()` | 759 | paddle hit, layered under `sndScratch` |
| `sndThud()` | 700 | wall bounce |
| `sndPoint()` | 731 | a point scored |
| `sndLevelUp()` | 745 | level up (every 2 total points) |
| `sndCollide()` | 727 | ball-to-ball |
| `sndGameOver()` | 776 | game ends |

Verbatim means the same oscillator types, frequencies, ramps, durations and
gains. These were tuned by ear; re-deriving them produces a different game.

**`sndCollide` is dormant in v3** — `MAX_B` is 1, so two balls never coexist.
Port it anyway. Root `CLAUDE.md` §4: all seven SFX functions are always
present, never removed or merged. Comment that it is currently unreachable so
nobody deletes it as dead code.

**Wiring into the existing audio setup:**

- Brief 18 already creates `actx` on the first idle gesture and holds a `muted`
  flag. Every SFX function must early-return on `muted` — root's do
  (`if(muted)return`) — and must also no-op safely if `actx` is null, which it
  is until that first gesture.
- Root wraps every function body in `try{}catch(e){}`. Keep that. A failed
  oscillator must never take down the game loop.
- The mute button now gates BGM *and* SFX. Verify both.

---

## Task 2 — Trigger points

v3 gets its events from `advanceBall`, which returns a typed event array. Fire
each sound **inside the branch for its event type**, in the same
`events.forEach` that already commits strokes.

| Event | Sound |
|---|---|
| `paddleHit` | `sndScratch()` + `sndChalk()`, both, in that order |
| wall bounce | `sndThud()` |
| ball leaves play (point) | `sndPoint()` |
| level up (inside `checkLevel`) | `sndLevelUp()` |
| win condition met | `sndGameOver()` |

**The rule that has broken this before** — root `CLAUDE.md` §4, verbatim: the
chalk SFX fires **exactly once per paddle hit, inside the paddle-hit branch,
never on a frame clock**. No per-frame polling of ball position, no "did we
just bounce" heuristic, no debounce timer. The event array already tells you.
If you find yourself writing a cooldown to stop a sound repeating, the trigger
is in the wrong place.

Playing screen only. The idle doodle is silent — it runs the same physics and
would otherwise fire sounds behind the intro card.

---

## Task 3 — Paddle flash on hit

Root, lines 146–151:

```css
@keyframes paddle-flash {
  0%   { filter: brightness(1); }
  15%  { filter: brightness(3.5); }
  100% { filter: brightness(1); }
}
.paddle-hit { animation: paddle-flash 0.15s ease-out forwards; }
```

Apply the class to the **`.paddle` wrapper**, not the bar — so the bar and its
dot flash together, which is what root does.

Use root's retrigger idiom exactly, or a fast rally will only flash the first
hit:

```js
el.classList.remove('paddle-hit');
void el.offsetWidth;          // force reflow
el.classList.add('paddle-hit');
```

Left paddle flashes on a left hit, right on a right hit. Never both.

---

## Task 4 — Canvas glow on a point, and at game end

Root, line 74:

```css
#frame.canvas-glow {
  box-shadow: 0 0 0 4px rgba(255,215,140,0.22),
              0 0 28px rgba(255,215,140,0.22) !important;
}
```

Applied to the frame ring for **700ms**, then removed, on:

- a point scored, either side (root lines 1011 and 1018)
- game over (root line 1145)

Same remove / reflow / add retrigger idiom.

**Known doc conflict — resolve in favour of the live build.** `DESIGN.md` §1
says never add "neon glows or coloured drop shadows to game elements", and §6
says no element other than `.ctrl-chip` receives a shadow. The live v2 build
has done exactly this since it shipped, and Shivang has explicitly asked for it
back. Live code and an explicit request both win. Log it in `BACKLOG.md` as
doc drift for `DESIGN.md` to absorb; do not soften the effect to split the
difference.

---

## Task 5 — Score pop

Root, lines 238–243:

```css
@keyframes score-pulse {
  0%   { color: #FFFFFF; }
  30%  { color: #FFAE68; }   /* --color-orange */
  100% { color: #FFFFFF; }
}
.score-pop { animation: score-pulse 0.4s ease-out forwards; }
```

Only the number that changed pops — root compares the previous value before
writing the new one (lines 1198–1212). Port that, don't pop both.

---

## Task 6 — The game-over moment

The sequence at the win, in order:

1. `sndGameOver()` and the canvas glow fire on the final frame — at the same
   moment the paddles, ball, score and guardrails leave.
2. The brief-26 reveal runs on its existing timings: ground wipe 900ms, haiku
   at 1300ms, `#post-row` at 1700ms.

`sndGameOver` is a 2.5s decaying tone, so it is still sounding as the ground
wipes and settles under the haiku. That overlap is the point — it is why this
brief comes after the reveal rather than before it. Do not shorten it to fit,
and do not add a second sound to the reveal.

**BGM stays at level throughout.** Ducking it under the reveal is a real idea
and not this brief's — note it and move on.

---

## Task 7 — `swoosh.mp3`

`swoosh.mp3` sits in the repo root and is referenced by nothing — not root
`index.html`, not the v3 app. Do not wire it in. Flag it in the session
summary: it either has a use nobody has specced or it is dead weight that
brief 29's self-contained build must not bundle.

---

## Verification

- Play a full game on each surface with sound on. Paddle hits, wall bounces,
  points, the level-up and the game-over all fire, each exactly once per event.
- Fast rally: every paddle hit flashes, not just the first.
- Only the scoring side's number pops.
- Frame glows on a point and at game over, 700ms, then clean.
- Mute silences BGM and all SFX; unmute restores both.
- Nothing fires on the idle screen.
- No sound before the first gesture; no console errors from a null `actx`.
- Gains sit right against BGM at 0.72 — the paddle hit should read as a clear
  loud contact, not a tick under the music. Tune by ear and report anything
  changed from root's values.
- `git diff --stat main -- v3/engine/ v3/labs/ index.html` empty.

## Done looks like

The ball cracks off the paddle and the paddle flashes with it. A point lands
and the frame breathes gold. You win, the tone rings out, and the ground pours
in under it.
