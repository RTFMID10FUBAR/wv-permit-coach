import type { QuestionType } from '../content/types';
import type { AttemptEvent, ConceptMastery, MasteryBand } from './types';

export const BAND_THRESHOLDS = {
  LEARNING: 0.4,
  ALMOST_READY: 0.65,
  MASTERED: 0.85,
} as const;

/** MASTERED is a conjunctive gate, not a score alone. */
export const MASTERY_GATE = {
  minCorrect: 3,
  minDistinctSessions: 2,
  requiresNonDirectCorrect: true,
} as const;

/** Applying a rule is worth more evidence than reciting it. */
const TYPE_WEIGHT: Record<QuestionType, number> = {
  direct: 1,
  sign: 1.1,
  reversed: 1.25,
  negative: 1.4,
  scenario: 1.5,
  application: 1.6,
};

const RECENCY_DECAY = 0.9; // per attempt back in time
const RECOVERY_BONUS = 1.3; // getting right what you previously got wrong
const PRIOR_WEIGHT = 0.9; // pseudo-evidence so one lucky answer proves little
const PRIOR_MEAN = 0.35;
const HISTORY_CAP = 40;

const AGE_GRACE_DAYS = 7;
const AGE_DECAY_PER_DAY = 0.0015;
const MAX_AGE_DECAY = 0.25;
const DAY_MS = 86_400_000;

export function createConceptMastery(conceptId: string): ConceptMastery {
  return {
    conceptId,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    lastSeen: null,
    lastCorrect: null,
    currentStreak: 0,
    masteryScore: 0,
    missedQuestionIds: [],
    correctSessionIds: [],
    correctTypes: [],
    firstAttemptTotal: 0,
    firstAttemptCorrect: 0,
    everMissed: false,
    history: [],
  };
}

/** Weighted, recency-tilted, prior-damped accuracy. Ignores age; see effectiveMastery. */
export function rawMasteryScore(record: ConceptMastery): number {
  if (record.history.length === 0) return 0;
  const recent = record.history.slice(-HISTORY_CAP);
  let weighted = 0;
  let total = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const stepsBack = recent.length - 1 - i;
    const entry = recent[i];
    const weight =
      TYPE_WEIGHT[entry.type] *
      Math.pow(RECENCY_DECAY, stepsBack) *
      (entry.correct && entry.recovery ? RECOVERY_BONUS : 1);
    total += weight;
    if (entry.correct) weighted += weight;
  }
  if (total === 0) return 0;
  return (weighted + PRIOR_WEIGHT * PRIOR_MEAN) / (total + PRIOR_WEIGHT);
}

/**
 * Age decay: knowledge fades, but age alone must never drag an earned score down
 * into NEEDS_STUDY — only wrong answers can do that.
 */
export function effectiveMastery(record: ConceptMastery, now: number = Date.now()): number {
  const base = record.masteryScore;
  if (base < BAND_THRESHOLDS.LEARNING) return base;
  const anchor = record.lastCorrect ?? record.lastSeen;
  if (anchor === null) return base;
  const days = Math.max(0, (now - anchor) / DAY_MS - AGE_GRACE_DAYS);
  if (days <= 0) return base;
  const decay = Math.min(MAX_AGE_DECAY, days * AGE_DECAY_PER_DAY);
  return Math.max(BAND_THRESHOLDS.LEARNING, base - decay);
}

export function meetsMasteryGate(record: ConceptMastery): boolean {
  if (record.correct < MASTERY_GATE.minCorrect) return false;
  if (new Set(record.correctSessionIds).size < MASTERY_GATE.minDistinctSessions) return false;
  if (MASTERY_GATE.requiresNonDirectCorrect && !record.correctTypes.some((t) => t !== 'direct')) {
    return false;
  }
  return true;
}

export function classifyMastery(record: ConceptMastery, now: number = Date.now()): MasteryBand {
  const score = effectiveMastery(record, now);
  if (score >= BAND_THRESHOLDS.MASTERED) {
    return meetsMasteryGate(record) ? 'MASTERED' : 'ALMOST_READY';
  }
  if (score >= BAND_THRESHOLDS.ALMOST_READY) return 'ALMOST_READY';
  if (score >= BAND_THRESHOLDS.LEARNING) return 'LEARNING';
  return 'NEEDS_STUDY';
}

export function canMarkMastered(record: ConceptMastery, now: number = Date.now()): boolean {
  return classifyMastery(record, now) === 'MASTERED';
}

