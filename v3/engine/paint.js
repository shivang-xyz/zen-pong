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

/* ── paint stroke renderer — brief 11 task 3 ──────────────────────────────
   renderPaintStroke(ctx, pts, col, wt, op, opts) mirrors renderChalkStroke's
   signature shape: (ctx, pts, col, wt, op, ...extra-knobs). `wt` here IS the
   base width in pixels, same contract as renderStroke/renderChalkStroke —
   PAINT_WIDTH_BASE=6.0 is a starting point for whatever the caller feeds in
   as wt (the lab's Base width slider becomes the wtRange fed to
   simulateGame; this function doesn't know or care where wt came from).

   A single ctx.lineWidth stroke can't vary width along its length, so this
   is a filled ribbon: sample the Catmull-Rom spine densely, offset each
   sample perpendicular by half the local width, and fill the closed
   left+right outline. Width at each sample is base wt scaled by two
   independent, purely-deterministic (no injected rng — same idiom as
   strokes.js's jitterPath, which derives its jitter from point coordinates
   rather than threading an rng call through every renderer) signals:
     3b — a low-frequency sine wave across arc length (brush loading/
          unloading), seeded off the stroke's own start/end coordinates.
     3c — a pooling spike near either end, IF that end is a real paddle/wall
          hit (poolStart/poolEnd — the caller determines this from stroke
          adjacency + event type, same division of responsibility as
          renderChalkStroke taking ageFrac from the caller instead of
          computing it from stroke index itself).
   The two combine by max(), not multiply — a pooling knot should read
   reliably regardless of where the width wave happens to sit at that arc
   length, not get cancelled by a low point in the wave. */
export const PAINT_WIDTH_BASE = 6.0;

const WIDTH_VAR_MIN = 0.55, WIDTH_VAR_MAX = 1.6;   // 3b, PROVISIONAL
const POOL_PEAK_MIN = 2.2, POOL_PEAK_MAX = 3.2;    // 3c, PROVISIONAL
const POOL_WINDOW_MIN = 8, POOL_WINDOW_MAX = 14;   // 3c, PROVISIONAL, px
const GLOSS_WIDTH_FRAC = 0.32;   // "clean and slightly glossy, not grainy" —
const GLOSS_ALPHA_MULT = 0.4;    // a thin lighter streak down the centre,
                                  // not chalk-style grain.

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

function lighten(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const mix = c => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

export function renderPaintStroke(ctx, pts, col, wt, op, opts = {}) {
  if (pts.length < 2) return;
  const {
    widthVariation = 1.0,   // 0 = uniform wt, 1 = full 0.55-1.6x wave (3b)
    poolingStrength = 1.0,  // 1 = literal 2.2-3.2x PROVISIONAL peak (3c)
    poolStart = false,
    poolEnd = false,
  } = opts;

  const samples = sampleSpine(pts, 8);
  if (samples.length < 2) return;
  const { s: arcS, length } = arcLengths(samples);

  const undulations = 1.5 + hash2(pts[0].x, pts[0].y) * 1.5;             // 1.5-3, 3b
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

  function buildRibbon(widthScale) {
    const left = [], right = [];
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const pPrev = samples[Math.max(i - 1, 0)], pNext = samples[Math.min(i + 1, samples.length - 1)];
      let tx = pNext.x - pPrev.x, ty = pNext.y - pPrev.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const nx = -ty, ny = tx;
      const halfW = 0.5 * wt * widthMultAt(i) * widthScale;
      left.push({ x: p.x + nx * halfW, y: p.y + ny * halfW });
      right.push({ x: p.x - nx * halfW, y: p.y - ny * halfW });
    }
    return { left, right };
  }

  function fillRibbon(left, right, fillStyle, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fill();
    // Rounded caps at both ends — radius follows local half-width, so a
    // pooled end's cap reads as a blob (per 3c), not a bulge with square
    // corners.
    const r0 = Math.hypot(left[0].x - right[0].x, left[0].y - right[0].y) / 2;
    ctx.beginPath(); ctx.arc(samples[0].x, samples[0].y, r0, 0, Math.PI * 2); ctx.fill();
    const n = left.length - 1;
    const rN = Math.hypot(left[n].x - right[n].x, left[n].y - right[n].y) / 2;
    ctx.beginPath(); ctx.arc(samples[n].x, samples[n].y, rN, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const { left, right } = buildRibbon(1);
  fillRibbon(left, right, col, op);

  const { left: gl, right: gr } = buildRibbon(GLOSS_WIDTH_FRAC);
  fillRibbon(gl, gr, lighten(col, 0.5), op * GLOSS_ALPHA_MULT);
}
