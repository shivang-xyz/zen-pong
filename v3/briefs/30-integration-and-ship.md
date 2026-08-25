# Brief 30 — Integration and Ship

Replace the live game. Continue on `feature/v3-app`, then merge to `main`.

This brief ends the port. After it, `shivang-xyz.github.io/zen-pong` serves v3.

**Read before starting:** `ARCHITECT.md`, `v3/CLAUDE.md` (its engine rule and
its audio rules are both load-bearing here), `PORT-PLAN.md`, and root
`CLAUDE.md` §4.

---

## Task 1 — How the single file gets made

`PORT-PLAN.md` requires one self-contained file. `v3/CLAUDE.md` requires that
the engine stays the source of truth and that **no consumer ever copy-pastes
engine code**. Those look contradictory. They are not — resolve it with a build
step, and do not resolve it by hand-inlining.

**Build a small generator**, `v3/build.js`, plain Node, no dependencies:

- Reads `v3/app/index.html`.
- Replaces its `<script type="module">` block with one script containing the
  engine modules inlined in dependency order, followed by the app code, with the
  `import`/`export` statements stripped.
- Rewrites the `Oolong.mp3` path from `../../Oolong.mp3` to `Oolong.mp3`.
- Writes root `index.html`.
- Stamps a header comment at the top of the output:
  `GENERATED FILE — do not edit. Source: v3/app/index.html + v3/engine/. Rebuild with: node v3/build.js`

**The rule this creates, and it must be loud:** root `index.html` is now a build
artifact. Nobody edits it, ever. All changes go to `v3/app/index.html` or
`v3/engine/` and get rebuilt. Put this in `v3/CLAUDE.md` as a settled decision,
not just in a code comment.

Why a build step rather than hand-inlining: hand-inlining forks the engine
permanently. The lab and the product would drift apart silently, which is the
exact failure `v3/CLAUDE.md`'s engine rule exists to prevent, and it would not
show up until someone tuned a value in the lab and wondered why the game
ignored it.

**Why single-file at all**, so this isn't cargo-culted: ES modules do not load
over `file://`. A single file opens from disk, can be emailed, and can be hosted
anywhere. That is a real product property, not tidiness.

---

## Task 2 — The two things that will not be inside the file

Say these plainly in the session summary rather than quietly failing the
"self-contained" claim:

1. **`Oolong.mp3` stays a sibling file.** Root `CLAUDE.md` §4 forbids
   base64-embedded audio, and 2.5MB of base64 in the HTML would be absurd
   regardless. The HTML is one file; the audio is one asset next to it.
2. **The Google Fonts link is a remote asset.** `DESIGN.md` §3 says DM Serif
   Display and Space Mono are an interim substitute until Basier Circle is
   self-hosted. Leave it as-is and log it — self-hosting fonts is its own job,
   and doing it badly (a FOUT on the intro card) is worse than the current state.

Both are pre-existing and neither blocks ship. Add them to `BACKLOG.md`.

---

## Task 3 — Mobile

**This is the one real ship blocker in the brief.** v3 has no mobile handling at
all. The game is mouse-driven; on a phone it will load, look broken, and be
unplayable.

Root `index.html` already solves this — `checkMobile()`, the `is-mobile` body
class, and `#mobile-overlay`. Port that behaviour: below 600px, show the overlay
and hide the control row.

Two things to get right that root does and a naive port would miss:

- The idle doodle keeps running behind the overlay, scaled to fill the viewport
  (root's `resize()` uses `Math.max` on mobile, not `Math.min`). A phone visitor
  sees the art moving even though they can't play.
- **A shared link opened on a phone must still show the artwork.** That is the
  single most likely way a phone visitor arrives — someone sent them a painting.
  The share screen (`#a=…`) must render on mobile, with the overlay only
  blocking the *game*. Getting this wrong makes every shared link dead on the
  device most people will open it on.

Write the overlay copy to match the product's voice — not an error, an
invitation to come back on a desktop.

---

## Task 4 — Page metadata

Currently absent from the v3 app. Add to `<head>`:

- `<title>Zen Pong</title>`
- A one-line description meta.
- Open Graph and Twitter card tags — title, description, and a static preview
  image committed to the repo. It cannot be the player's own artwork (no server
  to render one per link), so use one good finished piece as the card image and
  do not pretend otherwise.
- Favicon derived from the existing SVG logo mark.
- `theme-color` `#383838`.

---

## Task 5 — The swap

In this order:

1. Run `node v3/build.js`, generating root `index.html`.
2. **Tag the current `main` tip `v2-final`** before anything replaces it, and
   push the tag. The v2 build then stays recoverable by name forever without
   leaving a stray `index-v2.html` in the repo.
3. Commit the generated root `index.html` on `feature/v3-app`.
4. Merge `feature/v3-app` → `main` with a real merge commit (`--no-ff`), same as
   the paint and chalkboard arcs — the brief-by-brief history stays legible.
5. Push. GitHub Pages redeploys.

Delete the stale merged branches while you are here — `feature/art-lab`,
`feature/paint-surface`, `feature/chalkboard-surface` — all long merged and
logged in `BACKLOG.md` as housekeeping. Leave `feature/fill-regions`; it is
unmerged and still blocked on its rectangle-clip fix.

---

## Task 6 — Verify on the live URL, not locally

Local `python3 -m http.server` and GitHub Pages differ in ways that matter here:
MIME types, caching, and the base path. Everything below is checked at
`https://shivang-xyz.github.io/zen-pong/`, after the deploy lands.

- All three surfaces play end to end. Idle → surface → rally → reveal → share.
- Audio unlocks on the first gesture and BGM loads (this is the most likely
  thing to break on the path rewrite).
- Save PNG downloads. Copy link copies. A copied link, opened in a private
  window, shows the same artwork.
- Open a shared link on a phone: the artwork renders, the overlay does not
  swallow it.
- Open the file directly from disk (`file://`) — it must work, since that is the
  reason for single-file.
- No console errors, no 404s in the network tab.
- **The art lab still runs** (`v3/labs/art-lab.html`) and paper still renders
  identically — the engine was not touched, so prove it rather than assume it.

---

## Task 7 — Close the port

- `PROJECT-LOG.md` entry: the port is done, what shipped, what did not.
- `PORT-PLAN.md`: mark the sequence complete. It has done its job.
- `BACKLOG.md`: add the items from Task 2, and note that this is the checkpoint
  `BACKLOG.md` itself named for a full triage — "once every current surface is
  built and the game is fitted together". That triage is brief 31, together with
  the QA sweep of everything deferred during the run.

---

## Verification

Everything in Task 6, on the live URL. Plus:

- Root `index.html` carries the GENERATED header and nobody has hand-edited it.
- `node v3/build.js` run twice produces a byte-identical file (no timestamps, no
  nondeterminism in the generator).
- `git diff --stat main -- v3/engine/ v3/labs/` empty across the whole merge.
- `v2-final` tag exists on origin and points at the pre-swap `main` tip.

## Done looks like

Someone opens the live URL, picks a surface, plays a game of pong, watches their
painting resolve, and sends it to a friend who opens it and sees the same piece.
The thing is shipped.
