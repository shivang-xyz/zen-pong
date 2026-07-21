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

const DENSITY_CELL = 28;
const DENSITY_FLOOR = 0.15;
const MIN_SPACING = DENSITY_CELL * 2.5;
const COUNT_MIN = 12, COUNT_MAX = 26;   // PROVISIONAL — tune against the density scrubber
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
