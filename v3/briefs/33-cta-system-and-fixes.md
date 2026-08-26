# Brief 33 — CTA System, Icons, Two Fixes, and Mobile Repair

Continue on `feature/v3-polish` after brief 32. Docs to `main`.

Root `index.html` is generated. Edit `v3/app/index.html`, then `node v3/build.js`.
Renumber `PORT-PLAN.md`: music → 34, QA sweep → 35.

**Read first:** `v3/design/cta.css` (the spec), `v3/design/cta-states.html` (the
live reference — if the build disagrees with this page, the build is wrong), and
the CTA handoff section of `v3/design/MOBILE-NOTES.md`.

**Before you touch anything:** confirm `v3/app/index.html` already contains
brief 31 and 32 (grep for `PAPER_PALETTE`/`#F2716A` and `screen-mobile-gate`).
If either is missing, stop — you are on the wrong baseline; the palette and the
mobile screens must already be there before this brief layers on.

**Scope.** `v3/app/index.html` only, plus the new `v3/app/icons/` source files.
`v3/engine/` and `v3/labs/art-lab.html` byte-identical to `main`.

---

## Task 1 — Bake in the CTA state system

`cta.css` is the single source of truth for every control's hover / focus /
press / muted state. The good news: the build's markup already uses the exact
class names it targets (`.rbtn`, `.rbtn-primary`, `.ctrl-chip`, `.icon-pill`,
`.pal-pill`, `#surface-chip`, `#timeline-chip`). Confirmed present. So this is a
layer-on, not a refactor.

- Copy every rule and token from `cta.css` into the app's `<style>`, placed
  **after** the existing resting styles so the state rules win on equal
  specificity. That ordering is load-bearing — `cta.css`'s own header says so.
- The interaction model: resting controls are cold (dark fill, inset shadow,
  grey label). Interaction **warms** them — label/icon takes `#FFAE68`, the drop
  shadow takes the same hue, wide and soft. Nothing moves, nothing changes fill,
  nothing resizes. In 240ms, out 320ms.
- The build currently dims `.rbtn` with `opacity: .85` on hover. **Remove that**
  — the glow replaces it. Grep for `opacity` on hover/active in the control
  styles and delete those; `cta.css` sets `opacity: 1` but a stray rule elsewhere
  will fight it.
- Three things the reference page is strict about, easy to get wrong:
  1. **Timeline glow is a scrub state, not hover.** Add `.scrubbing` to the
     track on `pointerdown`, remove on window `pointerup`. The build already has
     a pointerdown handler on the track (~line 2498) — add the class toggle
     there. Hover alone gives the thumb a faint ring only.
  2. **Hover rules stay inside `@media (hover: hover)`** so touch never gets a
     stuck glow. `cta.css` already scopes them; keep it.
  3. **Surface tiles and palette dots have no hover state** by design. Leave
     them as the spec has them (focus-visible only).
- Mute's persistent warm state is driven by `aria-pressed="true"`, not a class.
  The build already sets `aria-pressed` on the mute button (~line 2322 region) —
  verify it still does after this change.

Verify by loading `cta-states.html` beside the running app and matching every
control's hover, press, tab, and the persistent muted state.

---

## Task 2 — Adopt the handoff icon set

Ten icons in `v3/app/icons/`: `home, replay, mute, sound, save, share, link,
shuffle, play, cursor`. All are stroke-only, `stroke="currentColor"`, 18×18
(shuffle 20×20) — confirmed clean.

- Single-file build: **inline** them into the markup. `<img>` won't work —
  `currentColor` doesn't resolve on an external image, so the glow would never
  reach the icon. Keep the `.svg` files in `v3/app/icons/` as source; the build
  inlines their contents.
