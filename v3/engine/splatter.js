/* Splatter — brief 13 tasks 1-2. Pure placement/geometry (buildSplatter) +
   a render function confined to canvas access (renderSplatterMark), same
   carve-out as paint.js's own build/render split.

   Placement is density-weighted, not event-triggered: brief 02's hit-
   triggered ink bloom pinned every mark to the canvas edges (paddle/wall
   hit points are always on the boundary), which is exactly the mistake
   this avoids. Splatter lands where the ball's own path crossed itself
   most — computeLineDensity + findDenseKnots (density.js) find those
   knots; which ones actually get a mark is a separate, seeded weighted
   draw (weightedSampleWithoutReplacement, rng.js) so two similarly-busy
   rallies don't produce identical splatter structure. */

import { computeLineDensity, findDenseKnots } from './density.js';
import { weightedPick, weightedSampleWithoutReplacement } from './rng.js';
import { blendOklab } from './palette.js';

const DENSITY_CELL = 28;
const DENSITY_FLOOR = 0.15;
const MIN_SPACING = DENSITY_CELL * 2.5;
// PROVISIONAL — brief 14 task 3 raised this: review read the line as the
// exception and dots as the rule. The fix for THAT was mostly Task 2 (much
// wider stroke width) and Task 4 (less pooling stealing the eye at the
// edges) — splatter count still goes up too, per the brief's explicit
// "more splatter and more line at once, not a trade" instruction.
const COUNT_MIN = 24, COUNT_MAX = 50;
const FLUNG_RATIO = 0.4;                // ~60/40 drops:flung, PROVISIONAL per brief

const DROP_R_MIN = 1.0, DROP_R_MAX = 9.0;
const DROP_SIZE_POWER = 4; // heavy-tailed: rng()^4 clusters near 0, occasional draw near 1

const FLUNG_LEN_MIN = 14, FLUNG_LEN_MAX = 34;
const FLUNG_HEAD_R_MIN = 3, FLUNG_HEAD_R_MAX = 7;
const SATELLITE_COUNT_MIN = 2, SATELLITE_COUNT_MAX = 5;

const INK_WEIGHT = 0.15; // ink sits alongside the 3 accents as a 4th, minor-tier colour option

function splatterColorWeights(palette) {
  return [
    { value: palette.ink, weight: INK_WEIGHT },
    ...palette.accents.map(a => ({ value: a.hex, weight: a.weight })),
  ];
}

/* Nearest-segment direction: which way was the ball travelling as it passed
   closest to (x,y)? Used to orient a flung mark's tail. Strided scan would
   save cycles but knot counts (≤60) × stroke segment counts are cheap
   enough for a lab tool without it. */
function nearestDirection(strokes, x, y) {
  let bestDistSq = Infinity;
  let dir = { x: 1, y: 0 };
  for (const s of strokes) {
    const pts = s.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const abx = b.x - a.x, aby = b.y - a.y;
      const len2 = abx * abx + aby * aby || 1;
      let t = ((x - a.x) * abx + (y - a.y) * aby) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + abx * t, py = a.y + aby * t;
      const dx = x - px, dy = y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        const l = Math.hypot(abx, aby) || 1;
        dir = { x: abx / l, y: aby / l };
      }
    }
  }
  return dir;
}

/* buildSplatter(strokes, palette, rng, w, h, opts) → mark descriptors.
   Pure: no DOM. Each mark is either
     { type:'drop', x, y, r, irregularity, seedAngle, colorHex }
   or
     { type:'flung', x, y, dx, dy, headR, length, colorHex, satellites }
   Deterministic given the same strokes/palette/rng sequence. */
