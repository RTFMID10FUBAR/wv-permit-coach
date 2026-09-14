import type { SignSpec } from '../content/types';
import type { Rng } from './random';
import { shuffle } from './random';

export type SignDrillMode = 'sign-to-meaning' | 'meaning-to-sign' | 'scenario-to-sign';

export const SIGN_DRILL_MODES: SignDrillMode[] = [
  'sign-to-meaning',
  'meaning-to-sign',
  'scenario-to-sign',
];

export const SIGN_MODE_LABEL: Record<SignDrillMode, string> = {
  'sign-to-meaning': 'Sign → meaning',
  'meaning-to-sign': 'Meaning → sign',
  'scenario-to-sign': 'Situation → sign',
};

export interface SignDrill {
  mode: SignDrillMode;
  answer: SignSpec;
  prompt: string;
  /** Text options for sign→meaning; sign options for the other two modes. */
  textOptions: string[] | null;
  signOptions: SignSpec[] | null;
  correctIndex: number;
}

function distractors(signs: readonly SignSpec[], answer: SignSpec, rng: Rng, count: number): SignSpec[] {
  const sameCategory = signs.filter((s) => s.key !== answer.key && s.category === answer.category);
  const others = signs.filter((s) => s.key !== answer.key && s.category !== answer.category);
  const picked = [...shuffle(sameCategory, rng), ...shuffle(others, rng)];
  const unique: SignSpec[] = [];
  const seenMeanings = new Set([answer.meaning]);
  for (const candidate of picked) {
    if (unique.length >= count) break;
    if (seenMeanings.has(candidate.meaning)) continue;
    seenMeanings.add(candidate.meaning);
    unique.push(candidate);
  }
  return unique;
}

export function buildSignDrill(
  signs: readonly SignSpec[],
  mode: SignDrillMode,
  rng: Rng,
  optionCount = 4,
  preferredKey?: string,
): SignDrill | null {
  if (signs.length < 2) return null;
  const answer =
    (preferredKey ? signs.find((s) => s.key === preferredKey) : undefined) ??
    shuffle(signs, rng)[0];
  const wrong = distractors(signs, answer, rng, Math.max(1, optionCount - 1));
  if (wrong.length === 0) return null;
  const options = shuffle([answer, ...wrong], rng);
  const correctIndex = options.findIndex((s) => s.key === answer.key);

  if (mode === 'sign-to-meaning') {
    return {
      mode,
      answer,
      prompt: 'What does this sign mean?',
      textOptions: options.map((s) => s.meaning),
      signOptions: null,
      correctIndex,
    };
  }
  if (mode === 'meaning-to-sign') {
    return {
      mode,
      answer,
      prompt: `Which sign means: ${answer.meaning}`,
      textOptions: null,
      signOptions: options,
      correctIndex,
    };
  }
  return {
    mode,
    answer,
    prompt: `You are driving and the rule that applies is: “${answer.action}” Which sign is telling you that?`,
    textOptions: null,
    signOptions: options,
    correctIndex,
  };
}
