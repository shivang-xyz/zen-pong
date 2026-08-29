# Brief 36 — Repo Cleanup & Release Hygiene

Branch off `main` as `feature/v3-cleanup`. This is housekeeping + docs — no
player-facing behaviour changes. Docs and deletions land via a normal PR to
`main`. Root `index.html` is generated; if any change touches
`v3/app/index.html`, rebuild with `node v3/build.js`, otherwise leave it.

**Scope.** Branch pruning, dead-file removal, README, LICENSE, and a doc-drift
reconciliation pass. `v3/engine/` and `v3/labs/` behaviour untouched.

---

## Task 1 — Prune stale branches

All merged into `main`, safe to delete (local **and** `origin`):
`feature/v3-app`, `feature/v3-polish`, `feature/v3-music-polish`,
`feature/v3-palette-music`.

`feature/fill-regions` is **unmerged** and now **decided: abandon it.** First
capture the idea in `BACKLOG.md` (so nothing is lost), then delete the branch
local **and** origin. Add this entry to `BACKLOG.md` verbatim (under the
Engine-wide / Product section, or wherever fits):

> - **Fill-regions (closed-area colour fills) — deferred; branch abandoned
>   (brief 36, 2026-08-28).** The idea: detect the closed regions the strokes
>   form and flood them with translucent colour, so the piece gains filled
>   shapes, not just lines. Built experimentally on `feature/fill-regions`,
>   never finished — blocked on a rectangle-clip bug in the region detection
>   (`fill.js`'s clip step). Branch deleted on cleanup (dangling, unmerged
>   since the early arc); the idea and the blocker live here. Pick it up as a
>   fresh brief if wanted — `fill.js`'s existing region-analysis machinery is
>   the starting point. *Originally `03-fill-regions.md`.*

Only after that entry is committed, delete the branch (local + origin).

---

## Task 2 — Remove dead files

- **`swoosh.mp3`** — referenced by nothing (root `index.html`, the v3 app, and
  the build all ignore it; confirmed in `BACKLOG.md`). Delete.
- **`.DS_Store`** — macOS junk, committed by accident. Delete and add to
  `.gitignore`.
- **`.gitignore`** — audit: ensure `.DS_Store`, `.claude/`, and any local scratch
  are ignored.

Keep everything else: `fonts/` (the Basier Circle woff2s — a real deferred
option, small, harmless to keep), `og-image.png`, `favicon.svg`,
`Zen Pong Logo.svg`, `Oolong.mp3`, `GoldenPothos.mp3`.

---

## Task 3 — README.md

The repo has none. It is the front door — write it properly. Use this structure
(prose, a screenshot, the live link):

- **Title + one-liner:** "Zen Pong — a pong match that paints. Every rally leaves
  a piece of generative art."
- **Live link** to the GitHub Pages URL, and a screenshot (use a good finished
  paint canvas — export one from the game).
- **What it is:** three surfaces (paper, chalk, paint), the ball's path becomes
  the artwork, share your painting as a link, all audio synthesised + a licensed
  soundtrack.
- **How it's built** — this is the interesting part, keep it: one self-contained
  HTML file, pure vanilla JS, **no external libraries**, no build framework; a
  small Node generator (`v3/build.js`) inlines the engine modules so the shipped
  file stays one file while the engine stays the single source of truth. Canvas
  1000×630, DOM paddles, Web Audio for everything.
- **Repo layout:** `v3/engine/` (the headless, seedable engine — source of
  truth), `v3/app/` (the product), `v3/labs/` (the art lab), `v3/briefs/` (the
  build history), root `index.html` (generated — never hand-edited).
- **Credits:** music by Omni Gardens (link to the Bandcamp album), fonts, and a
  line on how it was built (Shivang directing, brief by brief).
- **Licence:** reference the LICENSE file (Task 4).

---

## Task 4 — LICENSE

None exists. **Decision for Shivang — three separate rights, don't conflate:**

1. **The code.** Options: MIT (permissive — others can learn from / reuse it,
   good for an indie building reputation), or "all rights reserved" (source
   visible on GitHub but no reuse rights). Recommended: MIT for the code if
   Shivang is happy for it to be a public, learnable example; otherwise a short
   proprietary notice.
2. **The artwork** players generate — clarify they own / may freely use their own
   pieces (goodwill, and it fuels sharing).
3. **The music** — NOT Shivang's to license; it stays Omni Gardens'. The LICENSE
   / README must say the soundtrack is used under permission and is not covered
   by the repo's licence. (See the release checklist — the permission itself is a
   separate to-do.)

Ship the LICENSE Shivang picks; put the three-part note in the README.

---

## Task 5 — Doc-drift reconciliation (one pass)

Several docs describe old behaviour. `BACKLOG.md` already lists them — work that
list. Make the docs match the live code (live code wins, per `ARCHITECT.md`):

- `DESIGN.md` §2 colour tables — update to the shipped hexes, and note palettes
  are now **generated in OKLCh** (brief 35), not a fixed set.
- `DESIGN.md` §1/§6 — absorb the frame glow the game actually uses (stop banning
  it).
- `DESIGN.md` §11 — logo is the inline SVG, never text; correct the save-PNG note.
- `CLAUDE.md` — fix the stale BGM (it's `new Audio()` + media-element source, and
  now a **two-track crossfading player**, brief 35), spawn-angle, and
  merged-loop notes.
- `PORT-PLAN.md` — already marked complete; leave as the historical record.
- Strike the now-resolved `BACKLOG.md` items (don't delete — strike with the
  brief number, per the file's own rule).

Goal: a new contributor (or future session) reading the docs is not misled.

---

## Task 6 — Briefs index (nice-to-have)

Add `v3/briefs/README.md`: a one-line-each index of briefs 18→36 as the build
history. It turns a folder of files into a legible changelog and reads as
"this was built deliberately." Low effort, high polish.

---

## Verification

- `git branch` shows only `main` (+ `feature/fill-regions` if kept); origin
  matches. No merged feature branches dangling.
- `swoosh.mp3` and `.DS_Store` gone; `.gitignore` covers them.
- README renders on GitHub with a screenshot and the live link.
- LICENSE present; README carries the three-part rights note.
- Docs match live code — no stale colour tables, glow ban, or fetch-based BGM
  claim. Resolved backlog items struck with brief numbers.
- `node v3/build.js` still regenerates root `index.html` byte-identically; the
  live game is unchanged (this brief ships no behaviour change).
- `git diff --stat main -- v3/engine/ v3/labs/` empty.

## Done looks like

The repo reads as a finished, deliberate project: a real README, a licence, no
dead files or dangling branches, and docs that tell the truth. Nothing about the
running game changes — this is the difference between "a link someone sent me"
and "a project someone shipped."
