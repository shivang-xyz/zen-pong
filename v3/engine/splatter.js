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
import { traceClosedCR } from './strokes.js';

const DENSITY_CELL = 28;
const DENSITY_FLOOR = 0.15;
const MIN_SPACING = DENSITY_CELL * 2.5;
// PROVISIONAL — brief 15 task 2 raised this again: still near-invisible
// specks at brief 14's sizes. Target ~40% splatter / 60% stroke by visual
// mass, so size moved first (a fat stroke section can now reach ~24px wide
// at widthVariation 1.0 — PAINT_WIDTH_BASE 6.0 x WIDTH_VAR_MAX 4.0 — so
// DROP_R_MAX approaches that), count moved second.
const COUNT_MIN = 32, COUNT_MAX = 64;
const FLUNG_RATIO = 0.4;                // ~60/40 drops:flung, PROVISIONAL per brief

const DROP_R_MIN = 4.0, DROP_R_MAX = 20.0;    // was 1.0-9.0 — small end now legible at 312px
const DROP_SIZE_POWER = 3.5; // heavy-tailed, slightly less extreme than before (min is already not tiny)

const FLUNG_LEN_MIN = 26, FLUNG_LEN_MAX = 60;      // was 14-34
const FLUNG_HEAD_R_MIN = 7, FLUNG_HEAD_R_MAX = 15; // was 3-7
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

/* ── intersection blotches — brief 14 task 4, reworked brief 15 task 4 ────
   Reads brief 02's failure first: hit-triggered ink bloom put every mark on
   the canvas edge, because paddle/wall hits — the only events that fired
   it — are structurally always on the boundary. Cut for exactly that
   reason (PROJECT-LOG.md 2026-07-09). Brief 12/13 quietly reintroduced the
   same shape of bug via stroke pooling; brief 14 reduced it, brief 15
   removed it outright (paint.js). This module is what actually carries
   "marks where the rally was busy" now.

   Reuses brief 13's density machinery rather than a fresh intersection
   detector — findDenseKnots' candidates already ARE the high-crossing
   points (that's what "dense" means for overlapping line segments). What
   density alone can't answer is WHICH two strokes cross at a given point —
   contributingStrokes answers that by re-checking proximity.

   Brief 15: a single smooth ellipse per knot didn't read as pooled paint.
   Fewer locations (2-4, only the genuinely busiest — a much higher density
   floor than splatter's, plus wide spacing, rather than splatter's "spread
   across the whole composition" pool), each now a CLUSTER: one irregular
   main mass, 3-6 smaller satellites crowded around and overlapping it, a
   few droplets flung outward. Every element is its own closed Catmull-Rom
   silhouette (traceClosedCR) — smooth curve, still a hard opaque edge, no
   gradient. Colour: main mass blends toward the seeded true mix; satellites
   and droplets are each independently biased toward one parent colour or
   the other (never the same flat blend repeated), which is what actually
   sells "two wet colours meeting" rather than "a third colour painted on
   top." */
const BLOTCH_COUNT_MIN = 2, BLOTCH_COUNT_MAX = 4;       // "top few," not a dozen scattered points
const BLOTCH_DENSITY_FLOOR = 0.5;    // much higher than splatter's 0.15 — only true hot spots qualify
const BLOTCH_MIN_SPACING = DENSITY_CELL * 6;            // keep the few clusters well separated
const BLOTCH_PROX_RADIUS = 22;       // px — how close two strokes must both pass to "cross" here
const BLOTCH_R_MIN = 12, BLOTCH_R_MAX = 46;             // main-mass radius before density/width scaling
const BLOTCH_SATELLITE_MIN = 3, BLOTCH_SATELLITE_MAX = 6;
const BLOTCH_DROPLET_MIN = 2, BLOTCH_DROPLET_MAX = 4;

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

/* Wobbly closed-silhouette vertices around (cx,cy) — same 2-harmonic radius
   wobble idea as paint.js's patch shapes, but sourced from the passed rng
   (a blotch cluster is built once, at build time, unlike renderPaintStroke
   which avoids threading rng through a per-frame renderer) rather than a
   coordinate hash. Simpler to just draw the randomness from the stream
   that's already there. */
function wobblyBlobPoints(rng, cx, cy, baseR, elongation) {
  const verts = 10 + Math.floor(rng() * 6); // 10-15
  const lobeStrength = 0.15 + rng() * 0.2;
  const angle = rng() * Math.PI * 2;
  const phase1 = rng() * Math.PI * 2, phase2 = rng() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2;
    const wobble = 1 + lobeStrength * (Math.sin(a * 2 + phase1) * 0.6 + Math.sin(a * 3 + phase2) * 0.3);
    const lx = Math.cos(a) * baseR * elongation * wobble;
    const ly = (Math.sin(a) * baseR / elongation) * wobble;
    pts.push({
      x: cx + lx * Math.cos(angle) - ly * Math.sin(angle),
      y: cy + lx * Math.sin(angle) + ly * Math.cos(angle),
    });
  }
  return pts;
}

