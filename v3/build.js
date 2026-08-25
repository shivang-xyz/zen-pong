#!/usr/bin/env node
// v3/build.js — generates repo-root index.html from v3/app/index.html +
// v3/engine/. Plain Node, no dependencies. Rebuild after any change to
// either: `node v3/build.js`.
//
// Brief 30 Task 1. The problem this resolves: PORT-PLAN.md requires one
// self-contained file (ES modules don't load over file://, so a real
// product has to be a single script); v3/CLAUDE.md forbids ever
// copy-pasting engine code into a consumer (that forks the engine
// permanently — the lab and the product drift apart silently, and it
// surfaces months later as "I tuned it in the lab and the game ignored
// me"). A build step is how both hold at once: the engine stays the
// single source of truth, and root index.html becomes generated OUTPUT
// that nobody hand-edits, not a hand-merged copy.
//
// The one thing a naive "strip import/export, concatenate every file"
// version of this script would get silently wrong: v3/engine/chalkboard.js
// and v3/engine/density.js each export a DIFFERENT function named
// computeLineDensity. chalkboard.js's version (plus its
// scatterDensitySmudges/renderSmudges siblings) is consumed only by
// v3/labs/art-lab.html; density.js's is what paint.js/splatter.js actually
// call. Flattening every file into one shared scope would let whichever
// file happens to land later in the bundle silently win that name for
// EVERY call site, including paint.js/splatter.js's own internal calls —
// a silent behavior change, not a crash. Fixed below by giving every
// engine file its own IIFE scope (real module isolation, not flattening)
// that only ever exposes the exact names its OWN `import` lines ask for.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const APP_PATH = path.join(__dirname, 'app', 'index.html');
const ENGINE_DIR = path.join(__dirname, 'engine');
const OUT_PATH = path.join(ROOT_DIR, 'index.html');

const OOLONG_DEV_PATH = '../../Oolong.mp3';
const OOLONG_SHIP_PATH = 'Oolong.mp3';

const GENERATED_HEADER =
  '<!-- GENERATED FILE — do not edit. Source: v3/app/index.html + v3/engine/. Rebuild with: node v3/build.js -->\n';

// Matches `import { a, b, c } from './x.js'` (engine-internal, relative to
// v3/engine/) and `import { a, b, c } from '../engine/x.js'` (the app's
// own imports) in one pattern — confirmed by grep across every engine file
// and v3/app/index.html: named imports only, no `import * as`, no default
// imports, no `as` aliasing, no re-exports. Tolerates the multi-line form
// (e.g. physics.js's own 4-name import, and the app's own import of it) —
// `[^}]*` matches across newlines fine since it's a negated character
// class, not `.`.
const IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*['"](?:\.\/|\.\.\/engine\/)([\w-]+)\.js['"];?/g;

function parseImports(src) {
  const out = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src))) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    out.push({ names, module: m[2] });
  }
  return out;
}

function stripImportsAndExports(src) {
  let out = src.replace(IMPORT_RE, '');
  out = out.replace(/^export (function|const)\b/gm, '$1');
  return out;
}

function readEngineFile(mod) {
  return fs.readFileSync(path.join(ENGINE_DIR, mod + '.js'), 'utf8');
}

// Export-name extraction. NOT a one-name-per-line regex — physics.js has
// real multi-declarator `export const` lines:
//   export const W = 1000, H = 630, PW = 8, PH = 64, BR = 6;
//   export const PAD_MIN = CR, PAD_MAX = H - CR - PH;
//   export const BASE_SPD = 5.2, WIN = 3;
// and the app imports W, H, PH, BR, PAD_MIN, PAD_MAX, WIN, BASE_SPD off
// exactly these lines. A one-name-per-line extractor would silently drop
// every name after the first on each line — not a crash, just WIN/H/etc.
// becoming `undefined` in the bundle (e.g. `score >= WIN` always false).
// This scanner tracks bracket/paren/brace depth and string literals so it
// only splits on TOP-LEVEL commas and only stops at a TOP-LEVEL semicolon —
// correct for both a simple one-line multi-declarator and a single name
// with a large multi-line array/object body (HUE_LIBRARY, CORNERS, etc.).
function extractExportNames(src) {
  const names = [];
  const headerRe = /^export (function|const)\s+/gm;
  let m;
  while ((m = headerRe.exec(src))) {
    if (m[1] === 'function') {
      const rest = src.slice(headerRe.lastIndex);
      const fnMatch = rest.match(/^([A-Za-z0-9_]+)/);
      if (fnMatch) names.push(fnMatch[1]);
      continue;
    }
    // const — scan forward from right after "const ", splitting on
    // top-level commas, stopping at the top-level terminating semicolon.
    let i = headerRe.lastIndex;
    let depth = 0;
    let segStart = i;
    let inString = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (inString) {
        if (c === '\\') { i++; continue; }
        if (c === inString) inString = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
      if (c === '[' || c === '{' || c === '(') { depth++; continue; }
      if (c === ']' || c === '}' || c === ')') { depth--; continue; }
      if (depth === 0 && c === ',') {
        names.push(src.slice(segStart, i).trim().split('=')[0].trim());
        segStart = i + 1;
        continue;
      }
      if (depth === 0 && c === ';') {
        names.push(src.slice(segStart, i).trim().split('=')[0].trim());
        break;
      }
    }
    headerRe.lastIndex = i; // resume the outer scan after this whole statement
  }
  return names.filter(Boolean);
}

