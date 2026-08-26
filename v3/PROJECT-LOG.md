# PROJECT-LOG.md — Zen Pong v3 Living State

Newest entries at top. Each session appends where it left off. A fresh chat
reads this to know exactly where the project stands.

---

## 2026-08-27 — Brief 33 built on `feature/v3-polish`. CTA states, icons, share/surface fixes, mobile repair.

Fifth brief on `feature/v3-polish`, sitting on top of 31/32. Not merged this
session; same review rhythm as before the ship.

**Task 1 — the CTA state system is real now.** `cta.css` copied verbatim into
the app's `<style>`, placed after every resting rule so it wins ties, per
that file's own instruction. The actual work was finding and deleting every
rule that predated it and fought it — `.rbtn`'s `opacity: .85` hover-dim,
an equivalent opacity pair scoped to the mobile share screen, `.icon-pill
svg`'s hover-to-opacity-1 override, and two `.pal-pill` rules (dot hover-
scale, an un-scoped shuffle hover colour that would have stuck on touch).
None of these would have thrown an error or looked obviously wrong in a
diff; they'd have just silently fought the new glow, in some cases only on
touch. Timeline scrubbing is wired for real now too — `.scrubbing` added on
`pointerdown`, removed on a `window` `pointerup`, matching the reference
page's own script. Every state — hover, focus-visible, press, the mute
persistent glow, the scrub glow — was measured against `cta.css`'s own
computed values, not eyeballed: exact matches throughout, including
confirming the icon SVGs' own `stroke` genuinely follows `currentColor`
through a state change, not just the button chrome around them.

**Task 2 — icon set.** `home`/`replay`/`mute`/`sound` inlined verbatim from
the new `v3/app/icons/` source files. `home` and `sound` are real visual
changes (sound gains the two wave arcs the old icon never had); `replay`/
`mute` were already identical path data. `shuffle` and `cursor` were left
untouched — Shivang's explicit call: `cursor.svg`'s stroke-only
`currentColor` glyph would have gone invisible against the cream canvas
(the shipped cursor is a solid two-tone dark-fill/cream-outline mark for a
reason), and the shuffle icon already matches `cta-states.html` at its
current size. `save`/`share`/`link`/`play` are in the repo as source,
wired nowhere — the results/share buttons stay text-only, as designed.

**Task 3 — results "share" copies in place.** No longer navigates to the
share screen; encodes and `history.replaceState`s the real `#a=…` fragment
exactly as before, then copies it via the same shared clipboard core
already used by desktop share and mobile share, instead of showing the
player the painting they were already looking at. The share screen itself
is untouched — still the landing view for a recipient's link.

A real bug came out of verifying this, not the plan: the shared copy
helper used to read `e.currentTarget`, which the DOM resets to `null` the
instant an event finishes dispatching — synchronously, before an `await`
inside the listener ever resumes. The new handler awaits the fragment
encode before it can call the helper, so `e.currentTarget` was already
gone by then; the clipboard write itself succeeded, but "Copied!" never
appeared, silently. Confirmed with a two-line test (`e.currentTarget` true
mid-listener, false after one awaited microtask) before fixing it — the
helper now takes the button element itself, captured synchronously, at
all three of its call sites. Re-verified afterward with an actual trusted
click (this sandbox's own synthetic-input warning confirmed a real OS
clipboard write happened): label showed "Copied!", reverted after 3s, no
navigation. Then went a step further than prior briefs could — fed the
exact copied fragment back through the real `decodeFromFragment`/
`decodeArtworkPayload`/`renderSharePage` pipeline and confirmed it
rendered correctly (8 strokes, matching seed). Every prior brief's share
verification was code review plus isolated logic checks, because this
sandbox couldn't produce a real trusted clipboard write; this is the first
time the actual end-to-end path — real click, real copy, real decode —
was observed directly.

**Task 4 — surface selection can't start a game.** `onGesture` now ignores
any click/touchstart that originates on a control (`#surface-chip`,
`.ctrl-chip`, any `button`) — fixes it at the one place both the mouse and
touch paths funnel through, rather than trusting every handler to
`stopPropagation()` correctly (the touch path never did). A second real
bug turned up live: the first version of the guard checked `e.target` for
every gesture type, including the ones arriving from the window Space-key
listener — and a keydown's target is whatever has keyboard focus, which
after a mouse click on a tile is the tile itself. Spacebar silently did
nothing right after picking a surface with the mouse. Scoped the guard to
click/touchstart specifically; a direct keydown dispatch with a tile
deliberately focused confirmed arm-then-start both still work.

**Task 5 — five real mobile bugs, all fixed at cause, all reverified live:**
- **5a** (the worst one): `landingWithSharePayload` is `let` now, cleared
  in `goToIdleArmed()` — and cleared *before* `setScreen()`, not after,
  since `setScreen` reads it synchronously through its own
  `fitScreenToViewport()` call. A recipient tapping "play your own" now
  lands on a genuinely animating gate at once — verified live, including
  running the exact link produced by Task 3's real copy back through the
  real decode pipeline first, then tapping through from there.
- **5b**: `100vh` → `100dvh` on both mobile screens and `#full`'s rotation
  fallback; the hard `overflow:hidden` scroll lock is gone entirely for
  the gate/share case (`overflow-y:auto` on the screen containers instead),
  with `justify-content: safe center` applied on both up front — this
  sandbox can't reproduce iOS's real 100vh/100dvh gap to confirm the risk
  either way, so it's not gated on "if observed broken." Verified at a
  deliberately short 375×500 viewport: every control, including the top
  logo, reachable by scroll both directions on both screens.
- **5c**: resolved by 5a/5b landing, confirmed live (real animation, real
  non-zero canvas height).
- **5d**: mobile share's logo-to-"tap to view" gap measured at exactly
  16px after the fix (was ~32, double the spec).
- **5e**: re-confirmed centred post-5b, at both a tall and a short
  viewport.

Desktop fully unaffected — a complete game start to finish, zero console
errors, verified via a temporary debug hook (removed before commit, same
pattern as every prior brief).

`node v3/build.js` run twice, byte-identical. `git diff --stat main --
v3/engine/ v3/labs/` empty throughout.

### Next
Review `feature/v3-polish`, merge when approved. `PORT-PLAN.md` renumbered
— BGM replacement is now brief 34, the QA sweep is brief 35.

## 2026-08-26 — Brief 32 built on `feature/v3-polish`. Mobile gate + share screens.

Replaces brief 30's placeholder — a translucent `#mobile-overlay` card
floated over the still-rendered desktop screen via a JS cover/contain
scale-transform — with two real, natively-responsive mobile screens. Not
merged this session; sits on `feature/v3-polish` behind brief 31, same
review rhythm as every brief before the ship.

**Architecture.** A new presentation-layer selector, `updateMobileScreens()`,
sits alongside the untouched `screenState`/`screens`/`setScreen()` machine —
it means exactly what it meant before, mobile or desktop. The selector
toggles `mobile-gate-active`/`mobile-share-active` on `<html>`, which give
the four desktop `.screen` sections a REAL `display:none` (not a visual
cover) and show one of two new sections instead. `isTouchDevice()`/
`isMobileBlocked()` detection is unchanged, per the brief. The old cover/
contain scale-transform branch in `fitScreenToViewport()` is gone entirely,
replaced by a call to `updateMobileScreens()` and an explicit early-out on
touch — not left to an accidental side effect of the desktop fit-math
against a zero-sized `display:none` element.

**Task 3 — the gate, running the real doodle.** This was the brief's own
flag as "the one with real thought in it," and it's the one thing brief 30
explicitly punted on (`MOBILE-NOTES.md`'s own recommendation: run the real
engine, not a CSS stand-in). `paddleL`/`paddleR` — previously static
`{180}`/`{430}`, doubling as the doodle ball's real collision surfaces —
are now driven by a JS reproduction of the design's own CSS keyframes
(4.5s loop, per-segment ease-in-out, confirmed exact against the design's
own timing, not approximated) whenever `isMobileBlocked()`, and snapped
back to their static values every frame otherwise (verified nothing else
in the file ever reads/writes them, so this is safe). Verified with a real
collision measurement, not a visual guess: drove 2000 physics steps and
confirmed the ball's closest approach to the left edge landed inside the
paddle's own animated span at that exact moment. `drawGateFrame()` shares
one paint routine (`paintDoodleFrame(ctx)`, extracted from the old
`drawFrame()`) with the desktop doodle canvases — same draw calls, one
different destination — and `doodleLoop()` calls only the gate path while
gated, skipping the desktop canvases entirely rather than painting them
invisibly every frame (a real perf fix a Plan-agent review caught before
this was built, not found after). Reduced motion holds one completed
still via a capped 300-step headless fast-forward (stops early the instant
a ball reset would occur) — measured at 2.4–3.4ms per burst, safe for a
phone's first paint.

**Task 2 — mobile share.** New screen (logo, tap-hint, artwork, haiku,
actions) populated by one more `drawImage()` blit off `renderSharePage()`'s
existing full-size canvases — no new render logic. Tap opens a rotated
fullscreen view; per Shivang's explicit edit to the plan, this draws a
FRESH COPY into its own canvas pair on open rather than moving the live DOM
node (`cloneNode()` on a canvas never copies its bitmap — confirmed against
spec, so the design's own literal approach was never viable either way).
Sized to `MOBILE-NOTES.md`'s exact formula; skips the rotation in a real
landscape viewport. Copy-link unified into one `copyLinkToClipboard(text,
onSuccess)` core, reused by desktop share, mobile share, and the gate, each
with its own success callback per its own copy spec. The logo image is now
preloaded once at script init instead of per-export, closing an async gap
(an `<img>.onload` yield) that risked WebKit treating a subsequent
`window.open()`/`navigator.share()` as no longer user-triggered — same fix
benefits every export path, not just the new mobile one.

**Two real bugs, caught and fixed during verification, neither anticipated
in the plan:**
- The new canvases (`#gate-canvas`, the mobile-share and fullscreen pairs)
  don't inherit `width:100%;height:100%` for free — that rule is scoped to
  the existing desktop canvas IDs specifically, not generic. Without it
  they rendered at native 1000×630 clipped inside a ~343px-wide wrapper.
  Added matching rules for the new IDs; re-verified via
  `getComputedStyle` and fresh screenshots.
- A forced landscape+touch viewport (812×375) exposed that the scroll lock
  made below-fold content — the gate's message card and copy button,
  mobile share's haiku and all three buttons — genuinely unreachable, not
  merely ugly, on a rotated phone or a landscape-default iPad. Per
  Shivang's own instruction on this exact risk ("if it's ugly but usable,
  fine — just say so"), this crossed that bar, so it got a minimal fix:
  landscape is exempted from the scroll lock. Verified reachable via
  scroll afterward.

**Verification gaps, flagged honestly rather than glossed over:** real
clipboard copy still can't be verified live in this sandbox (same
document-focus limitation as briefs 29–31) — the label/hint swap logic was
verified in isolation instead. `navigator.share`/`canShare` are entirely
unavailable in this sandbox, so only the no-Web-Share fallback path was
live-exercised; the Web Share branch itself is code-reviewed, not run.
Reduced-motion's end-to-end freeze in `doodleLoop()` was verified via the
fast-forward function running in isolation, not a live
`prefers-reduced-motion` render — this sandbox's `matchMedia` reports
`false` for it and (unlike coarse-pointer) can't be monkey-patched the same
way. Worth a real click-through on all three once this is reviewed outside
the sandbox.

Desktop regression: a full game start to results/share is unaffected. A
cold load with a real share-link fragment at mobile viewport renders via
the mobile share screen, never intercepted by the gate — including the
brief-29 `landingWithSharePayload` race-window case.

`node v3/build.js` run twice, byte-identical (319650 bytes). `git diff
--stat main -- v3/engine/ v3/labs/` empty throughout.

### Next
Review `feature/v3-polish`, merge when approved. Brief 33 (BGM replacement
— `Oolong.mp3` isn't licensed for commercial use) is written and waiting;
34 is the QA sweep.

## 2026-08-26 — Brief 31 built on `feature/v3-polish`. Palette, paint, sound, text.

First post-ship polish pass, off `main` per the new branch. Not merged this
session — sits on `feature/v3-polish` pending review, same rhythm as every
other brief before the ship.

**Palette (Task 1) — every number verified in code, not eyeballed.** A small
`deltaE` mirror of palette.js's own private `oklabDeltaE` (off the already-
exported `hexToOklab`) prints and asserts every claim at load. Measured live,
matches the brief's own worked table to the decimal: paper hues
25.2/144.9/264.6° (gaps 119.7/119.7/120.6, triadic), ground ΔE
0.310/0.313/0.328; chalk ground ΔE 0.605/0.607/0.600, all comfortably clear
of their floors. Paper's green — the thing that started this brief — now
holds against cream at a glance. Chalk's new triad reads at genuinely even
weight on the board, gold/cyan/pink no longer uneven the way yellow used to
dominate. Paint's default confirmed pinned to the approved reference
(triadic, base 0, Cream, Crimson/Yellow/Cyan-blue) at both the doodle and a
fresh game; 20 live shuffles produced only triadic/split-complementary.

