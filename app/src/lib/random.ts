export interface Rng {
  next(): number;
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic. Seeded per session so a reload reshuffles. */
export function createRng(seed: number | string): Rng {
  let a = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PresentedChoice {
  text: string;
  originalIndex: number;
}

/**
 * Reorders choices only. Choice TEXT is passed through untouched — numbers, distances
 * and legal thresholds are never rewritten by presentation.
 */
export function presentChoices(
  choices: readonly string[],
  correctAnswer: number,
  rng: Rng,
): { choices: PresentedChoice[]; correctIndex: number } {
  const indexed = choices.map((text, originalIndex) => ({ text, originalIndex }));
  const shuffled = shuffle(indexed, rng);
  return {
    choices: shuffled,
    correctIndex: shuffled.findIndex((c) => c.originalIndex === correctAnswer),
  };
}
