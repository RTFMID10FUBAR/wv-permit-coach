import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Question } from '../content/types';
import { getRecord, recordAttempt } from '../lib/mastery';
import { createRng, hashSeed } from '../lib/random';
import { openProgressStore } from '../lib/storage';
import type { ProgressStore } from '../lib/storage';
import { AppStateContext } from './context';
import type { AppStateValue } from './context';
import type {
  ConceptMastery,
  LessonCompletion,
  MockResult,
  Settings,
  SignStat,
} from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/types';


function newSessionId(): string {
  const random = Math.floor(Math.random() * 0xffffff).toString(16);
  return `s-${Date.now().toString(36)}-${random}`;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<ProgressStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageKind, setStorageKind] = useState('loading');
  const [records, setRecords] = useState<Record<string, ConceptMastery>>({});
  const [mocks, setMocks] = useState<MockResult[]>([]);
  const [lessons, setLessons] = useState<LessonCompletion[]>([]);
  const [signStats, setSignStats] = useState<Record<string, SignStat>>({});
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [seenQuestions, setSeenQuestions] = useState<string[]>([]);
  const seenQuestionsRef = useRef<Set<string>>(new Set());

  const sessionId = useMemo(() => newSessionId(), []);
  const rng = useMemo(() => createRng(hashSeed(sessionId)), [sessionId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const store = await openProgressStore();
      if (cancelled) return;
      storeRef.current = store;
      const [loadedRecords, loadedMocks, loadedLessons, loadedSigns, loadedSettings, loadedSeen] =
        await Promise.all([
          store.getMastery(),
          store.getMocks(),
          store.getLessons(),
          store.getSignStats(),
          store.getSettings(),
          store.getSeenQuestions(),
        ]);
      if (cancelled) return;
      seenQuestionsRef.current = new Set(loadedSeen);
      setSeenQuestions(loadedSeen);
      setRecords(loadedRecords);
      setMocks(loadedMocks);
      setLessons(loadedLessons);
      setSignStats(Object.fromEntries(loadedSigns.map((s) => [s.key, s])));
      setSettings(loadedSettings);
      setStorageKind(store.kind);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const answeredQuestionIds = useMemo(() => new Set(seenQuestions), [seenQuestions]);

  const answerQuestion = useCallback(
    (question: Question, correct: boolean) => {
      const firstAttempt = !seenQuestionsRef.current.has(question.id);
      if (firstAttempt) {
        seenQuestionsRef.current.add(question.id);
        const ids = [...seenQuestionsRef.current];
        setSeenQuestions(ids);
        void storeRef.current?.setSeenQuestions(ids);
      }
      setRecords((prev) => {
        const existing = getRecord(prev, question.conceptId);
        const next = recordAttempt(existing, {
          questionId: question.id,
          conceptId: question.conceptId,
          questionType: question.questionType,
          correct,
          at: Date.now(),
          sessionId,
          firstAttempt,
        });
        void storeRef.current?.putMastery(next);
        return { ...prev, [next.conceptId]: next };
      });
    },
    [sessionId],
  );

  const recordSign = useCallback((key: string, correct: boolean) => {
    setSignStats((prev) => {
      const existing = prev[key] ?? { key, attempts: 0, correct: 0, lastSeen: 0 };
      const next: SignStat = {
        key,
        attempts: existing.attempts + 1,
        correct: existing.correct + (correct ? 1 : 0),
        lastSeen: Date.now(),
      };
      void storeRef.current?.putSignStat(next);
      return { ...prev, [key]: next };
    });
  }, []);

  const saveMock = useCallback((result: MockResult) => {
    setMocks((prev) => [...prev, result].sort((a, b) => a.finishedAt - b.finishedAt));
    void storeRef.current?.addMock(result);
  }, []);

  const completeLesson = useCallback((lessonId: string, markedMastered: boolean) => {
    const completion: LessonCompletion = { lessonId, completedAt: Date.now(), markedMastered };
    setLessons((prev) => [...prev.filter((l) => l.lessonId !== lessonId), completion]);
    void storeRef.current?.putLesson(completion);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void storeRef.current?.setSettings(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    setRecords({});
    setMocks([]);
    setLessons([]);
    setSignStats({});
    seenQuestionsRef.current = new Set();
    setSeenQuestions([]);
    void storeRef.current?.clearProgress();
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      loading,
      storageKind,
      sessionId,
      rng,
      records,
      mocks,
      lessons,
      signStats,
      settings,
      answeredQuestionIds,
      answerQuestion,
      recordSign,
      saveMock,
      completeLesson,
      updateSettings,
      resetProgress,
    }),
    [
      loading,
      storageKind,
      sessionId,
      rng,
      records,
      mocks,
      lessons,
      signStats,
      settings,
      answeredQuestionIds,
      answerQuestion,
      recordSign,
      saveMock,
      completeLesson,
      updateSettings,
      resetProgress,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
