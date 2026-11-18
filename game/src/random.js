// Seeded randomness (mulberry32): the same seed builds the same city, traffic and
// pedestrians, which is what makes the screenshot scenes repeatable. Live games
// seed from the clock; ?shot= scenes seed from the URL.
export function createRandom(seed) {
  let a = seed | 0;
  function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Integer in [min, max), float in [min, max), one of a list, a coin flip.
  next.int = (min, max) => min + Math.floor(next() * (max - min));
  next.range = (min, max) => min + next() * (max - min);
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  return next;
}
