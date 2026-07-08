/* Optional, opt-in stroke-richness enhancements — brief 02.
   Pure render-time overlays: none of this consumes rng() or affects
   simulate.js's game state, so it never touches determinism, and turning
   every enhancement off reproduces the pre-brief-02 output exactly.
   Zero DOM/audio beyond the ctx callers pass into renderBloom. */

import { BASE_SPD, MAX_SPD } from './physics.js';

export const DEFAULT_ENHANCEMENTS = {
  ageFade: { enabled: false, newest: 1.0, oldest: 0.55 },
  speedWeight: { enabled: false, minW: 0.8, maxW: 2.0, slowSpd: BASE_SPD, fastSpd: MAX_SPD },
  bloom: { enabled: false, radius: 40, alpha: 0.12, colorMode: 'hitColor' },
};

/* Mean per-frame speed of a stroke's raw (pre-jitter) points — pts are one
   simulation frame apart, so consecutive-point distance is already
   px/frame, matching BASE_SPD/MAX_SPD's units. */
export function computeMeanSpeed(pts) {
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return total / (pts.length - 1);
}

/* 1A: age fade. `index`/`total` are the stroke's fixed position in the full
   (un-scrubbed) game stroke list, so this stays correct under the density
   scrubber regardless of which subset is currently rendered. */
export function ageFadeMultiplier(index, total, params) {
  if (!params.enabled || total <= 1) return 1;
  const frac = index / (total - 1); // 0 = oldest, 1 = newest
  return params.oldest + (params.newest - params.oldest) * frac;
}

/* 1B: speed-driven weight. A multiplier on the ball's own randomized `wt`
   (not an absolute replacement) — minW/maxW bracket that multiplier. */
export function speedWeightMultiplier(speed, params) {
  if (!params.enabled) return 1;
  const span = params.fastSpd - params.slowSpd;
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (speed - params.slowSpd) / span));
  return params.minW + (params.maxW - params.minW) * t;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function blendRgb(hexA, hexB) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return { r: Math.round((a.r + b.r) / 2), g: Math.round((a.g + b.g) / 2), b: Math.round((a.b + b.b) / 2) };
}

/* 1C: soft radial glow at a paddle-hit point. Caller is responsible for
   draw order (call before the stroke loop so blooms sit under strokes). */
export function renderBloom(ctx, bloom, params) {
  const { r, g, b } = params.colorMode === 'blend'
    ? blendRgb(bloom.hitCol, bloom.blendCol)
    : hexToRgb(bloom.hitCol);
  const grad = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, params.radius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${params.alpha})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(bloom.x, bloom.y, params.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
