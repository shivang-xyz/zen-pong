/* Brief 06 Task 2 — rendering-level pixel test. Loads the real art-lab.html
   in a headless browser, enables fill at default settings, and measures —
   from actual rendered pixels, not eyeballing — whether a ring of unwashed
   paper is left between each fill and the stroke that bounds it.

   Method (why it's reliable): a tile rendered with fill OFF and the same
   tile with fill ON differ ONLY by the wash layer — identical surface,
   grain, vignette, and strokes. So (fillOn - fillOff) is a PURE wash
   signal with zero grain/stroke noise: any pixel whose colour changed is a
   pixel the wash actually painted. We reconstruct each selected region's
   detection mask in-browser (deterministic engine, same seed), then for
   sample points around each region's inner boundary we walk inward toward
   the centroid and count consecutive UNWASHED interior pixels before the
   first washed one. That count, in canvas px, is the paper ring width.
   Ring ~0 = pass (wash reaches the stroke). Ring > threshold = the bug.

   Requires puppeteer-core + a Chrome binary (nothing added to the repo):
     PUPPETEER_CORE=/abs/path/to/node_modules/puppeteer-core \
     CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     SERVER=http://localhost:8000 \
     node v3/tests/fill-render.test.mjs

   Saves: v3/tests/fill-verification/seed-<N>.png  (full rendered tiles)
          v3/tests/fill-verification/task2-results.json */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'fill-verification');

const PUPPETEER_CORE = process.env.PUPPETEER_CORE || 'puppeteer-core';
const CHROME_PATH = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SERVER = process.env.SERVER || 'http://localhost:8000';
const URL = `${SERVER}/v3/labs/art-lab.html`;

const SEED_TILES = [0, 1, 2, 3, 4, 5];   // tiles 0..5 => seeds 1..6 (baseSeed=1)
const WASH_THRESHOLD = 8;                // summed |dRGB|; >this = "washed"
const RAY_CAP = 30;                      // max inward px to walk

const puppeteer = (await import(PUPPETEER_CORE)).default;

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: 'new',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE ERROR:', m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('#grid .tile canvas');
await new Promise(r => setTimeout(r, 400));

// 0) Pin the base seed. The lab randomises state.baseSeed at boot
// (Math.random), so tile i is baseSeed+i, NOT seed i. Force baseSeed=1 via
// the seed control so tile t == seed 1+t and lines up with the engine
// re-run below (and with the Task 1 headless seeds).
const pinnedBase = await page.evaluate(() => {
  const el = document.getElementById('ctl-seed');
  el.value = '1';
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
});
if (pinnedBase !== '1') throw new Error(`failed to pin base seed, got ${pinnedBase}`);
await new Promise(r => setTimeout(r, 800));   // let the re-sim + render settle

// 1) Capture fill-OFF pixels (default state) into the page.
await page.evaluate((tiles) => {
  const canvases = document.querySelectorAll('#grid .tile canvas');
  window.__off = {};
  tiles.forEach(t => {
    const cv = canvases[t];
    window.__off[t] = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  });
}, SEED_TILES);

// 2) Enable fill at defaults and let it recompute + render.
await page.click('#fill-on');
await page.waitForFunction(() => {
  const c = document.querySelector('#grid .tile canvas');
  return c && document.querySelector('#fill-on').checked;
});
await new Promise(r => setTimeout(r, 800));

