# Brief 06 — Fill Verification & Final Attempt (Hard Stop)

**Branch:** `feature/fill-regions` (continue existing branch)
**Goal:** Brief 05 reported all 5 acceptance criteria met — edge gap closed,
spread fixed via corrected quadrant selection. Shivang re-checked the fresh
build after the push and both problems are still visibly present: fills
still stop short of stroke edges, fills still cluster near each other. The
self-report did not match reality.

**This changes what "done" means for this brief.** No more prose claims of
"verified." Every acceptance criterion below must be backed by a script
output or a saved screenshot Shivang can independently look at. If you
cannot produce that evidence, the task is not done.

**This is the final attempt.** If the automated checks in Task 4 still
fail after your fix, stop. Do not attempt a further heuristic tweak. Write
up what the evidence shows and report it plainly — we will drop fill and
move to a different feature rather than keep guessing.

---

## Task 0 — Preflight: rule out a stale build before touching code
Before assuming Brief 05's fix is wrong, confirm you're actually looking at
Brief 05's code:
- Print `git log -3 --oneline` on `feature/fill-regions` and confirm the
  quadrant-selection fix commit is present and is what's currently checked
  out.
- Confirm the local server serving `art-lab.html` was restarted after that
  commit (stale dev server / browser cache is a real and common cause of
  "fixed but still broken").
- Report the commit hash you're testing against in your final summary.
If this reveals the bug was never actually being tested against the real
fix, say so plainly — that's a legitimate finding, not a failure to hide.

## Task 1 — Headless engine-level test (no browser)
`fill.js` is headless by contract — use that. Write a Node test script
(lives in `v3/engine/` or a `v3/tests/` folder, your call) that:
- Imports the detection/filtering/selection functions directly.
- Runs them across at least 20 seeds.
- For each seed, records: total candidate regions per quadrant, which
  regions were selected, and the computed dilation amount per region.
- Asserts: every quadrant with at least one candidate region gets at least
  one selection before any quadrant gets a second (the Brief 05 rule).
- Dumps a results file (JSON is fine) and prints a pass/fail summary.
Run it. Paste the actual output in your summary — not a description of
what it should show.

## Task 2 — Rendering-level test (real pixels, real screenshots)
The engine can be correct while the render step still has the bug — Brief
05's fix may have landed in detection/selection but not in whatever draws
the wash. Verify the actual rendered output:
- Use a headless browser (Puppeteer or Playwright — install if not
  present) to load `art-lab.html`, enable fill at default settings, and
  render at least 6 of the same seeds Shivang has looked at.
- For each, capture the canvas as an image and also pull raw pixel data
  (`getImageData` on the canvas context) to programmatically check: along
  the boundary of each filled region, is there a ring of paper-colour
  pixels between the fill and the stroke that bounds it? Measure it (pixel
  count / ring width), don't eyeball it from the screenshot.
- Save the screenshots to disk somewhere in the repo (e.g.
  `v3/tests/fill-verification/`) so Shivang can open them directly and
  compare to what he saw.
- Report the actual measured ring width per region, per seed. "0px" or
  "no ring detected" is the passing condition — not "looks good."

## Task 3 — Fix whatever Task 1/2 evidence actually shows
Now that you have real data instead of a code read-through, fix the actual
cause. Possibilities to check, don't assume which:
- Dilation computed correctly in `fill.js` but the render step in
  `art-lab.html` not applying it, or applying it to the wrong mask/buffer.
- Draw order or compositing issue (e.g. blur pass happening after
  dilation, undoing it).
- The quadrant-selection fix from Brief 05 present in one code path (e.g.
  a test/debug function) but not the one actually wired to the live render
  loop.
- Caching: fills computed once and not recomputed when they should be.
Whatever it is, name it plainly in your summary — this is the third round
on the same two bugs, we need to know what specifically kept failing.

## Task 4 — Re-run Task 1 and Task 2 after the fix
Same scripts, same seeds. This is the actual gate. Paste fresh output.

---

## Acceptance criteria (all require pasted evidence, not description)
1. Task 0 preflight completed, commit hash reported.
2. Task 1 script output shows every quadrant with candidates getting at
   least one selection, across ≥20 seeds. Raw output pasted.
3. Task 2 measured ring width is 0 (or below an agreed noise threshold,
   state it) across all 6 test seeds. Raw measurements pasted, screenshots
   saved to repo and their paths given.
4. If either check still fails after your fix attempt: stop, do not
   iterate further, report the raw evidence as-is and say plainly that
   fill does not meet the bar at this time.
5. All Brief 03/04/05 criteria still hold (fill OFF = identical to main,
   determinism, headless engine, root index.html untouched).

## Git / serve automation
- Continue on `feature/fill-regions`, commit per task.
- Push when complete, whether the outcome is pass or the Task 4 hard stop.
- Start the local server, reply with the exact URL, the commit hash
  tested, and the pasted evidence from Tasks 1 and 2 (or the stop report).
- Do NOT merge to main regardless of outcome — Shivang decides based on
  the evidence.

## Out of scope
- No new aesthetic changes beyond closing these two specific bugs.
- No new lab controls.
- Render-mode toggle, ink bloom, chalkboard/canvas surfaces — separate
  future briefs, not this one.
