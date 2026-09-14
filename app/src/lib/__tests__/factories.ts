import type { Concept, Question, SourceRef, Topic } from '../../content/types';

export const SOURCE: SourceRef = {
  sourceDocument: "West Virginia Driver's Licensing Handbook",
  chapter: 'V',
  chapterTitle: 'Signs, Signals and Pavement Markings',
  section: 'Test fixture',
  pdfPage: 42,
  printedPage: 32,
  sourceQuote: 'fixture quote',
  verifiedDate: '2026-01-01',
};

export function topic(id: string, examWeight = 1, order = 1): Topic {
  return {
    id,
    title: `Topic ${id}`,
    chapter: 'I',
    order,
    blurb: '',
    examWeight,
  };
}

export function concept(id: string, topicId: string): Concept {
  return {
    id,
    topicId,
    label: `Concept ${id}`,
    statement: `Rule ${id}`,
    source: SOURCE,
  };
}

export function question(
  id: string,
  topicId: string,
  conceptId: string,
  overrides: Partial<Question> = {},
): Question {
  return {
    id,
    topicId,
    subtopic: 'fixture',
    conceptId,
    question: `Question ${id}?`,
    choices: ['a', 'b', 'c', 'd'],
    correctAnswer: 0,
    explanation: 'because the handbook says so',
    questionType: 'direct',
    difficulty: 'core',
    source: SOURCE,
    ...overrides,
  };
}
