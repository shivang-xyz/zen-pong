/* Paint surface — brief 12 (reset of brief 11 tasks 2-3; palette.js and this
   file's function contract from brief 11 tasks 1-2 stand unchanged). A third
   surface style alongside paper (surface.js) and chalkboard (chalkboard.js
   on feature/chalkboard-surface), fully additive: neither is touched.

   Same carve-out as those two modules: this file is allowed to touch a
   canvas 2D context because producing surface/stroke pixels is its whole
   job. That access is confined to the exported build/render functions.
   Everywhere else in the engine stays DOM-free. */

import { computeLineDensity, findDenseKnots } from './density.js';
import { weightedPick } from './rng.js';

/* ── ground texture — brief 12 task 1 ─────────────────────────────────────
   Brief 11's tiled basket-weave read as a drafting grid at every size and
   is not tunable into correctness: a repeating tile with regular pitch will
   always read as ruled paper, no matter how faint. Killed entirely — no
   tile, no createPattern, no repeat.

   Replaced with a non-repeating "tooth": sparse irregular specks plus a
   handful of very-low-amplitude soft blotches, each drawn once at a random
   position across the FULL canvas from the passed rng — nothing tiled,
   nothing on a grid, no directional structure. Colour-neutral (light+dark
   mix, like real primed-canvas tooth) so it reads correctly over all 4
   GROUND_LIBRARY hexes with no per-ground tuning. */
const SPECK_COUNT = 900;
const SPECK_R_MIN = 0.35, SPECK_R_MAX = 1.1;
const SPECK_ALPHA_MIN = 0.02, SPECK_ALPHA_MAX = 0.05;

const BLOTCH_COUNT_MIN = 14, BLOTCH_COUNT_MAX = 24;
const BLOTCH_R_MIN = 40, BLOTCH_R_MAX = 150;
const BLOTCH_ALPHA_MIN = 0.012, BLOTCH_ALPHA_MAX = 0.03;

