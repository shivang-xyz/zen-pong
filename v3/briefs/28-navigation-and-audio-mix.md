# Brief 28 — Navigation, Audio Mix, Results Breathing Room

Review pass on briefs 26 and 27. Continue on `feature/v3-app`. Docs to `main`.

Renumber `PORT-PLAN.md`: share → 29, integration + ship → 30.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/art-lab.html`
byte-identical to `main`. Root `index.html` untouched.

---

## Task 1 — The mute icon bug, diagnosed

This has now been reported three times and "fixed" twice. The logic is right and
the CSS is right; **the bug is that `hidden` does not exist as a JS property on
SVG elements.**

Current code (~line 1927):

```js
pgMuteIconUnmuted.hidden = muted;
pgMuteIconMuted.hidden = !muted;
```

`hidden` is an IDL attribute defined on `HTMLElement`. An `<svg>` is an
`SVGElement`, which inherits from `Element`, not `HTMLElement` — it has no
`hidden` property. So that assignment silently creates a plain JS expando and
**never touches the attribute**. The CSS rule `.icon-pill svg[hidden]` (~line
300) is correct and never matches, because the attribute never changes. The
initial state looks right only because the `hidden` attribute is written into
the markup by hand.

**Fix:** stop using the `.hidden` property on SVG. Either

```js
el.toggleAttribute('hidden', shouldHide);
```

or toggle a class and style on that. Both work on any element.

**Audit the whole file for the same mistake.** `#serve-dot` has a
`.serve-dot[hidden]` rule (~line 311) and is very likely being toggled the same
way — check it, and check any other SVG or non-HTML element toggled through
`.hidden`. Fix all of them, not just the mute button.

Verify by clicking: the crossed speaker must appear on mute and disappear on
unmute, and `aria-pressed` must follow.

---

## Task 2 — Home button

New control on the **playing screen**, to the **left of restart**. Row becomes:

```
[ home ]  [ restart ]  [ mute ]
```

- `.ctrl-chip.icon-pill`, same as its neighbours. 18×18 inline SVG, `#C5C5C5`,
  stroke-width 1.5, opacity 0.8 / hover 1.0. A simple house outline — roof
  triangle plus body, no fill, matching the visual weight of the restart and
  mute glyphs.
- `aria-label="Home"`.
- **Action: back to the idle screen with the surface selector already showing**
  — that is idle's `data-idle-step="armed"` state, not `attract`. The whole
  point is letting the player pick a different surface, so they must not have
  to make a gesture to reveal the selector again.
- The idle doodle resumes; the abandoned game's strokes are discarded. No
  confirmation prompt.

---

## Task 3 — Play again goes to surface select

On results, **PLAY AGAIN** currently starts a new game directly on the same
surface. That leaves no route back to the surface selector from the end of a
game, which is where a player most wants to try a different one.

Change it to the same destination as Task 2's home button: idle, armed, surface
selector showing.

Restart on the playing screen is unchanged — that stays an immediate same-surface
replay, and is now the only control that does.

---

## Task 4 — Results screen needs air

Results fits on a 13" but reads crammed. Give it room, and **let this screen
scroll** — it is a resting screen, not a live one, so a scrollbar is acceptable
here where it is not on playing.

- Roughly **64px above the logo** and **96px below the control row**. Stay on
  the 4pt grid; tune by eye.
- Do not apply the playing screen's fit clamp or the uniform `scale()` fallback
  to results. Let it be taller than the viewport.
- Playing and idle keep brief 25's tight rhythm exactly as-is. This is a
  results-only change.

---

## Task 5 — Audio mix

### 5a — One master bus, not 2.5× on every literal

Every SFX function currently connects straight to `actx.destination` with
absolute gains tuned in root (`sndScratch`'s click is 0.49, its body 0.36, and
so on). Multiplying each literal by 2.5 would push several past 1.0, clip on
the summing bus, and destroy the relative mix that makes those sounds read as
distinct objects.

**Build a bus instead:**

```
every SFX  →  sfxBus (GainNode)  →  sfxLimiter (DynamicsCompressorNode)  →  destination
```

- `sfxBus.gain` = **2.5** — the one knob. Every individual gain stays exactly at
  root's tuned value, so the mix is preserved and only the level moves.
- `sfxLimiter`: `threshold -6`, `knee 6`, `ratio 12`, `attack 0.003`,
  `release 0.15`. This catches the peaks a 2.5× boost creates instead of letting
  them distort.
- Create both lazily alongside `actx`; every SFX must connect to `sfxBus`, never
  to `destination`.

