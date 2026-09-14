import { describe, expect, it } from 'vitest';
import type { QuestionType } from '../../content/types';
import { createConceptMastery, recordAttempt } from '../mastery';
import { computeReadiness } from '../readiness';
import type { ConceptMastery, MockResult } from '../types';
import { concept, topic } from './factories';

const T0 = Date.UTC(2026, 0, 10);
const DAY = 86_400_000;

const topics = [topic('t1'), topic('t2'), topic('t3'), topic('t4'), topic('t5')];
const concepts = topics.map((t, i) => concept(`c${i + 1}`, t.id));

function strongRecord(conceptId: string, sessions = 3): ConceptMastery {
  let record = createConceptMastery(conceptId);
  const types: QuestionType[] = ['scenario', 'negative', 'application'];
  for (let i = 0; i < sessions; i++) {
    record = recordAttempt(record, {
      questionId: `${conceptId}-q${i}`,
      conceptId,
      questionType: types[i % types.length],
      correct: true,
      at: T0 - (sessions - i) * DAY,
      sessionId: `s${i}`,
      firstAttempt: true,
    });
  }
  return record;
}

function mock(score: number, at: number): MockResult {
  return {
    id: `m-${at}`,
    startedAt: at - 600_000,
    finishedAt: at,
    durationSeconds: 600,
    total: 25,
    score,
    passed: score >= 19,
    answers: [],
    byTopic: [],
    missedConceptIds: [],
  };
}

describe('readiness', () => {
  it('is Not Ready with no data at all', () => {
    const readiness = computeReadiness({ mocks: [], records: {}, topics, concepts, now: T0 });
    expect(readiness.label).toBe('Not Ready');
    expect(readiness.signals).toHaveLength(6);
    expect(readiness.blockers.length).toBeGreaterThan(0);
    expect(readiness.disclaimer).toContain('does not predict');
  });

  it('moves to Getting There once a mock has been taken', () => {
    const readiness = computeReadiness({
      mocks: [mock(12, T0 - DAY)],
      records: {},
      topics,
      concepts,
      now: T0,
    });
    expect(readiness.label).toBe('Getting There');
  });

  it('requires three mocks at 22+/25 for Strong', () => {
    const records = Object.fromEntries(concepts.map((c) => [c.id, strongRecord(c.id)]));
    const twoGood = computeReadiness({
      mocks: [mock(23, T0 - 3 * DAY), mock(24, T0 - 2 * DAY)],
      records,
      topics,
      concepts,
      now: T0,
    });
    expect(twoGood.label).not.toBe('Strong');
    expect(twoGood.blockers.some((b) => b.includes('mock exam'))).toBe(true);

    const threeGood = computeReadiness({
      mocks: [mock(23, T0 - 3 * DAY), mock(24, T0 - 2 * DAY), mock(22, T0 - DAY)],
      records,
      topics,
      concepts,
      now: T0,
    });
    expect(threeGood.label).toBe('Strong');
    expect(threeGood.blockers).toHaveLength(0);
  });

  it('does not reach Strong on mock scores alone when topics are weak', () => {
    const readiness = computeReadiness({
      mocks: [mock(23, T0 - 3 * DAY), mock(24, T0 - 2 * DAY), mock(25, T0 - DAY)],
      records: {},
      topics,
      concepts,
      now: T0,
    });
    expect(readiness.label).not.toBe('Strong');
    expect(readiness.signals.find((s) => s.id === 'weak-topics')?.met).toBe(false);
  });

  it('exposes a breakdown that explains the label', () => {
    const readiness = computeReadiness({
      mocks: [mock(20, T0 - DAY)],
      records: { c1: strongRecord('c1') },
      topics,
      concepts,
      now: T0,
    });
    const ids = readiness.signals.map((s) => s.id);
    expect(ids).toEqual([
      'mocks-at-target',
      'recent-average',
      'weak-topics',
      'first-attempt',
      'spread',
      'recovery',
    ]);
    for (const signal of readiness.signals) {
      expect(signal.detail.length).toBeGreaterThan(0);
      expect(signal.target.length).toBeGreaterThan(0);
    }
    expect(readiness.nextStep.length).toBeGreaterThan(0);
  });

  it('counts a formerly missed concept as recovered once it is back above 65%', () => {
    let record = createConceptMastery('c1');
    record = recordAttempt(record, {
      questionId: 'q1',
      conceptId: 'c1',
      questionType: 'direct',
      correct: false,
      at: T0 - 5 * DAY,
      sessionId: 's0',
      firstAttempt: true,
    });
    const beforeFix = computeReadiness({
      mocks: [],
      records: { c1: record },
      topics,
      concepts,
      now: T0,
    });
    expect(beforeFix.signals.find((s) => s.id === 'recovery')?.value).toBe(0);

    for (const [i, type] of (['scenario', 'negative', 'application'] as QuestionType[]).entries()) {
      record = recordAttempt(record, {
        questionId: 'q1',
        conceptId: 'c1',
        questionType: type,
        correct: true,
        at: T0 - (3 - i) * DAY,
        sessionId: `s${i + 1}`,
        firstAttempt: false,
      });
    }
    const afterFix = computeReadiness({
      mocks: [],
      records: { c1: record },
      topics,
      concepts,
      now: T0,
    });
    expect(afterFix.signals.find((s) => s.id === 'recovery')?.value).toBe(1);
  });
});