Chalk's new palette is an **app-level override**, not an engine edit —
`v3/engine/chalkboard.js` no longer supplies `CHALK_PALETTE` to the app at
all (dropped from the import); the app defines its own array of the same
name. Same pattern `PAPER_PALETTE` already used, same pattern BACKLOG.md
already documents for paint's width constants — the product value wins,
the engine file stays untouched.

**Paint marks (Task 2).** Blotches removed everywhere the artwork renders,
not just the reveal the brief's own text names — results AND the share
screen (brief 29's `renderSharePage` called the same function to reproduce
the reveal for a link; leaving it there would have made a shared link show
a different painting than the one actually shared). Splatter: cooldown
40->24, target 3-8/game->10-18/game, measured against 20 real headless
games at the shipped tuning — 19/20 landed inside the range, one short game
at 9. The cap (18) is doing real work here, not sitting as a rare safety
net the way it mostly did against the old 3-8 target — a game's total
splatter count scales with its own rally length, which the port's own
history (briefs 29/30) already measured varying by thousands of steps game
to game, so no per-frame probability alone holds a tight band without a
real ceiling. Pushing the one below-10 outlier up would mean most games
land on the cap instead of varying — left as measured. No black splatter
(ink weight dropped from the live color pool entirely — the ball marker
itself is unaffected, that's a separate legibility call). Paint opacity
0.88, both strokes and splatter, confirmed at the pixel level
(224/255 = 0.878); paper and chalk untouched.

**Sound (Task 3).** Game-over is a real two-note "da-DUM" now — D4 then G3,
a falling perfect fourth 380ms apart — not brief 28's same-bell-twice.
Verified by spying on every oscillator/gain call against hand-computed
expected values: exact match, all 10 partials across both strikes.

**Timeline (Task 4) and copy link (Task 5).** Reveal opens at 70%
(measured: 71/102). Copy link's fallback path (hidden input +
execCommand) is implemented and its show/revert timing verified in
isolation, but a real successful copy could not be verified live —
this session's own sandboxed browser tool fails both
`navigator.clipboard.writeText` and `execCommand('copy')` for a
document-focus reason unrelated to the code (same limitation hit during
brief 29). Worth a real click-through once this is actually reviewed in a
normal browser.

**Idle text (Task 6).** Both strings rewritten fresh, not ported — root's
copy was never this game's actual UI text. Cream, not grey; a single
seamless-loop keyframe floats it ±3px over 3.2s, `prefers-reduced-motion`
respected.

`node v3/build.js` run twice, byte-identical. `git diff --stat main --
v3/engine/ v3/labs/` empty throughout — engine and lab genuinely untouched
despite two of six tasks (chalk palette, blotch removal) touching things
those files own.

### Next
Review `feature/v3-polish`, merge when approved. Brief 32 (real mobile
share/gate screens) and 33 (BGM replacement — `Oolong.mp3` isn't licensed
for commercial use) are written and waiting; 34 is the QA sweep.

## 2026-08-26 — v3 live. Post-ship feedback split into briefs 31, 32, 33.

Brief 30 shipped; the live URL serves v3. Architect verification of the built
artifact (sandbox, not the live URL — no egress to github.io from here): rebuild
byte-identical to committed, no `type="module"`, og-image exactly 1200x630,
`pointer: coarse` detection present, all three surfaces play to results and
share with zero console errors and zero 4xx, payloads 533-1080 chars, **`file://`
loads and animates** (the single-file build earning its keep), mobile overlay
gates the game, and a share link on a phone viewport renders the artwork with
the overlay correctly standing down. Share screen sits flush edge-to-edge on
mobile — measured, no overflow, purely cosmetic — backlogged and now superseded
by brief 32.

### Why the feedback became three briefs, not one
Shivang sent everything together. Tasks 1-6 are one file, one review, one
rhythm. The mobile work is two new screens with a rotated full-screen view and a
real-engine gate — a brief on its own by any measure. Music is an open direction
that needs a decision before anything is written. Splitting keeps each review
tractable; bundling would have produced one unreviewable session.

### Brief 31 — the palette finding worth recording
"Make the paper green darker" turned into a structural problem once measured in
OKLCh. Paper's pink is at hue **354.2**, blue at **263.0** — a **91-degree gap**,
which is neither triadic (120) nor split-complementary (150/60). And the green
`#8CFFB4` sits at L **0.913** against the other two at 0.70-0.73: it does not
disappear on cream because it is slightly light, it disappears because it is a
whole tonal register brighter than its own palette.

So the requested rule cannot be satisfied without moving one of the three. Two
measurements made the choice:

- A true triad at **25 / 145 / 265, L 0.70, C 0.16** puts the blue at `#6D9AFF`,
  which is **dE 0.005** from the existing `#689AFF` — perceptually the same
  colour. The paddle token never moves and nothing looks like it shifted.
- The red lands at `#F2716A`, **dE 0.104** from the paddle's `#FF68AE` — *below*
  the 0.15 accent-separation floor, so it reads as the same hue family rather
  than a near-miss. A coral at dE 0.2 would have looked like a bug; this doesn't.

Split-complementary was measured too and rejected on evidence: its two partners
sit 60 degrees apart, producing green/blue pairwise dE of **0.149** — under the
0.15 floor. Triadic separates properly, split-comp does not, at these hues.

Chalk had the same illness: hue spacing 101/93/166, and uneven ground contrast
(yellow 0.647 vs blue/pink ~0.46). Rebuilt as a triad at L 0.80 with a new
**dE >= 0.55 against `#1A1A1E`** guard asserted in code — a chalk palette that
goes invisible on the board is the one failure mode this surface has already
hit twice (BACKLOG's brief-10 smudge item, brief 17's retune).

### Brief 32 — the gate question, answered yes
Shivang asked whether the gate could keep the design's paddle-and-cursor
animation but run the real idle doodle inside the canvas. Yes, and
`MOBILE-NOTES.md` §5 independently recommends the same thing.

The part that needed deciding: **do not layer the design's paddle animation over
a doodle whose paddles are static.** The ball would visibly bounce off nothing
while the visible paddles moved elsewhere — worse than the CSS placeholder.
Instead, drive the doodle's own `paddleL`/`paddleR` objects from the design's
keyframe motion and position the DOM paddles from those same values. The ball
then genuinely bounces off the paddle the cursor is dragging, which is the
entire point of the screen. The seam already exists (the doodle passes those
objects into `advanceBall`), so it is a few lines.

Shipping the CSS stand-in would have meant maintaining a second, worse renderer
of the same thing forever — the two-algorithms trap briefs 19-20 spent two
sessions escaping.

Mobile tokens ship as fixed values rather than a ratio (closing MOBILE-NOTES
open question 1): a ratio produces fractional radii and frame widths at
arbitrary widths, and this codebase has already lost a round to 2px marks
landing on fractional pixels (brief 25).

### Brief 33 — music: recommendation on record
`Oolong.mp3` is not licensed for commercial use and has to go. The
recommendation given to Shivang is **generative ambient synthesised in Web
Audio** rather than sourcing licensed tracks. It removes the licensing question
entirely (he owns the output), removes a 2.5MB asset and makes the build
genuinely self-contained (closing a brief-30 backlog item), never repeats, and
can follow game state. The bell synthesis from briefs 28 and 31 is most of the
instrument already. Decision pending.

### Next
31 -> 32 -> 33 -> 34 (QA sweep + backlog triage).

## 2026-08-25/26 — Brief 30 shipped. The port is done. v3 is live.

`https://shivang-xyz.github.io/zen-pong/` serves v3. `v2-final` tags the
pre-swap `main` tip, pushed to origin — v2 is recoverable by name forever.

**What shipped, in one pass:**
- `v3/build.js` — the single-file requirement and the never-copy-paste-the-
  engine rule, resolved by a build step instead of hand-inlining. One IIFE
  per engine file (real module scoping, not flattening) so
  `v3/engine/chalkboard.js`'s and `v3/engine/density.js`'s two DIFFERENT
  functions both named `computeLineDensity` can never collide in the bundle.
  Caught and fixed before it shipped: a naive one-name-per-line export
  extractor would have silently dropped `H`/`PW`/`PH`/`BR`/`PAD_MAX`/`WIN`
  from `physics.js`'s real multi-declarator `export const` lines — not a
  crash, `WIN` becomes `undefined` and the game would never register a win.
  Fixed with a depth-aware scanner; verified against the actual generated
  output and by driving a real headless game through it to a real result.
  Two runs produce a byte-identical file.
- Mobile. v3 shipped with zero mobile handling before this brief. Root's
  `#mobile-overlay`/cover-vs-contain scaling ported, but the detection is
  capability-based (`isTouchDevice()`: width ≤600 OR `matchMedia('(hover:
  none) and (pointer: coarse)')`), not a width breakpoint — v3 has no touch
  paddle control at all (unlike root), so a plain breakpoint would let an
  iPad through with no overlay and a paddle that never moves. Two real bugs
  caught in review before they shipped: `screenState` doesn't flip to
  `'share'` until an async decode resolves, so a naive block-unless-share
  check would flash the overlay on a real shared link opened on a phone; and
  the mobile scale math initially read `window.innerWidth/innerHeight`,
  which this session's own testing tool reports inflated by a fixed factor
  in its mobile-emulation mode — switched to
  `document.documentElement.clientWidth/clientHeight`, the standard source
  for actual layout viewport size, after share's artwork visibly bled off a
  screenshot's edge with the wrong values.
- Metadata: title, description, OG/Twitter cards, `theme-color`, a favicon
  derived from the logo's own dot mark. `og-image.png` is a real finished
  painting (not `exportArtworkPNG`'s 2128×1588 reused as-is — that ratio
  would crop badly at the required 1200×630) — a dedicated composition,
  picked as the most open of five candidate games so it reads clearly at
  thumbnail size instead of as dense noise.
- The swap: tag, build, merge `--no-ff`, push, verified on the live URL —
  full idle→playing→results→share loop, audio unlock/BGM load, a real
  shared link opened cold on the live domain, `file://` (static-render
  verified — this session's browser tooling couldn't drive JS on a file://
  path outside its own sandboxed project root, so full interactivity there
  is asserted from the script no longer containing any ES module syntax,
  not independently re-observed), the art lab still running unchanged.
  `feature/chalkboard-surface`/`feature/paint-surface` deleted (confirmed
  merged); `feature/fill-regions` left, still blocked on its own fix.

**What didn't ship, stated rather than left quiet:** `Oolong.mp3` and the
Google Fonts link stay outside the single HTML file (both logged in
`BACKLOG.md`, neither blocks anything). Touch paddle control — v3 blocks
every touch device behind the overlay rather than half-supporting it;
playable touch is real, separate work, backlogged for brief 31. Basier
Circle self-hosting is explicitly *not* queued as a mechanical swap even
though the font files already sit in the repo — it's a typeface decision
against what every v3 screen was actually designed with, needs Shivang's
call.

**Next:** brief 31 — the QA sweep + full `BACKLOG.md` triage, the checkpoint
the backlog has named for itself since it was created.

## 2026-08-25 — Brief 29 verified in-browser. Brief 30 (ship) written.

Share page built. Rather than hand Shivang another QA list, the architect chat
pulled `feature/v3-app` into a sandbox, served it, and drove three full games
through Playwright — paper, chalk and paint — hitting SHARE on each and opening
the resulting links cold in a fresh browser context.

**Results — the payload architecture holds:**
- Round trip works on all three surfaces. A shared link lands directly on
  `#screen-share` with the artwork rendered.
- Original vs. shared render: **pixel-identical** apart from ~450 pixels, all
  inside the `.rbtn-primary` bounding box — i.e. the animated gradient hairline
  and the PAINT/PLAY word swap, both of which are supposed to differ frame to
  frame. The artwork itself matched exactly.
- Payload sizes: **paper 998, chalk 425, paint 1005 characters.** The brief's
  hard ceiling was 8192. Decimation could arguably be *reduced* if fidelity ever
  needs it — there is an order of magnitude of headroom.
- Haiku matched across the boundary on all three (the seed travels).
- Zero console errors, zero page errors on both send and receive sides.