Report the final master value — 2.5 is the target, but if the limiter is working
hard on every paddle hit, back it off and say so.

### 5b — BGM down 20% during play

Currently 0.72 everywhere. Duck it to **0.58** while the player is in the game,
and keep it ducked through results so `sndGameOver` has room. Back to 0.72 on
idle. Ramp over ~600ms — a step change reads as a glitch.

### 5c — Point sound becomes a bell

`sndPoint` is currently a 320Hz sine holding for 1.4s. It has no attack and no
character, which is why it disappears under the BGM. Replace it with a struck
bell — a rin / singing bowl, which is the right instrument for this game.

A bell is an **inharmonic** partial stack with a hard attack and a long decay.
Starting recipe, tune by ear:

| Element | Freq | Gain | Decay |
|---|---|---|---|
| Strike transient | bandpass noise ~3000Hz, Q 1.5 | 0.10 | 12ms |
| Fundamental | 660 Hz | 0.30 | 3.0s |
| Partial 2 | ×2.72 (≈1795 Hz) | 0.16 | 2.0s |
| Partial 3 | ×5.06 (≈3340 Hz) | 0.08 | 1.2s |
| Partial 4 | ×8.7 (≈5740 Hz) | 0.04 | 0.6s |
| Beat partner | fundamental ×1.003 | 0.12 | 3.0s |

- Sine oscillators, attack ≈4ms, exponential decay to 0.001.
- The ×1.003 beat partner is what makes it sound like struck metal rather than
  a synth tone — real bowls beat slowly. Don't skip it.
- Those partial ratios are deliberately not integers. Integer ratios give an
  organ, not a bell.

### 5d — Game over: bigger, still zen

`sndGameOver` is a 220Hz sine for 2.5s. Keep its restraint — one strike, no
melody, no chord — and give it weight and length.

| Element | Freq | Gain | Decay |
|---|---|---|---|
| Strike transient | bandpass noise ~1400Hz, Q 2 | 0.12 | 20ms |
| Fundamental | 220 Hz | 0.34 | 4.5s |
| Partial 2 | ×2.74 (≈603 Hz) | 0.18 | 3.0s |
| Partial 3 | ×5.4 (≈1188 Hz) | 0.08 | 1.6s |
| Beat partner | fundamental ×1.004 | 0.14 | 4.5s |
| Sub | 110 Hz | 0.12 | 3.0s |

- Attack ≈15ms — slightly slower than the point bell, so it swells rather than
  cracks. That's where the drama comes from.
- Optional, try it: a **second strike at +1.6s, 45% gain**. One bell answering
  itself is temple-like; two different pitches would be a melody and wrong.
  Ship it only if it lands.
- 4.5s means it is still ringing under the ground wipe and into the haiku. That
  is intended — do not shorten it to fit the reveal.

### 5e — Frame glow more prominent

Current: `0 0 0 4px rgba(255,215,140,0.22), 0 0 28px rgba(255,215,140,0.22)`,
700ms.

- **On a point:** `0 0 0 6px rgba(255,215,140,0.38), 0 0 48px
  rgba(255,215,140,0.34)`, **900ms**.
- **At game over:** same colour, `0 0 0 8px` / `0 0 64px`, alpha ~0.45, held
  **1400ms** so it decays with the bell rather than ending before it.

Amber stays `rgba(255,215,140,·)` — it is the one warm accent the frame gets and
it should not become a new colour. Tune the alphas by eye.

---

## Verification

- Mute icon changes on every click, both directions. No other element in the
  file toggles `.hidden` on a non-HTML element — grep and confirm.
- Home button sits left of restart, goes to idle with the surface selector
  already visible. PLAY AGAIN goes to the same place. Restart still replays
  immediately on the same surface.
- Results has visible air above and below and may scroll; playing and idle are
  unchanged and still don't scroll at 1280×800.
- All SFX route through `sfxBus` — grep for `connect(a.destination)` and confirm
  none remain in an SFX path. BGM is unaffected by the bus.
- Sounds are clearly audible over BGM during play. Report the shipped master
  gain and whether the limiter is engaging on normal hits.
- Point reads as a struck bell with a long shimmer; game over as a deeper,
  slower bell still ringing through the reveal.
- Frame glow reads clearly on all three surfaces at both strengths.
- `git diff --stat main -- v3/engine/ v3/labs/ index.html` empty.

## Done looks like

You can leave a game and pick a new surface from anywhere. The mute button tells
the truth. A point lands with a bell and a warm pulse of light, and when the
game ends a deeper bell rings out over your painting while the ground pours in
underneath it.
