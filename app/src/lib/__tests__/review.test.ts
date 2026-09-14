import { describe, expect, it } from 'vitest';
import { createConceptMastery, recordAttempt } from '../mastery';
import { createRng } from '../random';
import {
  buildPracticeQueue,
  emptySessionState,
  groupMissedByConcept,
  noteAnswered,
  rankTopicsByMastery,
  scoreQuestionPriority,
  selectNextQuestion,
} from '../review';
import type { ConceptMastery } from '../types';
import { concept, question, topic } from './factories';

const T0 = Date.UTC(2026, 0, 1);

function mastered(conceptId: string): ConceptMastery {
  let record = createConceptMastery(conceptId);
  for (const [i, type] of (['direct', 'scenario', 'negative'] as const).entries()) {
    record = recordAttempt(record, {
      questionId: `q${i}`,
      conceptId,
      questionType: type,
      correct: true,
      at: T0,
      sessionId: `s${i}`,
      firstAttempt: true,
    });
  }
  return record;
}

function missed(conceptId: string, questionId: string): ConceptMastery {
  return recordAttempt(createConceptMastery(conceptId), {
    questionId,
    conceptId,
    questionType: 'direct',
    correct: false,
    at: T0,
    sessionId: 's1',
    firstAttempt: true,
  });
}

describe('topic ranking', () => {
  it('ranks topics weakest first', () => {
    const topics = [topic('t-strong'), topic('t-weak'), topic('t-mid')];
    const concepts = [concept('c1', 't-strong'), concept('c2', 't-weak'), concept('c3', 't-mid')];
    let mid = createConceptMastery('c3');
    mid = recordAttempt(mid, {
      questionId: 'q',
      conceptId: 'c3',
      questionType: 'direct',
      correct: true,
      at: T0,
      sessionId: 's1',
      firstAttempt: true,
    });
    const records = { c1: mastered('c1'), c3: mid };
    const ranked = rankTopicsByMastery(topics, concepts, records, T0);
    expect(ranked.map((r) => r.topicId)).toEqual(['t-weak', 't-mid', 't-strong']);
    expect(ranked[0].masteryScore).toBe(0);
    expect(ranked[0].seenConcepts).toBe(0);
    expect(ranked[2].conceptCount).toBe(1);
  });
});

describe('next-question selection', () => {
  const pool = [
    question('q1', 't1', 'c1'),
    question('q2', 't1', 'c1'),
    question('q3', 't1', 'c2'),
    question('q4', 't2', 'c3'),
  ];

  it('never serves the same question twice in a row', () => {
    const state = noteAnswered(emptySessionState(), pool[0], false);
    const next = selectNextQuestion(pool, {}, state, createRng('seed'), T0);
    expect(next).not.toBeNull();
    expect(next?.id).not.toBe('q1');
  });

  it('re-tests a concept missed this session with a DIFFERENT question', () => {
    // c1 was missed on q1; q2 is another question on the same concept.
    const records = { c1: missed('c1', 'q1') };
    let state = noteAnswered(emptySessionState(), pool[0], false);
    // Answer something else so the "not just asked" guard does not exclude c1.
    state = noteAnswered(state, pool[3], true);
    const next = selectNextQuestion(pool, records, state, createRng('seed'), T0);
    expect(next?.conceptId).toBe('c1');
    expect(next?.id).toBe('q2');
  });

  it('prefers unseen concepts over mastered ones', () => {
    const records = { c1: mastered('c1') };
    const unseenScore = scoreQuestionPriority(pool[2], records, emptySessionState(), T0);
    const masteredScore = scoreQuestionPriority(pool[0], records, emptySessionState(), T0);
    expect(unseenScore).toBeGreaterThan(masteredScore);
  });

  it('returns null only when the pool is empty', () => {
    expect(selectNextQuestion([], {}, emptySessionState(), createRng('s'), T0)).toBeNull();
    expect(selectNextQuestion(pool, {}, emptySessionState(), createRng('s'), T0)).not.toBeNull();
  });

  it('builds a practice queue without immediate concept repeats', () => {
    const queue = buildPracticeQueue(pool, {}, createRng('seed'), 4, T0);
    expect(queue.length).toBeGreaterThan(1);
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].id).not.toBe(queue[i - 1].id);
      expect(queue[i].conceptId).not.toBe(queue[i - 1].conceptId);
    }
  });
});

describe('missed grouping', () => {
  it('groups missed questions by concept, weakest first', () => {
    const questions = [question('q1', 't1', 'c1'), question('q2', 't1', 'c2')];
    const concepts = [concept('c1', 't1'), concept('c2', 't1')];
    const records = { c1: missed('c1', 'q1'), c2: missed('c2', 'q2') };
    const groups = groupMissedByConcept(records, questions, concepts, T0);
    expect(groups).toHaveLength(2);
    expect(groups[0].questions[0].id).toBeDefined();
    expect(groups.every((g) => g.concept !== null)).toBe(true);
    expect(groups[0].masteryScore).toBeLessThanOrEqual(groups[1].masteryScore);
  });

  it('ignores concepts with no outstanding misses', () => {
    const questions = [question('q1', 't1', 'c1')];
    const concepts = [concept('c1', 't1')];
    expect(groupMissedByConcept({ c1: mastered('c1') }, questions, concepts, T0)).toEqual([]);
  });
});
