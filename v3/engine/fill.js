/* Enclosed-region detection for the post-game fill pass — brief 03.
   Pure: zero DOM, zero canvas, zero audio, zero randomness. Takes stroke
   point data + canvas dims, returns region data. Runs a raster flood-fill
   (brief's recommended approach) entirely in plain JS/typed arrays — even
   curve flattening avoids canvas, reusing strokes.js's traceCR bezier
   control-point formula but sampling it directly instead of stroking a
   path, the same technique index.html's old idle-doodle animation used to
   flatten Catmull-Rom curves without canvas.

   Rendering the wash itself (which legitimately needs canvas/ImageData/
   blur) lives in the lab, not here — see art-lab.html's renderFillWash. */

import { W as CANVAS_W, H as CANVAS_H } from './physics.js';

const MASK_SCALE = 2;       // downsample factor from canvas resolution
const WALL_RADIUS = 2;      // mask-px half-width of the rasterized stroke wall
const SAMPLE_STEP_PX = 1;   // ~mask-px spacing between curve samples

export const DEFAULT_FILL = {
  enabled: false, style: 0, opacity: 0.32, blend: 0.5,
  maxCount: 6, minAreaFrac: 0.004, maxAreaFrac: 0.08,
};

function cubicBezierAt(p1, c1, c2, p2, s) {
  const u = 1 - s;
  const a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
  return {
    x: a * p1.x + b * c1.x + c * c2.x + d * p2.x,
    y: a * p1.y + b * c1.y + c * c2.y + d * p2.y,
  };
}

/* Flattens one stroke's Catmull-Rom path into a dense polyline in canvas
   coordinates. Control-point formula matches strokes.js's traceCR exactly,
   so the flattened polyline traces the same curve traceCR draws. */
function flattenStroke(pts) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1],
          p3 = pts[Math.min(i + 2, pts.length - 1)], t = .5;
    const c1 = { x: p1.x + (p2.x - p0.x) * t / 3, y: p1.y + (p2.y - p0.y) * t / 3 };
    const c2 = { x: p2.x - (p3.x - p1.x) * t / 3, y: p2.y - (p3.y - p1.y) * t / 3 };
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      + Math.hypot(c1.x - p1.x, c1.y - p1.y) + Math.hypot(c2.x - p2.x, c2.y - p2.y);
    const steps = Math.max(2, Math.ceil(segLen / (SAMPLE_STEP_PX * MASK_SCALE)));
    for (let s = 1; s <= steps; s++) out.push(cubicBezierAt(p1, c1, c2, p2, s / steps));
  }
  return out;
}

function stampDisc(mask, maskW, maskH, cx, cy, r) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(maskW - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(maskH - 1, Math.ceil(cy + r));
  const r2 = r * r;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) mask[y * maskW + x] = 1;
    }
  }
}

/* Rasterizes all strokes' centerlines into a binary ink mask via dense
   disc-stamping — cheap, gap-free thick-line rasterization with no real
   line-drawing algorithm needed. */
function rasterizeInk(strokes, maskW, maskH) {
  const mask = new Uint8Array(maskW * maskH);
  strokes.forEach(st => {
    flattenStroke(st.pts).forEach(p => {
      stampDisc(mask, maskW, maskH, p.x / MASK_SCALE, p.y / MASK_SCALE, WALL_RADIUS);
    });
  });
  return mask;
}

/* Multi-source BFS from every non-ink border cell, 4-connected. */
function floodOutside(mask, maskW, maskH) {
  const outside = new Uint8Array(maskW * maskH);
  const qx = new Int32Array(maskW * maskH);
  const qy = new Int32Array(maskW * maskH);
  let qt = 0;
  function push(x, y) {
    const idx = y * maskW + x;
    if (mask[idx] || outside[idx]) return;
    outside[idx] = 1;
    qx[qt] = x; qy[qt] = y; qt++;
  }
  for (let x = 0; x < maskW; x++) { push(x, 0); push(x, maskH - 1); }
  for (let y = 0; y < maskH; y++) { push(0, y); push(maskW - 1, y); }
  for (let qh = 0; qh < qt; qh++) {
    const x = qx[qh], y = qy[qh];
    if (x > 0) push(x - 1, y);
    if (x < maskW - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < maskH - 1) push(x, y + 1);
  }
  return outside;
}

/* Connected-component labeling over cells that are neither ink nor
   reachable from the border — i.e. enclosed. 4-connected, one pass. */
