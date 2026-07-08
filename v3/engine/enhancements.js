/* Optional, opt-in stroke-richness enhancements — brief 02.
   Pure render-time overlays: none of this consumes rng() or affects
   simulate.js's game state, so it never touches determinism.
   Zero DOM/audio in this file.

   Ink bloom (1C) was removed (2026-07-08): hit-triggered placement put
   every bloom on the left/right edges (where paddle hits occur), which
   read as wrong compositionally. To be respecced later as
   composition-aware rather than hit-triggered. */

import { BASE_SPD, MAX_SPD } from './physics.js';

export const DEFAULT_ENHANCEMENTS = {
  ageFade: { enabled: true, newest: 1.0, oldest: 0.55 },
  speedWeight: { enabled: false, minW: 0.8, maxW: 2.0, slowSpd: BASE_SPD, fastSpd: MAX_SPD },
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
