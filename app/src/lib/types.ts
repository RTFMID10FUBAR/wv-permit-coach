import type { QuestionType } from '../content/types';

export type MasteryBand = 'NEEDS_STUDY' | 'LEARNING' | 'ALMOST_READY' | 'MASTERED';

export interface AttemptEvent {
  questionId: string;
  conceptId: string;
  questionType: QuestionType;
  correct: boolean;
  at: number;
  sessionId: string;
  /** First time this learner has ever answered this particular question. */
  firstAttempt: boolean;
}

export interface HistoryEntry {
  correct: boolean;
  at: number;
  type: QuestionType;
  /** Correct answer on a concept that had an outstanding miss — worth more. */
  recovery: boolean;
}

export interface ConceptMastery {
  conceptId: string;
  attempts: number;
  correct: number;
  incorrect: number;
  lastSeen: number | null;
  lastCorrect: number | null;
  currentStreak: number;
  masteryScore: number;
  missedQuestionIds: string[];
  correctSessionIds: string[];
  correctTypes: QuestionType[];
  firstAttemptTotal: number;
  firstAttemptCorrect: number;
  everMissed: boolean;
  history: HistoryEntry[];
}

export interface MockAnswer {
  questionId: string;
  conceptId: string;
  topicId: string;
  chosenIndex: number | null;
  correctIndex: number;
  correct: boolean;
}

export interface MockResult {
  id: string;
  startedAt: number;
  finishedAt: number;
  durationSeconds: number;
  total: number;
  score: number;
  passed: boolean;
  answers: MockAnswer[];
  byTopic: { topicId: string; asked: number; correct: number }[];
  missedConceptIds: string[];
}

export interface LessonCompletion {
  lessonId: string;
  completedAt: number;
  markedMastered: boolean;
}

export interface SignStat {
  key: string;
  attempts: number;
  correct: number;
  lastSeen: number;
}

export interface Settings {
  textScale: number;
  speechEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = { textScale: 1, speechEnabled: false };

export interface ProgressExport {
  exportedAt: string;
  app: string;
  topicsStudied: { topicId: string; title: string; conceptsSeen: number; masteryPercent: number }[];
  questionCounts: { answered: number; correct: number; incorrect: number; distinctQuestions: number };
  mockScores: { date: string; score: number; total: number; passed: boolean; durationSeconds: number }[];
  weakTopics: { topicId: string; title: string; masteryPercent: number }[];
  masteryByConcept: { conceptId: string; masteryScore: number; band: MasteryBand; attempts: number }[];
  lessonsCompleted: { lessonId: string; completedAt: string; markedMastered: boolean }[];
}
