/* Optional, opt-in stroke-richness enhancements — brief 02.
   Pure render-time overlays: none of this consumes rng() or affects
   simulate.js's game state, so it never touches determinism.
   Zero DOM/audio in this file.

   Ink bloom (1C) was removed (2026-07-08): hit-triggered placement put
   every bloom on the left/right edges (where paddle hits occur), which
   read as wrong compositionally. To be respecced later as
   composition-aware rather than hit-triggered.

   The velocity-driven weight enhancement (1B) was removed (2026-07-12,
   brief 08): in practice it was indistinguishable from age fade — both just
   modulate how much ink a stroke reads as having — so it was cut per "build
   lean", along with the per-stroke velocity field and mean-velocity helper
   that only existed to feed it. Age fade is now the only enhancement. */

export const DEFAULT_ENHANCEMENTS = {
  ageFade: { enabled: true, newest: 1.0, oldest: 0.55 },
};

/* 1A: age fade. `index`/`total` are the stroke's fixed position in the full
   (un-scrubbed) game stroke list, so this stays correct under the density
   scrubber regardless of which subset is currently rendered. */
export function ageFadeMultiplier(index, total, params) {
  if (!params.enabled || total <= 1) return 1;
  const frac = index / (total - 1); // 0 = oldest, 1 = newest
  return params.oldest + (params.newest - params.oldest) * frac;
}
