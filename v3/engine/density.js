/* Line-density field + local-maxima extraction — brief 13 task 0. Pure,
   headless, deterministic, no DOM. `computeLineDensity`'s accumulation
   technique has a precedent in chalkboard.js (unmerged, brief 09/10), and
   region detection has one in fill.js (also unmerged) — both branches sit
   unmerged and v3/CLAUDE.md forbids copy-pasting engine code into a
   consumer, so this is built fresh, standalone, on main. */

function stridePts(pts, maxPts) {
  if (pts.length <= maxPts) return pts;
  const out = [], step = (pts.length - 1) / (maxPts - 1);
  for (let k = 0; k < maxPts; k++) out.push(pts[Math.round(k * step)]);
  return out;
}

/* computeLineDensity(strokes, w, h, cellPx) → { cols, rows, cellPx, cells }.
   `cells` is a row-major Float32Array normalised to [0,1] (max cell = 1;
   all-zero if there are no strokes). Each stroke deposits weight
   (proportional to its own `wt`) into every grid cell its polyline passes
   through, sampled along each segment, so a cell with more/heavier line
   through it accumulates more density. */
export function computeLineDensity(strokes, w, h, cellPx = 28) {
  const cols = Math.ceil(w / cellPx), rows = Math.ceil(h / cellPx);
  const cells = new Float32Array(cols * rows);

  for (const s of strokes) {
    const pts = stridePts(s.pts, 28);
    const wt = s.wt || 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(len / (cellPx * 0.5)));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const cx = Math.floor((a.x + (b.x - a.x) * t) / cellPx);
        const cy = Math.floor((a.y + (b.y - a.y) * t) / cellPx);
        if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) cells[cy * cols + cx] += wt;
      }
    }
  }

  let max = 0;
  for (let i = 0; i < cells.length; i++) if (cells[i] > max) max = cells[i];
  if (max > 0) for (let i = 0; i < cells.length; i++) cells[i] /= max;

  return { cols, rows, cellPx, cells };
}

/* findDenseKnots(field, opts) → [{ x, y, density }], sorted descending by
   density. Greedy local-maxima selection: rank every above-floor cell by
   density, walk down the ranked list, keep a candidate only if it's at
   least `minSpacing` away from every candidate already kept. A plain
   top-N would just return a tight cluster around the single densest
   region — the spacing constraint is what makes these "knots" (plural,
   spread across the composition) rather than one hot spot.

   Deterministic, no rng: this only RANKS candidates. Task 1's seeded
   weighted sampling — which of these knots actually gets a splatter mark,
   and how many — is a separate, randomised concern layered on top by the
   caller, not this function's job. */
export function findDenseKnots(field, opts = {}) {
  const { cols, rows, cellPx, cells } = field;
  const {
    densityFloor = 0.15,
    minSpacing = cellPx * 2.5,
    maxCandidates = 40,
  } = opts;

  const candidates = [];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const d = cells[cy * cols + cx];
      if (d < densityFloor) continue;
      candidates.push({ x: (cx + 0.5) * cellPx, y: (cy + 0.5) * cellPx, density: d });
    }
  }
  candidates.sort((a, b) => b.density - a.density);

  const kept = [];
  const minSpacingSq = minSpacing * minSpacing;
  for (const c of candidates) {
    if (kept.length >= maxCandidates) break;
    let tooClose = false;
    for (const k of kept) {
      const dx = c.x - k.x, dy = c.y - k.y;
      if (dx * dx + dy * dy < minSpacingSq) { tooClose = true; break; }
    }
    if (!tooClose) kept.push(c);
  }
  return kept;
}