The pixel-identical result is worth noting against the brief's own stated bar,
which was only "visually indistinguishable". The decimate-and-delta approach did
better than it needed to.

Observed and passed to Shivang rather than acted on: live splatter reads sparse
in a short 3-0 game — one visible drop. May be the game length, may be the rate.
His eye, on a longer rally.

### Brief 30 — the contradiction it has to resolve
`PORT-PLAN.md` requires one self-contained file. `v3/CLAUDE.md` forbids a
consumer ever copy-pasting engine code. Hand-inlining the engine to satisfy the
first would violate the second permanently — the lab and the product would drift
apart silently, and it would surface months later as "I tuned it in the lab and
the game ignored me."

Resolved with a build step: `v3/build.js`, plain Node, no dependencies, inlines
the engine modules in dependency order and emits root `index.html` as a
**generated artifact nobody edits**. The engine stays the single source of
truth; the shipped file is output. That rule goes into `v3/CLAUDE.md` as settled,
not just a code comment.

Why single-file is worth the trouble at all, recorded so it isn't cargo-culted
later: ES modules do not load over `file://`. Single-file means the game opens
from disk, can be emailed, and hosts anywhere.

### Stated rather than papered over
Two things stay outside the "self-contained" file, and the brief says so out
loud instead of letting the claim quietly become false: `Oolong.mp3` (root
`CLAUDE.md` §4 forbids base64 audio, and 2.5MB of it would be absurd anyway)
and the Google Fonts link (`DESIGN.md` §3's interim substitute, pending Basier
Circle). Both pre-existing, neither blocks ship, both backlogged.

### The one real ship blocker
**Mobile.** v3 has none — the game is mouse-driven and on a phone it will load
and be unplayable. Root already solves this (`checkMobile`, `#mobile-overlay`).
The part a naive port would miss: **a shared link opened on a phone must still
render the artwork.** That is the single likeliest way a phone visitor arrives —
someone sent them a painting. Overlay the game, never the share screen.

### Next
30 ships it. 31 is the QA sweep plus the full `BACKLOG.md` triage — the
checkpoint the backlog names for itself.

## 2026-08-24 — Brief 28 approved. Brief 29 (share page) written.

Navigation, audio mix and results spacing all landed and approved. Small
outstanding polish deliberately deferred — Shivang's call is speed to a
shippable build, then a QA sweep.

### The share architecture — the one real decision left
Put to Shivang explicitly, because it changes what gets built and could not be
resolved from the repo: there is no server, so a shared artwork has to travel
inside the URL or not travel at all. His answer: the recipient must see the
exact painting; static is fine, replay can wait; the primary CTA follows the
design.

**Chosen: transmit the artwork, not a replay.** A seed-plus-input replay is
smaller, but it depends on `Math.sin`/`cos`/`atan2` returning bit-identical
results across browser engines, which no spec guarantees. A divergence there
does not read as a glitch — it produces a *different painting*, silently.
Sending the marks has no such failure mode.

**The bar is visually indistinguishable, not pixel-identical.** The recipient
never saw the original, so a mark three pixels over is not an error. Setting
that bar deliberately is what makes the payload small enough to fit in a link:
decimate to every 3rd point (Catmull-Rom makes most 60fps samples redundant),
delta-encode, and run it through the browser's native `CompressionStream` —
a platform API, so the no-external-libraries rule holds. Expected 2-5KB, hard
ceiling 8KB.

Two asymmetries worth recording:
- **Splatter must be transmitted explicitly.** Brief 24's live splatter is
  emitted from a per-frame probability check, so it is not reproducible from the
  seed. Only a handful of marks; ~12-16 bytes each.
- **Blotches must not be.** `buildIntersectionBlotches` is deterministic over a
  finished stroke set, so it re-derives from the decoded strokes and seed.
  Decimation may shift a cluster slightly — invisible, and it saves serialising
  every satellite and droplet silhouette.

The fragment (`#a=…`) is never sent to the server, so GitHub Pages has no
length opinion.

**Replay is not foreclosed.** The timeline scrubber already renders
`strokes[0..n]`; animating n from 0 off the same payload *is* the replay. Not
built now, deliberately available later at near-zero cost.

### Resolved and flagged
- **`DESIGN.md` §7's UNRESOLVED share-canvas size resolved: 800x504** — exactly
  0.8x the game canvas, so the artwork scales cleanly. Border and radius stay
  fixed rather than scaling with it, per the mockup.
- **`.rbtn-primary`'s PAINT/PLAY label alternation is built as designed but has
  never been ratified** (`DESIGN.md` §10 says so itself). Shivang asked for the
  CTA per the design, so it ships; flagged at review as one CSS rule to drop if
  it reads as a fidget.

