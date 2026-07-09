/* Brief 06 Task 1 — headless engine-level test for the fill selection +
   dilation logic. No browser: imports the pure engine functions directly,
   runs them across many seeds, and asserts the Brief 05 spread rule:
   every quadrant that has at least one area-filtered candidate region must
   receive at least one selection before any quadrant receives a second.

   Also records, per selected region, the dilation amount the lab's
   renderFillWash would apply (mirroring its formula) — so we can see in raw
   numbers how much the wash actually grows at default settings, which is
   the render-side half of the "fill stops short of the stroke" bug.

   Run: node v3/tests/fill-selection.test.mjs
   Dumps: v3/tests/fill-verification/task1-results.json */

import { simulateGame, DEFAULT_PALETTE } from '../engine/simulate.js';
import { W, H } from '../engine/physics.js';
import {
  DEFAULT_FILL, detectRegions, selectFillRegions, quadrantCounts,
} from '../engine/fill.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lab defaults these must mirror (art-lab.html state + strokes.js).
const WT_MAX = 2.4;              // state.wtRange[1]
const PASS1_WIDTH_MULT = 2.2;   // DEFAULT_STROKE_PARAMS.pass1WidthMult
const MASK_SCALE = 2;           // fill.js internal
const STYLE_DEFAULT = DEFAULT_FILL.style; // 0

// Mirror renderFillWash's dilation math so we record what actually happens.
function dilationForStyle(style) {
  const blurPx = 1 + style * 5;
  const wideStrokeHalfWidth = (WT_MAX * PASS1_WIDTH_MULT) / 2;
  const dilateAmount = Math.max(wideStrokeHalfWidth, blurPx * 1.2);
  const nMaskPx = Math.round(dilateAmount / MASK_SCALE);
  return { blurPx, dilateAmountCanvasPx: dilateAmount, nMaskPx, effectiveCanvasPx: nMaskPx * MASK_SCALE };
}

const quadrantOf = (r) => {
  const top = r.centroid.y < H / 2, left = r.centroid.x < W / 2;
  return top ? (left ? 'tl' : 'tr') : (left ? 'bl' : 'br');
};

const SEEDS = [];
for (let s = 1; s <= 25; s++) SEEDS.push(s);        // 25 sequential
SEEDS.push(42, 100, 777, 271828, 45463);            // + the ones used before

const params = { ...DEFAULT_FILL };
const results = [];
let failures = 0;

for (const seed of SEEDS) {
  const { strokes } = simulateGame({ seed, winScore: 3, palette: DEFAULT_PALETTE });
  const regions = detectRegions(strokes, W, H);
  const qc = quadrantCounts(regions, params, W, H);
  const selected = selectFillRegions(regions, params, W, H);

  const selByQuad = { tl: 0, tr: 0, bl: 0, br: 0 };
  selected.forEach(r => { selByQuad[quadrantOf(r)]++; });

  // Brief 05 rule: every occupied quadrant gets >=1 before any gets a 2nd.
  // Concretely: no quadrant has a candidate but 0 selections while some
  // other quadrant has >=2 selections; and (since maxCount 6 >= 4 quadrants)
  // every occupied quadrant must get at least one selection unless all
  // candidates fit under the cap (then all are selected anyway).
  const occupiedQuads = ['tl', 'tr', 'bl', 'br'].filter(q => qc[q] > 0);
  const starved = occupiedQuads.filter(q => selByQuad[q] === 0);
  const anySecond = Object.values(selByQuad).some(n => n >= 2);
  const ruleViolated = starved.length > 0 && (anySecond || selected.length < params.maxCount);
  // If selected.length < maxCount and a quadrant is starved, that quadrant
  // genuinely had 0 candidates OR the algo failed — starved is computed
  // only over quadrants WITH candidates, so any starved entry is a failure.
  const pass = starved.length === 0;
  if (!pass) failures++;

  const dil = dilationForStyle(STYLE_DEFAULT);

  results.push({
    seed,
    totalRegions: regions.length,
    candidates: { tl: qc.tl, tr: qc.tr, bl: qc.bl, br: qc.br, total: qc.total },
    selectedByQuadrant: selByQuad,
    selectedCount: selected.length,
    starvedQuadrants: starved,
    pass,
    dilation: dil,
  });
}

const summary = {
  seedsRun: SEEDS.length,
  failures,
  passed: failures === 0,
  dilationAtDefaultStyle: dilationForStyle(STYLE_DEFAULT),
  results,
};

const outPath = join(__dirname, 'fill-verification', 'task1-results.json');
writeFileSync(outPath, JSON.stringify(summary, null, 2));

console.log('=== Brief 06 Task 1 — headless selection test ===');
console.log(`seeds run: ${SEEDS.length}   failures: ${failures}   ${failures === 0 ? 'PASS' : 'FAIL'}`);
console.log(`dilation @ default style=${STYLE_DEFAULT}:`, JSON.stringify(dilationForStyle(STYLE_DEFAULT)));
console.log('');
console.log('seed  | candidates TL/TR/BL/BR (tot) | selected TL/TR/BL/BR (tot) | starved | pass');
for (const r of results) {
  const c = r.candidates, s = r.selectedByQuadrant;
  const cStr = `${c.tl}/${c.tr}/${c.bl}/${c.br} (${c.total})`.padEnd(18);
  const sStr = `${s.tl}/${s.tr}/${s.bl}/${s.br} (${r.selectedCount})`.padEnd(16);
  console.log(
    `${String(r.seed).padStart(6)}| ${cStr}| ${sStr}| ${(r.starvedQuadrants.join(',') || '-').padEnd(8)}| ${r.pass ? 'ok' : 'FAIL'}`
  );
}
console.log('');
console.log(`results JSON: ${outPath}`);
process.exit(failures === 0 ? 0 : 1);
