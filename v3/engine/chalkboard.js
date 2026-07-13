/* Chalkboard surface + chalk-stroke renderer — brief 07. A second surface
   style alongside paper (surface.js), fully additive: paper is untouched.

   Like surface.js, this module is allowed to touch a canvas 2D context —
   its whole job is producing surface texture and stroke pixels, the same
   carve-out surface.js documents for itself. That canvas access is confined
   to the two exported render functions, buildChalkboardSurface and
   renderChalkStroke (the latter also lazily builds the shared static grain
   tile on first call). Everywhere else in the engine stays DOM-free.

   All randomness flows through the injected rng() (surface) or a fixed-seed
   makeRng() for the static grain tile (deterministic across runs) — never
   the ambient global RNG. Same seed + same params => identical render,
   background included. */

import { traceCR } from './strokes.js';
import { makeRng } from './rng.js';

/* ── Task 1 — chalkboard surface texture ─────────────────────────────────
   Tuned by eye against the ampersand "recently erased" reference:
   - BASE #1A1A1E: cool near-black, not pure black.
   - SMUDGE: 5–12 large, soft, low-opacity cool-grey blobs at rng positions/
     radii/tone — the dominant "partially erased cloud" feature. A few read
     darker than base too, so the erasing looks uneven rather than additive.
   - GRAIN: subtle neutral per-pixel noise (amp ~8, vs paper's 14), no warm
     tint — this is a cool surface. Same getImageData-loop family as paper.
   - VIGNETTE: edge gradients like paper's, darkened for the near-black base
     (0.32 top/bottom, 0.26 sides) so the board sinks at the edges.
   - No dashed centre-line (paper-specific), no white dust speckle (the
     ampersand reference has essentially none). */
const CB_BASE = '#1A1A1E';
const CB_SMUDGE_MIN = 5, CB_SMUDGE_MAX = 12;
const CB_GRAIN_AMP = 8;
const CB_VIGNETTE_EDGE = 78;

export function buildChalkboardSurface(w, h, rng) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const pc = cv.getContext('2d');

  // Base near-black.
  pc.fillStyle = CB_BASE; pc.fillRect(0, 0, w, h);

  // Large cloudy smudge: soft radial blobs, mostly lighter ("erased chalk
  // residue") with a few darker to keep the erasing uneven.
  const blobCount = CB_SMUDGE_MIN + Math.floor(rng() * (CB_SMUDGE_MAX - CB_SMUDGE_MIN + 1));
  for (let b = 0; b < blobCount; b++) {
    const cx = rng() * w, cy = rng() * h;
    const radius = (0.16 + rng() * 0.34) * Math.max(w, h);
    const lighter = rng() > 0.28;                 // most blobs lighten
    const tone = lighter ? 42 + rng() * 46 : 6 + rng() * 10; // grey level
    const alpha = (lighter ? 0.05 : 0.07) + rng() * 0.05;
    const g = pc.createRadialGradient(cx, cy, 0, cx, cy, radius);
    // cool tint: nudge blue a touch above red/green
    g.addColorStop(0, `rgba(${tone | 0},${tone | 0},${(tone + 8) | 0},${alpha.toFixed(3)})`);
    g.addColorStop(1, `rgba(${tone | 0},${tone | 0},${(tone + 8) | 0},0)`);
    pc.fillStyle = g;
    pc.fillRect(0, 0, w, h);
  }

  // Fine neutral grain on top (subtler than paper, no warm tint).
  const img = pc.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (rng() - 0.5) * CB_GRAIN_AMP;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 1.05)); // faintly cooler
    }
  }
  pc.putImageData(img, 0, 0);

  // Vignette — darken toward the edges (technique from buildPaper, tuned dark).
  const ew = CB_VIGNETTE_EDGE; let g;
  g = pc.createLinearGradient(0, 0, 0, ew);
  g.addColorStop(0, 'rgba(0,0,0,0.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, 0, w, ew);
  g = pc.createLinearGradient(0, h, 0, h - ew);
  g.addColorStop(0, 'rgba(0,0,0,0.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, h - ew, w, ew);
  g = pc.createLinearGradient(0, 0, ew, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.26)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, 0, ew, h);
  g = pc.createLinearGradient(w, 0, w - ew, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.26)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(w - ew, 0, ew, h);

  return cv;
}

/* ── Task 3 — chalk palettes ──────────────────────────────────────────────
   Starting points sampled off the bubbles PALETTE reference; Shivang eyeball-
   corrects the exact hexes in the lab, so these are not final. White mode uses
   a single warm off-white (not pure #FFFFFF, which reads plastic on grain). */
export const CHALK_PALETTE = ['#3E8EF7', '#E8478E', '#F5C518']; // blue / pink / yellow
export const WHITE_CHALK_HEX = '#EFEAE0';