export function buildSplatter(strokes, palette, rng, w, h, opts = {}) {
  const { countRange = [COUNT_MIN, COUNT_MAX], flungRatio = FLUNG_RATIO } = opts;

  const field = computeLineDensity(strokes, w, h, DENSITY_CELL);
  const knots = findDenseKnots(field, {
    densityFloor: DENSITY_FLOOR, minSpacing: MIN_SPACING, maxCandidates: 60,
  });
  if (knots.length === 0) return [];

  const count = Math.min(
    knots.length,
    countRange[0] + Math.floor(rng() * (countRange[1] - countRange[0] + 1)),
  );
  const chosen = weightedSampleWithoutReplacement(
    rng, knots.map(k => ({ value: k, weight: k.density })), count,
  );

  const colorWeights = splatterColorWeights(palette);

  return chosen.map(k => {
    const colorHex = weightedPick(rng, colorWeights);

    if (rng() < flungRatio) {
      const dir = nearestDirection(strokes, k.x, k.y);
      const sign = rng() < 0.5 ? 1 : -1; // fling either way along the local line
      const dx = dir.x * sign, dy = dir.y * sign;
      const nx = -dy, ny = dx;
      const headR = FLUNG_HEAD_R_MIN + rng() * (FLUNG_HEAD_R_MAX - FLUNG_HEAD_R_MIN);
      const length = FLUNG_LEN_MIN + rng() * (FLUNG_LEN_MAX - FLUNG_LEN_MIN);
      const satelliteCount = SATELLITE_COUNT_MIN
        + Math.floor(rng() * (SATELLITE_COUNT_MAX - SATELLITE_COUNT_MIN + 1));
      const satellites = [];
      for (let i = 0; i < satelliteCount; i++) {
        const t = 1.1 + i * 0.35 + rng() * 0.25;
        const perp = (rng() - 0.5) * headR * (1.2 + i * 0.6);
        satellites.push({
          x: k.x + dx * length * t + nx * perp,
          y: k.y + dy * length * t + ny * perp,
          r: Math.max(0.6, headR * (0.4 - i * 0.05) * (0.7 + rng() * 0.5)),
        });
      }
      return { type: 'flung', x: k.x, y: k.y, dx, dy, headR, length, colorHex, satellites };
    }

    const rNorm = Math.pow(rng(), DROP_SIZE_POWER); // heavy-tailed toward small
    const r = DROP_R_MIN + (DROP_R_MAX - DROP_R_MIN) * rNorm;
    const irregularity = 0.12 + rng() * 0.13;
    const seedAngle = rng() * Math.PI * 2;
    return { type: 'drop', x: k.x, y: k.y, r, irregularity, seedAngle, colorHex };
  });
}

/* ── intersection blotches — brief 14 task 4 ──────────────────────────────
   Reads brief 02's failure first: hit-triggered ink bloom put every mark on
   the canvas edge, because paddle/wall hits — the only events that fired
   it — are structurally always on the boundary. Cut for exactly that
   reason (PROJECT-LOG.md 2026-07-09). Brief 12/13 quietly reintroduced the
   same shape of bug: pooling (renderPaintStroke's 3c) also only fires at
   paddle/wall hits, so once strokes went opaque and wide, the pooling
   knots became the dominant, edge-ringed mark — same root cause, different
   feature. Task 4's real fix isn't "make blotches at intersections" in
   isolation, it's "stop placing the DOMINANT mark at a boundary-only event
   at all" — paint.js's POOL_PEAK_* reduction (task 4's other half) is what
   actually stops the edge-ringing; this function is what fills the
   resulting gap with marks that land where the rally was actually busy.

   Reuses brief 13's density machinery rather than a fresh intersection
   detector — findDenseKnots' candidates already ARE the high-crossing
   points (that's what "dense" means for overlapping line segments), so a
   second bespoke pairwise-segment-intersection pass would find the same
   locations by a more expensive route. What density alone can't answer is
   WHICH two strokes cross at a given knot — contributingStrokes below
   answers that by re-checking proximity at each chosen point. */
const BLOTCH_COUNT_MIN = 6, BLOTCH_COUNT_MAX = 14;
const BLOTCH_PROX_RADIUS = 22;      // px — how close two strokes must both pass to "cross" here
const BLOTCH_R_MIN = 6, BLOTCH_R_MAX = 30;
const BLOTCH_SIZE_POWER = 2;        // less heavy-tailed than drops — a blotch should usually read

/* Every stroke with a segment within `radius` of (x,y), one entry each
   (nearest distance kept if a stroke weaves past the point more than
   once). Not just the nearest stroke (nearestDirection's job) — this is
   "who's here", plural, since a blotch needs to know how many/which
   strokes actually converge at the knot. */
function contributingStrokes(strokes, x, y, radius) {
  const r2 = radius * radius;
  const found = [];
  for (const s of strokes) {
    let best = Infinity;
    const pts = s.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const abx = b.x - a.x, aby = b.y - a.y;
      const len2 = abx * abx + aby * aby || 1;
      let t = ((x - a.x) * abx + (y - a.y) * aby) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + abx * t, py = a.y + aby * t;
      const dx = x - px, dy = y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    if (best <= r2) found.push({ colorHex: s.col, wt: s.wt });
  }
  return found;
}

