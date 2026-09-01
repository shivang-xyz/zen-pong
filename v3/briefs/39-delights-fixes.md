# Brief 39 — Delights, Round 2 (corrections + share/audio fixes)

Build on `feature/v3-delights-2` off `main`. Root `index.html` is generated —
edit `v3/app/index.html`, then `node v3/build.js`. `v3/engine/` and `v3/labs/`
stay byte-identical to `main` (the ball ramp is app-side). Docs to `main`.

**Ship model:** build it, self-verify against each task's checks, then merge to
`main` (`--no-ff`) and push. **Two items carry real behaviour risk — Tasks 4 and
5 — so your report MUST include the evidence each names** (measured numbers /
a round-trip screenshot). The architect will spot-check those two on the live
build; build them carefully.

---

## Task 1 — Attribution line: copy + style

Replace the current attribution line (drop the envelope icon entirely) with:

> Created by <u>Shivang Joshi</u> ✦ Music by <u>Omni Gardens</u> ✦ <u>Contact</u>

- **Only** "Shivang Joshi", "Omni Gardens", and "Contact" are links (underlined).
  "Created by" and "Music by" are plain text, not underlined.
- Links: Shivang Joshi → `https://www.shivangjoshi.xyz`; Omni Gardens →
  `https://omnigardens.bandcamp.com/album/moss-king-2`; Contact →
  `mailto:hello@shivangjoshi.xyz?subject=Zen%20Pong`. Site + Bandcamp open in a
  new tab (`rel="noopener"`).
- Separator is `✦` with a **single space** on each side. No icons.
- Same quiet styling as now: Space Mono ~11px, `--color-disabled`; the three
  links underlined, with a subtle warm/lighten on hover.

## Task 2 — Attribution line: not sticky, tucked below the fold

- **Desktop** (idle, results, desktop share): the line is **not** `position:
  fixed`/sticky. Put it in normal flow at the very bottom, and extend the page
  height just enough that the line sits **just below the fold** — the main
  content still fills the first screen, and a small scroll down reveals the line
  tucked underneath. (Matches the behaviour Shivang wants: it shouldn't be
  visible on the fold, but reachable with a nudge of scroll.)
- **Mobile** (gate, mobile share): keep the line **within the fold** as it is now
  — no extra scroll on mobile. In-flow at the bottom of the column, clear of the
  buttons.
- One shared implementation.

## Task 3 — Results text widths

- The "…of calm, gained" line must **never truncate** — remove any
  ellipsis/`nowrap`/fixed-width clip; let it take the space it needs on the left.
