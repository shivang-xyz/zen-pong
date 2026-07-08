/* Paper/canvas surface texture generator — ported from root index.html's
   buildPaper(). Returns an off-screen <canvas>; only module here that
   touches the DOM/canvas, since its whole job is producing one.

   Note: CLAUDE.md calls for merging buildPaper's two getImageData loops
   into one for performance. The current index.html already has a single
   grain+wave loop (vignette/centerline are gradient fills, not a second
   pixel loop) — nothing left to merge, ported as-is. */

export function buildSurface(w, h, rng) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const pc = cv.getContext('2d');

  pc.fillStyle = '#FFF5E5'; pc.fillRect(0, 0, w, h);
  const img = pc.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    const row = Math.sin(y * 0.047) * 3;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (rng() - 0.5) * 14;
      const v = (Math.sin(x * 0.031 + row) + Math.sin(y * 0.022)) * 2.5;
      d[i] = Math.min(255, Math.max(0, d[i] + n + v));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.88 + v * 0.9));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.72 + v * 0.75));
    }
  }
  pc.putImageData(img, 0, 0);

  const ew = 65; let g;
  g = pc.createLinearGradient(0, 0, 0, ew);
  g.addColorStop(0, 'rgba(0,0,0,0.055)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, 0, w, ew);
  g = pc.createLinearGradient(0, h, 0, h - ew);
  g.addColorStop(0, 'rgba(0,0,0,0.055)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, h - ew, w, ew);
  g = pc.createLinearGradient(0, 0, ew, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.045)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(0, 0, ew, h);
  g = pc.createLinearGradient(w, 0, w - ew, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.045)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = g; pc.fillRect(w - ew, 0, ew, h);

  pc.save();
  pc.setLineDash([2, 16]);
  pc.strokeStyle = 'rgba(140,120,90,0.07)';
  pc.lineWidth = 0.5;
  pc.beginPath(); pc.moveTo(w / 2, 35); pc.lineTo(w / 2, h - 35); pc.stroke();
  pc.restore();

  return cv;
}
