# Brief 37 — Launch Hygiene

Pre-launch plumbing, not features. Branch off `main` as `feature/v3-launch-hygiene`
after cleanup (36) merges. Root `index.html` is generated — edit
`v3/app/index.html`, then `node v3/build.js`.

**Scope.** `v3/app/index.html` only. `v3/engine/` and `v3/labs/` byte-identical
to `main`. Everything here is additive and must **degrade silently** — the game
must still run perfectly with no network (from `file://`, offline), exactly as it
does today. Nothing here changes gameplay.

---

## Task 1 — Privacy-friendly analytics (Cloudflare — chosen)

Cloudflare Web Analytics — cookieless, no consent banner, free. Add this exact
snippet to `<head>` (real token, no placeholder):

```html
<!-- Cloudflare Web Analytics -->
<script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "19319b3700974cdfb2ed26cb4337c75b"}'></script>
<!-- End Cloudflare Web Analytics -->
```

- It's a remote `type=module` script (async by nature) — it must **never block
  or break the page** if it fails to load (offline, `file://`, or blocked by a
  tracker-blocker). Confirm the game still runs fully with the script 404'd/blocked.
- No cookies, no personal data — anonymous page/visit counts only. No consent
  banner needed.
- This is the generated file, so the snippet goes into `v3/app/index.html`'s
  `<head>` and is carried through by `node v3/build.js` like everything else.

---

## Task 2 — Error visibility (no backend)

Right now if the game throws on a browser we didn't test, it fails silently and
Shivang never knows. Make errors visible without standing up a server:

- Add global `window.addEventListener('error', …)` and
  `'unhandledrejection'` handlers.
- Each logs a clearly-tagged `console.error` (`[zenpong] …`) with the message,
  source, and line — so anyone (or Shivang, remotely walking a user through it)
  can read it from the console.
- **Note on Cloudflare:** its free Web Analytics is page-views only — it does
  **not** take custom events, so errors surface in the **console**, not the
  dashboard. That's fine for now: console logging is the mechanism. Leave a
  one-line comment at the handler noting that if an events-capable tool (Umami)
  is added later, this is where an error event would fire — so it's a two-line
  change then, not a rediscovery.
- Do **not** show the user anything alarming — this is silent instrumentation,
  not a UI. The game's existing graceful paths (bad share payload → idle, etc.)
  stay as they are.

---

## Task 3 — Lazy-load the audio

The page currently can pull **~7MB of audio** (both tracks) up front — that hurts
first load, especially on mobile data. Fix the load order:

- Load **no audio until the first user gesture** (audio can't unlock before one
  anyway — tie it to the existing audio-unlock gesture).
- Load **only the first track** at unlock (the coin-flip pick — brief 35).
- Load the **second track lazily**, shortly before the crossfade needs it (the
  crossfade trigger already knows when track-end approaches — kick off the second
  track's load a few seconds ahead of that, not at page load).
- Net effect: initial load pulls ~0MB of audio; the first track streams on play;
  the second arrives just in time. Keep the crossfade seamless — verify there's
  no gap if the second track is still buffering (start the crossfade only once it
  can play through, `canplaythrough`, with a short fallback).
- Keep root `CLAUDE.md` §4's protected `new Audio()` + `createMediaElementSource`
  pattern — this is about *when* they're created, not how.

---

## Task 4 — Social preview + meta check

The link's first impression in every feed. Verify (add/fix only what's missing —
brief 30 added most of this):

- `<title>`, description meta, Open Graph (`og:title`/`og:description`/`og:image`/
  `og:url`/`og:type`) and Twitter card tags all present and correct.
- `og:image` points to `og-image.png` (1200×630) with an absolute URL to the live
  site, and `og:url` is the live URL.
- `theme-color`, favicon present.
- Report the final tag set so Shivang can paste the live link into LinkedIn / X /
  iMessage and confirm the card renders. (The paste-test itself is his — it can't
  be done from here.)

---

## Optional (Shivang's design call, not required to ship)

**Cold-arrival clarity.** A first-time visitor sees the quote — beautiful, but
abstract. One plain line somewhere unobtrusive ("a pong match that paints") would
make the novelty land in three seconds. Left as a design decision, not built here
unless Shivang wants it.

---

## Verification — including the real-device / cross-browser QA pass

**Automated / in-build:**
- Game runs identically with the analytics script blocked or 404'd (offline and
  `file://`). No console errors from the hygiene code itself in the happy path.
- Initial page load pulls no audio; first track streams on first gesture; second
  track loads before the crossfade and the crossfade stays gap-free.
- A deliberately-thrown test error logs `[zenpong]` to the console with message/
  source/line.
- The Cloudflare snippet is present in `<head>` with the real token; the
  Cloudflare dashboard registers a visit after a real load (Shivang confirms in
  his dashboard once live).
- `node v3/build.js` twice byte-identical. `git diff --stat main -- v3/engine/
  v3/labs/` empty.

**Real-device / cross-browser pass — Shivang runs this on actual hardware**
(this is the device-level bugging list; my sandbox cannot do it):

Test matrix — **desktop Chrome, Safari, Firefox** + **a real iPhone (Safari)** +
**a real Android (Chrome)**. On each, walk:

1. **Idle** — loads, doodle animates, music starts on first click/tap and it is
   *not always the same track* across reloads; mute works; credit line shows.
2. **Each surface** — paper, chalk, paint: play a full game to the results
   reveal. Watch for jank, wrong colours, missing splatter, audio glitches.
3. **Shuffle** — on each surface, several times: colours genuinely change every
   time (the brief-35 fix), legible on their ground.
4. **Results** — timeline scrubber works (amber, no white outline), save PNG
   downloads, "share" copies the link and says "Copied!" without navigating.
5. **Share round-trip** — copy a link on desktop, open it on the **phone**: the
   exact artwork renders. Then on the phone tap "play your own" → the **gate**
   appears immediately (no desktop flash), doodle animating; "go back to artwork"
   returns to the piece.
6. **Mobile fold** — gate and share screens sit in one fold, nothing cut off, ≤40px
   above the logo; the rotated full-screen artwork view opens and closes.
7. **Sound** — point bell, the two-note game-over, no double-sound on the winning
   point; music crossfades between the two tracks with no silent gap.
8. **Edge** — open the game from a bad/truncated share link → clean idle, no error
   UI. Open `index.html` straight from disk (`file://`) → still works.
9. **Console** — no red errors on any browser during a normal play-through.

Log anything that misbehaves per device/browser; those become the next fix list.

## Done looks like

The game loads light and fast, you can see your launch in an analytics dashboard,
a break on any browser leaves a trail instead of vanishing, the link looks right
in a feed — and you've walked a real phone and three real browsers through the
whole thing so nothing surprises a stranger.
