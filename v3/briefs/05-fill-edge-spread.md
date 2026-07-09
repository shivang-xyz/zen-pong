# Brief 05 — Fill Edge Gap + Spread Diagnosis

**Branch:** `feature/fill-regions` (continue existing branch)
**Goal:** Close the remaining edge gap between fills and strokes, and
determine whether the spread problem is a selection bug or a data
limitation — then fix accordingly.

**Status from Shivang's review of Brief 04:** Colour variety and opacity
are good, ship-quality. Two problems remain:
1. Fills still stop short of the stroke boundary — a thin gap/halo is
   visible.
2. Fills still cluster near each other instead of spreading toward canvas
   corners/edges.

---

## Task 1 — Width-proportional mask dilation (fixes the edge gap)
Brief 04 dilated the fill mask by a fixed 1–2px. That's not enough because
strokes render as two passes at different widths (per v3/CLAUDE.md: wide
pass at 0.22α, core pass at 0.88α) — the visible stroke is wider than a
flat 1–2px constant accounts for.

Change dilation to scale with actual stroke width rather than a fixed
pixel value. Dilate the fill mask by roughly half the wide-pass stroke
width, so the wash edge tucks fully under the stroke at its widest point.
Verify by zooming into a filled region's boundary — no cream/paper ring
should be visible anywhere along the edge, at any zoom level in the lab.

## Task 2 — Quadrant candidate-count debug readout
Before touching the spread/selection logic further, we need to know
whether the problem is "good candidates exist in the corners and aren't
being picked" (selection bug) or "few/no candidate regions exist near
canvas corners" (a property of how strokes are shaped — nothing to select
from). We don't know which yet, so build the diagnostic first.

Add a small per-artwork readout (lab UI, near the existing "N fills"
readout) showing: total candidate regions found by the detector (before
filtering/capping), broken down by which quadrant of the canvas each
falls in (simple 2×2 split is fine — top-left/top-right/bottom-left/
bottom-right).

This is read-only instrumentation. No behavior changes in this task.

## Task 3 — Conditional fix, based on Task 2 data
Run the lab across a spread of seeds with the readout visible and report
findings before changing anything further:

- **If candidate regions exist in outer quadrants but aren't selected:**
  the Brief 04 quadrant-bias selection rule has a bug — fix it so it
  actually prefers under-represented quadrants when candidates are
  available there.
- **If outer quadrants genuinely have few/no candidate regions:** this is
  a property of the current min-area threshold being too strict for the
  smaller regions that tend to form near edges, not a selection bug. Try
  loosening `fill.minAreaFrac` specifically for regions in
  under-represented quadrants, and re-check spread. Document this as a
  structural constraint either way — if loosening the threshold doesn't
  meaningfully help, say so plainly rather than continuing to tune blind.

Do not guess which branch applies — the readout from Task 2 decides it.

---

## Acceptance criteria
1. No visible gap between any fill and its bounding stroke, checked at
   multiple zoom levels, multiple seeds.
2. Quadrant candidate-count readout visible in the lab and accurate.
3. A clear, one-paragraph finding recorded (in the PR/commit description)
   on whether spread was a selection bug or a candidate-availability limit,
   and what was done about it.
4. Fills visibly reach more of the canvas (including at least occasional
   corner/edge fills) across a spread of seeds — or, if Task 3 concludes
   this is a hard structural limit, a clear explanation of why, with
   evidence (the quadrant counts) to back it up.
5. All Brief 03 + Brief 04 acceptance criteria still hold (fill OFF =
   identical to main, determinism, headless engine, root index.html
   untouched, opacity/colour quality unchanged).

## Git / serve automation
- Continue on `feature/fill-regions`, commit per task.
- Push when complete and self-verified.
- Start the local server, reply with the exact URL
  (`http://localhost:8000/v3/labs/art-lab.html`) plus the one-paragraph
  finding from Task 3.
- Do NOT merge to main.

## Out of scope
- Render-mode toggle system (regular / fill / black-stroke) — separate
  future brief.
- Canvas background colour toggle — separate future brief.
- Any new fill style beyond the existing wash↔painterly control.