function paintTexture(pc, w, h, rng) {
  for (let i = 0; i < SPECK_COUNT; i++) {
    const x = rng() * w, y = rng() * h;
    const r = SPECK_R_MIN + rng() * (SPECK_R_MAX - SPECK_R_MIN);
    const dark = rng() > 0.45; // slightly more dark flecks than light, like real tooth
    const a = SPECK_ALPHA_MIN + rng() * (SPECK_ALPHA_MAX - SPECK_ALPHA_MIN);
    pc.fillStyle = dark ? `rgba(0,0,0,${a.toFixed(3)})` : `rgba(255,255,255,${a.toFixed(3)})`;
    pc.beginPath();
    pc.arc(x, y, r, 0, Math.PI * 2);
    pc.fill();
  }

  const blotchCount = BLOTCH_COUNT_MIN + Math.floor(rng() * (BLOTCH_COUNT_MAX - BLOTCH_COUNT_MIN + 1));
  for (let i = 0; i < blotchCount; i++) {
    const x = rng() * w, y = rng() * h;
    const r = BLOTCH_R_MIN + rng() * (BLOTCH_R_MAX - BLOTCH_R_MIN);
    const dark = rng() > 0.5;
    const a = BLOTCH_ALPHA_MIN + rng() * (BLOTCH_ALPHA_MAX - BLOTCH_ALPHA_MIN);
    const tone = dark ? '0,0,0' : '255,255,255';
    const g = pc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${tone},${a.toFixed(3)})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    pc.fillStyle = g;
    pc.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

const VIGNETTE_EDGE = 60;
const VIGNETTE_TB_ALPHA = 0.09;  // weaker than chalkboard's 0.32 (very subtle, per brief 11)
const VIGNETTE_LR_ALPHA = 0.07;  // weaker than chalkboard's 0.26

function applyVignette(pc, w, h) {
  const ew = VIGNETTE_EDGE; let g;
  g = pc.createLinearGradient(0, 0, 0, ew);
  g.addColorStop(0, `rgba(0,0,0,${VIGNETTE_TB_ALPHA})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, 0, w, ew);
  g = pc.createLinearGradient(0, h, 0, h - ew);
  g.addColorStop(0, `rgba(0,0,0,${VIGNETTE_TB_ALPHA})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, h - ew, w, ew);
  g = pc.createLinearGradient(0, 0, ew, 0);
  g.addColorStop(0, `rgba(0,0,0,${VIGNETTE_LR_ALPHA})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, 0, ew, h);
  g = pc.createLinearGradient(w, 0, w - ew, 0);
  g.addColorStop(0, `rgba(0,0,0,${VIGNETTE_LR_ALPHA})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(w - ew, 0, ew, h);
}

/* buildPaintSurface(w, h, rng, groundHex) — same shape as
   buildChalkboardSurface(w, h, rng). Plain mode only: groundHex always
   comes from GROUND_LIBRARY (palette.js), passed by the caller. Unlike
   brief 11's tiled version, the texture now genuinely uses rng — every seed
   gets its own scatter of specks/blotches, still deterministic per seed. */
export function buildPaintSurface(w, h, rng, groundHex) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const pc = cv.getContext('2d');

  pc.fillStyle = groundHex;
  pc.fillRect(0, 0, w, h);

  paintTexture(pc, w, h, rng);
  applyVignette(pc, w, h);

  // No dashed centre line (paper-specific), no dust speckle beyond the
  // tooth above — both explicitly excluded for paint's ground.

  return cv;
}

/* ── ground patches — brief 14 task 1 (replaces brief 13's soft-glow
   version entirely) ────────────────────────────────────────────────────
   Brief 13's patches were soft radial gradients — wrong on every axis per
   review. Patches are now the SAME paint quality as strokes/splatter: hard
   opaque fills, no gradient, no blur, no feather. Mode 2 from
   PAINT-MODE.md §3 still holds — no colour choice (accent palette, not
   GROUND_LIBRARY), composition-aware placement via density.js (§3.1),
   still composited beneath all marks.

   Shape: a closed polygon with a multi-harmonic wobble on the radius
   (three sine terms at different frequencies/phases, hashed per patch) —
   one low-frequency term makes the overall silhouette lopsided, higher-
   frequency terms add lobes. Independent x/y scale (not just a uniform
   radius) gives the elongated/round variety the brief asks for without
   needing true ellipse trig. `count` is now caller-supplied (the lab's
   Patch count slider), not rng-derived — "seeded placement WITHIN that
   count," not a seeded count. */
const PATCH_R_MIN = 9;                 // "comparable to a large splatter drop"
const PATCH_R_MAX_FRAC = 1 / 3;        // "up to a third of the canvas" — resolved against w*h at call time
const PATCH_SIZE_POWER = 3.2;          // heavy-tailed: rng()^3.2, mostly small/mid, occasional huge
const PATCH_KNOT_JITTER = 90;          // px, spread around a chosen density knot
const PATCH_GROUND_HEX = '#F4EBD4';    // Cream — fixed, Patches mode has no colour choice

function irregularPatchPoints(cx, cy, baseR, scaleX, scaleY, angle, lobeStrength, seed) {
  const verts = 14 + Math.floor(hash1(seed) * 8); // 14-21
  const pts = [];
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2;
    const w1 = Math.sin(a * 2 + seed * 3.1) * 0.55;
    const w2 = Math.sin(a * 3 + seed * 5.7 + 1.3) * 0.28;
    const w3 = Math.sin(a * 5 + seed * 1.9 + 2.6) * 0.17;
    const wobble = 1 + lobeStrength * (w1 + w2 + w3);
    const lx = Math.cos(a) * baseR * scaleX * wobble;
    const ly = Math.sin(a) * baseR * scaleY * wobble;
    pts.push({
      x: cx + lx * Math.cos(angle) - ly * Math.sin(angle),
      y: cy + lx * Math.sin(angle) + ly * Math.cos(angle),
    });
  }
  return pts;
}

