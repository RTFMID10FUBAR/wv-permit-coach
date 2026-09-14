import type { Concept, Question, Topic } from '../content/types';
import { aggregateMastery, bandFromScore, effectiveMastery } from './mastery';
import type { Rng } from './random';
import { shuffle } from './random';
import type { ConceptMastery, MasteryBand } from './types';

export interface TopicRanking {
  topicId: string;
  title: string;
  masteryScore: number;
  band: MasteryBand;
  conceptCount: number;
  seenConcepts: number;
  missedQuestionCount: number;
}

export function rankTopicsByMastery(
  topics: readonly Topic[],
  concepts: readonly Concept[],
  records: Record<string, ConceptMastery>,
  now: number = Date.now(),
): TopicRanking[] {
  return topics
    .map((topic) => {
      const topicConcepts = concepts.filter((c) => c.topicId === topic.id);
      const ids = topicConcepts.map((c) => c.id);
      const score = aggregateMastery(ids, records, now);
      return {
        topicId: topic.id,
        title: topic.title,
        masteryScore: score,
        band: bandFromScore(score),
        conceptCount: ids.length,
        seenConcepts: ids.filter((id) => records[id] && records[id].attempts > 0).length,
        missedQuestionCount: ids.reduce(
          (acc, id) => acc + (records[id]?.missedQuestionIds.length ?? 0),
          0,
        ),
      };
    })
    .sort((a, b) =>
      a.masteryScore === b.masteryScore
        ? a.topicId.localeCompare(b.topicId)
        : a.masteryScore - b.masteryScore,
    );
}

export interface SessionReviewState {
  /** Questions already served this session. */
  askedQuestionIds: string[];
  /** Concepts the learner got wrong this session — these must come back, differently. */
  missedConceptIds: string[];
  /** The concept just answered; never immediately re-served. */
  lastConceptId: string | null;
  lastQuestionId: string | null;
}

export function emptySessionState(): SessionReviewState {
  return {
    askedQuestionIds: [],
    missedConceptIds: [],
    lastConceptId: null,
    lastQuestionId: null,
  };
}

export function noteAnswered(
  state: SessionReviewState,
  question: Question,
  correct: boolean,
): SessionReviewState {
  const missed = correct
    ? state.missedConceptIds.filter((id) => id !== question.conceptId)
    : state.missedConceptIds.includes(question.conceptId)
      ? state.missedConceptIds
      : [...state.missedConceptIds, question.conceptId];
  return {
    askedQuestionIds: state.askedQuestionIds.includes(question.id)
      ? state.askedQuestionIds
      : [...state.askedQuestionIds, question.id],
    missedConceptIds: missed,
    lastConceptId: question.conceptId,
    lastQuestionId: question.id,
  };
}

const PRIORITY = {
  missedThisSession: 100,
  outstandingMiss: 70,
  unseen: 55,
  weakBand: 45,
  learningBand: 25,
  almostBand: 8,
  mastered: 1,
  alreadyAskedPenalty: -80,
} as const;

export function scoreQuestionPriority(
  question: Question,
  records: Record<string, ConceptMastery>,
  state: SessionReviewState,
  now: number = Date.now(),
): number {
  const record = records[question.conceptId];
  let score = 0;
  if (state.missedConceptIds.includes(question.conceptId)) score += PRIORITY.missedThisSession;
  if (!record || record.attempts === 0) {
    score += PRIORITY.unseen;
  } else {
    if (record.missedQuestionIds.length > 0) score += PRIORITY.outstandingMiss;
    const mastery = effectiveMastery(record, now);
    const band = bandFromScore(mastery);
    if (band === 'NEEDS_STUDY') score += PRIORITY.weakBand;
    else if (band === 'LEARNING') score += PRIORITY.learningBand;
    else if (band === 'ALMOST_READY') score += PRIORITY.almostBand;
    else score += PRIORITY.mastered;
  }
  if (state.askedQuestionIds.includes(question.id)) score += PRIORITY.alreadyAskedPenalty;
  return score;
}

/**
 * Next question for a practice session. Re-tests a missed concept with a DIFFERENT
 * question and never serves the same concept twice in a row while alternatives exist.
 */
export function selectNextQuestion(
  pool: readonly Question[],
  records: Record<string, ConceptMastery>,
  state: SessionReviewState,
  rng: Rng,
  now: number = Date.now(),
): Question | null {
  if (pool.length === 0) return null;

  const notJustAsked = pool.filter(
    (q) => q.id !== state.lastQuestionId && q.conceptId !== state.lastConceptId,
  );
  const notSameQuestion = pool.filter((q) => q.id !== state.lastQuestionId);

  const tiers = [
    notJustAsked.filter((q) => !state.askedQuestionIds.includes(q.id)),
    notSameQuestion.filter((q) => !state.askedQuestionIds.includes(q.id)),
    notJustAsked,
    notSameQuestion,
    pool.slice(),
  ];

  for (const tier of tiers) {
    if (tier.length === 0) continue;
    const shuffled = shuffle(tier, rng);
    let best = shuffled[0];
    let bestScore = scoreQuestionPriority(best, records, state, now);
    for (const candidate of shuffled.slice(1)) {
      const score = scoreQuestionPriority(candidate, records, state, now);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }
  return null;
}

/** Ordered practice queue for one topic — weakest concepts first, no immediate repeats. */
export function buildPracticeQueue(
  pool: readonly Question[],
  records: Record<string, ConceptMastery>,
  rng: Rng,
  limit: number,
  now: number = Date.now(),
): Question[] {
  const queue: Question[] = [];
  let state = emptySessionState();
  for (let i = 0; i < limit; i++) {
    const next = selectNextQuestion(pool, records, state, rng, now);
    if (!next) break;
    if (state.askedQuestionIds.includes(next.id) && queue.length >= pool.length) break;
    queue.push(next);
    state = noteAnswered(state, next, true);
  }
  return queue;
}

export interface MissedGroup {
  conceptId: string;
  concept: Concept | null;
  topicId: string;
  questions: Question[];
  masteryScore: number;
  band: MasteryBand;
}

export function groupMissedByConcept(
  records: Record<string, ConceptMastery>,
  questions: readonly Question[],
  concepts: readonly Concept[],
  now: number = Date.now(),
): MissedGroup[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const groups: MissedGroup[] = [];
  for (const record of Object.values(records)) {
    if (record.missedQuestionIds.length === 0) continue;
    const missed = record.missedQuestionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => Boolean(q));
    if (missed.length === 0) continue;
    const concept = conceptById.get(record.conceptId) ?? null;
    const score = effectiveMastery(record, now);
    groups.push({
      conceptId: record.conceptId,
      concept,
      topicId: concept?.topicId ?? missed[0].topicId,
      questions: missed,
      masteryScore: score,
      band: bandFromScore(score),
    });
  }
  return groups.sort((a, b) => a.masteryScore - b.masteryScore);
}
