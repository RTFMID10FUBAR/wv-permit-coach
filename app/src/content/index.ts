import type {
  Concept,
  ContentBundle,
  Lesson,
  Question,
  SignSpec,
  Topic,
} from './types';

/**
 * Content is authored elsewhere and lands in ./data as JSON. The glob resolves to
 * nothing until it does, so the app builds and renders an honest empty state rather
 * than failing or inventing study material.
 */
const modules = import.meta.glob('./data/*.json', { eager: true, import: 'default' }) as Record<
  string,
  unknown
>;

function readArray<T>(name: string): T[] {
  const raw = modules[`./data/${name}.json`];
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const inner = (raw as Record<string, unknown>)[name];
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}

const topics = readArray<Topic>('topics').slice().sort((a, b) => a.order - b.order);
const concepts = readArray<Concept>('concepts');
const lessons = readArray<Lesson>('lessons');
const rawQuestions = readArray<Question>('questions');
const signs = readArray<SignSpec>('signs');

export interface ContentIssue {
  kind: 'dropped' | 'warning';
  message: string;
}

const issues: ContentIssue[] = [];

/** A question whose correctAnswer does not index its choices cannot be rendered safely. */
const questions = rawQuestions.filter((q) => {
  const ok =
    Array.isArray(q.choices) &&
    q.choices.length >= 2 &&
    Number.isInteger(q.correctAnswer) &&
    q.correctAnswer >= 0 &&
    q.correctAnswer < q.choices.length;
  if (!ok) {
    issues.push({ kind: 'dropped', message: `Question ${q?.id ?? '(no id)'} has an invalid answer index and was not loaded.` });
  }
  return ok;
});

const conceptIds = new Set(concepts.map((c) => c.id));
const orphanQuestions = questions.filter((q) => !conceptIds.has(q.conceptId));
if (orphanQuestions.length > 0) {
  issues.push({
    kind: 'warning',
    message: `${orphanQuestions.length} question(s) reference a concept that is not in the concept list.`,
  });
}

export const content: ContentBundle = { topics, concepts, lessons, questions, signs };
export const contentIssues: ContentIssue[] = issues;

export const conceptById = new Map(concepts.map((c) => [c.id, c]));
export const topicById = new Map(topics.map((t) => [t.id, t]));
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const questionById = new Map(questions.map((q) => [q.id, q]));
export const signByKey = new Map(signs.map((s) => [s.key, s]));

export function questionsForConcept(conceptId: string): Question[] {
  return questions.filter((q) => q.conceptId === conceptId);
}

export function questionsForTopic(topicId: string): Question[] {
  return questions.filter((q) => q.topicId === topicId);
}

export function questionsForLesson(lesson: Lesson): Question[] {
  const wanted = new Set(lesson.conceptIds);
  return questions.filter((q) => wanted.has(q.conceptId));
}

export function lessonsForTopic(topicId: string): Lesson[] {
  return lessons.filter((l) => l.topicId === topicId);
}

export function conceptsForTopic(topicId: string): Concept[] {
  return concepts.filter((c) => c.topicId === topicId);
}

export function lessonForConcept(conceptId: string): Lesson | null {
  return lessons.find((l) => l.conceptIds.includes(conceptId)) ?? null;
}

export const contentIsEmpty =
  topics.length === 0 && questions.length === 0 && lessons.length === 0 && signs.length === 0;

export const contentCounts = {
  topics: topics.length,
  concepts: concepts.length,
  lessons: lessons.length,
  questions: questions.length,
  signs: signs.length,
};