### Next
29 → 30 (integration + ship): fold into one self-contained `index.html`, replace
the live root file. After that the QA sweep and `BACKLOG.md` triage — which is
the checkpoint `BACKLOG.md` itself names ("once every surface is built and the
game is fitted together").

## 2026-08-24 — Brief 27 reviewed. Brief 28 written.

Sound and interactions landed. Feedback split into a navigation gap, a real
bug, and an audio-mix pass.

### The mute icon: diagnosed properly on the third report
Reported three times, "fixed" twice, and both fixes were correct in isolation —
which is the tell that the diagnosis was wrong each time. The actual cause:

`hidden` is an IDL attribute defined on **`HTMLElement`**. An `<svg>` is an
`SVGElement`, which inherits from `Element`, not `HTMLElement`, and therefore
has no `hidden` property. `svgEl.hidden = true` silently creates a plain JS
expando and never touches the attribute. The CSS added in brief 26
(`.icon-pill svg[hidden] { display:none }`) is correct and simply never matches.
The initial state looked right only because the attribute is hand-written into
the markup.

Fix is `toggleAttribute('hidden', …)`. Brief 28 also requires auditing the whole
file for the same mistake — `#serve-dot` has a matching `[hidden]` rule and is a
likely second instance. Lesson worth keeping: when a fix is correct and the
symptom survives, stop refining the fix and go find a different mechanism.

### Navigation gap
There was no route from a finished game back to the surface selector — PLAY
AGAIN restarted on the same surface, and idle's selector only appears after a
gesture. Both a new home button (left of restart, playing screen) and PLAY AGAIN
now go to idle in its **armed** state, selector already showing. Restart stays
an immediate same-surface replay and is now the only control that does.

### Audio mix — why not 2.5x on every number
Shivang asked for everything ~2.5x louder. Multiplying each literal would push
several gains past 1.0 (`sndScratch`'s click is already 0.49), clip on the
summing bus, and destroy the relative balance that makes the sounds read as
distinct objects. Instead: one `sfxBus` GainNode at 2.5 feeding a
`DynamicsCompressor` limiter, with every individual gain left at root's tuned
value. One knob, mix preserved, peaks caught.

Also: BGM ducked 0.72 → 0.58 for play **and** results (not just play — otherwise
it would swell back up exactly as `sndGameOver` is ringing).

`sndPoint` and `sndGameOver` were both single sine tones with no attack, which
is why they vanished under the BGM. Rebuilt as struck bells — inharmonic partial
stacks with hard attacks and long exponential decays, each with a slightly
detuned beat partner (×1.003 / ×1.004) because that beating is what separates
struck metal from a synth tone. Integer partial ratios would give an organ.
Game over is the deeper bowl at 4.5s, deliberately still ringing under the
900ms ground wipe and into the haiku at 1300ms — the overlap this whole
sequencing decision was made for.

### Next
28 → 29 (share page) → 30 (integration + ship).

## 2026-08-24 — Brief 26 done (results/reveal approved). Brief 27 written.

Results/reveal built and approved — commit `7f1536c`. The reveal lands, so the
game loop now closes end to end: idle → pick a surface → play → your painting
resolves → save it or play again. Three of the four screens are real.

The one call flagged for review in brief 26 — `buildIntersectionBlotches` at
the reveal, and no second density-placed splatter pass — came through with the
screen. Treating that as settled unless it comes back.

### Brief 27 — in-game feel, and why it's a port not a design task
Everything Shivang asked for already exists and is tuned in root `index.html`.
The brief is explicit that this is a port: same oscillators, same gains, same
trigger points. Re-deriving tuned-by-ear sounds produces a different game.

Mapped from root:
- paddle hit → `sndScratch()` + `sndChalk()` + `.paddle-hit` flash
  (brightness 3.5, 150ms)
- wall → `sndThud()`
- point → `sndPoint()` + `#frame.canvas-glow` 700ms + `.score-pop` on the
  number that changed only
- level up → `sndLevelUp()`, game over → `sndGameOver()` + glow
- `sndCollide()` is dormant in v3 (`MAX_B` is 1) and ported anyway — root
  `CLAUDE.md` §4 keeps all seven present, so it is commented as unreachable
  rather than left to look like dead code.

Two things called out hard in the brief because they are the known failure
modes: the retrigger idiom (`remove` / force reflow / `add`, or a fast rally
only flashes once), and root `CLAUDE.md` §4's rule that chalk SFX fires exactly
once per paddle hit inside the paddle-hit branch, never on a frame clock — v3's
`advanceBall` already returns a typed event array, so any cooldown timer is a
sign the trigger went in the wrong place.

`sndGameOver` is a 2.5s decaying tone that plays across the 900ms ground wipe
and under the haiku at 1300ms. That overlap is the payoff for sequencing feel
*after* the reveal rather than before it — one moment, not two.

### Doc drift found
`DESIGN.md` §1 forbids "neon glows or coloured drop shadows to game elements"
and §6 allows shadows only on `.ctrl-chip`. The live build has used the amber
`canvas-glow` on the frame ring since it shipped, and Shivang asked for it
back. Live code plus an explicit request both win; logged for `DESIGN.md` to
absorb rather than softening the effect to satisfy the doc.

### Next
27 (feel) → 28 (share page) → 29 (integration + ship). After 27 the game is
feature-complete for a player who never shares; 28 and 29 are the tail.

## 2026-08-24 — Brief 25 reviewed. Brief 26 (results / reveal) written.

Layout, fit and the 3-dot chips landed. Two defects left, both small, both
folded into brief 26 as Task 0 rather than becoming a brief of their own —
Shivang asked whether to keep writing briefs for QA-sized items, and the answer
is no: a fix that is two numbers and a `display:none` does not need its own
review cycle, it needs to ride along with the next real brief. Backlogging them
would be worse, since they are visible defects on a screen we are calling done.
Protocol holds for features; QA rides.

### The guardrails, finally diagnosed properly
Measured off the build screenshot: colour, height, length and x-position are all
now exactly right (`#C5C5C5`, flat, 2px x 8px, spanning the frame band). The
remaining problem is y, and it is not a nudge — it is structural.

`PAD_MIN` is `CR` = **40**. The canvas `border-radius` is **48**. So the
paddle's travel limit sits 8px *inside the corner arc*, and a horizontal 8px bar
placed there is trying to sit flush against a curve, which it cannot do — it
overhangs into the dark on its outer rows. That overhang is what has read as
"not tucked in" across three rounds of nudging the colour and length.

Fix: move both pairs onto the straight section — top y 38 → 48, bottom y 590 →
580, derived from the border-radius. The mark is then ~8px off the true paddle
limit. Under 1.5% of canvas height, invisible as an affordance, and the
alternative is a bar that can never sit flush. Deliberate trade, recorded here
rather than discovered again later.

### Brief 26 — the decisions made, so review knows what to look at
- **Paint reveal ground resolved.** `DESIGN.md` §2's UNRESOLVED item and the
  design file's amber stand-in are both superseded: the ground is the engine's
  real `buildPaintSurface` with `palette.ground` (Cream), built from the game
  seed per `PAINT-MODE.md` §3.1. No ground-colour picker ships — §3 says the
  colour is user-chosen but no approved screen has the control, so it is
  backlogged rather than invented. Patches mode stays out.
- **Blotches yes, second splatter pass no.** The lab runs both over the finished
  stroke set. Live splatter (brief 24) already put marks down, so a full
  density-placed pass on top would double the count. `buildIntersectionBlotches`
  is different in kind — compound wet-colour clusters at crossings, only
  meaningful over a finished composition, and a large part of the lab look. This
  is the one aesthetic call in the brief that has not been seen; flagged for
  review both ways.
- **Only paint has a reveal.** Paper and chalk were on their real ground during
  play, so for those the reveal is chrome leaving and strokes coming to full.
  No fake wipe.
- **Timeline scrubber clips strokes, not blotches.** Blotches are placed from
  the full stroke set and stay put; recomputing them per scrubber position would
  make the control feel unstable and cost a rebuild per frame. Compromise
  commented at the code site.
- **Save PNG deviates from `DESIGN.md` §11**, which draws the logo as the text
  string `| ZEN • PONG |`. The standing rule is the logo is never text. SVG
  rendered into the export instead; §11 logged as drift.
- **Haiku seeded, not random** — ported from root's `QUOTES`, picked off the
  game seed, so a finished artwork reproduces identically for the share page.

### Next
Brief 26 written and committed. Then 27 (feel/audio), 28 (share), 29 (ship).

## 2026-08-24 — Brief 24 reviewed. Brief 25 written; sequence set through ship.

Paint, splatter and the guardrails all landed. Five items back, one of which
turned out to be the cause of another.

### The slits weren't a geometry bug — the layout is squashing
The guardrail code is already correct: 8px long, canvas x 0-8, `#C5C5C5`, 2px,
z-index 3, positions derived from `physics.js`. It still looked wrong. Cause,
found by measuring the screenshots rather than re-reading the code:

`.stage` is `width:1000px; max-width:100%`. On a 13" MacBook the page is taller
than the viewport, and that `max-width` lets the stage compress **horizontally**
below 1000px — measured at roughly 900 CSS px, about 0.9x. Everything inside is
`inset:0` so it compresses too. The canvas bitmap is squashed on one axis, and
the 2px guardrail lands on a fractional device pixel: measured off the current
build it renders ~1.3px tall with a soft `#828282`→`#C5C5C5` gradient across its
length instead of a flat 2px bar. That blur is the "not tucked in neatly."

So the slit complaint and the scroll complaint are the same defect. `max-width`
on a fixed-aspect artwork surface is wrong in principle — non-uniform
compression of a canvas is never what you want. Removed, and the vertical rhythm
tightened so 1000x630 plus chrome fits inside 760px at 1:1. A uniform
whole-`.screen` `scale()` is the fallback for anything shorter — both axes,
never one child.

### Other brief-25 items
- **Mute has no second state** — the icon is permanently the crossed speaker, so
  it reads "muted" while the music plays. Two inline SVGs, plus `aria-pressed`
  and a swapping label.
- **3-dot palette chip everywhere, both screens.** Worth recording honestly:
  Shivang's premise was that all modes already have three colours. Chalk and
  paint do; **paper has five** (`DEFAULT_PALETTE`). So this is not a UI-only
  change — paper drops to three stroke colours (pink, blue, green: the two
  paddle colours plus the next in existing order, nothing invented). A chip
  showing three while the canvas paints five would be a lying control, so the
  chip and the palette move together. Flagged for his eye at review, since it
  visibly changes the paper artwork.
- **Playing logo 140x27 → 98x19** and the idle/results logos left alone until
  those screens are reviewed.

### Sequence set through ship
Answering the two forward questions:

- **Brief 26 — results / reveal.** Next. It is the payoff the whole premise
  rests on ("the artwork is the product") and the game loop cannot close
  without it.
- **Brief 27 — in-game feel: audio + hit/score interactions.** Placed *after*
  the reveal on purpose. The reveal has its own audio and motion beat (the
  ground wipe, the haiku landing), and doing all the feel work in one pass
  produces one motion and sound language rather than two designed apart. The
  cost of the other order is wiring audio twice. Flipping them is cheap if
  Shivang would rather have the juice sooner — his call, offered explicitly.
- **Brief 28 — share page. Brief 29 — integration + ship.**

### Next
Brief 25 written and committed. `PORT-PLAN.md` renumbered and now runs to 29.

## 2026-08-24 — Brief 23 reviewed: three of four kept, the taper reversed

Guardrails, the 60% width cut, per-stroke profiles and the emergence taper all
built. Reviewed in-browser and against the lab. Verdict: keep three, reverse
one, plus three new items. Now brief 24.

### The taper is reversed — it solved one problem and created another
Brief 23's emergence taper (stroke width ramps from zero at the ball) did make
the ball visible, and the commit-frame convergence argument held. But it applies
to every stroke at both ends, so every stroke became thin-at-both-ends — which
directly undoes brief 23's own Task 4, whose whole point was that strokes should
differ in character. Solving ball visibility by imposing a uniform silhouette on
the entire composition was the wrong trade.

Replaced with Shivang's own alternative: a ~10px gap between the ball and its
live trail. The stroke keeps whatever width its profile gives it, blunt ends
included; the ball sits in clean space ahead of the ink. Simpler, and it leaves
the stroke's shape entirely alone. Ball also goes solid black (`INK_HEX`) in
paint mode for good measure.

Worth recording: the gap does change something at commit — the last ~10px fills
in when the stroke lands. That is a stroke *completing*, not a stroke changing
shape, which is a different thing from brief 20's pop. The distinction is
subtle enough that it is commented at the code site.

### Kept
- **Guardrails** — right idea, wrong geometry. Brief 23 put them inside the 8px
  frame border, i.e. light grey on grey, invisible. Shivang's reference image
  (measured at 2x: `#888888`, 2px tall, 16px long spanning canvas x 0-16) puts
  them poking 8px *inward* from the frame into the cream. Note his written ask
  was "much lighter grey" but the reference measures as the frame grey exactly
  — the reference wins, and the contrast problem was position, not tone.
- **Width cut** — right direction, not far enough. Brief 24 cuts the base as
  well (6.0 → 3.5, widest stroke 23px → ~13px). Found while checking: the lab's
  own BASE WIDTH slider sits at **4.5**, so `paint.js`'s frozen 6.0 already
  matched neither the lab nor the product. The divergence logged in brief 23
  is wider than it looked.
- **Per-stroke profiles** — flat/ramp/wave, kept as built.

### New in brief 24
- **Committed strokes at 70% during play, 100% at game end** — so the live line
  reads against everything already down. Built as a ground/strokes layer split
  rather than per-stroke alpha: per-stroke alpha double-darkens at crossings,
  and the split is what brief 25's reveal needs anyway (ground composites
  *under* the marks). Building that seam now instead of unpicking
  `gamePersistCv` next brief.
- **Paint palette pill shows 5 slots, not 3** — ground, ink, A, B, C, matching
  the lab's swatch row (`PAINT-MODE.md` §2.3). Stroke colours unchanged: the
  rally still cycles the three accents, exactly as `art-lab.html` does. The pill
  shows the artwork's palette, not the stroke cycle.
- **Doc drift found** — `PAINT-MODE.md` §2.2 says ink is the *line* colour
  ("this is not a variable"). The lab has never done that; lines are accents,
  ink is splatter. Approved that way through briefs 11-16, so live code wins and
  the app matches the lab. Logged in `BACKLOG.md` rather than resolved here.

### Corrections to brief 24, same session
- **Guardrails: I read the two reference screenshots backwards.** The image
  showing a `#888888` tick extending 8px into the cream was the *current*
  brief-23 build, not the target; the light-grey tick contained inside the frame
  border was the target. Re-measured: `#C5C5C5`, 2px tall, 8px long, spanning
  canvas x 0-8 — entirely on the frame, nothing in the cream. The contrast comes
  from tone, not position, which is what "much lighter grey" meant all along.
  My earlier note claiming Shivang's words and his reference contradicted each
  other was wrong; they agreed and I had the wrong image.
- **Live splatter added as Task 6.** The lab's artworks carry splatter and the
  game has never had any — `buildSplatter`/`buildIntersectionBlotches` are
  never called by the app. Wanted: rare marks that aren't part of the trail,
  thrown off the ball mid-rally. This is `PAINT-MODE.md` §5 D, specced since
  brief 11 and never built.

  The constraint that shapes it: emission must be **mid-flight, never on a
  paddle or wall hit**. `splatter.js`'s own header records why — brief 02's
  hit-triggered ink bloom pinned every mark to the canvas edge, because hits are
  always on the boundary, and it was cut for that. Placement is also offset
  perpendicular to travel so a mark lands clear of the line rather than reading
  as a blob in it. Sizes mirrored down ~0.58x from the engine's private
  constants, which were tuned against a 24px stroke the game no longer has.

  Flagged forward to brief 25: if the reveal also runs the lab's density-placed
  splatter pass over the finished strokes, the canvas gets both. That is a
  decision to make knowing live splatter now exists, not by default.

### Next
Brief 24 written and committed. `PORT-PLAN.md` renumbered — results/reveal 25,
share 26, integration + ship 27.

## 2026-08-24 — Brief 22: playing screen built and approved; brief 23 queued

Commit `9a9fdbe` on `feature/v3-app`. The real game — mouse + AI paddles,
engine physics, persistent per-surface trail rendering, score/level, serve
beat, restart/mute, per-game seed, landing on the results stub. Approved on
first look ("good build").

### Task 1 landed as specced — one paint renderer for the product's life
`makePaintTracker(rng, cfg)` is now the single bake-on-append mechanism, two
instances (doodle at `DOODLE_PAINT_WIDTH_BASE` 3.0, game at `paint.js`'s
imported `PAINT_WIDTH_BASE` 6.0), feeding the one shared `drawPaintRibbon`.
`renderPaintStroke` is not called anywhere in the app. This is what keeps
`DESIGN.md` §13's "marks never move or re-draw" reachable at the reveal.

Plan-stage catch worth keeping: `paint.js`'s `WIDTH_VAR_MIN`/`WIDTH_VAR_MAX`
(0.15/4.0) are private, not exported, and carry a "do not change (brief 15)"
comment — so they were mirrored app-side rather than imported, and the engine
was not touched to add an export. The session flagged this rather than making
a quiet engine edit. Correct call, and brief 23 has now turned that mirror
into a deliberate divergence.

### Review verdict — four changes, now brief 23
1. **Paddle guardrails missing.** With 48px rounded corners and the paddle
   confined to `PAD_MIN`–`PAD_MAX`, nothing tells the player where their reach
   ends and the wall begins. The live v2 build already solves this
   (`drawSlits()`, root `index.html`) — v3 takes its positions, not its
   treatment: 2px `#888888` marks. DOM chrome, never drawn into the persistent
   artwork canvas (they would otherwise end up in the saved PNG).
2. **Paint max width cut 60%** — `GAME_PAINT_WIDTH_VAR_MAX` 4.0 → 1.6, worst
   case 57.6px → 23.0px. The frozen 4.0 was approved in the lab on static
   seeded artworks and is simply wrong in a live rally; the product value wins
   from here (see `BACKLOG.md`).
3. **The ball is invisible in paint mode** — same colour as its own trail, and
   the ribbon is several times its diameter. Fix is an emergence taper: the
   stroke is zero-width at the ball and widens behind it, so the ball is always
   a clean dot with ink flowing out of it. Measured from the polyline's last
   point, which means live and committed renders are identical *at* the commit
   frame — the shape the player watched settle is the shape that is kept, and
   brief 20's pop is not reintroduced.
4. **Every stroke has the same character** — one sine profile, varied only by
   phase, so the composition reads as machine-made. Replaced with seeded
   per-stroke profiles: flat / ramp / wave.

### Next
Brief 23 written and committed. `PORT-PLAN.md` renumbered — results/reveal 24,
share 25, integration + ship 26.

## 2026-08-24 — Brief 21 reviewed: idle screen approved. Log debt cleared.

Brief 21's doodle passed Shivang's eye — cream paint ground, slate-grey
chalkboard, fuller density before reset — approved as built, no changes
requested. There is no merge gate here, unlike the surface arcs:
`feature/v3-app` carries the whole product port through brief 25 per
`PORT-PLAN.md` and merges to `main` only when the app is whole.

### Doc debt — four sessions with no log entry
Briefs 18, 19, 20 and 21 all shipped without a `PROJECT-LOG.md` entry.
`main`'s newest entry was still brief 17's, whose "Next" line said brief 18
was merely *unblocked* — so a chat loading cold today would have planned
brief 18 from scratch against a branch that already contained it, plus three
follow-ups. This is the same failure `v3/CLAUDE.md`'s docs-live-on-`main`
rule exists to prevent, arriving from the other side: the docs went to the
right branch, they just never got written. The rule is necessary and not
sufficient — writing the log entry is the closing act of a session, per
`ARCHITECT.md`, and four sessions in a row skipped it.

The four entries below are **reconstructed** (2026-08-24) from the brief
files, the commit diffs, and the unusually thorough inline comments in
`v3/app/index.html`. They are accurate on what changed and why; they are
thinner than a live entry on what was considered and rejected in the moment.
Marked as such rather than passed off as contemporaneous.

### Conflict found and resolved — the density scrubber
`PORT-PLAN.md`'s brief-22 line listed a density scrubber as a playing-screen
control. `DESIGN.md` §8 Screen 2 (updated 2026-08-24, *after* PORT-PLAN was
written) says the opposite in as many words: "no density or timeline control
during play. Tuning happens on results (Screen 3) only." The approved
`v3/design/2-playing.html` carries the same call in a source comment and has
no scrubber in its control row. Newer approved design wins; PORT-PLAN's
brief 22/23 lines corrected this session.

Note this is not a relocation of the same control. The lab's density
scrubber tunes *composition density*; results' `#timeline-chip`
(`DESIGN.md` §10) selects *which frame of the accumulated painting to keep*.
Different controls. The density scrubber currently ships nowhere — if it is
still wanted as product UI it needs its own decision, and `PORT-PLAN.md`'s
closing note (which still names it as one of the two lab-style controls that
do ship) is now the only place asserting otherwise.

### Next
Brief 22 — playing screen. Written and committed this session.

## 2026-08-24 — Brief 21: idle doodle fixes, round 3 *(reconstructed)*

Commit `5adcaea` on `feature/v3-app`. Three doodle-scoped fixes.

- **Chalkboard's denim cast — diagnosed doodle-side, not engine-side.** The
  brief permitted a fix in `chalkboard.js`; the session correctly declined to
  make one. `CB_BASE` (`#1A1A1E`) and the grain carry a deliberate faint cool
  tint — approved and frozen at brief 17, and invisible at the engine's own
  near-black brightness. Brief 20's doodle-only `brightness(2.4)` lift is a
  flat per-channel multiply, so it scaled that intentional whisper by 2.4x
  along with everything else and manufactured the blue. Fix: append
  `grayscale(1)` to the same doodle-only filter chain — strips hue and chroma
  while leaving the brightness-lifted per-pixel luminance (the grain and
  smudge texture itself) untouched. `chalkboard.js` not modified, so the lab,
  which never applies this filter, is unaffected *by construction* rather
  than by verification. Correct call: the engine value wasn't wrong, the
  presentation layer was.
- **Paint ground pinned to Cream.** `buildPalette` had been drawing a random
  ground and landing on Pale lavender. Now passes
  `{ groundHex: GROUND_LIBRARY[0].hex }` — the approved lab default
  (`PAINT-MODE.md` §3, brief 16). Scheme and base index are deliberately left
  undrawn so the three accents still come from `palette.js`'s real curated-hue
  scheme system exactly as the lab renders it; nothing swapped in from
  `DEFAULT_PALETTE`, the unrelated 5-colour paddle palette, per the brief's
  explicit warning.
- **Density threshold 8 → 18.** Brief 20's value was inherited unchanged from
  brief 18's *rolling-window* cap, where 8 meant something different; as a
  build-then-clear threshold it read as a sparse loop. Tuned by eye.

`PORT-PLAN.md` renumbered (playing → 22, results → 23, share → 24,
integration → 25) in `c631bcc` on `main`.

## 2026-08-24 — Brief 20: idle doodle fixes, round 2 *(reconstructed)*

Commit `2e4f3c0`. Four fixes; the first is the one that mattered.

- **Paint's commit-time pop — the cause was two renderers, not pooling.**
  Brief 19 had scoped its width-baking fix to the live stroke only, on the
  reasoning that a committed `pts` array never changes again, so the engine's
  own `renderPaintStroke` was already correct for it. True in isolation,
  false in practice: the baked algorithm and the engine's are independently
  derived formulas with different phase/frequency, so a stroke visibly
  snapped to a different shape the instant it committed. Fix: `renderStrokeAs`
  is now the single renderer for a paint stroke's entire life — live or
  committed — driven by pre-baked per-point `.w`. The pop is impossible by
  construction; there is no second algorithm left to disagree. `commitStroke`
  also re-zips the baked `.w` onto `jitterPath`'s output (a 1:1
  length-preserving map that drops extra fields), without which every
  interior point silently lost its width at commit. `paint.js`'s
  `renderPaintStroke` untouched and still owns the finished-artwork path.
