# Brief 29 — Share Page

The last new screen. Continue on `feature/v3-app`. Docs to `main`.

Read: `v3/design/4-share.html` (fidelity reference), `DESIGN.md` §8 Screen 4 /
§7 / §10 `.rbtn-primary`.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/art-lab.html`
byte-identical to `main`. Root `index.html` untouched.

---

## The problem this brief solves

Someone finishes a painting and sends a link. The person who opens it must see
**that painting**, not a demo. There is no server — v3 is a static file on
GitHub Pages — so the artwork has to travel inside the URL.

**Decision: transmit the artwork, not a replay.** Re-simulating the rally from
a seed plus recorded input would be smaller still, but it depends on
`Math.sin`/`cos`/`atan2` producing bit-identical results across browser
engines, which is not guaranteed. A divergence there is not a glitch, it is a
different painting. Sending the marks themselves has no such failure mode.

**The bar is visually indistinguishable, not pixel-identical.** The recipient
never saw the original, so a mark sitting three pixels over is not an error.
That bar is what makes the payload small enough to fit in a link.

**Replay stays cheap later.** The timeline scrubber already renders
`strokes[0..n]`. Animating n from 0 to the end *is* the replay, off the same
payload. Do not build it now; just don't foreclose it.

---

## Task 1 — Artwork payload

Encode into the URL **fragment** (`#a=…`). A fragment is never sent to the
server, so GitHub Pages has no length opinion at all.

### What travels

| Field | Notes |
|---|---|
| Format version | 1 byte. Future-proofs the decoder. |
| Surface | 1 byte — paper / chalk / paint |
| Game seed | 4 bytes — drives the ground texture, blotch placement and the haiku, so all three come free |
| Paint palette | scheme index, base index, ground index — 3 bytes, paint only |
| Strokes | count, then per stroke: colour index, `wt`, `op`, point count, points |
| Paint per-stroke | profile type and its params (2–3 bytes) |
| Splatter marks | 3–8 of them, explicitly — see below |

### Points — the bulk of it

- **Decimate.** Strokes are drawn through Catmull-Rom, so most 60fps samples are
  redundant. Keep every Nth point, starting **N = 3**, and tune until the curve
  is visually identical to the original.
- **Delta-encode.** First point absolute (10 bits x, 10 bits y — the canvas is
  1000×630). Every subsequent point as a signed byte pair, since consecutive
  samples are a few pixels apart. Reserve an escape for the rare larger jump.
- **Paint widths:** store the baked `.w` per kept point, quantised to one byte.
  Re-deriving them from the profile would need the original arc length, which
  decimation changes — a byte a point is cheaper than that inaccuracy.

### Compress

Use the browser's built-in `CompressionStream('deflate-raw')` /
`DecompressionStream`. It is a platform API, not a library, so the
no-external-libraries rule holds. Delta-encoded bytes compress well.

Fall back to uncompressed base64url if the API is missing, and mark that in the
version byte.

### Splatter must be sent explicitly

Live splatter (brief 24) is emitted per frame from a probability check, so it is
**not** reproducible from the seed alone. Serialise the marks: type, x, y, size,
colour index, and for flung marks the direction and its satellites. There are
only a handful; ~12–16 bytes each.

Blotches are the opposite — `buildIntersectionBlotches` runs deterministically
over the finished stroke set, so re-run it on the decoded strokes with the
decoded seed. Decimation may shift a cluster slightly; invisible, and it saves
serialising every satellite and droplet silhouette.

### Budget

Expect **2–5KB** of base64 for a full 3-point game. **Hard ceiling 8KB** — if a
game exceeds it, raise decimation and report the number. Report the real
measured size for a typical game on each surface.

---

## Task 2 — Screen 4

Per `v3/design/4-share.html` and `DESIGN.md` §8 Screen 4.

```
32   logo, cream fill, centred
32
canvas 800 x 504, radius 48, border 8px #888888, artwork + ground
32   haiku, DM Serif italic 14px #C5C5C5, centred
32
#share-row (800px, space-between)
  LEFT:  [ PAINT/PLAY YOUR OWN ]   .rbtn-primary
  RIGHT: [ DOWNLOAD PNG ] [ COPY LINK ]   .rbtn, gap 16
```

- **800 × 504 resolves `DESIGN.md` §7's UNRESOLVED share-canvas size.** It is
  exactly 0.8× the game canvas, so render the 1000×630 artwork scaled to 0.8.
  Border (8px) and radius (48px) stay fixed and do **not** scale down with it —
  that is deliberate in the mockup.
- No score, no controls, no author, no date, no seed. One row of actions so the
  page holds in a single fold.
- `.rbtn-primary` per the design file: 1px hairline gradient wrapper, the five
  trail colours wrapped back to pink, `background-size: 200% 100%`, 12s linear
  loop. The button itself stays dark — no fill change, no size change.
- The label's first word alternates PAINT → PLAY every 3s, hard cut, in a fixed
  44px slot so nothing reflows. `DESIGN.md` §10 marks this "needs ratifying" —
  build it as designed, and flag it at review as the one behaviour that has
  never been signed off. It is one CSS rule to drop if it reads as a fidget.

---

## Task 3 — Flows

- **Results → SHARE** navigates to Screen 4 showing the player's own artwork —
  a true preview of what a recipient will see. The link is generated here.
- **COPY LINK** copies the full URL including the fragment, to the clipboard.
  Give it a brief confirmation state on the button itself (label swaps to
  "copied", ~1.5s). No toast, no new component.
- **DOWNLOAD PNG** reuses the brief-26 exporter at full resolution — the 2×
  1000×630 output, not the 800-wide preview. Same `zen-pong-<seed>.png` name.
- **PAINT/PLAY YOUR OWN** goes to idle in its **armed** state, surface selector
  showing — same destination as the home button and PLAY AGAIN (brief 28). A
  recipient landing cold should be one click from playing.
- **Landing with a fragment:** decode and go straight to Screen 4. Do not flash
  the idle screen first.
- **Landing without one:** normal idle, exactly as now.

---

## Task 4 — When the payload is broken

Links get truncated by chat clients and mangled by hand. Decode failures must be
quiet:

- Bad version, failed decompress, malformed data, or a length that doesn't
  match the header → fall through to the normal idle screen. No error UI, no
  console noise beyond one `console.warn`.
- Never render a half-decoded artwork. A partial painting presented as
  someone's finished piece is worse than no painting.

---

## Verification

- Finish a game on each surface, hit SHARE, copy the link, open it in a
  different browser profile. The artwork must be **visually indistinguishable**
  from the original — screenshot both and compare side by side, all three
  surfaces.
- Report the measured payload size per surface, and the decimation N you shipped.
- Splatter marks appear in the shared copy in the same places.
- Haiku matches — it comes off the transmitted seed.
- Share canvas measures 800×504 with an 8px border and 48px radius.
- DOWNLOAD PNG gives the full-resolution export, not the preview size.
- COPY LINK works and confirms. PAINT/PLAY YOUR OWN lands on idle-armed.
- Truncate a link by hand → clean fall-through to idle.
- No external libraries. `CompressionStream` used with a working fallback path —
  test the fallback by stubbing the API away.
- `git diff --stat main -- v3/engine/ v3/labs/ index.html` empty.

## Done looks like

You finish a painting, hit share, paste the link to a friend, and they open your
exact piece — ground, marks, splatter, haiku — with one button inviting them to
make their own.
