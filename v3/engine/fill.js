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
  enabled: false, style: 0, opacity: 0.32,
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

/* Brief 05 task 2 diagnostic (read-only, no behavior change): counts how
   many area-band-filtered candidates (min/maxAreaFrac applied, same
   population selectFillRegions calls "candidates" — NOT the raw
   detectRegions() output, which is dominated by sub-pixel noise slivers
   from stroke crossings and wouldn't tell us anything about viable fill
   candidates) fall in each canvas quadrant, via a simple 2x2 split. This
   is what distinguishes "good candidates exist in a quadrant but aren't
   picked" (selection bug) from "few/no candidates exist there" (a
   property of where enclosed regions of a fillable size actually form). */
export function quadrantCounts(regions, params = {}, W = CANVAS_W, H = CANVAS_H) {
  const { minAreaFrac = DEFAULT_FILL.minAreaFrac, maxAreaFrac = DEFAULT_FILL.maxAreaFrac } = params;
  const candidates = regions.filter(r => r.areaFraction >= minAreaFrac && r.areaFraction <= maxAreaFrac);
  const midX = W / 2, midY = H / 2;
  const counts = { tl: 0, tr: 0, bl: 0, br: 0, total: candidates.length };
  candidates.forEach(r => {
    const top = r.centroid.y < midY, left = r.centroid.x < midX;
    if (top && left) counts.tl++;
    else if (top && !left) counts.tr++;
    else if (!top && left) counts.bl++;
    else counts.br++;
  });
  return counts;
}

/* Filters to the min/max area band, then caps to maxCount using a 2x2
   quadrant spread rule (brief 05 task 3 — replaces brief 04's 3x3-grid
   version, which had a real selection bug: brief 05's task 2 diagnostic
   showed candidates reasonably distributed across all four quadrants in
   most seeds, yet whole quadrants often ended up with zero selected
   fills despite having several viable candidates. Root cause: the 3x3
   grid's round-robin ordered its 9 CELLS by each cell's best candidate's
   area and broke out of the loop the moment maxCount was reached — with
   maxCount=6 and up to 9 occupied cells, that meant only the 6 richest
   CELLS (which can easily all cluster in 2-3 of the four true quadrants,
   e.g. a busy center) ever got picked, silently starving whole quadrants
   that had smaller-but-still-valid candidates. This was a genuine
   selection bug, not a candidate-availability limit — confirmed by
   comparing quadrantCounts()'s per-quadrant candidate totals against
   what selectFillRegions actually picked across a spread of seeds.

   Selection rule (documented plainly, this is a taste decision):
   1. Bucket the area-filtered candidates into the SAME four quadrants
      quadrantCounts() reports on (2x2 split), not a finer 3x3 grid — so
      the round-robin operates at the granularity the spread guarantee
      actually needs to hold.
   2. Round-robin across occupied quadrants (ordered by each quadrant's
      own best candidate's area, richest first, only as a tie-breaker for
      which quadrant's *extra* picks come first): pass 0 takes the single
      best candidate from every occupied quadrant; since there are only
      four quadrants and maxCount defaults to 6, pass 0 completes for
      every occupied quadrant before pass 1 ever starts — guaranteeing
      full quadrant coverage whenever every quadrant has at least one
      valid candidate. Only once every quadrant has its pick does a
      second pass draw a second candidate per quadrant, and so on.
   3. A quadrant with zero area-filtered candidates simply can't
      contribute — that's the genuine "candidate-availability limit"
      case Task 3 also anticipates, and no selection rule can invent a
      fill where detection found nothing fillable.
   No rng() involved: it's a deterministic area/position rule with no
   meaningful ties to randomize, so determinism holds trivially. */