function fillPatch(pc, points, colorHex) {
  pc.save();
  pc.globalAlpha = 1.0; // hard opaque — same paint quality as strokes/splatter, no falloff
  pc.fillStyle = colorHex;
  pc.beginPath();
  pc.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) pc.lineTo(points[i].x, points[i].y);
  pc.closePath();
  pc.fill();
  pc.restore();
}

/* buildPatchGround(w, h, rng, strokes, palette, count) → offscreen canvas.
   Same shape family as buildPaintSurface, plus the composition-awareness
   inputs (strokes, palette) Plain mode doesn't need, plus the lab-
   controlled patch count (default 6, matching brief 13's old midpoint). */
export function buildPatchGround(w, h, rng, strokes, palette, count = 6) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const pc = cv.getContext('2d');

  pc.fillStyle = PATCH_GROUND_HEX;
  pc.fillRect(0, 0, w, h);
  paintTexture(pc, w, h, rng); // same substrate tooth as Plain, visible in the gaps between fields

  const field = computeLineDensity(strokes, w, h, 28);
  const knots = findDenseKnots(field, { densityFloor: 0.05, minSpacing: 50, maxCandidates: 40 });

  const colorWeights = palette.accents.map(a => ({ value: a, weight: a.weight }));
  const patchRMax = Math.sqrt(w * h * PATCH_R_MAX_FRAC / Math.PI);

  for (let i = 0; i < count; i++) {
    const accent = weightedPick(rng, colorWeights);

    const sizeNorm = Math.pow(rng(), PATCH_SIZE_POWER); // heavy-tailed toward small/mid
    const baseR = PATCH_R_MIN + (patchRMax - PATCH_R_MIN) * sizeNorm;

    let cx, cy;
    if (knots.length > 0) {
      // Density-weighted knot choice — PAINT-MODE.md §3.1's composition-
      // awareness, without depleting the pool (patches may reuse a busy
      // region; splatter's placement already used its own weighted draw).
      const knot = weightedPick(rng, knots.map(k => ({ value: k, weight: k.density })));
      cx = knot.x + (rng() - 0.5) * PATCH_KNOT_JITTER;
      cy = knot.y + (rng() - 0.5) * PATCH_KNOT_JITTER;
    } else {
      cx = rng() * w; cy = rng() * h;
    }

    // Some broadly round, some elongated: 55% near-round, 45% clearly stretched.
    const elongated = rng() < 0.45;
    const scaleX = elongated ? 1.3 + rng() * 1.6 : 1.0 + rng() * 0.12;
    const scaleY = elongated ? 1 / (1.0 + rng() * 0.7) : 1.0 + rng() * 0.12;
    const angle = rng() * Math.PI * 2;
    const lobeStrength = 0.08 + rng() * 0.24; // some lobed/spilled, some cleaner

    const points = irregularPatchPoints(cx, cy, baseR, scaleX, scaleY, angle, lobeStrength, rng() * 1000);
    fillPatch(pc, points, accent.hex);
  }

  applyVignette(pc, w, h);
  return cv;
}

