/* Trail-stroke geometry and rendering — ported from root index.html.
   Pure canvas drawing (2D context in, nothing else) + pure path math.
   No ball/game state here. */

/* Catmull-Rom-ish path through pts, traced as a sequence of bezier curves. */
export function traceCR(ctx, pts) {
  if (pts.length < 2) return;
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1],
          p3 = pts[Math.min(i + 2, pts.length - 1)], t = .5;
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * t / 3, p1.y + (p2.y - p0.y) * t / 3,
      p2.x - (p3.x - p1.x) * t / 3, p2.y - (p3.y - p1.y) * t / 3,
      p2.x, p2.y);
  }
}

/* Closed variant of traceCR — same t=0.5 Catmull-Rom-to-bezier conversion,
   but neighbour indices wrap (modulo pts.length) instead of clamping at the
   ends, so the curve closes smoothly back on itself rather than reading as
   an open path with its ends pinned. Brief 15: paint patches and blotch-
   cluster blobs both need a closed, curved (not polygon) silhouette. */
export function traceClosedCR(ctx, pts) {
  const n = pts.length;
  if (n < 3) return;
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n],
          p3 = pts[(i + 2) % n], t = .5;
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * t / 3, p1.y + (p2.y - p0.y) * t / 3,
      p2.x - (p3.x - p1.x) * t / 3, p2.y - (p3.y - p1.y) * t / 3,
      p2.x, p2.y);
  }
  ctx.closePath();
}

/* Defaults equal to the live build's hardcoded pass widths/alphas. */
export const DEFAULT_STROKE_PARAMS = {
  pass1WidthMult: 2.2, pass1AlphaMult: 0.22,
  pass2WidthMult: 0.75, pass2AlphaMult: 0.88,
};

/* Two-pass stroke: wide soft pass, then a narrower dense core pass.
   `params` externalizes the pass multipliers — this is what the lab's
   sliders drive; omitted fields fall back to the live build's values. */
export function renderStroke(ctx, pts, col, wt, op, params = {}) {
  if (pts.length < 2) return;
  const p = { ...DEFAULT_STROKE_PARAMS, ...params };
  ctx.save(); ctx.globalAlpha = op * p.pass1AlphaMult; ctx.strokeStyle = col;
  ctx.lineWidth = wt * p.pass1WidthMult; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  traceCR(ctx, pts); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.globalAlpha = op * p.pass2AlphaMult; ctx.strokeStyle = col;
  ctx.lineWidth = wt * p.pass2WidthMult; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  traceCR(ctx, pts); ctx.stroke(); ctx.restore();
}

/* Perpendicular sine displacement applied to interior points when a stroke
   commits (extracted from commitStroke). `amplitude` defaults to the live
   build's value (0.5) and is what the lab's jitter-amplitude slider drives.
   Endpoints are left untouched so committed strokes still meet at the exact
   hit/bounce/spawn point. */
export function jitterPath(pts, amplitude = 0.5) {
  if (pts.length < 2) return pts;
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    const nx = pts[Math.min(i + 1, pts.length - 1)].x - pts[i - 1].x;
    const ny = pts[Math.min(i + 1, pts.length - 1)].y - pts[i - 1].y;
    const len = Math.hypot(nx, ny) || 1;
    const j = Math.sin(p.x * 0.73 + p.y * 1.31) * amplitude;
    return { x: p.x + (-ny / len) * j, y: p.y + (nx / len) * j };
  });
}