/* Bias toward one parent colour or the other (never the cluster's own
   centre blend) — 0-0.35 or 0.65-1.0, picked with equal probability. */
function skewedBias(rng) {
  return rng() < 0.5 ? rng() * 0.35 : 0.65 + rng() * 0.35;
}

/* buildIntersectionBlotches(strokes, palette, rng, w, h, opts) → cluster
   descriptors: { type:'blotchCluster', blobs:[{points,colorHex}...],
   droplets:[{x,y,r,colorHex}...] }. Pure: no DOM. `opts.sizeMult` is the
   lab's relabelled "Blotch size" control (was Pooling Strength — brief 15
   task 1 repurposed the slider, pooling itself is gone). Skips any
   candidate knot where fewer than 2 strokes actually converge (nothing
   there to mix); at this much higher a density floor that should be rare. */
export function buildIntersectionBlotches(strokes, palette, rng, w, h, opts = {}) {
  const { countRange = [BLOTCH_COUNT_MIN, BLOTCH_COUNT_MAX], sizeMult = 1.0 } = opts;

  const field = computeLineDensity(strokes, w, h, DENSITY_CELL);
  const knots = findDenseKnots(field, {
    densityFloor: BLOTCH_DENSITY_FLOOR, minSpacing: BLOTCH_MIN_SPACING, maxCandidates: 10,
  });
  if (knots.length === 0) return [];

  const count = Math.min(
    knots.length,
    countRange[0] + Math.floor(rng() * (countRange[1] - countRange[0] + 1)),
  );
  const chosen = weightedSampleWithoutReplacement(
    rng, knots.map(k => ({ value: k, weight: k.density })), count,
  );

  const clusters = [];
  chosen.forEach(k => {
    const contributors = contributingStrokes(strokes, k.x, k.y, BLOTCH_PROX_RADIUS);
    if (contributors.length < 2) return; // no actual crossing here, skip
    contributors.sort((a, b) => b.wt - a.wt);
    const [c1, c2] = contributors; // two widest, per brief: never average 3+ down to mud

    // Size scales with local density and the crossing strokes' combined width.
    const sizeScale = sizeMult * (0.6 + 0.5 * k.density) * (0.6 + (c1.wt + c2.wt) / 16);
    const mainR = Math.max(6, (BLOTCH_R_MIN + rng() * (BLOTCH_R_MAX - BLOTCH_R_MIN)) * sizeScale);

    const blobs = [];
    const mainBias = 0.35 + rng() * 0.3; // 0.35-0.65 — near the "true" seeded mix, still never flat 50/50
    blobs.push({
      points: wobblyBlobPoints(rng, k.x, k.y, mainR, 0.75 + rng() * 0.6),
      colorHex: blendOklab(c1.colorHex, c2.colorHex, mainBias),
    });

    const satCount = BLOTCH_SATELLITE_MIN
      + Math.floor(rng() * (BLOTCH_SATELLITE_MAX - BLOTCH_SATELLITE_MIN + 1));
    for (let i = 0; i < satCount; i++) {
      const a = rng() * Math.PI * 2;
      const dist = mainR * (0.35 + rng() * 0.65); // crowded/overlapping, not orbiting free
      const sx = k.x + Math.cos(a) * dist, sy = k.y + Math.sin(a) * dist;
      const satR = mainR * (0.25 + rng() * 0.35);
      blobs.push({
        points: wobblyBlobPoints(rng, sx, sy, satR, 0.7 + rng() * 0.7),
        colorHex: blendOklab(c1.colorHex, c2.colorHex, skewedBias(rng)),
      });
    }

    const dropletCount = BLOTCH_DROPLET_MIN
      + Math.floor(rng() * (BLOTCH_DROPLET_MAX - BLOTCH_DROPLET_MIN + 1));
    const droplets = [];
    for (let i = 0; i < dropletCount; i++) {
      const a = rng() * Math.PI * 2;
      const dist = mainR * (1.1 + rng() * 0.9 + i * 0.3); // escaping outward, further with each one
      droplets.push({
        x: k.x + Math.cos(a) * dist, y: k.y + Math.sin(a) * dist,
        r: Math.max(1.5, mainR * (0.14 - i * 0.015) * (0.6 + rng() * 0.6)),
        colorHex: blendOklab(c1.colorHex, c2.colorHex, skewedBias(rng)),
      });
    }

    clusters.push({ type: 'blotchCluster', blobs, droplets });
  });

  return clusters;
}

/* renderBlotchCluster(ctx, cluster) — every blob a smooth closed curve
   (traceClosedCR), fully opaque flat fill, droplets simple filled circles.
   No gradient, no blur, same "clean fills only" discipline as everything
   else in paint mode. */
export function renderBlotchCluster(ctx, cluster) {
  ctx.save();
  ctx.globalAlpha = 1.0;
  cluster.blobs.forEach(b => {
    ctx.fillStyle = b.colorHex;
    traceClosedCR(ctx, b.points);
    ctx.fill();
  });
  cluster.droplets.forEach(d => {
    ctx.fillStyle = d.colorHex;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
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
