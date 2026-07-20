/* Paint surface — brief 11 task 2 (canvas ground, plain mode only). A third
   surface style alongside paper (surface.js) and chalkboard (chalkboard.js
   on feature/chalkboard-surface), fully additive: neither is touched.

   Same carve-out as those two modules: this file is allowed to touch a
   canvas 2D context because producing surface/stroke pixels is its whole
   job. That access is confined to the exported build/render functions
   (buildPaintSurface here; renderPaintStroke lands in task 3). Everywhere
   else in the engine stays DOM-free. */

/* ── canvas weave texture ─────────────────────────────────────────────────
   Distinguishing feature vs. paper/chalkboard's per-pixel grain (a
   getImageData noise loop): woven cloth reads as a REGULAR cross-hatch
   (two perpendicular thread directions) with IRREGULAR thread thickness,
   not as isotropic per-pixel noise. Built as a static, fixed-internal-seed,
   seamless tile — same idiom as chalkboard.js's stroke grain tile
   (brief 09): multi-pixel elements survive display-size downscale, where
   per-pixel noise averages away (that was brief 09's whole root cause).
   Built once, cached, reused via createPattern — cheap regardless of how
   many grounds get built in a session. */
const WEAVE_TILE = 64;     // px, seamless repeat unit at native (1000x630) res
const WEAVE_PITCH = 16;    // px per weave cell (4x4 cells/tile)
const WEAVE_TILE_SEED = 0x7EA7E;
let _weaveTile = null;

function buildWeaveTile() {
  const s = WEAVE_TILE;
  const tile = document.createElement('canvas');
  tile.width = s; tile.height = s;
  const tcx = tile.getContext('2d');

  // Simple deterministic PRNG local to this tile build (mirrors rng.js's
  // mulberry32 so no import is needed for a one-off internal seed).
  let a = WEAVE_TILE_SEED >>> 0;
  const wrng = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Basket-weave, not ruled lines: a first pass drew full-length horizontal
  // and vertical strokes spanning the whole tile, which — however faint —
  // still reads as a drafted grid, because real interlaced thread doesn't
  // present as continuous rules. Real canvas weave is perceived as a field
  // of small alternating over/under nubs at each thread crossing, each
  // thread only "on top" for the span of one crossing before the
  // perpendicular thread covers it again. So: iterate grid CELLS, and in
  // each cell draw one short horizontal dash and one short vertical dash
  // (each ~1 pitch long, not tile-length), alternating which one paints on
  // top in a checkerboard — that alternation is what a basket weave is.
  // Each dash is a colour-neutral highlight+shadow bevel pair, same reason
  // as before: one shared tile has to read correctly over all 4
  // GROUND_LIBRARY hexes with no per-ground tuning.
  const cells = Math.round(s / WEAVE_PITCH);

  function drawDash(cx, cy, isHorizontal, len, thick, shadowA, highlightA) {
    for (let dx = -s; dx <= s; dx += s) {
      for (let dy = -s; dy <= s; dy += s) {
        const x = cx + dx, y = cy + dy;
        const half = len / 2;
        tcx.strokeStyle = `rgba(0,0,0,${shadowA.toFixed(3)})`;
        tcx.lineWidth = thick;
        tcx.beginPath();
        if (isHorizontal) { tcx.moveTo(x - half, y + thick * 0.4); tcx.lineTo(x + half, y + thick * 0.4); }
        else { tcx.moveTo(x + thick * 0.4, y - half); tcx.lineTo(x + thick * 0.4, y + half); }
        tcx.stroke();

        tcx.strokeStyle = `rgba(255,255,255,${highlightA.toFixed(3)})`;
        tcx.lineWidth = thick * 0.65;
        tcx.beginPath();
        if (isHorizontal) { tcx.moveTo(x - half, y - thick * 0.35); tcx.lineTo(x + half, y - thick * 0.35); }
        else { tcx.moveTo(x - thick * 0.35, y - half); tcx.lineTo(x - thick * 0.35, y + half); }
        tcx.stroke();
      }
    }
  }

  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      const centerX = (cx + 0.5) * WEAVE_PITCH + (wrng() - 0.5) * 1.5;
      const centerY = (cy + 0.5) * WEAVE_PITCH + (wrng() - 0.5) * 1.5;
      const len = WEAVE_PITCH * (0.8 + wrng() * 0.25);
      const thick = 0.8 + wrng() * 0.7;
      const shadowA = 0.05 + wrng() * 0.025;
      const highlightA = 0.04 + wrng() * 0.02;
      const hOnTop = (cx + cy) % 2 === 0; // checkerboard alternation = the weave

      if (hOnTop) {
        drawDash(centerX, centerY, false, len, thick, shadowA * 0.75, highlightA * 0.75);
        drawDash(centerX, centerY, true, len, thick, shadowA, highlightA);
      } else {
        drawDash(centerX, centerY, true, len, thick, shadowA * 0.75, highlightA * 0.75);
        drawDash(centerX, centerY, false, len, thick, shadowA, highlightA);
      }
    }
  }

  return tile;
}

const VIGNETTE_EDGE = 60;
const VIGNETTE_TB_ALPHA = 0.09;  // weaker than chalkboard's 0.32 (very subtle, per brief)
const VIGNETTE_LR_ALPHA = 0.07;  // weaker than chalkboard's 0.26

/* buildPaintSurface(w, h, rng, groundHex) — same shape as
   buildChalkboardSurface(w, h, rng). Plain mode only in this brief:
   groundHex always comes from GROUND_LIBRARY (palette.js), passed by the
   caller. `rng` is accepted for signature parity with buildChalkboardSurface
   and because brief 13's seeded Patches ground will need it — Plain mode's
   ground is fully determined by groundHex alone (shared static weave tile +
   fixed vignette, no per-seed variation), so it goes unused here rather than
   inventing a cosmetic use that would read as per-pixel tone drift and
   contradict "flat groundHex base." */
export function buildPaintSurface(w, h, rng, groundHex) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const pc = cv.getContext('2d');

  pc.fillStyle = groundHex;
  pc.fillRect(0, 0, w, h);

  if (!_weaveTile) _weaveTile = buildWeaveTile();
  const pat = pc.createPattern(_weaveTile, 'repeat');
  pc.fillStyle = pat;
  pc.fillRect(0, 0, w, h);

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

  // No dashed centre line (paper-specific), no dust speckle — both
  // explicitly excluded for paint's ground.

  return cv;
}