// 3) Measure the paper gap between the WASH EDGE and the ACTUAL BOUNDING
//    STROKE, in-browser, from real pixels.
//
//    Reference matters: an earlier version walked from the detection mask
//    interior, which is inset ~4px from the stroke centreline (WALL_RADIUS)
//    — that sits OUTSIDE the visible ~2.6px stroke, so it structurally
//    could never see a wash-vs-stroke gap and always read 0. Here we instead
//    build an EXACT ink map (re-render the stroke layer with the same
//    renderStroke + age-fade the lab uses) and, along rays out from each
//    region's centroid, measure how many PAPER pixels sit between where the
//    wash ends and where the bounding stroke begins. That is the ring the
//    brief actually asks about.
const measurement = await page.evaluate(async (opts) => {
  const { tiles, WASH_THRESHOLD } = opts;
  const INK_ALPHA = 10;    // ink map alpha (0-255) above which a pixel is stroke
  const GAP_WINDOW = 16;   // px past the wash edge to search for the stroke
  const RAYS = 360;        // angular samples per region
  const canvases = document.querySelectorAll('#grid .tile canvas');

  const fillMod = await import('../engine/fill.js');
  const simMod = await import('../engine/simulate.js');
  const phys = await import('../engine/physics.js');
  const strokeMod = await import('../engine/strokes.js');
  const enhMod = await import('../engine/enhancements.js');
  const { detectRegions, selectFillRegions, DEFAULT_FILL } = fillMod;
  const { simulateGame, DEFAULT_PALETTE } = simMod;
  const { renderStroke, DEFAULT_STROKE_PARAMS } = strokeMod;
  const { DEFAULT_ENHANCEMENTS, ageFadeMultiplier } = enhMod;
  const { W, H } = phys;

  const out = [];
  const pngs = {};

  for (const t of tiles) {
    const seed = 1 + t; // baseSeed pinned to 1, seedFor(i)=baseSeed+i
    const cv = canvases[t];
    const on = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const off = window.__off[t];
    pngs[seed] = cv.toDataURL('image/png');

    const { strokes } = simulateGame({ seed, winScore: 3, palette: DEFAULT_PALETTE });
    const regions = detectRegions(strokes, W, H);
    const selected = selectFillRegions(regions, DEFAULT_FILL, W, H);

    // Exact ink map: replicate the lab's stroke layer (age-fade on by
    // default, speed-weight off) into a transparent canvas, read its alpha.
    const inkCv = document.createElement('canvas');
    inkCv.width = W; inkCv.height = H;
    const ictx = inkCv.getContext('2d');
    const total = strokes.length;
    strokes.forEach((st, idx) => {
      const op = st.op * ageFadeMultiplier(idx, total, DEFAULT_ENHANCEMENTS.ageFade);
      renderStroke(ictx, st.pts, st.col, st.wt, op, DEFAULT_STROKE_PARAMS);
    });
    const inkData = ictx.getImageData(0, 0, W, H).data;

    const washedAt = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      const i = (y * W + x) * 4;
      return (Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2])) > WASH_THRESHOLD;
    };
    const inkAt = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      return inkData[(y * W + x) * 4 + 3] > INK_ALPHA;
    };

    const regionResults = selected.map((region, ri) => {
      const cx = region.centroid.x, cy = region.centroid.y;
      const diag = Math.hypot(region.bounds.x1 - region.bounds.x0, region.bounds.y1 - region.bounds.y0);
      const maxR = Math.ceil(diag / 2) + GAP_WINDOW + 4;
      const gaps = [];
      let openRays = 0;

      for (let a = 0; a < RAYS; a++) {
        const ang = (a / RAYS) * Math.PI * 2;
        const ux = Math.cos(ang), uy = Math.sin(ang);
        // find the outermost washed radius before the first ink on this ray
        let lastWash = -1, firstInkAfterWash = -1;
        for (let r = 0; r <= maxR; r++) {
          const px = Math.round(cx + ux * r), py = Math.round(cy + uy * r);
          if (inkAt(px, py)) {           // hit a stroke
            if (lastWash >= 0) { firstInkAfterWash = r; break; }
            // ink before any wash (centroid outside region / crossing stroke):
            // keep going, the bounding stroke is the one after wash begins
            continue;
          }
          if (washedAt(px, py)) lastWash = r;
        }
        if (lastWash < 0) continue;                 // no wash this direction
        if (firstInkAfterWash < 0) { openRays++; continue; } // no stroke within reach
        const gap = firstInkAfterWash - lastWash - 1; // paper px strictly between
        if (firstInkAfterWash - lastWash <= GAP_WINDOW) gaps.push(Math.max(0, gap));
        else openRays++;
      }

      gaps.sort((a, b) => a - b);
      const n = gaps.length;
      const pct = p => n ? gaps[Math.min(n - 1, Math.floor(p * n))] : 0;
      const mean = n ? gaps.reduce((s, v) => s + v, 0) / n : 0;
      return {
        regionIndex: ri,
        areaFraction: +region.areaFraction.toFixed(5),
        boundedRays: n,
        openRays,
        gapMax: n ? gaps[n - 1] : 0,
        gapP90: pct(0.9),
        gapMedian: pct(0.5),
        gapMean: +mean.toFixed(2),
        fracRaysGapGT1: n ? +(gaps.filter(g => g > 1).length / n).toFixed(3) : 0,
      };
    });

    const worstGapP90 = regionResults.reduce((m, r) => Math.max(m, r.gapP90), 0);
    const worstGapMax = regionResults.reduce((m, r) => Math.max(m, r.gapMax), 0);
    out.push({
      seed, selectedRegions: selected.length,
      worstGapMax, worstGapP90,
      regions: regionResults,
    });
  }
  return { out, pngs };
}, { tiles: SEED_TILES, WASH_THRESHOLD });

await browser.close();

// 4) Write screenshots + JSON, print a summary table.
for (const [seed, dataURL] of Object.entries(measurement.pngs)) {
  const b64 = dataURL.replace(/^data:image\/png;base64,/, '');
  writeFileSync(join(OUT_DIR, `seed-${seed}.png`), Buffer.from(b64, 'base64'));
}

const PASS_GAP_P90 = 1;   // px; wash-to-stroke paper ring must be <= this
const summary = {
  washThreshold: WASH_THRESHOLD,
  note: 'gap width in canvas px = PAPER pixels between where the wash ends and '
    + 'the bounding stroke begins, measured along 360 rays out from each '
    + 'region centroid. Wash edge = last pixel where fillOn-fillOff exceeds the '
    + 'wash threshold (a pure wash signal; identical grain/strokes cancel). '
    + 'Stroke = alpha>10 in an exact re-render of the lab stroke layer.',
  passIfWorstGapP90LE: PASS_GAP_P90,
  seeds: measurement.out,
};
writeFileSync(join(OUT_DIR, 'task2-results.json'), JSON.stringify(summary, null, 2));

console.log('=== Brief 06 Task 2 — rendered-pixel wash-to-stroke gap ===');
console.log(`wash threshold |dRGB|>${WASH_THRESHOLD}   (pass if worst gap P90 <= ${PASS_GAP_P90}px)`);
console.log('');
console.log('seed | regions | worst gapMax | worst gapP90 | per-region gapP90 list');
let worstOverall = 0;
for (const s of measurement.out) {
  worstOverall = Math.max(worstOverall, s.worstGapP90);
  const list = s.regions.map(r => `${r.gapP90}`).join(',');
  console.log(
    `${String(s.seed).padStart(4)} | ${String(s.selectedRegions).padStart(7)} | ${String(s.worstGapMax).padStart(12)} | ${String(s.worstGapP90).padStart(12)} | ${list}`
  );
}
console.log('');
console.log(`worst gap P90 across all seeds: ${worstOverall}px  -> ${worstOverall <= PASS_GAP_P90 ? 'PASS' : 'FAIL'}`);
console.log(`screenshots + JSON in: ${OUT_DIR}`);
process.exit(worstOverall <= PASS_GAP_P90 ? 0 : 1);