/* ── paint stroke renderer — brief 12 task 2 (independent path, replaces
   brief 11 task 3 entirely) ────────────────────────────────────────────────
   Brief 11's stroke went through paper's two-pass translucent pipeline in
   spirit (opacity range 0.50-0.68, a soft glossy overlay pass) and read as
   watercolour, not paint. This path is fully opaque — globalAlpha is always
   1.0, `op` is accepted for signature parity with renderStroke/
   renderChalkStroke but never read. No second translucent pass of any kind:
   overlap must read as one flat colour sitting on top of another, never a
   blend. Age fade and the weight/opacity range controls are paper-only —
   this function's own hardcoded opacity is what actually severs them, no
   matter what the caller passes in.

   Still a filled ribbon (a single ctx.lineWidth stroke can't vary width
   along its length): Catmull-Rom spine sampled densely, each sample offset
   perpendicular by half the local width, closed outline filled. Width at
   each sample is base wt scaled by two independent, purely-deterministic
   (no injected rng — same idiom as strokes.js's jitterPath, hashing off
   point coordinates rather than threading rng through every renderer)
   signals, combined by max() so a pooling knot is never cancelled by a low
   point in the width wave:
     3b — low-frequency sine wave across arc length (brush loading/
          unloading), seeded off the stroke's own start/end coordinates.
          Range widened to 0.15x-4.0x per brief 14 (was 0.4x-2.0x in brief
          12, which review found still barely perceptible). Undulation
          count dropped too (0.5-1.5 vs the old 1.5-3) — brief 14 wants
          "one or two transitions per stroke, not many," and at this much
          wider an amplitude, the old cycle count read as vibration.
     3c — pooling spike near either end, IF that end is a real paddle/wall
          hit (poolStart/poolEnd, computed by the caller from stroke
          adjacency + event type — same division of labour as
          renderChalkStroke taking ageFrac from the caller). Peak lowered
          brief 14 task 4 — pooling at hit points was reading as the
          dominant mark, edge-clustered exactly like brief 02's cut ink
          bloom (hit-triggered placement is always boundary-pinned; see
          PROJECT-LOG.md 2026-07-09). Brief 13's density-placed intersection
          blotches (splatter.js) are the replacement for "marks read where
          the rally was busy"; pooling now only has to read as "the line
          paused here," not carry the composition's mark-density.
   Edges are clean fills only: no grain, no halo, no soft falloff. */
export const PAINT_WIDTH_BASE = 6.0;

const WIDTH_VAR_MIN = 0.15, WIDTH_VAR_MAX = 4.0;   // 3b, brief 14 widened range
const WIDTH_VAR_UNDULATIONS_MIN = 0.5, WIDTH_VAR_UNDULATIONS_MAX = 1.5; // brief 14: fewer transitions
const POOL_PEAK_MIN = 1.3, POOL_PEAK_MAX = 1.8;    // 3c, brief 14 task 4: reduced from 2.2-3.2
const POOL_WINDOW_MIN = 8, POOL_WINDOW_MAX = 14;   // 3c, brief 11 §3c, unchanged

// GLSL-style deterministic hash — same family of trick as jitterPath's
// Math.sin(p.x*0.73+p.y*1.31): a scalar function of coordinates, no rng
// threading needed for per-stroke/per-commit "seeded" jitter.
function hash1(x) { const s = Math.sin(x) * 43758.5453123; return s - Math.floor(s); }
function hash2(x, y) { return hash1(x * 12.9898 + y * 78.233); }
function smoothstep01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

// Same Catmull-Rom construction as strokes.js's traceCR, but returns sampled
// {x,y} points instead of issuing ctx bezier commands — the ribbon needs
// actual coordinates + normals, not just a stroke path.
function sampleSpine(pts, samplesPerSeg = 8) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1],
          p3 = pts[Math.min(i + 2, pts.length - 1)], t = 0.5;
    const c1x = p1.x + (p2.x - p0.x) * t / 3, c1y = p1.y + (p2.y - p0.y) * t / 3;
    const c2x = p2.x - (p3.x - p1.x) * t / 3, c2y = p2.y - (p3.y - p1.y) * t / 3;
    for (let k = 1; k <= samplesPerSeg; k++) {
      const u = k / samplesPerSeg, mu = 1 - u;
      out.push({
        x: mu * mu * mu * p1.x + 3 * mu * mu * u * c1x + 3 * mu * u * u * c2x + u * u * u * p2.x,
        y: mu * mu * mu * p1.y + 3 * mu * mu * u * c1y + 3 * mu * u * u * c2y + u * u * u * p2.y,
      });
    }
  }
  return out;
}