/* buildIntersectionBlotches(strokes, palette, rng, w, h, opts) → mark
   descriptors, same { type:'drop', ... } shape buildSplatter's drops use
   (renderSplatterMark already renders it) — a blotch IS an irregular
   opaque blob, just bigger and OKLab-blended rather than palette-drawn.
   Skips any candidate knot where fewer than 2 strokes actually converge
   (nothing there to mix) — real dense knots almost always clear this,
   since that is what "dense" means. */
export function buildIntersectionBlotches(strokes, palette, rng, w, h, opts = {}) {
  const { countRange = [BLOTCH_COUNT_MIN, BLOTCH_COUNT_MAX] } = opts;

  const field = computeLineDensity(strokes, w, h, DENSITY_CELL);
  const knots = findDenseKnots(field, {
    densityFloor: DENSITY_FLOOR, minSpacing: MIN_SPACING, maxCandidates: 60,
  });
  if (knots.length === 0) return [];

  const count = Math.min(
    knots.length,
    countRange[0] + Math.floor(rng() * (countRange[1] - countRange[0] + 1)),
  );
  const chosen = weightedSampleWithoutReplacement(
    rng, knots.map(k => ({ value: k, weight: k.density })), count,
  );

  const blotches = [];
  chosen.forEach(k => {
    const contributors = contributingStrokes(strokes, k.x, k.y, BLOTCH_PROX_RADIUS);
    if (contributors.length < 2) return; // no actual crossing here, skip
    contributors.sort((a, b) => b.wt - a.wt);
    const [c1, c2] = contributors; // two widest, per brief: never average 3+ down to mud

    const bias = 0.3 + rng() * 0.4; // 0.3-0.7 — never a flat 50/50 wash
    const colorHex = blendOklab(c1.colorHex, c2.colorHex, bias);

    const sizeNorm = Math.pow(rng(), BLOTCH_SIZE_POWER);
    const baseR = BLOTCH_R_MIN + (BLOTCH_R_MAX - BLOTCH_R_MIN) * sizeNorm;
    // Size scales with local density and the crossing strokes' combined width.
    const r = Math.max(3, baseR * (0.6 + 0.5 * k.density) * (0.6 + (c1.wt + c2.wt) / 16));

    blotches.push({
      type: 'drop',
      x: k.x, y: k.y, r,
      irregularity: 0.15 + rng() * 0.15,
      seedAngle: rng() * Math.PI * 2,
      colorHex,
    });
  });

  return blotches;
}

function drawIrregularBlob(ctx, x, y, r, irregularity, seedAngle) {
  const verts = 9;
  ctx.beginPath();
  for (let i = 0; i <= verts; i++) {
    const a = seedAngle + (Math.PI * 2 * i) / verts;
    // Deterministic wobble from the vertex angle + the blob's own position
    // (same coordinate-hash idiom paint.js's stroke renderer uses) — no
    // extra rng threading needed to make one blob's edge irregular.
    const wobble = 1 + Math.sin(a * 3.7 + x * 0.13 + y * 0.17) * irregularity;
    const rr = r * wobble;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawTeardrop(ctx, x, y, dx, dy, headR, length) {
  const backAngle = Math.atan2(-dy, -dx);
  const segs = 10;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = backAngle - Math.PI / 2 + (Math.PI * i) / segs;
    ctx.lineTo(x + Math.cos(a) * headR, y + Math.sin(a) * headR);
  }
  ctx.lineTo(x + dx * length, y + dy * length); // taper to the tip
  ctx.closePath(); // back to the first back-circle point — the other taper edge
}

/* renderSplatterMark(ctx, mark) — fully opaque, flat fill, no gradient, no
   blur. Same "clean fills only" discipline as renderPaintStroke. */
export function renderSplatterMark(ctx, mark) {
  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = mark.colorHex;

  if (mark.type === 'drop') {
    drawIrregularBlob(ctx, mark.x, mark.y, mark.r, mark.irregularity, mark.seedAngle);
    ctx.fill();
  } else {
    drawTeardrop(ctx, mark.x, mark.y, mark.dx, mark.dy, mark.headR, mark.length);
    ctx.fill();
    mark.satellites.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();
}
