# Brief 39 — Delights, corrections

**Ship directly — no plan-review step.** Branch off `main` (`feature/v3-delights-fix`),
self-verify against the checklist, merge to `main` (`--no-ff`), push, reply with
the live URL. Edit `v3/app/index.html`, then `node v3/build.js`. `v3/engine/` and
`v3/labs/` stay byte-identical to `main`.

Five corrections to brief 38. (A sixth reported item — a gate-canvas glitch only
in Chrome's devtools device-emulation — is being handled separately; it is **not**
in this brief. Do not change the gate.)

---

## Task 1 — Attribution line: copy, links, spacing

Change the line to exactly:

> Created by Shivang Joshi ✦ Music by Omni Gardens ✦ Contact

- **Remove the envelope icon** entirely.
- Three links, styled with **underline only** (nothing else changes — same Space
  Mono, same `--color-disabled`): **Shivang Joshi** → `https://www.shivangjoshi.xyz`,
  **Omni Gardens** → `https://omnigardens.bandcamp.com/album/moss-king-2`,
  **Contact** → `mailto:hello@shivangjoshi.xyz?subject=Zen%20Pong`. External links
  open in a new tab (`rel="noopener"`).
- Separator is `✦` with a **single space** on each side. Single spaces throughout —
  no wide gaps.

---

## Task 2 — Attribution line is NOT sticky

It's currently pinned/fixed. Remove that. Put it in **normal document flow as the
last element on the page**, below the main content, so it sits **just past the
bottom of the fold** — a small scroll reveals it, tucked underneath (not visible
at rest, not floating over the art). Extend the page height only as much as needed
to clear the fold; don't push it far down.

- Applies on desktop (idle, results). On the mobile screens (gate, share) it's
  already in flow — keep it in flow at the bottom of the content, clear of the
  action buttons, and it may wrap to two lines on a narrow phone.
- No `position: fixed`/`sticky` anywhere for this line.

---

## Task 3 — Results: protect the calm line, tidy the haiku

- **The calm/gained line never wraps.** `white-space: nowrap` on `.gained` — it
  always stays one line.
- **The haiku is constrained to the timeline chip's width** (the control directly
  below it on the right) and never extends beyond it: cap its `max-width` to the
  rendered width of `#timeline-chip`, right-aligned, `white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis` as a safety net.
- **Replace the long attributed quotes with short haiku so nothing gets clipped.**
  The current `QUOTES` are long philosophical quotes (e.g. the Alan Watts one) —
  clipped to the timeline width they'd read as broken. Swap the pool for short
  single-line haiku that fit cleanly. Use these (Shivang can tweak later):

  ```
  old pond, silent still
  wind moves, the pines reply
  still water holds the moon
  one leaf — then all of autumn
  empty sky, a single crane
  the path forgets my feet
  snow melts into the stream
  dusk folds into the hills
  clouds pass, the mountain waits
  no wind, yet the bell sings
  the rally, then the quiet
  first light on wet stone
  ```

  Keep the same seeded-selection mechanism (deterministic per game seed, so the
  share screen still matches). This changes what the results/share "haiku" shows —
  that's intended.

---

## Task 4 — Ball ramp is whole-GAME, not per-rally

The ramp currently resets every serve (`gameServeStartMs`), so each point starts
slow again — wrong. It should build over the **whole game** so the overall pace
rises and the canvas doesn't crowd out.

- Drive `gameSpeedRampFactor` from **`gameFirstServeMs`** (set once per game in
  `startGame()`) — i.e. seconds since the game began — **not** `gameServeStartMs`.
  Never reset it per serve.
- Keep the per-serve `gameRampAppliedFactor = 1.0` reset in `spawnGameBall()` — a
  fresh ball spawns at the engine's base speed and, on its first frame, gets
  bumped up to the current whole-game factor. That's what makes later points open
  already-faster instead of resetting to calm.
- Retune for a game-length curve: hold calm ~**15s**, ramp to the cap by ~**100s**,
  cap ~**1.6×** (tune by feel, report the final numbers). Stays app-side —
  `v3/engine/` untouched.
- Verify by logging the factor every ~10s of a played game: it should climb
  monotonically across the game and **not** drop back to 1.0 after a point.

---

## Task 5 — Share exports the SELECTED timeline frame

Right now **share** always encodes the full stroke set, so a recipient sees the
"max" painting regardless of where the scrubber sits. (Save-PNG already respects
the scrubber because it reads the rendered canvas — leave it.) Make share match
the scrubber. This is low effort and worth doing.

- Track the scrubber's current stroke count — store the `count` passed into
  `updateTimelineUI(count)` in a module variable (e.g. `currentTimelineCount`).
- In `copyResultsShareLink` (the `#btn-share` handler), don't encode
  `gameLastEndedStrokes` wholesale. Build a **sliced** copy first:
  `strokes = strokes.slice(0, currentTimelineCount)`, and
  `splatterMarks` filtered to those with `afterStrokes <= currentTimelineCount`.
  Keep `seed`, `surface`, `paintGroundHex`, `quote`, `durationSec` unchanged.
  Encode that sliced object.
- No wire-format change and no recipient change — the decoder just receives fewer
  strokes and renders exactly the frame the sharer saw. Default 70% still shares
  70%; scrub to any point and share it and the recipient sees that point.

---

## Verification (self-check, then ship)

- Attribution reads exactly "Created by Shivang Joshi ✦ Music by Omni Gardens ✦
  Contact", three underlined links all working, single-space spacing, no icon, and
  it sits just below the fold (small scroll reveals it) — not sticky — on idle and
  results; in-flow and clear of buttons on mobile.
- Results: calm line never wraps; haiku never exceeds the timeline width (ellipsis
  if ever needed); the short haiku show and nothing is clipped in normal cases.
- Ball speed rises across a whole game and does not reset each point; logged factor
  climbs monotonically. `git diff --stat main -- v3/engine/` empty.
- Scrub the timeline to ~40%, hit share, open the link in a fresh browser → the
  recipient sees the ~40% frame, not the full painting. Save-PNG still matches the
  scrubber too.
- `node v3/build.js` twice byte-identical. Desktop full game, no regressions, no
  console errors.
- Then **merge to `main` (`--no-ff`), push, reply with the live URL.**
