import { describe, expect, it } from 'vitest';
import type { QuestionType } from '../../content/types';
import {
  BAND_THRESHOLDS,
  aggregateMastery,
  canMarkMastered,
  classifyMastery,
  createConceptMastery,
  effectiveMastery,
  firstAttemptAccuracy,
  masteryGateReasons,
  meetsMasteryGate,
  recordAttempt,
} from '../mastery';
import type { ConceptMastery } from '../types';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

function answer(
  record: ConceptMastery,
  opts: {
    correct: boolean;
    at?: number;
    session?: string;
    type?: QuestionType;
    questionId?: string;
    firstAttempt?: boolean;
  },
): ConceptMastery {
  return recordAttempt(record, {
    questionId: opts.questionId ?? `q-${record.attempts + 1}`,
    conceptId: record.conceptId,
    questionType: opts.type ?? 'direct',
    correct: opts.correct,
    at: opts.at ?? T0,
    sessionId: opts.session ?? 'session-1',
    firstAttempt: opts.firstAttempt ?? true,
  });
}

describe('mastery engine', () => {
  it('starts every concept at zero with no history', () => {
    const record = createConceptMastery('c1');
    expect(record.masteryScore).toBe(0);
    expect(classifyMastery(record, T0)).toBe('NEEDS_STUDY');
    expect(meetsMasteryGate(record)).toBe(false);
  });

  it('CANNOT reach MASTERED from one lucky correct answer', () => {
    const record = answer(createConceptMastery('c1'), { correct: true, type: 'direct' });
    expect(record.correct).toBe(1);
    expect(effectiveMastery(record, T0)).toBeLessThan(BAND_THRESHOLDS.MASTERED);
    expect(classifyMastery(record, T0)).not.toBe('MASTERED');
    expect(canMarkMastered(record, T0)).toBe(false);
    expect(meetsMasteryGate(record)).toBe(false);
  });

  it('cannot reach MASTERED from three correct answers in ONE session', () => {
    let record = createConceptMastery('c1');
    record = answer(record, { correct: true, type: 'direct', session: 's1' });
    record = answer(record, { correct: true, type: 'scenario', session: 's1' });
    record = answer(record, { correct: true, type: 'negative', session: 's1' });
    expect(record.correct).toBe(3);
    expect(meetsMasteryGate(record)).toBe(false);
    expect(classifyMastery(record, T0)).not.toBe('MASTERED');
  });

  it('cannot reach MASTERED on repeated direct recall alone', () => {
    let record = createConceptMastery('c1');
    record = answer(record, { correct: true, type: 'direct', session: 's1' });
    record = answer(record, { correct: true, type: 'direct', session: 's2' });
    record = answer(record, { correct: true, type: 'direct', session: 's3' });
    record = answer(record, { correct: true, type: 'direct', session: 's4' });
    expect(record.correct).toBe(4);
    expect(meetsMasteryGate(record)).toBe(false);
    expect(masteryGateReasons(record, T0)).toContain(
      'Answer a scenario or applied question about this rule correctly.',
    );
  });

  it('reaches MASTERED with 3+ correct, 2+ sessions and an applied question', () => {
    let record = createConceptMastery('c1');
    record = answer(record, { correct: true, type: 'direct', session: 's1', at: T0 });
    record = answer(record, { correct: true, type: 'scenario', session: 's2', at: T0 + DAY });
    record = answer(record, { correct: true, type: 'negative', session: 's2', at: T0 + DAY });
    expect(meetsMasteryGate(record)).toBe(true);
    expect(effectiveMastery(record, T0 + DAY)).toBeGreaterThanOrEqual(BAND_THRESHOLDS.MASTERED);
    expect(classifyMastery(record, T0 + DAY)).toBe('MASTERED');
  });

  it('weights applied question types above repeated direct recall', () => {
    let direct = createConceptMastery('c1');
    let applied = createConceptMastery('c2');
    for (const session of ['s1', 's2', 's3']) {
      direct = answer(direct, { correct: true, type: 'direct', session });
      applied = answer(applied, { correct: true, type: 'application', session });
    }
    expect(applied.masteryScore).toBeGreaterThan(direct.masteryScore);
  });

  it('weights recent answers more than old ones', () => {
    let improving = createConceptMastery('c1');
    improving = answer(improving, { correct: false, at: T0 });
    improving = answer(improving, { correct: false, at: T0 + DAY });
    improving = answer(improving, { correct: true, at: T0 + 2 * DAY });
    improving = answer(improving, { correct: true, at: T0 + 3 * DAY });

    let declining = createConceptMastery('c2');
    declining = answer(declining, { correct: true, at: T0 });
    declining = answer(declining, { correct: true, at: T0 + DAY });
    declining = answer(declining, { correct: false, at: T0 + 2 * DAY });
    declining = answer(declining, { correct: false, at: T0 + 3 * DAY });

    expect(improving.masteryScore).toBeGreaterThan(declining.masteryScore);
  });

  it('gives extra credit for correcting a previously missed concept', () => {
    let recovered = createConceptMastery('c1');
    recovered = answer(recovered, { correct: false, questionId: 'q1' });
    recovered = answer(recovered, { correct: true, questionId: 'q2' });

    let plain = createConceptMastery('c2');
    plain = answer(plain, { correct: false, questionId: 'q1' });
    // Same shape of history, but the miss is cleared first so the second answer is not a recovery.
    plain.missedQuestionIds = [];
    plain = answer(plain, { correct: true, questionId: 'q2' });

    expect(recovered.masteryScore).toBeGreaterThan(plain.masteryScore);
  });

  it('clears a missed question once the concept is answered correctly', () => {
    let record = createConceptMastery('c1');
    record = answer(record, { correct: false, questionId: 'q1' });
    expect(record.missedQuestionIds).toEqual(['q1']);
    record = answer(record, { correct: true, questionId: 'q1' });
    expect(record.missedQuestionIds).toEqual([]);
    expect(record.everMissed).toBe(true);
  });

  it('decays slowly with time since the last correct answer', () => {
    let record = createConceptMastery('c1');
    record = answer(record, { correct: true, type: 'scenario', session: 's1', at: T0 });
    record = answer(record, { correct: true, type: 'negative', session: 's2', at: T0 });
    record = answer(record, { correct: true, type: 'application', session: 's3', at: T0 });
    const fresh = effectiveMastery(record, T0);
    const later = effectiveMastery(record, T0 + 90 * DAY);
    expect(later).toBeLessThan(fresh);
    expect(later).toBeGreaterThan(fresh - 0.3);
  });

  it('never lets age alone push a concept below NEEDS_STUDY', () => {
    let record = createConceptMastery('c1');
    record = answer(record, { correct: true, type: 'scenario', session: 's1', at: T0 });
    record = answer(record, { correct: true, type: 'negative', session: 's2', at: T0 });
    const decayed = effectiveMastery(record, T0 + 50 * 365 * DAY);
    expect(decayed).toBeGreaterThanOrEqual(BAND_THRESHOLDS.LEARNING);
    expect(classifyMastery(record, T0 + 50 * 365 * DAY)).not.toBe('NEEDS_STUDY');
  });

  it('classifies bands at the documented thresholds', () => {
    const record = createConceptMastery('c1');
    expect(classifyMastery({ ...record, masteryScore: 0.39 }, T0)).toBe('NEEDS_STUDY');
    expect(classifyMastery({ ...record, masteryScore: 0.4 }, T0)).toBe('LEARNING');
    expect(classifyMastery({ ...record, masteryScore: 0.64 }, T0)).toBe('LEARNING');
    expect(classifyMastery({ ...record, masteryScore: 0.65 }, T0)).toBe('ALMOST_READY');
    // High score without the gate stops at ALMOST_READY.
    expect(classifyMastery({ ...record, masteryScore: 0.95 }, T0)).toBe('ALMOST_READY');
  });

  it('aggregates unseen concepts as zero', () => {
    const seen = answer(createConceptMastery('c1'), { correct: true });
    const records = { c1: seen };
    expect(aggregateMastery(['c1'], records, T0)).toBeCloseTo(effectiveMastery(seen, T0), 6);
    expect(aggregateMastery(['c1', 'c2'], records, T0)).toBeCloseTo(
      effectiveMastery(seen, T0) / 2,
      6,
    );
    expect(aggregateMastery([], records, T0)).toBe(0);
  });

  it('tracks first-attempt accuracy separately from repeats', () => {
    let record = createConceptMastery('c1');
    record = answer(record, { correct: false, questionId: 'q1', firstAttempt: true });
    record = answer(record, { correct: true, questionId: 'q1', firstAttempt: false });
    record = answer(record, { correct: true, questionId: 'q2', firstAttempt: true });
    expect(record.firstAttemptTotal).toBe(2);
    expect(record.firstAttemptCorrect).toBe(1);
    expect(firstAttemptAccuracy({ c1: record })).toBeCloseTo(0.5, 6);
  });

  it('resets the streak on a wrong answer', () => {
    let record = createConceptMastery('c1');
    record = answer(record, { correct: true });
    record = answer(record, { correct: true });
    expect(record.currentStreak).toBe(2);
    record = answer(record, { correct: false });
    expect(record.currentStreak).toBe(0);
  });
});