/** Why "Mark mastered" is still locked, in the learner's words. */
export function masteryGateReasons(record: ConceptMastery, now: number = Date.now()): string[] {
  const reasons: string[] = [];
  if (effectiveMastery(record, now) < BAND_THRESHOLDS.MASTERED) {
    reasons.push('Mastery score is still below 85%.');
  }
  if (record.correct < MASTERY_GATE.minCorrect) {
    reasons.push(`Answer correctly ${MASTERY_GATE.minCorrect - record.correct} more time(s).`);
  }
  const sessions = new Set(record.correctSessionIds).size;
  if (sessions < MASTERY_GATE.minDistinctSessions) {
    reasons.push('Get it right again in a later study session, not just this one.');
  }
  if (!record.correctTypes.some((t) => t !== 'direct')) {
    reasons.push('Answer a scenario or applied question about this rule correctly.');
  }
  return reasons;
}

export function recordAttempt(record: ConceptMastery, attempt: AttemptEvent): ConceptMastery {
  const recovery = attempt.correct && record.missedQuestionIds.length > 0;
  const history = [...record.history, {
    correct: attempt.correct,
    at: attempt.at,
    type: attempt.questionType,
    recovery,
  }].slice(-HISTORY_CAP);

  const missedQuestionIds = attempt.correct
    ? record.missedQuestionIds.filter((id) => id !== attempt.questionId)
    : record.missedQuestionIds.includes(attempt.questionId)
      ? record.missedQuestionIds
      : [...record.missedQuestionIds, attempt.questionId];

  const next: ConceptMastery = {
    ...record,
    attempts: record.attempts + 1,
    correct: record.correct + (attempt.correct ? 1 : 0),
    incorrect: record.incorrect + (attempt.correct ? 0 : 1),
    lastSeen: attempt.at,
    lastCorrect: attempt.correct ? attempt.at : record.lastCorrect,
    currentStreak: attempt.correct ? record.currentStreak + 1 : 0,
    missedQuestionIds,
    correctSessionIds: attempt.correct && !record.correctSessionIds.includes(attempt.sessionId)
      ? [...record.correctSessionIds, attempt.sessionId]
      : record.correctSessionIds,
    correctTypes: attempt.correct && !record.correctTypes.includes(attempt.questionType)
      ? [...record.correctTypes, attempt.questionType]
      : record.correctTypes,
    firstAttemptTotal: record.firstAttemptTotal + (attempt.firstAttempt ? 1 : 0),
    firstAttemptCorrect:
      record.firstAttemptCorrect + (attempt.firstAttempt && attempt.correct ? 1 : 0),
    everMissed: record.everMissed || !attempt.correct,
    history,
    masteryScore: 0,
  };
  next.masteryScore = rawMasteryScore(next);
  return next;
}

export function getRecord(
  records: Record<string, ConceptMastery>,
  conceptId: string,
): ConceptMastery {
  return records[conceptId] ?? createConceptMastery(conceptId);
}

/** Mean effective mastery across a set of concepts; unseen concepts count as 0. */
export function aggregateMastery(
  conceptIds: string[],
  records: Record<string, ConceptMastery>,
  now: number = Date.now(),
): number {
  if (conceptIds.length === 0) return 0;
  const sum = conceptIds.reduce(
    (acc, id) => acc + (records[id] ? effectiveMastery(records[id], now) : 0),
    0,
  );
  return sum / conceptIds.length;
}

export function bandLabel(band: MasteryBand): string {
  switch (band) {
    case 'NEEDS_STUDY':
      return 'Needs study';
    case 'LEARNING':
      return 'Learning';
    case 'ALMOST_READY':
      return 'Almost ready';
    case 'MASTERED':
      return 'Mastered';
  }
}

export function bandFromScore(score: number): MasteryBand {
  if (score >= BAND_THRESHOLDS.MASTERED) return 'MASTERED';
  if (score >= BAND_THRESHOLDS.ALMOST_READY) return 'ALMOST_READY';
  if (score >= BAND_THRESHOLDS.LEARNING) return 'LEARNING';
  return 'NEEDS_STUDY';
}

export function firstAttemptAccuracy(records: Record<string, ConceptMastery>): number {
  let total = 0;
  let correct = 0;
  for (const record of Object.values(records)) {
    total += record.firstAttemptTotal;
    correct += record.firstAttemptCorrect;
  }
  return total === 0 ? 0 : correct / total;
}