function findEnclosedRegions(mask, outside, maskW, maskH) {
  const visited = new Uint8Array(maskW * maskH);
  const qx = new Int32Array(maskW * maskH);
  const qy = new Int32Array(maskW * maskH);
  const regions = [];

  for (let y0 = 0; y0 < maskH; y0++) {
    for (let x0 = 0; x0 < maskW; x0++) {
      const startIdx = y0 * maskW + x0;
      if (mask[startIdx] || outside[startIdx] || visited[startIdx]) continue;

      let qh = 0, qt = 0;
      visited[startIdx] = 1;
      qx[qt] = x0; qy[qt] = y0; qt++;
      let minX = x0, maxX = x0, minY = y0, maxY = y0, sumX = 0, sumY = 0, count = 0;
      const pixX = [], pixY = [];
      while (qh < qt) {
        const cx = qx[qh], cy = qy[qh]; qh++;
        count++; sumX += cx; sumY += cy;
        pixX.push(cx); pixY.push(cy);
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        if (cx > 0) { const i = cy * maskW + (cx - 1); if (!mask[i] && !outside[i] && !visited[i]) { visited[i] = 1; qx[qt] = cx - 1; qy[qt] = cy; qt++; } }
        if (cx < maskW - 1) { const i = cy * maskW + (cx + 1); if (!mask[i] && !outside[i] && !visited[i]) { visited[i] = 1; qx[qt] = cx + 1; qy[qt] = cy; qt++; } }
        if (cy > 0) { const i = (cy - 1) * maskW + cx; if (!mask[i] && !outside[i] && !visited[i]) { visited[i] = 1; qx[qt] = cx; qy[qt] = cy - 1; qt++; } }
        if (cy < maskH - 1) { const i = (cy + 1) * maskW + cx; if (!mask[i] && !outside[i] && !visited[i]) { visited[i] = 1; qx[qt] = cx; qy[qt] = cy + 1; qt++; } }
      }

      const regionW = maxX - minX + 1, regionH = maxY - minY + 1;
      const localMask = new Uint8Array(regionW * regionH);
      for (let k = 0; k < count; k++) {
        localMask[(pixY[k] - minY) * regionW + (pixX[k] - minX)] = 1;
      }

      regions.push({
        areaFraction: count / (maskW * maskH),
        centroid: { x: (sumX / count) * MASK_SCALE, y: (sumY / count) * MASK_SCALE },
        bounds: {
          x0: minX * MASK_SCALE, y0: minY * MASK_SCALE,
          x1: (maxX + 1) * MASK_SCALE, y1: (maxY + 1) * MASK_SCALE,
        },
        maskBounds: { x0: minX, y0: minY, w: regionW, h: regionH },
        mask: localMask,
      });
    }
  }
  return regions.sort((a, b) => b.areaFraction - a.areaFraction);
}

/* Detects all enclosed regions formed by the given strokes. Pure function
   of (strokes, W, H) — no rng, no DOM, no canvas. Returns regions sorted
   by areaFraction descending; filtering/capping is a separate step
   (selectFillRegions) so detection stays a stable, cacheable base result. */
export function detectRegions(strokes, W = CANVAS_W, H = CANVAS_H) {
  if (strokes.length === 0) return [];
  const maskW = Math.round(W / MASK_SCALE), maskH = Math.round(H / MASK_SCALE);
  const mask = rasterizeInk(strokes, maskW, maskH);
  const outside = floodOutside(mask, maskW, maskH);
  return findEnclosedRegions(mask, outside, maskW, maskH);
}

/* Filters to the min/max area band, then caps to maxCount. When more
   candidates pass the band filter than maxCount, walks them largest-first
   and greedily accepts only ones whose centroid is far enough (>= 15% of
   the shorter canvas dimension) from every already-accepted centroid —
   biases toward larger regions (walk order) while avoiding an all-fills-
   in-one-corner result. If spacing rejects too many, a second relaxed pass
   fills remaining slots from the largest leftovers regardless of spacing. */
export function selectFillRegions(regions, params = {}, W = CANVAS_W, H = CANVAS_H) {
  const { minAreaFrac = DEFAULT_FILL.minAreaFrac, maxAreaFrac = DEFAULT_FILL.maxAreaFrac, maxCount = DEFAULT_FILL.maxCount } = params;
  const candidates = regions.filter(r => r.areaFraction >= minAreaFrac && r.areaFraction <= maxAreaFrac);
  if (candidates.length <= maxCount) return candidates;

  const minSpacing = 0.15 * Math.min(W, H);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const picked = [], skipped = [];
  for (const c of candidates) {
    if (picked.length >= maxCount) break;
    if (picked.every(p => dist(p.centroid, c.centroid) >= minSpacing)) picked.push(c);
    else skipped.push(c);
  }
  for (const c of skipped) {
    if (picked.length >= maxCount) break;
    picked.push(c);
  }
  return picked;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/* Blend of two hex colors, t=0 -> hexA, t=1 -> hexB. Pure arithmetic. */
export function blendColors(hexA, hexB, t = 0.5) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const mix = k => Math.round(a[k] + (b[k] - a[k]) * t);
  return `rgb(${mix('r')},${mix('g')},${mix('b')})`;
}
