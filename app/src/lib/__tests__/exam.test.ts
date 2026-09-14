import { describe, expect, it } from 'vitest';
import { MOCK_PASS_MARK, MOCK_SIZE, buildMockExam, scoreMock } from '../exam';
import { createRng, presentChoices } from '../random';
import { question, topic } from './factories';

function bank(topicId: string, count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) =>
    question(`${topicId}-q${i + offset}`, topicId, `${topicId}-c${i + offset}`),
  );
}

describe('mock exam balancer', () => {
  const topics = [topic('t1', 2, 1), topic('t2', 1, 2), topic('t3', 1, 3), topic('t4', 1, 4)];
  const questions = [...bank('t1', 30), ...bank('t2', 30), ...bank('t3', 30), ...bank('t4', 30)];

  it('builds exactly 25 questions when supply allows', () => {
    const plan = buildMockExam(questions, topics, createRng('seed-1'));
    expect(plan.questions).toHaveLength(MOCK_SIZE);
    expect(plan.shortfall).toBe(0);
  });

  it('never draws all 25 from one topic', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const plan = buildMockExam(questions, topics, createRng(seed));
      const counts = new Map<string, number>();
      for (const q of plan.questions) counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(Math.floor(MOCK_SIZE * 0.4));
      expect(counts.size).toBe(4);
    }
  });

  it('gives a double-weighted topic more questions than a normal one', () => {
    const plan = buildMockExam(questions, topics, createRng('weights'));
    const counts = new Map<string, number>();
    for (const q of plan.questions) counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
    expect(counts.get('t1') ?? 0).toBeGreaterThan(counts.get('t2') ?? 0);
  });

  it('never repeats a question inside one exam', () => {
    const plan = buildMockExam(questions, topics, createRng('unique'));
    expect(new Set(plan.questions.map((q) => q.id)).size).toBe(plan.questions.length);
  });

  it('handles a thin bank without crashing and reports the shortfall', () => {
    const thin = [...bank('t1', 3), ...bank('t2', 2)];
    const plan = buildMockExam(thin, topics, createRng('thin'));
    expect(plan.questions).toHaveLength(5);
    expect(plan.shortfall).toBe(20);
  });

  it('still balances when a topic has no questions at all', () => {
    const partial = [...bank('t1', 20), ...bank('t3', 20)];
    const plan = buildMockExam(partial, topics, createRng('partial'));
    expect(plan.questions).toHaveLength(MOCK_SIZE);
    expect(new Set(plan.questions.map((q) => q.topicId))).toEqual(new Set(['t1', 't3']));
  });

  it('spreads across concepts before reusing one', () => {
    const plan = buildMockExam(questions, topics, createRng('concepts'));
    expect(new Set(plan.questions.map((q) => q.conceptId)).size).toBe(plan.questions.length);
  });
});

describe('mock scoring', () => {
  const exam = [...bank('t1', 2), ...bank('t2', 2)];

  it('counts unanswered questions as incorrect', () => {
    const result = scoreMock(exam, { [exam[0].id]: 0 }, {
      id: 'm1',
      startedAt: 0,
      finishedAt: 60_000,
    });
    expect(result.score).toBe(1);
    expect(result.total).toBe(4);
    expect(result.answers.filter((a) => a.chosenIndex === null)).toHaveLength(3);
    expect(result.durationSeconds).toBe(60);
  });

  it('marks a pass at the pass mark and not below it', () => {
    const big = bank('t1', 25);
    const allCorrect = Object.fromEntries(big.map((q) => [q.id, q.correctAnswer]));
    const justPassing = Object.fromEntries(
      big.map((q, i) => [q.id, i < MOCK_PASS_MARK ? q.correctAnswer : 3]),
    );
    const justFailing = Object.fromEntries(
      big.map((q, i) => [q.id, i < MOCK_PASS_MARK - 1 ? q.correctAnswer : 3]),
    );
    const meta = { id: 'm', startedAt: 0, finishedAt: 0 };
    expect(scoreMock(big, allCorrect, meta).passed).toBe(true);
    expect(scoreMock(big, justPassing, meta).score).toBe(MOCK_PASS_MARK);
    expect(scoreMock(big, justPassing, meta).passed).toBe(true);
    expect(scoreMock(big, justFailing, meta).passed).toBe(false);
  });

  it('reports a per-topic breakdown and the missed concepts', () => {
    const result = scoreMock(exam, { [exam[0].id]: 0, [exam[2].id]: 0 }, {
      id: 'm2',
      startedAt: 0,
      finishedAt: 0,
    });
    const byTopic = Object.fromEntries(result.byTopic.map((r) => [r.topicId, r]));
    expect(byTopic.t1).toEqual({ topicId: 't1', asked: 2, correct: 1 });
    expect(byTopic.t2).toEqual({ topicId: 't2', asked: 2, correct: 1 });
    expect(result.missedConceptIds).toHaveLength(2);
  });
});

describe('answer shuffling', () => {
  it('reorders choices without ever rewriting their text', () => {
    const q = question('q1', 't1', 'c1', {
      choices: ['25 feet', '50 feet', '100 feet', '500 feet'],
      correctAnswer: 2,
    });
    const presented = presentChoices(q.choices, q.correctAnswer, createRng('shuffle-seed'));
    expect(presented.choices.map((c) => c.text).sort()).toEqual([...q.choices].sort());
    expect(presented.choices[presented.correctIndex].text).toBe('100 feet');
    for (const choice of presented.choices) {
      expect(choice.text).toBe(q.choices[choice.originalIndex]);
    }
  });

  it('is deterministic for the same seed and different across seeds', () => {
    const choices = ['a', 'b', 'c', 'd', 'e', 'f'];
    const one = presentChoices(choices, 0, createRng('seed-x')).choices.map((c) => c.originalIndex);
    const two = presentChoices(choices, 0, createRng('seed-x')).choices.map((c) => c.originalIndex);
    const three = presentChoices(choices, 0, createRng('seed-y')).choices.map((c) => c.originalIndex);
    expect(one).toEqual(two);
    expect(one).not.toEqual(three);
  });
});