- **Doodle-scoped width cap.** `DOODLE_PAINT_WIDTH_BASE` 3.0 with a 0.15–2.2
  variation range, local to the app file. `paint.js`'s frozen
  `PAINT_WIDTH_BASE` 6.0 / 0.15–4.0 (brief 16, approved) stand untouched —
  the frozen values read cartoonish at doodle scale, which is a scale
  problem, not a wrong constant.
- **Accumulate-then-hard-reset** replaced brief 18's rolling one-stroke
  eviction, so the cycle reads as a rally building and resolving.
- **Chalkboard's real ground** (`buildChalkboardSurface`'s smudge blobs,
  grain, vignette) rendered behind the chalk doodle, with a `brightness(2.4)`
  presentational lift on that draw call only — the same "correctly wired but
  invisible at native brightness" pattern `BACKLOG.md` had already logged
  once for this module. `contrast()` was tried first and read flatter: it
  pivots around mid-grey and crushes shadow detail toward zero for values
  this far below it. (That lift is what brief 21 then had to neutralise.)
- **Canvas group centered** — `justify-content: center` on the body flex
  column, treating tagline + canvas + palette dock as one unit, replacing
  brief 18's top-anchored asymmetric 32/48 padding.

## 2026-08-24 — Brief 19: idle doodle fixes *(reconstructed)*

Commit `5c3f151`. Five fixes.

- **Fixed seed** — `DOODLE_SEED = 2026`. Every rng stream in the doodle is a
  deterministic salt off it: physics, per-surface ground textures, paint
  width phase, palette. The doodle is ambiance, not the artwork, so
  determinism is the feature — it is what makes a surface switch a pure
  restyle of *identical* geometry rather than a fresh simulation.
- **Every transition continues, none resets.** `switchSurface` re-renders the
  same `committedStrokes` through the new renderer and cross-fades between
  two stacked canvases (`DESIGN.md` §13's 400ms linear). Physics and stroke
  state are never touched. Paint was the path that used to reset.
- **Chalk in tri-colour** (`CHALK_PALETTE`), matching how chalk was approved
  in the lab, replacing brief 18's white-mode override.
- **Ball marker** drawn every frame on every surface — without it the
  animation doesn't read as a rally.
- **Paint width baked at absolute arc length**, once per point at append
  time, never recomputed, with phase and wavelength fixed at the stroke's
  first point. `paint.js` expresses undulation as a cycle *count* over a
  finished stroke's total length — meaningless while the stroke is still
  growing — so it was converted to a fixed spatial wavelength via a 500px
  reference length. `paintWidthRng` is advanced by exactly two draws at every
  new stroke start regardless of which surface is on screen, so the sequence
  can never depend on the player's switching path (which would desync the
  identical-geometry guarantee). Scoping this to the live stroke only is what
  brief 20 then had to finish.

## 2026-08-24 — Brief 18: app shell, idle screen, surface selector, live doodle *(reconstructed)*

Commit `e36349a`, first commit on `feature/v3-app`. The port's foundation.
New file `v3/app/index.html`; root `index.html` untouched.

- **Screen-state machine** — idle / playing / results, with playing and
  results as labelled stubs. Idle carries its own Step A/B sub-state,
  independent of the screen state.
- **Engine consumed, never copied** — `rng`, `physics`, `strokes`, `surface`,
  `chalkboard`, `paint`, `palette`, `simulate` imported as ES modules.
- **Idle two-step** per the approved design. Step A shows the card alone; the
  first real gesture (space / click / touchstart) slides `#surface-chip` up
  *and* unlocks audio — root `CLAUDE.md` §4's protected pattern, `new Audio()`
  + `createMediaElementSource()`, never fetch+decodeAudioData, never
  mousemove. A second gesture while armed starts the game.
- **Surface selector ships as product UI** — the documented exception to
  `v3/CLAUDE.md`'s lab-controls rule.
- **Live doodle** — real `advanceBall` physics against the two static DOM
  paddles used as genuine collision surfaces, committing on the same events
  the live game uses, drawn to a persistent offscreen canvas. Root
  `index.html`'s `drawCv` architecture: cleared only on a full rebuild.
- **`--color-canvas-chalk`** — `DESIGN.md` §2 still flags this UNRESOLVED
  with a `#383838` placeholder that borrows the page background. The app uses
  `chalkboard.js`'s own frozen `CB_BASE` `#1A1A1E` instead, since the doodle
  draws the real engine texture rather than a CSS approximation. The DESIGN.md
  item remains formally open — the app simply is not waiting on it.

## 2026-08-24 — Brief 17: chalkboard reviewed, frozen, merged to main

Chalkboard (briefs 07-10) cleared its review gate and is merged. `main` now
carries all three surfaces — paper, chalkboard, paint.

