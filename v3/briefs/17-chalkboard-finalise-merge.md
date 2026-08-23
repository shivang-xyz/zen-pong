# Brief 17 — Chalkboard: Review, Freeze, Merge to main

Chalkboard (briefs 07–10) has been built and parked at its review gate on
`feature/chalkboard-surface` for weeks. This brief gets Shivang's eye on it,
freezes the approved values, and merges to `main` — same pattern as paint's
brief 16.

Docs to `main`. This is a merge brief, so the branch work lands on `main`.

---

## Task 1 — Serve for review, do NOT merge yet

Check out `feature/chalkboard-surface`, rebase it onto current `main` (paint is
now on main; resolve any lab conflicts by keeping both surfaces), serve the lab,
and give Shivang the link. Surface → Chalkboard.

Stop here and wait for his verdict. Do not proceed to freeze/merge until he
confirms. He is judging: chalk stroke quality, smudge read, tri-colour vs white
mode, overall composition against the paper/paint bar now set.

**Known open item to flag at review** (from `BACKLOG.md`): brief 10's density
smudge is correctly wired but tuned too faint (`SMUDGE_ALPHA` 0.055 peak). If
Shivang wants it stronger, that's a small tuning pass to do *before* merge while
we're in here — ask him. If he's happy as-is, it stays a backlog item.

## Task 2 — Freeze approved values (after his OK)

Per the calibration-instrument rule: chalk's tuned lab values become fixed
constants for the product. Record whatever Shivang approves — the smudge
intensity, chalk width default, mode default (white vs tri), palette hexes — as
named constants, mirroring how paint was frozen in brief 16. Keep the lab
sliders in place for future re-tuning.

## Task 3 — Merge to main (after freeze)

- Real merge (not squash), preserving brief 07–10 history.
- **Post-merge verification, before done:**
  - Paper byte-identical to pre-merge `main` (hash, seeds 1–6).
  - Paint renders unchanged (deterministic, same seeds).
  - Chalkboard renders as approved.
  - No `Math.random()` in engine; pure modules still pure.
- Do not delete `feature/chalkboard-surface` until the merge is confirmed on
  origin.

## Task 4 — Log + backlog

- PROJECT-LOG entry: chalk reviewed, values frozen, merged; note any smudge
  tuning done or left open.
- BACKLOG: strike the chalk items that got resolved; leave the rest.

## Done looks like

`main` carries all three surfaces — paper, chalkboard, paint — each rendering as
approved, one clean history, chalk values frozen.
