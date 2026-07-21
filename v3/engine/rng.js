/* Seedable PRNG — mulberry32. Same seed → identical rng() sequence. */

export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* weightedPick(rng, items) — items: [{ value, weight }]. Returns one value,
   probability proportional to weight. Brief 13: splatter colour and patch
   colour both need this. */
export function weightedPick(rng, items) {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

/* weightedSampleWithoutReplacement(rng, items, count) — items: [{ value,
   weight }]. Draws up to `count` distinct values, each draw weighted by the
   remaining pool's weights (higher weight, higher probability, but never a
   deterministic top-N — brief 13 task 1's explicit requirement, so two
   rallies with a similar density field don't always produce the same
   splatter structure). */
export function weightedSampleWithoutReplacement(rng, items, count) {
  const pool = items.slice();
  const chosen = [];
  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((s, it) => s + it.weight, 0);
    if (total <= 0) break;
    let r = rng() * total, idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    chosen.push(pool[idx].value);
    pool.splice(idx, 1);
  }
  return chosen;
}