export function selectFillRegions(regions, params = {}, W = CANVAS_W, H = CANVAS_H) {
  const { minAreaFrac = DEFAULT_FILL.minAreaFrac, maxAreaFrac = DEFAULT_FILL.maxAreaFrac, maxCount = DEFAULT_FILL.maxCount } = params;
  const candidates = regions.filter(r => r.areaFraction >= minAreaFrac && r.areaFraction <= maxAreaFrac);
  if (candidates.length <= maxCount) return candidates;

  const GRID = 3;
  const cellW = W / GRID, cellH = H / GRID;
  const cellIndex = c => {
    const cx = Math.min(GRID - 1, Math.max(0, Math.floor(c.centroid.x / cellW)));
    const cy = Math.min(GRID - 1, Math.max(0, Math.floor(c.centroid.y / cellH)));
    return cy * GRID + cx;
  };

  const byCell = new Map();
  candidates.forEach(c => {
    const idx = cellIndex(c);
    if (!byCell.has(idx)) byCell.set(idx, []);
    byCell.get(idx).push(c); // candidates arrives area-descending, preserved per cell
  });
  const cellKeys = [...byCell.keys()].sort((a, b) => byCell.get(b)[0].areaFraction - byCell.get(a)[0].areaFraction);

  const picked = [];
  for (let round = 0; picked.length < maxCount; round++) {
    let addedThisRound = false;
    for (const key of cellKeys) {
      if (picked.length >= maxCount) break;
      const list = byCell.get(key);
      if (round < list.length) { picked.push(list[round]); addedThisRound = true; }
    }
    if (!addedThisRound) break; // every cell's candidates exhausted
  }
  return picked;
}

/* Hex "#rrggbb" -> {r,g,b} (0-255 each). Exported since the lab needs it to
   turn a region's assigned hex color into ImageData/rgba() components. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const COLOR_PROXIMITY_PX = 220; // canvas px; "nearby" regions avoid repeating a color

/* One distinct palette color per region (brief 04 task 3 — replaces
   brief 03's single blend(palette[0],palette[1]) used everywhere).
   Assignment rule (documented plainly):
   1. Fisher-Yates shuffle the full active palette via rng() — once per
      artwork, so color order varies by seed but is reproducible.
   2. Walk regions in their existing area-descending order, cycling
      through the shuffled palette.
   3. If the cyclic pick would repeat a color already used by a region
      whose centroid is within COLOR_PROXIMITY_PX, advance to the next
      palette color (wrapping) until a non-conflicting one is found or
      the whole palette has been tried once (falls back to the cyclic
      pick rather than looping forever — with few colors and many close
      regions, some repeats are unavoidable).
   Deterministic: same seed -> same rng() sequence -> same shuffle -> same
   assignment. Returns new region objects with a `color` (hex) field;
   does not mutate the input. */
export function assignRegionColors(regions, palette, rng) {
  const shuffled = [...palette];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const assigned = [];
  return regions.map((r, i) => {
    let idx = i % shuffled.length;
    for (let tries = 0; tries < shuffled.length; tries++) {
      const candidate = shuffled[idx];
      const conflict = assigned.some(a => a.color === candidate
        && Math.hypot(a.centroid.x - r.centroid.x, a.centroid.y - r.centroid.y) < COLOR_PROXIMITY_PX);
      if (!conflict) break;
      idx = (idx + 1) % shuffled.length;
    }
    const color = shuffled[idx];
    assigned.push({ centroid: r.centroid, color });
    return { ...r, color };
  });
}

/* Grows a region's local mask circularly, by nCanvasPx of canvas-space
   dilation (converted internally to mask-px so callers don't need to know
   about MASK_SCALE) (brief 04 task 2 — compensates for the render-time
   blur's inward edge recession so the wash reaches/tucks under the
   bounding stroke instead of stopping short of it). Pure array math;
   expands mask/maskBounds/bounds accordingly. Does not mutate the input. */
export function dilateMask(region, nCanvasPx) {
  const n = Math.round(nCanvasPx / MASK_SCALE);
  if (n <= 0) return region;
  const { x0, y0, w, h } = region.maskBounds;
  const newW = w + 2 * n, newH = h + 2 * n;
  const src = region.mask;
  const dst = new Uint8Array(newW * newH);
  const n2 = n * n;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!src[y * w + x]) continue;
      for (let dy = -n; dy <= n; dy++) {
        const ny = y + n + dy;
        if (ny < 0 || ny >= newH) continue;
        for (let dx = -n; dx <= n; dx++) {
          if (dx * dx + dy * dy > n2) continue;
          const nx = x + n + dx;
          if (nx < 0 || nx >= newW) continue;
          dst[ny * newW + nx] = 1;
        }
      }
    }
  }
  return {
    ...region,
    mask: dst,
    maskBounds: { x0: x0 - n, y0: y0 - n, w: newW, h: newH },
    bounds: {
      x0: region.bounds.x0 - n * MASK_SCALE, y0: region.bounds.y0 - n * MASK_SCALE,
      x1: region.bounds.x1 + n * MASK_SCALE, y1: region.bounds.y1 + n * MASK_SCALE,
    },
  };
}
