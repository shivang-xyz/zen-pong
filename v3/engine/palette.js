/* Paint-mode palette module — brief 11 task 1. Pure ES module, zero DOM,
   all randomness through the injected rng(). Selection over a curated
   library (PAINT-MODE.md §2), never arithmetic hue generation — every hex
   that can appear in a finished artwork is one Shivang chose; this module
   only decides which of them combine. */

export const HUE_LIBRARY = [
  { name: 'Crimson',    hex: '#D92D3C', hue: 350 },
  { name: 'Vermilion',  hex: '#E8452A', hue: 10 },
  { name: 'Orange',     hex: '#F07818', hue: 28 },
  { name: 'Amber',      hex: '#F5A623', hue: 40 },
  { name: 'Yellow',     hex: '#F5C518', hue: 48 },
  { name: 'Chartreuse', hex: '#A8C63C', hue: 75 },
  { name: 'Green',      hex: '#3FA65A', hue: 140 },
  { name: 'Teal',       hex: '#1F8A8C', hue: 182 },
  { name: 'Cyan-blue',  hex: '#2E9BD4', hue: 200 },
  { name: 'Blue',       hex: '#2B5FD9', hue: 225 },
  { name: 'Violet',     hex: '#5B3FC4', hue: 255 },
  { name: 'Magenta',    hex: '#C43C8E', hue: 320 },
];

export const GROUND_LIBRARY = [
  { name: 'Cream',         hex: '#F4EBD4' },
  { name: 'Warm white',    hex: '#FAF6EE' },
  { name: 'Pale lavender', hex: '#E6E8F2' },
  { name: 'Blush',         hex: '#F2DCDC' },
];

export const INK_HEX = '#16120E';

/* Index-offset triples, PAINT-MODE.md §2.5. `analogous` is widened from the
   doc's literal (0,1,3) to (0,2,4) — see MIN_ACCENT_DE below for why: (0,1,3)
   selects two adjacent library hues (offset 0 and 1, 30° apart) often enough
   that its own accent-separation floor would fail on 9 of 12 base indices.
   That's the scheme offsets being mis-specified, not the floor being wrong
   (per the brief's own diagnostic instruction) — (0,2,4) drops the adjacent
   pair, keeps the "close-harmony" character (all three hues still within a
   120° window), and clears the same floor every other scheme does. */
export const SCHEMES = {
  'analogous': [0, 2, 4],
  'split-complementary': [0, 5, 7],
  'triadic': [0, 4, 8],
  'complementary-minor': [0, 6, 2],
};

const WEIGHTS = [0.55, 0.30, 0.15]; // A dominant, B secondary, C minor

/* ── OKLab ΔE (Björn Ottosson's OKLab, standard sRGB matrices) ───────────
   Muddiness guard, not a legibility one — see MIN_GROUND_DE/MIN_ACCENT_DE
   below for why this has to be perceptual chroma+lightness distance, not
   WCAG relative luminance. ~30 lines, no dependency. */
function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToOklab(hex) {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16));
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16));
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16));

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

function oklabDeltaE(hexA, hexB) {
  const a = hexToOklab(hexA), b = hexToOklab(hexB);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}

/* Ground floor — dormant by design (brief 11, resolved 2026-07-20 by
   computing the full 12×4 hue/ground ΔE matrix). Yellow/Cream is the
   global minimum of that matrix at ΔE 0.1687 — and it's also the
   best-loved pairing in the reference set (PROJECT-LOG.md 2026-07-20).
   There is therefore no bad accent-vs-ground pairing in the current
   library; MIN_GROUND_DE sits just under that minimum so it rejects
   NOTHING today. It exists solely as a tripwire for a future low-chroma
   hue added to HUE_LIBRARY. Do not tune this upward to make it "do
   something," and do not special-case any combination to bypass it —
   carving out the best pairing to satisfy a guard is proof the guard is
   measuring the wrong relationship. */
const MIN_GROUND_DE = 0.16;

/* Accent-vs-accent floor — this is the guard that does real work. Two
   accents landing close together collapses the three-colour structure and
   makes the 0.55/0.30/0.15 weighting meaningless. Computed the pairwise
   worst-case ΔE for all 4 schemes × 12 base indices (48 combos) with
   analogous already widened to (0,2,4) above: values range 0.131–0.328,
   clustering 0.13–0.19. 0.15 rejects 4/48 (~8%, spread across three
   schemes, none dominant) — enough that the retry path in buildPalette
   actually exercises in normal use, not so much that it fights the scheme
   tables. PROVISIONAL — tune by eye once seen in the lab, same as every
   other number in PAINT-MODE.md. */
const MIN_ACCENT_DE = 0.15;

const MAX_ATTEMPTS = 12; // one per possible base index — never unbounded

function seededPermutation3(rng) {
  const idx = [0, 1, 2];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/* opts: { scheme, baseIndex, groundHex } — any omitted value is drawn from
   rng. Passing all three is fully deterministic (the only remaining rng
   consumption is the seeded A/B/C permutation and, on a guard failure, the
   deterministic retry cycle below — both driven by the same rng argument,
   so identical rng + identical opts always reproduces identically). */
export function buildPalette(rng, opts = {}) {
  const schemeNames = Object.keys(SCHEMES);
  const scheme = opts.scheme ?? schemeNames[Math.floor(rng() * schemeNames.length)];
  const groundHex = opts.groundHex ?? GROUND_LIBRARY[Math.floor(rng() * GROUND_LIBRARY.length)].hex;
  const offsets = SCHEMES[scheme];
  const initialBase = opts.baseIndex ?? Math.floor(rng() * 12);

  let best = null; // { score, baseIndex, accents }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const baseIndex = (initialBase + attempt) % 12;
    const hueIdxs = offsets.map(o => (baseIndex + o) % 12);
    const hues = hueIdxs.map(i => HUE_LIBRARY[i]);

    const order = seededPermutation3(rng); // A/B/C assignment, seeded not positional
    const accents = order.map((hueSlot, weightSlot) => ({
      hex: hues[hueSlot].hex,
      name: hues[hueSlot].name,
      weight: WEIGHTS[weightSlot],
    }));

    const groundDEs = accents.map(a => oklabDeltaE(a.hex, groundHex));
    const accentDEs = [
      oklabDeltaE(accents[0].hex, accents[1].hex),
      oklabDeltaE(accents[0].hex, accents[2].hex),
      oklabDeltaE(accents[1].hex, accents[2].hex),
    ];
    const worstGround = Math.min(...groundDEs);
    const worstAccent = Math.min(...accentDEs);
    const score = Math.min(worstGround / MIN_GROUND_DE, worstAccent / MIN_ACCENT_DE);

    if (worstGround >= MIN_GROUND_DE && worstAccent >= MIN_ACCENT_DE) {
      return { ground: groundHex, ink: INK_HEX, accents, scheme, baseIndex };
    }
    if (!best || score > best.score) {
      best = { score, baseIndex, accents };
    }
  }

  // Bounded attempts exhausted — fall back to the best worst-case seen.
  return { ground: groundHex, ink: INK_HEX, accents: best.accents, scheme, baseIndex: best.baseIndex };
}