- Replace the build's existing inline control icons with these canonical
  versions so the shipped set matches the design exactly: **home**, **replay**
  (restart), and the **mute pair** — `sound.svg` for the unmuted/playing state,
  `mute.svg` (crossed speaker) for the muted state. The mute toggle already
  swaps icons via `toggleAttribute('hidden', …)` (brief 28's fix) — keep that
  mechanism, just swap the two SVG bodies for `sound`/`mute`.
- `shuffle` and `cursor` (the gate's paddle glyph, brief 32): align to these
  files if they differ.
- `save`, `share`, `link`, `play` are provided but the results/share buttons are
  **text** buttons (`.rbtn` "save artwork" / "share" / …). Do **not** add icons
  to them — the design keeps them text-only. Bring the files into the repo for
  completeness; leave them unused for now and note that in the log.

Every inlined icon inherits its colour from the button via `currentColor`, so no
per-state icon markup is needed.

---

## Task 3 — Results "share" copies the link, no share screen

Right now results → **share** navigates to the share screen (`btn-share` →
`shareCurrentGame`, ~line 3194). Change it: **share stays on results, copies the
link, and confirms on the button.**

- Keep the encoding — `shareCurrentGame` already builds the full absolute URL
  with the `#a=…` fragment. Reuse that to produce the URL; just don't navigate.
- On click: write the URL to the clipboard, swap the label to **"Copied!"** for
  **3 seconds**, then back to **"share"**. No screen change, no overlay.
- Same clipboard fallback as brief 31 Task 5 (hidden selectable input +
  `execCommand`) if `navigator.clipboard.writeText` rejects — and only show
  "Copied!" on real success. This is now the same copy-link behaviour used in
  three places (results share, desktop share screen, mobile share) — **one
  shared helper**, not three implementations.

**Why this is right, not just simpler:** the results screen already *is* the
artwork reveal, so a separate "preview your share" screen was showing the player
what they're already looking at. And save-PNG + play-again already live on
results, so nothing is lost by dropping the creator's route to the share screen.

**Keep the share screen itself** — it is still the landing view when a
*recipient* opens a `#a=…` link (desktop screen 4 and the mobile share screen).
Only the creator's navigation to it goes away. Decoding-a-fragment-on-load is
untouched.

---

## Task 4 — Selecting a surface must not start the game

On idle, tapping a surface tile can immediately start the game. The tile's click
handler calls `e.stopPropagation()` (~line 3229), which stops the **click** from
bubbling to the idle-screen gesture handler — but the idle screen also listens
on **`touchstart`** (~line 3614), and that path is never stopped. So on touch a
tile tap bubbles straight into `beginGame()`.

Fix at the source, robustly: in **`onGesture`** (~line 3597), ignore any gesture
that originates on an interactive control —

```js
if (e.target.closest('#surface-chip, .ctrl-chip, button')) return;
```

That covers the surface tiles, the palette chip, and any control on the idle
card, for click and touchstart alike, and doesn't depend on each handler
remembering to stop propagation. Selecting a surface then only ever selects; the
game still starts on a space/click/tap on the canvas or empty card, exactly as
before.

Verify: pick each surface with mouse and with touch — none start a game. A
space press, and a click on the canvas itself, still serve.

---

## Task 5 — Mobile repair (five real-device bugs)

The brief-32 mobile screens are broken on an actual phone. All five reported
symptoms trace to concrete causes below. Fix at the cause, not the symptom, and
test on a **real iOS Safari device**, not a narrowed desktop window — the two
worst bugs (viewport height and the routing flag) only show up there.

### 5a — "Play your own" shows the desktop screen, not the gate

The worst one. A recipient opens a share link, taps **play your own**, and gets
the unplayable desktop idle screen; the gate only appears after a zoom or
rotate.

Cause: `landingWithSharePayload` is a page-load `const` (`location.hash
.startsWith('#a=')`). `isMobileBlocked()` returns `false` while `screenState ===
'idle' && landingWithSharePayload` — a guard meant only for the split-second
before the share decode flips `screenState` to `'share'`. But the flag never
clears, so after `goToIdleArmed()` sets `screenState` back to `'idle'`, the guard
fires **again** and the gate is suppressed. The next `resize` doesn't re-evaluate
it either — it's still true.

Fix: make it mutable and clear it the moment the user leaves the share landing.
Change the `const` to `let`, and in `goToIdleArmed()` set
`landingWithSharePayload = false`. `setScreen()` already calls
`fitScreenToViewport()` → `updateMobileScreens()` on every screen change, so once
the flag is cleared the gate appears **immediately** on tap — no zoom needed, no
desktop flash.

### 5b — Nothing scrolls; content is stuck off-screen

Both mobile screens use `min-height: 100vh`, and `updateMobileScreens()` hard-sets
`overflow: hidden` on `html` and `body` in portrait. On iOS Safari `100vh` is the
**large** viewport (it ignores the URL bar), so the centred cluster is taller than
the actually-visible area and gets pushed partly above the fold — and with
overflow locked there is no way to scroll to it. That is the "stuck", the "not
centred", and most of the "gate animation doesn't work" (the canvas is simply
scrolled off-screen).

Fix, both screens:

- `min-height: 100vh` → `min-height: 100dvh` (dynamic viewport — tracks the real
  visible height as the URL bar shows/hides). Do the same for any `100vh` on
  these two screens and `#full`.
- Stop hard-locking scroll. Single-fold stays the *target*, but it must degrade
  to a scroll, never to unreachable content. Set `overflow-y: auto` on the two
  mobile screen containers and drop the `overflow:hidden` lock on `html`/`body`
  for the gate/share case (keep whatever is needed only to stop iOS rubber-band
  on the `#full` overlay). Content that fits shows in one fold; content that
  doesn't can be reached.

### 5c — Gate animation

Once 5a and 5b land, the gate is actually visible and on-screen, which is most of
this. After that, confirm on device that the doodle is genuinely animating in
`#gate-canvas` (the rally moves, the cursor rides the left paddle). If it's still
blank on iOS, check that `.stage`'s `aspect-ratio: 1000/630` is giving the canvas
a real pixel height (a zero-height flex parent renders an invisible canvas) — set
an explicit height fallback if so. `prefers-reduced-motion` still holds a still.

### 5d — Logo sits too far from "tap to view"

On the share screen the logo is in `<header>` but "tap to view" (`.zoom-hint`)
is the first child of `<main>`, which has `padding: var(--space-l)` (32px) on top
— so the gap is ~2× the 16px the design calls for (MOBILE-NOTES §3: logo → 16 →
"tap to view"). Bring them to 16px: move `.zoom-hint` into the header cluster, or
cut the share screen's `main` top padding so the logo-to-label gap reads as 16.

### 5e — Re-verify the share screen centres

Same root as 5b; the `100dvh` + scroll fix should re-centre it. Confirm the
cluster is vertically centred on a real phone with the URL bar both shown and
hidden.

---

## Verification

- Every control matches `cta-states.html` on hover, focus (keyboard), press, and
  the persistent muted state. No control moves, changes fill, or resizes.
- No stray `opacity` hover-dim remains on any `.rbtn`.
- Timeline warms only while scrubbing, not on plain hover.
- Icons match the handoff set; mute shows `sound` when playing and the crossed
  `mute` when muted; the glow reaches every icon.
- Results "share" copies the working link and shows "Copied!" for 3s with no
  navigation; a copied link still opens the artwork. Recipient landing on a
  `#a=…` link still renders the share screen.
- No surface selection — mouse or touch — starts a game.
- Desktop plays a full game start to finish with nothing regressed.
- **On a real phone:** open a share link → tap "play your own" → the **gate**
  appears at once (no desktop screen, no zoom needed). Gate doodle animates.
  Both mobile screens scroll if content overflows and never trap content
  off-screen. Share screen is centred. Logo-to-"tap to view" is ~16px.
- `node v3/build.js`; two runs byte-identical.
  `git diff --stat main -- v3/engine/ v3/labs/` empty.

## Done looks like

Every button warms from within when you touch it, the icons are the real set,
picking a surface just picks it, and "share" copies your link in place instead
of sending you to a screen showing the painting you're already looking at. On a
phone, a shared link opens clean, "play your own" lands straight on a living
gate, and nothing is ever stuck behind a fold you can't scroll to.