// Transitive closure + topological order via post-order DFS, starting from
// the app's own direct engine imports. Post-order DFS visits a file's
// dependencies before the file itself, so the returned array is already
// a valid build order (deps defined before dependents reference them) —
// and it naturally excludes anything never reached (enhancements.js is
// lab-only, never imported by the app or by anything the app imports).
function resolveBuildOrder(startModules) {
  const order = [];
  const visited = new Set();
  function visit(mod) {
    if (visited.has(mod)) return;
    visited.add(mod);
    const src = readEngineFile(mod);
    parseImports(src).forEach((imp) => visit(imp.module));
    order.push(mod);
  }
  startModules.forEach(visit);
  return order;
}

// One IIFE per engine file: destructures ONLY the names that file's own
// `import` lines request (real module isolation, not flattening — this is
// what makes the computeLineDensity collision structurally impossible
// rather than just currently-avoided), and returns an object of exactly
// that file's own exported names onto the shared __engine namespace.
function buildModuleIIFE(mod) {
  const src = readEngineFile(mod);
  const imports = parseImports(src);
  const body = stripImportsAndExports(src).trim();
  const destructures = imports
    .map((imp) => `  const { ${imp.names.join(', ')} } = __engine.${imp.module};`)
    .join('\n');
  const exportNames = extractExportNames(src);
  return [
    `__engine.${mod} = (() => {`,
    destructures,
    body,
    `  return { ${exportNames.join(', ')} };`,
    `})();`,
  ].filter(Boolean).join('\n');
}

function main() {
  const appSrc = fs.readFileSync(APP_PATH, 'utf8');
  const scriptRe = /<script type="module">([\s\S]*?)<\/script>/;
  const scriptMatch = appSrc.match(scriptRe);
  if (!scriptMatch) {
    throw new Error('v3/build.js: no <script type="module"> block found in v3/app/index.html');
  }
  const appScript = scriptMatch[1];

  const appImports = parseImports(appScript);
  const order = resolveBuildOrder(appImports.map((i) => i.module));
  const engineBundle = order.map(buildModuleIIFE).join('\n\n');

  // The ONLY place any engine name becomes a bare identifier in the final
  // scope — one destructure per statement the app's own script actually
  // wrote, pulling only those names off __engine.<module>. This is why
  // chalkboard.js's own computeLineDensity can never leak in: the app's
  // chalkboard import never asks for it, so it's never destructured here.
  const appDestructure = appImports
    .map((imp) => `const { ${imp.names.join(', ')} } = __engine.${imp.module};`)
    .join('\n');

  let appBody = appScript.replace(IMPORT_RE, '').trim();
  if (!appBody.includes(OOLONG_DEV_PATH)) {
    throw new Error(`v3/build.js: expected to find '${OOLONG_DEV_PATH}' in the app script to rewrite — path or count changed, update this script`);
  }
  appBody = appBody.split(OOLONG_DEV_PATH).join(OOLONG_SHIP_PATH);

  const finalScript = [
    'const __engine = {};',
    engineBundle,
    '',
    appDestructure,
    '',
    appBody,
  ].join('\n');

  // No type="module" on the output — this is WHY the build step exists.
  // A module script (even an inline one with no remaining imports) is
  // still refused by browsers over file://; a plain classic script is not.
  const outScriptTag = `<script>\n${finalScript}\n</script>`;
  let outHtml = appSrc.slice(0, scriptMatch.index) + outScriptTag + appSrc.slice(scriptMatch.index + scriptMatch[0].length);
  outHtml = GENERATED_HEADER + outHtml;

  fs.writeFileSync(OUT_PATH, outHtml);
  console.log(`Wrote ${path.relative(ROOT_DIR, OUT_PATH)} (${outHtml.length} bytes, ${order.length} engine modules: ${order.join(', ')})`);
}

main();
