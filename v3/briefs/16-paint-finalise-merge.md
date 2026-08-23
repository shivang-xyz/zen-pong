# Brief 16 — Paint: Freeze Constants, Housekeeping, Merge to main

Paint is approved in the lab. This brief freezes the tuned values, clears the
paint-arc housekeeping, and merges `feature/paint-surface` → `main`. No new art
behaviour — if output changes visually, something is wrong.

Docs to `main`. This is the merge brief, so the branch work lands on `main` too
(that's the point).

---

## Task 1 — Freeze the approved lab values into constants

Per the calibration-instrument rule in `v3/CLAUDE.md`: the sliders never ship,
their settled values become fixed constants in the engine. Shivang approved
these positions (2026-07-21). Set them as the product defaults / frozen
constants in `paint.js`:

| Control | Frozen value |
|---|---|
| Base width | 6.0 |
| Width variation | 1.0 (full range) |
| Blotch size | 1.0 |
| Patch count | 6 |
| Jitter amplitude | 0.5 |
| Ground (default) | Cream |
| Ground mode (default) | Plain |

Note these are approved *positions*, expected to change again during the
product port — freeze them as named constants, not magic numbers, so a later
pass can re-tune in one place.

**Density stays a live control, not frozen.** The density scrubber is a
product feature (per the calibration notes — 5/7-point games overshoot the good
zone, the scrubber is essential). Approved default sits ~37%; wire that as the
default scrubber position, keep the control.

**Do not touch the lab.** The sliders stay in `art-lab.html` for future
re-tuning. Freezing is about what the *product* will use, not removing lab
instruments.

## Task 2 — Delete the orphan brief

`v3/briefs/15-splatter-scale-and-patch-curves.md` was never built (brief 15
shipped as `15-paint-refinement.md`). Delete it. Leave a one-line note in the
brief-15 PROJECT-LOG entry that the orphan was removed, so the trail is intact.

## Task 3 — Close the density-ceiling OPEN item

`PAINT-MODE.md` §1 carries an OPEN question: restrained family vs. the dense
60–80%-coverage references. Shivang approved the restrained family across the
whole paint arc. Resolve it: change that OPEN block to LOCKED — restrained
family is the target, the maximalist references are not pursued. Keep one line
noting the dense option was consciously declined, not forgotten.

## Task 4 — Merge to main

Once 1–3 are committed on `feature/paint-surface` and the branch is rebased on
current `main`:

- Merge `feature/paint-surface` → `main`. Prefer a real merge (not squash) so
  the brief-by-brief history stays legible.
- **Verify on `main` after merge, before declaring done:**
  - Paper renders byte-identical to pre-merge `main` — hash across seeds 1–6.
  - Chalkboard branch untouched and still present on origin.
  - Paint renders in the lab exactly as approved (deterministic, same seeds).
  - No `Math.random()` in engine. `palette.js`/`density.js` still pure.
- Do **not** delete `feature/paint-surface` yet — leave it until the merge is
  confirmed good on origin.

## Task 5 — Log + backlog

- PROJECT-LOG entry: paint merged, values frozen, density-ceiling closed,
  orphan removed.
- BACKLOG: paint's own section can note "merged, values frozen — re-tune at
  product port." Chalkboard's review-gate and smudge-slider items are
  untouched and still open.

## Done looks like

`main` carries paper + paint, both rendering identically to before the merge,
paint values frozen as named constants, one clean history, no orphan brief, the
density question closed.
