import type { Question, Topic } from '../content/types';
import type { Rng } from './random';
import { shuffle } from './random';
import type { MockAnswer, MockResult } from './types';

export const MOCK_SIZE = 25;
export const MOCK_PASS_MARK = 19;
export const MOCK_TARGET_SCORE = 22;
export const MOCK_DURATION_SECONDS = 25 * 60;

/** No single topic may dominate the exam, whatever its examWeight says. */
export const MAX_TOPIC_SHARE = 0.4;

export interface ExamPlan {
  quotas: { topicId: string; quota: number; available: number }[];
  questions: Question[];
  shortfall: number;
}

function quotaTargets(
  topics: readonly Topic[],
  available: Map<string, number>,
  size: number,
): Map<string, number> {
  const usable = topics.filter((t) => (available.get(t.id) ?? 0) > 0);
  const quotas = new Map<string, number>();
  if (usable.length === 0) return quotas;

  const cap = Math.max(1, Math.floor(size * MAX_TOPIC_SHARE));
  const totalWeight = usable.reduce((acc, t) => acc + Math.max(0, t.examWeight), 0);
  let assigned = 0;

  const ideal = usable.map((topic) => {
    const share = totalWeight > 0 ? Math.max(0, topic.examWeight) / totalWeight : 1 / usable.length;
    return { topic, exact: share * size };
  });

  for (const { topic, exact } of ideal) {
    const want = Math.min(Math.floor(exact), cap, available.get(topic.id) ?? 0);
    quotas.set(topic.id, want);
    assigned += want;
  }

  // Distribute the remainder by largest fractional part, respecting cap and supply.
  const order = ideal
    .slice()
    .sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.topic.id.localeCompare(b.topic.id));
  let guard = 0;
  while (assigned < size && guard < size * usable.length + usable.length) {
    let progressed = false;
    for (const { topic } of order) {
      if (assigned >= size) break;
      const current = quotas.get(topic.id) ?? 0;
      if (current >= cap) continue;
      if (current >= (available.get(topic.id) ?? 0)) continue;
      quotas.set(topic.id, current + 1);
      assigned += 1;
      progressed = true;
    }
    if (!progressed) break;
    guard += 1;
  }

  // Cap can leave the exam short when few topics exist — relax the cap round-robin so
  // the overflow still spreads, never the supply.
  while (assigned < size) {
    let progressed = false;
    for (const { topic } of order) {
      if (assigned >= size) break;
      if ((quotas.get(topic.id) ?? 0) >= (available.get(topic.id) ?? 0)) continue;
      quotas.set(topic.id, (quotas.get(topic.id) ?? 0) + 1);
      assigned += 1;
      progressed = true;
    }
    if (!progressed) break;
  }
  return quotas;
}

/** Prefer one question per concept before repeating a concept inside one exam. */
function pickFromTopic(pool: Question[], quota: number, rng: Rng): Question[] {
  const shuffled = shuffle(pool, rng);
  const picked: Question[] = [];
  const usedConcepts = new Set<string>();
  for (const q of shuffled) {
    if (picked.length >= quota) break;
    if (usedConcepts.has(q.conceptId)) continue;
    picked.push(q);
    usedConcepts.add(q.conceptId);
  }
  if (picked.length < quota) {
    for (const q of shuffled) {
      if (picked.length >= quota) break;
      if (picked.includes(q)) continue;
      picked.push(q);
    }
  }
  return picked;
}

export function buildMockExam(
  questions: readonly Question[],
  topics: readonly Topic[],
  rng: Rng,
  size: number = MOCK_SIZE,
): ExamPlan {
  const byTopic = new Map<string, Question[]>();
  for (const q of questions) {
    const list = byTopic.get(q.topicId);
    if (list) list.push(q);
    else byTopic.set(q.topicId, [q]);
  }
  const knownTopics = topics.filter((t) => byTopic.has(t.id));
  const orphanTopicIds = [...byTopic.keys()].filter((id) => !topics.some((t) => t.id === id));
  const effectiveTopics: Topic[] = [
    ...knownTopics,
    ...orphanTopicIds.map((id) => ({
      id,
      title: id,
      chapter: 'I',
      order: 999,
      blurb: '',
      examWeight: 1,
    }) as Topic),
  ];

  const available = new Map<string, number>(
    effectiveTopics.map((t) => [t.id, byTopic.get(t.id)?.length ?? 0]),
  );
  const quotas = quotaTargets(effectiveTopics, available, size);

  const selected: Question[] = [];
  for (const topic of effectiveTopics) {
    const quota = quotas.get(topic.id) ?? 0;
    if (quota <= 0) continue;
    selected.push(...pickFromTopic(byTopic.get(topic.id) ?? [], quota, rng));
  }

  return {
    quotas: effectiveTopics.map((t) => ({
      topicId: t.id,
      quota: quotas.get(t.id) ?? 0,
      available: available.get(t.id) ?? 0,
    })),
    questions: shuffle(selected, rng),
    shortfall: Math.max(0, size - selected.length),
  };
}

export function scoreMock(
  exam: readonly Question[],
  chosen: Record<string, number | null>,
  meta: { id: string; startedAt: number; finishedAt: number },
): MockResult {
  const answers: MockAnswer[] = exam.map((q) => {
    const chosenIndex = chosen[q.id] ?? null;
    return {
      questionId: q.id,
      conceptId: q.conceptId,
      topicId: q.topicId,
      chosenIndex,
      correctIndex: q.correctAnswer,
      correct: chosenIndex !== null && chosenIndex === q.correctAnswer,
    };
  });
  const score = answers.filter((a) => a.correct).length;
  const byTopicMap = new Map<string, { asked: number; correct: number }>();
  for (const a of answers) {
    const entry = byTopicMap.get(a.topicId) ?? { asked: 0, correct: 0 };
    entry.asked += 1;
    if (a.correct) entry.correct += 1;
    byTopicMap.set(a.topicId, entry);
  }
  return {
    id: meta.id,
    startedAt: meta.startedAt,
    finishedAt: meta.finishedAt,
    durationSeconds: Math.max(0, Math.round((meta.finishedAt - meta.startedAt) / 1000)),
    total: exam.length,
    score,
    passed: score >= MOCK_PASS_MARK,
    answers,
    byTopic: [...byTopicMap.entries()].map(([topicId, v]) => ({ topicId, ...v })),
    missedConceptIds: [...new Set(answers.filter((a) => !a.correct).map((a) => a.conceptId))],
  };
}