function arcLengths(samples) {
  const s = [0];
  for (let i = 1; i < samples.length; i++) {
    s.push(s[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
  }
  return { s, length: s[s.length - 1] };
}

function poolMultAt(distFromEnd, seedX, seedY, poolingStrength) {
  const seed = hash2(seedX, seedY);
  const window = POOL_WINDOW_MIN + hash1(seed + 7.77) * (POOL_WINDOW_MAX - POOL_WINDOW_MIN);
  if (distFromEnd >= window) return 1;
  const peak = (POOL_PEAK_MIN + seed * (POOL_PEAK_MAX - POOL_PEAK_MIN)) * poolingStrength;
  const f = 1 - smoothstep01(distFromEnd / window);
  return 1 + (peak - 1) * f;
}

export function renderPaintStroke(ctx, pts, col, wt, op, opts = {}) {
  if (pts.length < 2) return;
  const {
    widthVariation = 1.0,   // 0 = uniform wt, 1 = full 0.4-2.0x wave (3b)
    poolingStrength = 1.0,  // 1 = literal 2.2-3.2x PROVISIONAL peak (3c)
    poolStart = false,
    poolEnd = false,
  } = opts;

  const samples = sampleSpine(pts, 8);
  if (samples.length < 2) return;
  const { s: arcS, length } = arcLengths(samples);

  const undulations = WIDTH_VAR_UNDULATIONS_MIN
    + hash2(pts[0].x, pts[0].y) * (WIDTH_VAR_UNDULATIONS_MAX - WIDTH_VAR_UNDULATIONS_MIN); // 3b
  const phase = hash2(pts[pts.length - 1].x, pts[pts.length - 1].y) * Math.PI * 2;

  function widthMultAt(i) {
    const t = length > 0 ? arcS[i] / length : 0;
    const wave = Math.sin(t * undulations * Math.PI * 2 + phase);       // -1..1
    const waveMult = WIDTH_VAR_MIN + (wave * 0.5 + 0.5) * (WIDTH_VAR_MAX - WIDTH_VAR_MIN);
    let mult = 1 + (waveMult - 1) * widthVariation;

    if (poolStart) {
      const p0 = samples[0];
      mult = Math.max(mult, poolMultAt(arcS[i], p0.x, p0.y, poolingStrength));
    }
    if (poolEnd) {
      const pN = samples[samples.length - 1];
      mult = Math.max(mult, poolMultAt(length - arcS[i], pN.x, pN.y, poolingStrength));
    }
    return mult;
  }

  const left = [], right = [];
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const pPrev = samples[Math.max(i - 1, 0)], pNext = samples[Math.min(i + 1, samples.length - 1)];
    let tx = pNext.x - pPrev.x, ty = pNext.y - pPrev.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    const halfW = 0.5 * wt * widthMultAt(i);
    left.push({ x: p.x + nx * halfW, y: p.y + ny * halfW });
    right.push({ x: p.x - nx * halfW, y: p.y - ny * halfW });
  }

  ctx.save();
  ctx.globalAlpha = 1.0; // always opaque — op is accepted for signature parity, never read
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();
  // Rounded caps at both ends — radius follows local half-width, so a
  // pooled end's cap reads as a blob (per 3c), not a bulge with square
  // corners. Clean fills only: no grain, no halo, no soft falloff.
  const r0 = Math.hypot(left[0].x - right[0].x, left[0].y - right[0].y) / 2;
  ctx.beginPath(); ctx.arc(samples[0].x, samples[0].y, r0, 0, Math.PI * 2); ctx.fill();
  const n = left.length - 1;
  const rN = Math.hypot(left[n].x - right[n].x, left[n].y - right[n].y) / 2;
  ctx.beginPath(); ctx.arc(samples[n].x, samples[n].y, rN, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