### Task 1 — rebase, review
`feature/chalkboard-surface` was 11 days stale (last touched at brief 10,
before paint's briefs 11-16 landed on `main`). Rebasing it forward meant
resolving `art-lab.html` conflicts across 6 of chalk's commits, reconciling
two independently-evolved forks of the same file — not just picking a side,
keeping both surfaces' functionality at every conflict (paint's paper-only
inertness + control panel, chalk's mode/width controls and render branch),
plus a real product conflict: chalk's brief 08 had removed speed-weight
entirely, unaware paint's later work (brief 12) explicitly kept it live.
Resolved provisionally by keeping it, flagged to Shivang as a genuine
"which decision wins" call rather than deciding it silently.

### Task 1 review verdict
- **Density smudge** — approved after a tuning pass (was task-listed as a
  known BACKLOG item: correctly wired but read as invisible at native res).
  `SMUDGE_ALPHA` 0.055 → 0.14, `SMUDGE_PROB` 0.45 → 0.6, radius base
  6-16px → 8-22px (`chalkboard.js`). BACKLOG's diagnostic item is resolved.
- **Speed weight** — the rebase's provisional "keep it" call was reversed.
  Shivang confirmed it isn't needed and doesn't meaningfully affect the
  result; re-removed for good (brief 08's original intent), this time
  cleanly: `enhancements.js`/`simulate.js` back to post-removal shape, the
  Speed Weight UI group and both `wt`-resolution branches in `art-lab.html`
  removed (the first removal attempt, brief 08, had left an orphaned lab
  binding that threw at boot — caught and fixed in-browser this session).
- Palette hexes, chalk mode default (white), chalk width default (1.0):
  reviewed as-is, no changes requested.

### Task 2 — freeze
Named the approved lab defaults as product constants in `chalkboard.js`,
mirroring paint's `PAINT_DEFAULT_*` pattern from brief 16: `CHALK_DEFAULT_MODE`
('white'), `CHALK_DEFAULT_WIDTH_MULT` (1.0). `CHALK_PALETTE`/`WHITE_CHALK_HEX`
and the smudge constants were already module-level constants — frozen in
place, now commented as approved-at-review rather than provisional.
`art-lab.html`'s initial state imports the two new constants instead of
duplicating the literals. Lab sliders stay live for future re-tuning.

### Task 3 — merge
Real merge (`--no-ff`, not squash) — brief 07-10 history stays legible in
`main`'s log.

**Post-merge verification (all passed):**
1. Paper byte-identical: `surface.js`/`physics.js`/`strokes.js`/`rng.js`
   zero-diff against pre-merge `main`; rendered-hash confirmed equal to the
   pre-merge branch's own hashes, seeds 1-3, both a same-session re-render
   and a full page reload.
2. Paint renders unchanged — visually confirmed on merged `main`, same
   splatter/blotch/patch behavior as brief 16's frozen defaults.
3. Chalkboard renders as approved — white mode default, tri-colour mode,
   both smudge levels, native lightbox, all confirmed error-free in-browser
   on merged `main`.
4. No `Math.random()` in `v3/engine/`; DOM confined to `surface.js`/
   `paint.js`/`chalkboard.js`'s designated build functions, as everywhere
   else in this arc.

`feature/chalkboard-surface` not deleted yet — origin push confirmed, but
leaving it per the brief's own instruction until Shivang has a chance to
notice if anything's off.

### Next
No brief queued. `v3/briefs/18-app-shell-idle-doodle.md` (already committed,
brief 16 session) was blocked on this merge landing — now unblocked.

## 2026-07-21 — Brief 16: paint finalised and merged to main

Paint mode (briefs 11-16) is merged. `main` now carries paper + paint;
chalkboard stays parked, unmerged, on `feature/chalkboard-surface`.

- **Frozen product defaults**, `paint.js`: `PAINT_WIDTH_BASE` 6.0 (already
  existed, re-confirmed), `PAINT_DEFAULT_WIDTH_VARIATION` 1.0,
  `PAINT_DEFAULT_BLOTCH_SIZE_MULT` 1.0, `PAINT_DEFAULT_PATCH_COUNT` 6,
  `PAINT_DEFAULT_JITTER_AMPLITUDE` 0.5, `PAINT_DEFAULT_GROUND_MODE`
  `'plain'` — Shivang's approved 2026-07-21 lab positions, named so a
  future product-port pass has one unambiguous source. Lab sliders
  untouched, already defaulted to these values. Density scrubber default
  moved to 37% (stays a live control, not frozen — approved position, not
  a fixed constant).
- Orphan `15-splatter-scale-and-patch-curves.md` (never built) deleted,
  noted in the brief-15 log entry above.
- `PAINT-MODE.md` §1's density-ceiling OPEN item resolved to LOCKED —
  restrained family is the approved target across the whole arc; the
  maximalist/dense references were considered and consciously declined,
  not forgotten.
- Merged `feature/paint-surface` → `main` with a real merge commit (not
  squash) — brief-by-brief history stays legible. Branch not deleted yet,
  left until the merge is confirmed good on origin.

### Post-merge verification (all passed)
1. Paper byte-identical: `surface.js`/`simulate.js`/`physics.js` zero-diff
   against pre-merge `main`; `strokes.js`/`rng.js` purely additive (existing
   exports untouched) — confirmed both by source diff and rendered-hash
   re-render, seeds 1-6.
2. `feature/chalkboard-surface` still on origin, tip unchanged (`dbea3fd`).
3. Paint renders deterministically on `main` using the frozen defaults
   above, both ground modes, seeds 1-6 all distinct.
4. No `Math.random()` in `v3/engine/`. `palette.js`/`density.js` confirmed
   DOM-free; DOM touches in the whole engine confined to `surface.js` and
   `paint.js`'s designated build functions, as everywhere else in this arc.

### Next
No paint brief queued. Chalkboard's review gate (briefs 07-10, unmerged)
and its backlogged smudge-slider item are still open and untouched by any
of this. `v3/UI-BRIEF-CONTEXT.md` (committed this session) is ready to hand
to a UI design chat cold whenever that starts.

## 2026-07-21 — Brief 15: refinement (splatter mass, curved patches, blotch clusters)

Opened with a real doc collision: two different `v3/briefs/15-*.md` files
existed uncommitted (`15-paint-refinement.md`, `15-splatter-scale-and-patch-
curves.md`), both numbered 15. Committed both to `main` (docs go to main
regardless of which gets built), flagged the collision, built
`15-paint-refinement.md` per explicit instruction — did not silently pick
one or merge them. *(Brief 16 housekeeping: `15-splatter-scale-and-patch-
curves.md` was never built and has now been deleted — orphan removed.)*

### Task 1 — pooling removed entirely, not reduced
Brief 14 cut pooling's peak; brief 15's own postmortem on that: "any amount
clusters at the boundary, because direction change only ever happens at a
paddle or a wall." Correct — there's no partial fix here, only gone or not.
Deleted `POOL_PEAK_*`/`POOL_WINDOW_*`/`poolMultAt`/`poolStart`/`poolEnd`
from `renderPaintStroke` outright (`paint.js`). The `POOLING STRENGTH`
slider is relabelled **Blotch size** and now feeds
`buildIntersectionBlotches`' `sizeMult` instead — a build-time input now,
so that control moved from `renderAll()` to `resimulateAll()` in the lab.

### Task 2 — splatter given real visual mass
Second size pass (brief 14 already raised it once, still read as specks).
Drop radius 1-9px → 4-20px (large end now approaches a fat stroke's actual
width: `PAINT_WIDTH_BASE 6.0 × WIDTH_VAR_MAX 4.0`). Flung length 14-34px →
26-60px, head radius 3-7px → 7-15px (satellites scale off head radius, so
they grew with it). Count 24-50 → 32-64. Placement logic untouched — brief
was explicit this is a size/count change, not a placement change.

### Task 3 — patches: closed Catmull-Rom, not straight edges
Added `traceClosedCR` to `strokes.js` (paper-path file — purely additive,
existing `traceCR`/`renderStroke`/`jitterPath` untouched, verified paper
still hash-identical). Same t=0.5 Catmull-Rom-to-bezier math as `traceCR`,
neighbour indices wrap modulo instead of clamping, so it closes smoothly.
`buildPatchGround`'s wobble-jittered vertices now trace through this
instead of `lineTo` — smooth lobed silhouette, still a hard opaque fill
(smooth outline ≠ soft edge).

### Task 4 — blotches: clusters, not single ellipses
The one needing actual judgment. Rewrote `buildIntersectionBlotches`
entirely: far fewer locations (2-4, density floor raised 0.15→0.5 — "only
the densest," not splatter's whole-composition pool) and each one is now a
compound `blotchCluster` — one irregular main mass + 3-6 overlapping
satellites + 2-4 droplets flung outward, every element its own
`traceClosedCR` silhouette. Colour: main mass blends near the seeded true
mix (bias 0.35-0.65), satellites/droplets independently skew toward one
parent colour or the other (0-0.35 or 0.65-1.0) — that per-element
variation, not a uniform blend repeated, is what reads as two wet colours
actually meeting rather than a third colour painted on. Considered literal
deterministic top-N by density for "only the densest" (brief's wording
leans that way) but kept the seeded-weighted draw brief 13 established,
just over a much smaller, already-elite candidate pool — abandoning
seed-to-seed variety entirely felt like solving the wrong problem now that
there are only 2-4 slots to begin with.

### Verification
Paper byte-identical (zero-diff on `surface.js`/`simulate.js`/`physics.js`;
`strokes.js` purely additive; hash-confirmed regardless). Full pipeline —
palette, both ground modes, strokes, splatter, blotch clusters —
hash-deterministic across seeds 1-6, all distinct. DOM confined to
`paint.js`'s two build functions; `splatter.js`/`density.js`/`rng.js`/
`strokes.js` stay DOM-free. No `Math.random()`. Screenshotted 312px grid
(both ground modes) + native lightboxes showing blotch clusters and patch
curves close up.

Status: brief 15 done on `feature/paint-surface`, pushed. Awaiting review.

## 2026-07-21 — Brief 14: calibration pass (patches, width, splatter/pooling balance)

Opened by committing docs left uncommitted from the architect side
(`v3/briefs/14-paint-calibration.md`, `v3/ARCHITECT.md`'s new "never hand
Shivang git chores" rule) to `main`, then rebasing the feature branch — the
new rule's own first-line-of-every-prompt pattern, now actually followed.

### Task 4 first, since it's the one with a real failure mode behind it
Read brief 02's ink-bloom postmortem before touching code (PROJECT-LOG.md
2026-07-09): hit-triggered placement put every bloom on the left/right
edges, because paddle/wall hits are structurally always on the boundary —
cut for exactly that reason. Brief 12/13 quietly reintroduced the identical
bug in a different feature: `renderPaintStroke`'s pooling (3c) *also* only
fires at paddle/wall hits, and once strokes went opaque and wide, those
pooling knots became the dominant, edge-ringed mark. Same root cause, new
paint. Fix has two halves, not one:
1. `POOL_PEAK_MIN/MAX` cut from 2.2-3.2x to 1.3-1.8x (`paint.js`) — pooling
   still reads as "the line paused here," stops being the loudest mark.
2. New `buildIntersectionBlotches` (`splatter.js`) fills the gap with marks
   that land where the rally was actually busy — reuses brief 13's
   `findDenseKnots` rather than a fresh intersection detector (dense knots
   already *are* the high-crossing points); `contributingStrokes` then
   answers "which two strokes" at each chosen point. Colour is an OKLab
   blend (`palette.js` gained `hexToOklab` export + new `oklabToHex`/
   `blendOklab`) of the two widest contributors, seeded-biased 0.3-0.7 so
   it's never a flat 50/50 wash — verified non-grey, non-uniform blends
   across a real seed.

### Task 1 — patches rebuilt, not tuned
Brief 13's soft radial-gradient patches were wrong on every axis per
review. New version: hard opaque fills (no gradient anywhere), closed
polygon with a 3-harmonic radius wobble for irregular/lobed silhouettes,
independent x/y scale for round-vs-elongated variety, heavy-tailed size
(`rng()^3.2`, 9px to a third of canvas area). `count` is now a lab slider
(0-12) instead of rng-derived — "seeded placement WITHIN that count," not a
seeded count.

### Task 2 — width range
0.4x-2.0x → 0.15x-4.0x. Also dropped undulation frequency (1.5-3 cycles →
0.5-1.5) since the old cycle count read as vibration at the new amplitude —
brief wanted "one or two transitions, not many." Verified the slider
actually sweeps uniform-at-0 to extreme-at-1, not just extreme-at-1.

### Task 3 — splatter count
12-26 → 24-50. Confirmed nothing in the render path was fragmenting or
skipping the trail — the "dots not lines" read was Task 2 (thin strokes)
and Task 4 (edge-pooling dominating attention), not a suppression bug.

### Verification
Paper zero-diff vs `main`. Full pipeline (palette, both ground modes,
strokes, splatter, blotches) hash-deterministic across seeds 1-6, all
distinct. `oklabToHex` round-trips exactly on all tested hexes. Blotch
colours pixel-checked on a real seed: genuine blends, not pure passthrough,
not flat grey. DOM confined to `paint.js`'s two build functions only —
`palette.js`/`splatter.js`/`density.js`/`rng.js` stay DOM-free. No
`Math.random()`. Screenshotted 312px grid (both ground modes) + one native
lightbox.

Status: brief 14 done on `feature/paint-surface`, pushed. Awaiting review.

## 2026-07-21 — Brief 13: splatter (density-placed) + ground patches

Found an interactive rebase left mid-flight from outside this session
(`.gitignore` conflict — main and the feature branch each independently
added the file, one for `.DS_Store`, one for `.claude/settings.local.json`).
Merged both lines, completed it, force-pushed. `.claude/settings.local.json`
is now untracked+ignored — the recurring dirty-file noise in every prior
session's git status is gone.

### Task 0 — `v3/engine/density.js`, on `main`
`computeLineDensity` (normalised [0,1] field this time, chalkboard.js's
version wasn't) + `findDenseKnots` (greedy local-maxima, minimum-spacing
constraint so results spread across the composition instead of clustering).
Built standalone per the brief — chalkboard.js/fill.js sit on unmerged
branches. Also added `weightedPick`/`weightedSampleWithoutReplacement` to
`rng.js` (purely additive, paper's `makeRng` untouched) since both splatter
and patches need seeded weighted sampling.

### Task 1-2 — `v3/engine/splatter.js` (new)
Placement: density field → `findDenseKnots` → seeded weighted sample (not
top-N, so similarly-busy rallies don't produce identical structure). Two
mark types, both fully opaque (no gradient, no soft edge): irregular blobs
(heavy-tailed size via `rng()^4`) and teardrop-shaped flung marks with 2-5
satellite droplets, oriented along the nearest stroke segment's direction.
Colour: ink at a fixed 0.15 weight alongside the 3 accent weights.

### Task 3 — `buildPatchGround`, `v3/engine/paint.js`
Colours come from the accent palette (not `GROUND_LIBRARY` — Patches mode
has no colour choice, PAINT-MODE.md §3). Composition-aware: field centres
are density-weighted toward busy rally regions, same `density.js` Task 1
uses. "Brush-swipe not circles" via 4-6 overlapping soft-gradient blobs
walking a jittered line per field. Coverage measured short of the 55-85%
target on the first pass (37-53%, pixel-sampled) — soft falloff + blob
overlap both eat into the naive solid-disc area estimate; added a measured
`RADIUS_COMPENSATION` (1.55x) to close the gap, re-verified in range.

### Verification
Paper byte-identical (engine files zero-diff vs `main` except the additive
`rng.js` exports; hash-confirmed anyway). Full paint pipeline — palette,
ground (both modes), strokes, splatter — hash-deterministic across seeds
1-6, all distinct. `density.js`/`splatter.js` DOM-free; `paint.js`'s new
`buildPatchGround` confined to the same carve-out as `buildPaintSurface`.
No `Math.random()`. Screenshotted native + 312px grid, both ground modes.

Not fully resolved by eye: patches read as soft round clouds more than
directional "brush swipes" at default settings — elongation is present but
subtle. Flagging for review rather than continuing to tune blind.

Status: brief 13 done on `feature/paint-surface`, pushed. Awaiting review.

## 2026-07-20 — Brief 12: paint reset (weave + stroke replaced, review-driven)

Brief 11's weave and stroke failed review — read as graph paper + translucent
watercolour, not paint. Brief 12 replaced both; palette.js and paint.js's
function contracts stand.

- **Ground:** `buildWeaveTile`/tile pattern deleted outright — a repeating
  tile can't be tuned into non-grid. Replaced with a non-repeating tooth
  (900 specks + ~15-24 low-amplitude blotches, positioned directly from the
  passed `rng`, no tile). Vignette kept.
- **Stroke:** new independent path, `globalAlpha` hardcoded to 1.0 (`op`
  param kept for signature parity, never read) — no two-pass, no blend on
  overlap. Removed the glossy highlight pass added last session (unrequested
  then, and a translucent layer contradicts "flat poster colour" now).
  Width-wave range widened 0.4×–2.0× (was 0.55×–1.6×). Pooling numbers
  unchanged (brief 11 §3c) — opacity was the reason it wasn't reading, not
  the peak/window values; confirmed visible post-fix, didn't need widening.
- **Lab:** age fade, weight range, opacity range, and both pass mults now
  `disabled` when Surface = Paint (verified both directions). Speed weight
  is not in the brief's severance list — left live for paint intentionally.
- Verified: paper-path files (`surface.js`/`strokes.js`/`simulate.js`/
  `physics.js`/`rng.js`) zero-diff vs `main`. Paint full-pipeline
  hash-deterministic, 6/6 distinct across seeds 1–6. Opaque confirmed at the
  pixel level (overlap = exact top colour, alpha 255, no blend). No
  `Math.random()` in engine. `paint.js` DOM confined to one
  `document.createElement` (`buildPaintSurface`).

Status: brief 12 done on `feature/paint-surface`, pushed. Awaiting review.

## 2026-07-20 — Brief 11 complete: paint stroke renderer + lab wiring (tasks 3-4)

Review gate released same-session ("a bare weave with no strokes on it isn't
reviewable"), so tasks 3 and 4 ran together on `feature/paint-surface`.

### Task 3 — `renderPaintStroke` in `v3/engine/paint.js`
A single `ctx.lineWidth` stroke can't vary width along its length, so this is
a filled ribbon: the Catmull-Rom spine is sampled densely, each sample offset
perpendicular by half the local width, left+right edges filled as one closed
polygon. Width at each sample is `wt` scaled by two independent signals,
combined by `max()` (not multiply, so a pooling knot isn't cancelled by a low
point in the width wave):
- **3b (width wave):** low-frequency sine across arc length, 0.55–1.6× range,
  1.5–3 undulations. Deterministic without threading an `rng` through the
  renderer — undulation count/phase are hashed off the stroke's own start/end
  coordinates, the same technique `strokes.js`'s `jitterPath` already uses
  (`Math.sin(p.x*0.73+p.y*1.31)`) rather than a new pattern.
- **3c (pooling):** peak 2.2–3.2× base over an 8–14px arc window, both
  seeded off the commit point's coordinates, smoothstep falloff (not a step).
  Only fires where `poolStart`/`poolEnd` are true — the caller (the lab)
  computes these from stroke adjacency + `event` type, so only real
  `paddleHit`/`wallHit` commit points pool; `score`/`overflow`/`gameEnd`
  endings (not physical direction changes) don't. Same division of labour as
  `renderChalkStroke` taking `ageFrac` from the caller instead of computing
  it from stroke index itself.
- **Glossy highlight, not in the brief's lettered subtasks:** a second,
  thinner (32% width) fill down the centre in a lightened tint at reduced
  alpha, motivated directly by the brief's "clean and slightly glossy, not
  grainy" line — a flat single-tone fill read as matte poster colour without
  it. Small and reversible if it reads wrong in review.
- Rounded caps at both ends, radius following local half-width, so a pooled
  end reads as a blob per 3c's spec rather than a bulge.

### Task 4 — lab wiring, `v3/labs/art-lab.html`
**Deviation from the brief, flagged not silently resolved:** the brief says
the surface selector "gains a third option: Paint," implying Paper+Chalkboard
already exist as a pair. They don't on this branch — chalk lives only on
`feature/chalkboard-surface` (unmerged), and brief 11 is explicit that paint
must stay independent of chalk and chalk must stay untouched. Building a real
3-way selector would mean pulling chalk code onto this branch, which the
brief's own constraint forbids. Built a 2-way Paper/Paint selector instead —
what's actually real on this branch — and flagging the gap rather than
inventing chalk here or silently shipping "third option" language that isn't
true yet.
- Scheme selector (4 rules + Random), ground colour (4 `GROUND_LIBRARY`
  entries) — both resimulate, since they change the underlying palette/ground.
- Base width / pooling strength / width variation sliders are pure
  render-time multipliers, no resimulate — same pattern as the existing
  Enhancements panel (age fade, speed weight), confirmed by watching stroke
  counts stay identical while dragging them.
- `simulateGame`'s colour cycling is a plain round-robin with no notion of
  accent weight, so the lab (not the engine) builds a 20-slot array with each
  accent repeated proportionally to its weight (11/6/3 for 0.55/0.30/0.15)
  and seed-shuffles it, so cycling doesn't visit dominant/secondary/minor in
  visible blocks. Lab-only glue, no engine change.
- Palette swatches (ground/ink/3 accents) render under each tile per the
  brief's explicit ask, so scheme rules are actually judgeable.

### Verification (Task 5)
1. Paper byte-identical to `main`: `surface.js`/`strokes.js`/`simulate.js`/
   `physics.js`/`rng.js` are untouched this whole brief (confirmed via
   `git diff main`), and the paper code path in `art-lab.html` calls the same
   functions with the same arguments, just now inside an `if/else` — hash
   re-render across seeds 1–6 confirms determinism on top of that.
2. Chalkboard: not on this branch, nothing to move.
3. Paint fully deterministic: palette + ground + stroke geometry + pooling
   hash-compared identical on same-seed re-render, 6/6 distinct across seeds
   1–6 (browser console, full pipeline including `renderPaintStroke`).
4. `palette.js`: still zero DOM references (unchanged this session).
5. `paint.js`: only two `document.createElement` calls in the whole file,
   both inside `buildWeaveTile`/`buildPaintSurface` — `renderPaintStroke` and
   its helpers only touch the passed-in `ctx`, matching `renderChalkStroke`'s
   confinement.
6. Grepped clean: no `Math.random()` anywhere in `v3/engine/`.

Manually exercised in the browser: surface toggle, scheme/ground dropdowns,
all three paint sliders, pooling strength pushed to visible extremes (4.0)
and width variation to uniform (0) to confirm both signals actually drive the
renderer, not just accept parameters silently.

### Status
Brief 11 (all 4 tasks) done on `feature/paint-surface`, pushed. Lab link
given to Shivang for his own-eye review — nothing here is a merge decision,
that's his call per `ARCHITECT.md`.

### Next
Brief 12 — physics-driven emission events (spin → splatter burst, speed →
whip line) and drips off the pools. Blocked on Shivang's review of this
session's stroke renderer landing well; do not start speculatively.

## 2026-07-20 — Brief 11 tasks 1-2 done (palette + paint ground); task 3 deferred to review

### Task 1 — `v3/engine/palette.js` (new, on `feature/paint-surface`)
Built per brief 11, but the brief's own separation-guard spec was revised
mid-session (WCAG relative luminance → OKLab ΔE) after Claude Code's plan
flagged that a WCAG floor would ban Yellow from ever appearing against any
ground — Yellow/Cream only reaches 1.25–1.51 WCAG contrast, well under any
conventional floor, despite being the best-loved pairing in the reference
set. Computing the actual 12×4 OKLab ΔE matrix confirmed the deeper issue:
Yellow/Cream (ΔE 0.1687) is the matrix's global minimum — the approved
pairing IS the worst pairing, so no ground-vs-accent floor can reject bad
combinations without also rejecting the good one. Resolution: `MIN_GROUND_DE
= 0.16` is dormant by design (rejects nothing today, tripwire for a future
low-chroma hue); the guard doing real work is accent-vs-accent
(`MIN_ACCENT_DE = 0.15`), which surfaced that the `analogous` scheme's
offsets `(0,1,3)` were mis-specified — adjacent library hues 30° apart fail
the floor on 9/12 base indices. Widened to `(0,2,4)`, per the brief's own
suggested fix; worst-case ΔE across all 4 schemes × 12 base indices now
0.131–0.328. Verified: deterministic (hash-compared, seeds 1-6, both random
and fully-pinned opts), exactly 3 accents always, no duplicate accent hexes,
A/B/C assignment ~35% base-hue-dominant (not positional), no `Math.random()`,
no DOM reference anywhere in the file.

### Task 2 — `v3/engine/paint.js` (new, ground only)
`buildPaintSurface(w, h, rng, groundHex)` — flat ground + weave texture +
weak vignette, no dashed centre line, no dust speckle. First implementation
read as a hard drafting grid, not woven cloth — a real bug (looping both
wraparound axes for every thread band stacked 2-3 overlapping strokes into
one hard edge). Rebuilt as an actual basket-weave: short alternating dashes
per grid cell (checkerboard on-top order) rather than tile-length ruled
lines, which is what stopped it reading as graph paper. Verified visually at
both native 1000×630 *and* ~312px (the lab's actual grid-tile size) across
all 4 `GROUND_LIBRARY` grounds — texture survives both, per the brief's
revised dual-size evaluation requirement (added mid-session for the same
reason brief 09 had to fix chalk's grain: a texture judged at only one size
can pass while failing at the other, in either direction).

### Housekeeping
- `v3/CLAUDE.md`: new rule — docs (`PROJECT-LOG.md`, `BACKLOG.md`,
  `ARCHITECT.md`, `CLAUDE.md`, `PAINT-MODE.md`, `briefs/`) commit to `main`
  only, never to a feature branch, rebase the branch after a doc commit.
  Root cause: brief 10's log entry landed on `feature/chalkboard-surface`
  instead of `main`, so the next chat loaded an 11-day-stale project state.
  This session's own brief-11 edits (the OKLab pivot above) were made
  directly against the working tree mid-session and needed exactly this
  split — code to `feature/paint-surface`, docs to `main` — to land clean.

### Status
`feature/paint-surface` has `palette.js` + `paint.js` (ground only), pushed.
Task 3 (paint stroke renderer — variable-width ribbon, pooling at commit
points) and Task 4 (lab wiring) not started; brief 11 explicitly gates Task 3
on review since it's the piece that decides whether paint mode works at all.

### Next
Brief 11 Task 3, new session.

## 2026-07-20 — Chalk arc closed pending review; paint/splatter references received; recommending a new chat, on Opus, for paint

### Housekeeping (confirmed landed on `main`)
- `v3/CLAUDE.md`: lab-controls-are-calibration-instruments rule recorded
  (commit `27e3fde`) — no lab slider ever ships as end-user UI; values get
  frozen to constants when a mode is promoted to product.
- `v3/BACKLOG.md` created (commit `393adec`), `ARCHITECT.md` load order
  updated to read it every session, right after `PROJECT-LOG.md`. First
  entry: chalk's density smudge (brief 10) fires correctly but is tuned too
  faint to read (`SMUDGE_ALPHA` 0.055 peak, 6–16px radius) — needs a real
  tuning pass plus a calibration slider, and smudge colour should follow
  chalk mode (white mode = neutral dust, tri mode = colour-tinted), which
  revises brief 09/10's "always pale neutral" call for tri mode
  specifically. Also carried forward the still-open items from the
  2026-07-11 entry (stale `feature/art-lab` branch, doc drift in
  `DESIGN.md`/root `CLAUDE.md`/`v3/CLAUDE.md`, ink bloom, spin-shape drops,
  fill's rectangle-clip fix, open product decisions) — status not
  re-verified, check before picking any up.
- Chalk status unchanged from the 2026-07-13 entry: briefs 07–10 complete
  on `feature/chalkboard-surface`, pushed, NOT merged. Still needs
  Shivang's own-eye review + merge decision — that's independent of the
  backlogged smudge-slider item above, doesn't need to block it.

### Paint/splatter — references received, NOT yet briefed
Shivang supplied 5 references for the next surface (canvas/paint mode),
spanning a wider range than chalk's did:
1. Cream/canvas-textured ground, two large precise black looping-circle
   strokes, a handful of big flat-colour blobs (yellow/orange-red/teal)
   sitting under/around the loops, fine multi-colour speckle across the
   whole surface.
2. A distinct, cleaner sub-style: glossy black squiggle-lines on white,
   with bold flat-colour lens/polygon shapes filling some of the enclosed
   regions between lines — visually very close to what `fill.js`'s
   enclosed-region detection already produces, just with an expressive
   line base instead of clean trail strokes.
3. Thick confident brush-swipe strokes (not just thin drips) over a
   saturated red/blue split ground, heavy layered white + colour spatter
   dots on top.
4–5. Two Adobe Stock references (watermarked) — dense, maximalist,
   6–8 simultaneous colours, drips + blobs + fine spray all at once, white
   ground barely visible through the coverage.

Synthesis — six distinct visual elements recur across the set: (A) warm
canvas-weave ground (nearest existing analog: `surface.js`'s paper
technique, different grain), (B) thick variable-width expressive strokes,
looser/bolder than today's trail render, (C) large flat-colour splat
blobs — closely matches what enclosed-region fill already does (ref #2
especially), (D) fine multi-colour spatter/spray dots at high density —
same shape of problem as chalk's density-scatter smudge, likely directly
reusable machinery, (E) thin gravity-biased drip trails hanging off
strokes/blobs — genuinely novel, no existing engine analog, (F) richer
simultaneous multi-colour palette with real paint-layering/overlap, unlike
chalk's clean 3-colour separation.

Proposed phasing (NOT confirmed with Shivang yet — this is a
recommendation, not a locked plan):
1. Canvas surface + bold variable-width stroke renderer (the foundation,
   same shape as chalk's brief 07).
2. Flat-colour splat blobs, built on `fill.js`'s existing enclosed-region
   detection rather than a new placement system from scratch.
3. Fine spatter/spray dots, adapting brief 10's density-scatter pattern
   (`computeLineDensity`/`scatterDensitySmudges`) to multi-colour dot
   placement instead of ambient smudge.
4. Drip trails — stretch, likely out of v1, no existing engine analog to
   build on, revisit after 1–3 are locked.

### Recommendation for next session
Start a NEW chat for paint/splatter, on Opus rather than Sonnet or Fable —
this mode is bigger in scope and more novel (element E has no existing
engine precedent, unlike everything chalk needed) than anything built so
far, and this project's own model (chats are disposable, the repo carries
continuity) is built exactly for clean handoffs like this one. Fable's
strength is narrative/creative writing, not a fit for this role's actual
work. Load order for the new chat: `ARCHITECT.md` → `v3/CLAUDE.md` →
`v3/PROJECT-LOG.md` (this entry) → `v3/BACKLOG.md` → latest brief. This
entry's synthesis above stands in for the raw reference images — confirm
phasing with Shivang before writing brief 11.

## 2026-07-13 — Chalkboard calibration + density smudge (Brief 10 done, NOT merged)

Intended last chalk brief before the review gate.
- **Task 0 (on `main`, pushed):** Recorded the calibration-instrument rule in
  `v3/CLAUDE.md` — every lab control exists to reach a locked default; none
  ships as end-user UI, values get frozen to constants when ported.
  `feature/chalkboard-surface` was rebased on top of it.
- **Task 1 — evaluate at native res.** Lightbox was CSS-upscaling the 1000x630
  bitmap (88vw/78vh), softening the grain under review. Capped at native:
  `max-width/height: min(1000px,96vw)/min(630px,86vh)` — shrinks on small
  screens, never exceeds native. Verified by measured rendered size (1000x630
  large viewport, 983x619 at 1280w). Noted the `#gc` doc-drift in the brief,
  did not chase it.
- **Task 2 — wide strokes read as chalk, not glow.** At native, wide strokes
  glowed. Halo changed from width-proportional to a ~constant dust fringe
  (core + `HALO_DUST` 3px); grain pattern now scales with stroke width
  (`grainScale = sqrt(width/1.6)`, cap 1.8) so texture stays proportional.
  Final: `HALO_ALPHA` 0.26, `HALO_DUST` 3.0, `CORE_MULT` 1.0,
  `CORE_GRAIN_STRENGTH` 0.6, `GRAIN_REF_WIDTH` 1.6.
- **Task 3 — density-based ambient smudge** replaces intersection smudge (which
  missed clustered/near-parallel bundles). Pure `computeLineDensity` (28px grid,
  wt-weighted) + `scatterDensitySmudges` (fixed-seed rng, placement/size/opacity
  by local density, `DENSITY_FLOOR` 0.16) + reused radial-blob `renderSmudges`.
  Verified: 0 smudges below floor, denser seeds get more; dead intersection code
  removed.
- Verified: paper byte-identical to main, chalkboard deterministic (smudges
  included), chalkboard.js density funcs pure. Still NOT merged — review gate is
  next, then canvas/paint.

## 2026-07-12 — Chalkboard final polish (Brief 09 done, NOT merged)

On `feature/chalkboard-surface`, the last chalk brief before Shivang's review:
- **Task 1 — roughness that survives display size.** Root cause the prior two
  passes missed: the grain tile used per-pixel holes that average away when the
  1000×630 canvas is shown at ~312px (3.2× downscale) — textured zoomed in,
  clean at a glance. Rebuilt the tile with multi-pixel blob holes (300 arcs,
  r 1.4–4px, 128px seamless) that survive the downscale, plus the ~20% presence
  bump: `CORE_GRAIN_STRENGTH` 0.5→0.6, `HALO_ALPHA` 0.20→0.24. Verified at real
  display size, not just zoomed.
- **Task 2 — intersection smudge.** Pure/headless `findStrokeIntersections`
  (bbox-culled pairs, strided polylines, 8px-grid dedup) + a soft radial-blob
  `renderIntersectionSmudges` (pale neutral chalk dust, low opacity, radius off
  local width). Composited once per render. Subtle, not muddy even at 140
  strokes.
- **Task 3 — age-linked smudge.** Threaded the existing age fraction into
  `renderChalkStroke`; older strokes get more core grain + dustier halo, so age
  costs crispness as well as opacity. Same single Age Fade toggle governs both;
  OFF = flat baseline.
- Verified: paper byte-identical to main, chalkboard deterministic (smudges
  included), chalkboard.js finder pure / DOM confined to render+build fns, no
  new lab controls. Still NOT merged — this is the review gate.

## 2026-07-12 — Chalkboard revision (Brief 08 done, NOT merged)

On `feature/chalkboard-surface`, two fixes before composition review:
- **Task 1 — chalk stroke roughness/thickness.** The core was drawn clean at
  the identical width paper uses (0.75), so chalk read as a paper stroke. Now
  `CORE_MULT` 1.0, `HALO_MULT` 2.1, and a second grain punch on the core at
  `CORE_GRAIN_STRENGTH` 0.5 (grain tile also coarsened) so texture is visible
  on the line itself, not just the halo. Tuned by eye to sit between the old
  clean build and the ampersand reference. `chalkWidthMult` still scales.
- **Task 2 — speed-weight removed entirely** (engine + lab + the per-stroke
  `speed` field). Indistinguishable from age fade in practice; cut per
  build-lean. Age fade is now the only enhancement.
- Verified: paper byte-identical to main, chalkboard deterministic, grep-clean
  of speed-weight refs. Still NOT merged — next is composition/density review.

## 2026-07-12 — Chalkboard surface built (Brief 07 done, NOT merged)

### Built but NOT merged — on branch `feature/chalkboard-surface` (off main)
- **Brief 07 (chalkboard surface):** New `v3/engine/chalkboard.js` adds a second
  surface style alongside paper, fully additive — `surface.js`/`strokes.js`/root
  `index.html` untouched, and Paper renders byte-identical to main (hash-verified
  across seeds 1-6). Branched off `main`, independent of fill.
  - `buildChalkboardSurface(w,h,rng)`: near-black `#1A1A1E` base, 5-12 rng cloudy
    smudge blobs, subtle neutral grain (amp 8), darkened edge vignette. No dashed
    centre-line, no dust speckle.
  - `renderChalkStroke(...)`: smooth Catmull-Rom two-pass (soft halo + clean
    core) on a per-stroke bbox offscreen, fixed-seed grain punched into the halo
    for a dusty chalk edge; `chalkWidthMult` scales width only.
  - Tri palette `CHALK_PALETTE` `['#3E8EF7','#E8478E','#F5C518']`; white mode
    `WHITE_CHALK_HEX` `#EFEAE0`. All starting points — Shivang eyeball-tunes.
  - Lab: Surface selector (Paper/Chalkboard) + Chalk group (mode White/3-Colour,
    width slider 0.5-3). Chalk reuses the existing age-fade/speed-weight resolved
    wt/op. Determinism hash-verified.
- **Awaiting Shivang's eye in the lab before merge** (same gate as fill). Likely
  tuning: smudge intensity/count, exact tri hexes, white warmth, chalk edge
  roughness, default width.

### Still open from before (unchanged)
- `feature/fill-regions`: Briefs 03-06 done (edge gap + spread fixed and
  pixel-verified in Brief 06), NOT merged — awaiting Shivang's review.

---

## 2026-07-09 — Fill built, needs aesthetic revision (Brief 03 done, NOT merged)

### Done & merged to main
- **Brief 01 (art-lab):** Engine extracted from root index.html into pure ES
  modules — `v3/engine/rng.js, physics.js, strokes.js, surface.js, simulate.js`.
  Seedable/deterministic. `v3/labs/art-lab.html` renders 12 headless-simulated
  artworks in a grid with metrics (strokes / ink% / crossings), density
  scrubber, palette, copy-settings. Faithful to live build. Merged.
- **Brief 02 (stroke enhancements):** Age fade (defaults newest 1.0 / oldest
  0.55, ON) and speed weight (min 0.8 / max 2.0, OFF) added as render-time
  overlays with lab controls, off-by-default discipline. Ink bloom was built
  then CUT — hit-triggered placement put all blooms on left/right edges
  (predictable, useless). Merged.

### Built but NOT merged — on branch `feature/fill-regions`, needs revision
- **Brief 03 (fill regions):** Raster flood-fill region detection in pure
  `v3/engine/fill.js` (headless, zero DOM — detection returns data; wash
  painting lives lab-side in art-lab.html). Detection works well. Lab "Fill"
  group added, off by default.
- **Shivang's verdict: mechanism great, aesthetic wrong. Four problems:**
  1. Fills render near-OPAQUE (lab default opacity 0.8 — should be ~0.3; spec
     said 0.32). This is the biggest issue — reads as flat digital shape, not
     the specced translucent pigment wash. "Same hand as the strokes" violated.
  2. Fills inset from stroke edges → ugly paper halo/gap (half-res mask + blur
     eating the boundary; needs mask dilation and/or full-res detection).
  3. Single colour — every fill is blend(palette[0],palette[1]). Shivang wants
     each region a DISTINCT palette colour, assigned with variety.
  4. Clustering — spacing rule too weak; fills bunch, leaving canvas halves
     empty. Needs stronger spread / quadrant balancing.
- **Decision: do NOT drop fill. One focused revision pass (Brief 04) first.**
  Judged at its worst preset (opaque/mono/inset/clustered). Target: translucent
  ~0.3 washes, each a distinct palette hue, filling clean to stroke edges,
  evenly spread, grain+lines showing through. Then re-decide keep/drop with
  real evidence.

### Housekeeping pending
- Delete stale `feature/art-lab` branch (merged long ago, never cleaned).
- Doc-drift cleanup commit (do together, low priority): DESIGN.md §12 rule 12
  still says BGM via fetch+decodeAudioData (WRONG — it's new Audio()+
  createMediaElementSource, per CLAUDE.md §4); root CLAUDE.md §7 spawn-angle
  formula doesn't match live index.html (live is Math.random()*0.55+0.18);
  root CLAUDE.md getImageData "two loops → merge" note is stale (already one).

### Calibration locked (Shivang's taste, in numbers)
Preferred compositions: ~28–50 strokes, ~10–17% ink, crossings under ~470.
Sweet spot ~30–35 strokes / 10–12% ink. Real preference is SPARSER than
intuition — high end is "acceptable," low 30s / ~11% is "beautiful." Implication:
5/7-point games overshoot the good zone → density scrubber is essential, and
suggested-moment tick target is ~10–13% ink primary, out to ~17% secondary.

### NEXT UP (start of next chat)
1. Write & run **Brief 04 — fill aesthetic revision** (the 4 fixes above).
   This is the priority; fill is the feature Shivang was most excited about.
2. After fill resolves (keep or drop with evidence), candidate next briefs:
   - Composition-aware ink bloom (bloom at dense intersection knots, not paddle
     hits — needs the region-analysis machinery fill already built).
   - Surfaces: chalkboard + canvas renderers (category change, likely the next
     big "wow" lever alongside fill).
   - Shivang's own ideas, logged & endorsed: spin-shape drops (heavy-spin ball
     drops a mark that makes player skill legible in the art — attacks
     convergence), swerve/loop ball physics (crank spin magnitude/decay, find
     the unhittable ceiling in the lab).
3. Open product items still pending Shivang: font decision (index.html already
   self-hosts Basier Circle — real Q is keep vs Google Font), 12 palette hex
   values, onboarding State-1 surface-selector sketch, share-page spec.