- The **haiku box on the right** is exactly as wide as the right-hand utility
  cluster beneath it (the timeline+save+share group — its left edge to the
  canvas's right edge). A long haiku **wraps to the next line** within that
  width and never extends beyond it. Right-align the haiku text so it sits under
  that cluster cleanly.
- Nothing else about the results layout changes; the gained-sweep, reveal timing,
  scrubber, save and share all stay as shipped.

## Task 4 — Ball ramp: rebuild on TOTAL GAME TIME  *(risk — include evidence)*

The current ramp resets every rally, so each point restarts slow — wrong. Make
the ball speed climb with **total time in the game**, monotonically, to keep the
canvas from crowding.

- `factor(t)` where **t = seconds since the game began** (set at `startGame`,
  **not** reset on serve): `1.0` at t=0, linear up to **1.5×** at **t=90s**,
  capped at 1.5× beyond. Tune the cap by feel if 1.5× reads as too much.
- Apply app-side to the app-owned `gameBall` each frame of play — scale the
  velocity magnitude to `baseSpeed × factor(t)`, preserving direction. Do **not**
  edit `v3/engine/`.
- A new serve keeps the current game-time factor (a mid-game rally opens already
  quicker); only a brand-new game resets it.
- **Evidence to report:** the measured ball speed (or factor) at t = 0 / 30 / 60
  / 90s of a game, showing the monotonic climb.

## Task 5 — Share & save capture the SCRUBBED frame, not max  *(risk — include evidence)*

Today share/save always encode the full artwork, ignoring the timeline. Fix:
**what the scrubber currently shows is what gets shared and saved.**

- The scrubber already renders `strokes[0..n]` for its current position. Use that
  same `n` when building the payload: encode `strokes[0..n]` plus only the
  splatter marks whose `afterStrokes ≤ n`. Blotches re-derive from the decoded
  subset as they do now.
- Apply to **both** the share link and the Save-PNG export (both WYSIWYG to the
  scrubber). Since the scrubber defaults to 70% (brief 31), an untouched share
  now sends the 70% frame that's actually on screen — that's correct, not a
  regression.
- No share-format version bump needed — it's still a stroke list, just a subset;
  the decoder already handles any count.
- **Evidence to report:** scrub to a partial frame, share, open the link in a
  fresh context, screenshot both — they must match. Repeat leaving the scrubber
  untouched (should share the 70% frame shown, not the full one).

## Task 6 — Mobile-gate "frozen doodle": verify on a REAL browser BEFORE fixing

Shivang saw the gate's canvas not animate in Chrome **devtools device-emulation**
mode, but it animates correctly on a real iPhone. The architect's headless
sandbox is itself an emulated context and could not reliably reproduce it, so:

- **Do not blind-change the gate/doodle code.** A wrong fix risks regressing the
  working real-device path.
- First **reproduce on a genuine browser window** — real Chrome/Firefox/Safari on
  desktop, resized narrow (< ~600px wide, which triggers the gate), **not**
  devtools device-emulation.
  - If the doodle **freezes on a real narrow window** → it's a real bug. Then
    diagnose and fix (likely a canvas-sizing or loop-gating issue when
    `#screen-idle` is `display:none`), and re-verify the real iPhone still works.
  - If it only misbehaves inside **devtools device-emulation** and a real narrow
    window is fine → it's an emulation artifact. Log it in `BACKLOG.md` and leave
    the code alone.
- Report which case it was.

## Task 7 — Music must start when entering the game from a shared link

Bug (seen in Opera, likely all): arriving via a shared link, then PLAY YOUR OWN →
idle-armed → serve, the BGM doesn't start until the mute button is toggled.

- Cause is almost certainly a suspended `AudioContext` on that path — only
  mute/unmute calls `resume()`. Fix: the **begin-game gesture** (`beginGame`, the
  serve that starts play) must `actx.resume()` **and** ensure BGM is playing, on
  every entry path including the share-arrival one — not rely on a later toggle.
- Verify: open a shared link, click through to play, and music starts on the
  first serve with no mute toggle. Confirm normal cold-start play is unchanged.

## Task 8 — One-tap native share on mobile (link)

On mobile, the **Copy Link** buttons — on the **mobile share** screen and the
**mobile gate** screen — become native-share buttons. (The "play your own"
navigation button is untouched.)

- On tap, call `navigator.share({ url: <the link> })` — the same URL the button
  copies today. This opens the OS share sheet (AirDrop, Messages, etc.). Share
  the **link**, not an image, so the recipient opens the live interactive artwork.
- **Fallback:** if `navigator.share` is unavailable, keep the current
  clipboard-copy + label-swap behaviour exactly as-is.
- Treat a user-cancelled share (`AbortError`) as a no-op — no error, button
  returns to normal. Desktop copy-link is unchanged.

---

## Verification (self-check, then ship)

- Attribution: reads `Created by Shivang Joshi ✦ Music by Omni Gardens ✦
  Contact`, only those three underlined, single-spaced ✦, no icon; all three
  links work. Not sticky — on desktop it's tucked just below the fold (small
  scroll reveals it); on mobile it's within the fold, clear of buttons.
- Results: gained line never truncates; long haiku wraps inside the right-cluster
  width and never overflows; everything else on results unchanged.
- Ball ramp: report the t=0/30/60/90s numbers (monotonic climb, resets only on a
  new game). `git diff --stat main -- v3/engine/` empty.
- Share/save: report the scrubbed round-trip screenshots (shared frame == on-screen
  frame; untouched == the 70% shown).
- Gate: report real-narrow-window vs devtools finding (fixed, or logged as
  artifact).
- Audio: shared-link → play → music starts on first serve, no mute toggle needed.
- Native share fires the OS sheet on mobile copy-link buttons; falls back to
  copy on unsupported browsers; cancel is a no-op.
- `node v3/build.js` twice byte-identical. Desktop full game, no regressions, no
  console errors. Then merge to `main` (`--no-ff`), push, reply with the live URL
  and the Task 4 / Task 5 evidence.