/* ── Task 2 — chalk stroke renderer ──────────────────────────────────────
   Target: the golden-ratio reference's line quality — a continuous, fairly
   clean, moderate-thin line with a little chalk roughness at the EDGE (not a
   flat vector line, not the ampersand's thick ragged strokes).

   Technique (documented per brief): draw onto a small per-stroke bbox-sized
   offscreen so texturing can't leak onto the rest of the canvas, then
   1. a wide, low-alpha soft "dust" halo (the edge),
   2. punch a seeded static grain into the halo via destination-out at FULL
      strength — the dusty, broken chalk edge, near the ampersand's ragged
      intensity, without any tiling artefact bleeding across strokes,
   3. lay a chunky core on top (CORE_MULT ~1.0, wider than paper's 0.75 core
      so chalk's resting line reads visibly heavier than a paper stroke),
   4. punch the SAME grain into the core but at reduced strength
      (CORE_GRAIN_STRENGTH) so the texture is visible on the line itself while
      the core stays mostly solid/continuous — this is what makes it read as
      "chalk" rather than "clean vector + faint halo" (brief 08 task 1).
   Grain is a fixed-seed makeRng() tile built once and reused, so it costs
   nothing per stroke beyond one createPattern + fillRect over a small rect —
   cheap enough to run per committed stroke in the live game later. The bbox
   offscreen keeps the erase local; nothing here reads/writes global state.

   chalkWidthMult scales BOTH pass widths (the standalone "thicker/thinner"
   knob). It stacks on the ball's own wt, which the caller has already
   resolved through age-fade / speed-weight (see art-lab renderTile) — this
   function never touches opacity or age logic itself. col is whatever the
   caller passes (white-mode override or the ball's tri-palette colour); mode
   selection lives in the caller, not here. */
const HALO_MULT = 2.1, HALO_ALPHA = 0.20;
const CORE_MULT = 1.0, CORE_ALPHA = 0.92;
const CORE_GRAIN_STRENGTH = 0.5; // fraction of the grain tile punched into the core
const GRAIN_TILE_SEED = 0x5eed; // fixed => deterministic grain across runs
let _grainTile = null;         // shared static tile, built once on first stroke

export function renderChalkStroke(ctx, pts, col, wt, op, chalkWidthMult = 1.0) {
  if (pts.length < 2) return;
  const wMul = chalkWidthMult;

  // Lazily build the shared grain tile (fixed seed => identical every run).
  if (!_grainTile) {
    const s = 96;
    const tile = document.createElement('canvas');
    tile.width = s; tile.height = s;
    const tcx = tile.getContext('2d');
    const img = tcx.createImageData(s, s);
    const grng = makeRng(GRAIN_TILE_SEED);
    for (let i = 0; i < s * s; i++) {
      // black specks => chalk "holes"; a bit denser/stronger than a fine film
      // grain so the texture reads as coarse chalk, not noise (brief 08)
      const hole = grng() < 0.5 ? grng() * grng() * 195 : 0; // biased faint, some bite
      img.data[i * 4] = 0; img.data[i * 4 + 1] = 0; img.data[i * 4 + 2] = 0;
      img.data[i * 4 + 3] = hole;
    }
    tcx.putImageData(img, 0, 0);
    _grainTile = tile;
  }

  // Padded bbox of the path (pad for the widest pass + a little slack).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const pad = Math.ceil(wt * wMul * HALO_MULT + 4);
  const ox = Math.floor(minX - pad), oy = Math.floor(minY - pad);
  const bw = Math.ceil(maxX - minX + pad * 2), bh = Math.ceil(maxY - minY + pad * 2);
  if (bw <= 0 || bh <= 0) return;

  const off = document.createElement('canvas');
  off.width = bw; off.height = bh;
  const o = off.getContext('2d');
  o.translate(-ox, -oy);
  o.lineCap = 'round'; o.lineJoin = 'round'; o.strokeStyle = col;

  // 1. wide soft dust halo (the edge)
  o.globalAlpha = op * HALO_ALPHA;
  o.lineWidth = wt * wMul * HALO_MULT;
  traceCR(o, pts); o.stroke();

  // 2. punch seeded grain into the halo only (device space => cover bbox)
  o.save();
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'destination-out';
  o.globalAlpha = 1;
  o.fillStyle = o.createPattern(_grainTile, 'repeat');
  o.fillRect(0, 0, bw, bh);
  o.restore(); // restores transform + source-over + globalAlpha

  // 3. chunky core on top (wider than paper's core => heavier resting line)
  o.globalAlpha = op * CORE_ALPHA;
  o.lineWidth = wt * wMul * CORE_MULT;
  traceCR(o, pts); o.stroke();

  // 4. lighter grain punch over the core so the LINE itself reads as chalk
  //    (reduced globalAlpha => only a fraction of each hole bites, keeping the
  //    core mostly solid rather than breaking up the way the halo does)
  o.save();
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'destination-out';
  o.globalAlpha = CORE_GRAIN_STRENGTH;
  o.fillStyle = o.createPattern(_grainTile, 'repeat');
  o.fillRect(0, 0, bw, bh);
  o.restore();

  ctx.drawImage(off, ox, oy);
}
