// Seeded PRNG — mulberry32 algorithm
// Returns deterministic pseudo-random values in [0, 1)

export function createRNG(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randomChoice(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

export function randomFloat(rng, min, max) {
  return rng() * (max - min) + min;
}

export function shuffle(rng, array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
