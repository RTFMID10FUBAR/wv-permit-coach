import { createContext } from 'react';
import type { Question } from '../content/types';
import type { Rng } from '../lib/random';
import type {
  ConceptMastery,
  LessonCompletion,
  MockResult,
  Settings,
  SignStat,
} from '../lib/types';

export interface AppStateValue {
  loading: boolean;
  storageKind: string;
  sessionId: string;
  rng: Rng;
  records: Record<string, ConceptMastery>;
  mocks: MockResult[];
  lessons: LessonCompletion[];
  signStats: Record<string, SignStat>;
  settings: Settings;
  answeredQuestionIds: Set<string>;
  answerQuestion(question: Question, correct: boolean): void;
  recordSign(key: string, correct: boolean): void;
  saveMock(result: MockResult): void;
  completeLesson(lessonId: string, markedMastered: boolean): void;
  updateSettings(patch: Partial<Settings>): void;
  resetProgress(): void;
}

export const AppStateContext = createContext<AppStateValue | null>(null);
