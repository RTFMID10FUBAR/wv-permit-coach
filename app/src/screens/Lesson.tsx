import { useCallback, useMemo, useState } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { EmptyState, MasteryBar, Screen } from '../components/Shell';
import { SourceLine } from '../components/SourceLine';
import { conceptById, lessonById, questionsForLesson, topicById } from '../content';
import type { Question } from '../content/types';
import {
  canMarkMastered,
  effectiveMastery,
  getRecord,
  masteryGateReasons,
} from '../lib/mastery';
import { emptySessionState, noteAnswered, selectNextQuestion } from '../lib/review';
import type { SessionReviewState } from '../lib/review';
import { Link, navigate } from '../router';
import { useAppState } from '../state/useAppState';

export function LessonScreen({ lessonId }: { lessonId: string }) {
  const { records, rng, sessionId, answerQuestion, completeLesson, lessons } = useAppState();
  const lesson = lessonById.get(lessonId) ?? null;
  const pool = useMemo(() => (lesson ? questionsForLesson(lesson) : []), [lesson]);

  const [sessionState, setSessionState] = useState<SessionReviewState>(emptySessionState);
  const [current, setCurrent] = useState<Question | null>(null);
  const [asked, setAsked] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const start = useCallback(() => {
    const fresh = emptySessionState();
    const first = selectNextQuestion(pool, records, fresh, rng);
    setSessionState(fresh);
    setCurrent(first);
    setAsked(first ? 1 : 0);
    setQuizDone(!first);
  }, [pool, records, rng]);

  const handleAnswered = useCallback(
    (question: Question, correct: boolean) => {
      answerQuestion(question, correct);
      setSessionState((prev) => noteAnswered(prev, question, correct));
    },
    [answerQuestion],
  );

  const next = useCallback(() => {
    const following = selectNextQuestion(pool, records, sessionState, rng);
    const limit = Math.max(pool.length, 6);
    if (!following || asked >= limit) {
      setCurrent(null);
      setQuizDone(true);
      return;
    }
    setCurrent(following);
    setAsked((n) => n + 1);
  }, [pool, records, sessionState, rng, asked]);

  if (!lesson) {
    return (
      <Screen title="Lesson not found" back="/topics" backLabel="Study Handbook">
        <EmptyState
          title="That lesson is not in this build"
          message="The lesson content may not have been loaded yet."
        />
      </Screen>
    );
  }

  const topic = topicById.get(lesson.topicId);
  const conceptRecords = lesson.conceptIds.map((id) => getRecord(records, id));
  const lessonMastery =
    conceptRecords.length === 0
      ? 0
      : conceptRecords.reduce((acc, r) => acc + effectiveMastery(r), 0) / conceptRecords.length;
  const allMastered = conceptRecords.length > 0 && conceptRecords.every((r) => canMarkMastered(r));
  const gateReasons = [
    ...new Set(conceptRecords.flatMap((r) => masteryGateReasons(r))),
  ].slice(0, 4);
  const alreadyMarked = lessons.some((l) => l.lessonId === lesson.id && l.markedMastered);

  return (
    <Screen
      title={lesson.title}
      subtitle={topic ? `${topic.title} · Chapter ${topic.chapter} · about ${lesson.estimatedMinutes} min` : undefined}
      back="/topics"
      backLabel="Study Handbook"
    >
      <section className="lesson-block">
        <h2>The rules</h2>
        <ul className="rule-list">
          {lesson.rules.map((rule, index) => (
            <li key={`${rule.source.pdfPage}-${index}`} className="rule-item">
              <p className="rule-text">{rule.text}</p>
              <SourceLine source={rule.source} />
            </li>
          ))}
        </ul>
      </section>

      <section className="lesson-block">
        <h2>In plain English</h2>
        <p>{lesson.plainEnglish}</p>
      </section>

      <section className="lesson-block">
        <h2>Why this matters</h2>
        <p>{lesson.whyItMatters}</p>
      </section>

      <section className="lesson-block">
        <h2>Example situation</h2>
        <p>{lesson.example}</p>
      </section>

      <section className="lesson-block">
        <h2>Concepts in this lesson</h2>
        <ul className="concept-list">
          {lesson.conceptIds.map((id) => {
            const concept = conceptById.get(id);
            const record = getRecord(records, id);
            return (
              <li key={id} className="concept-row">
                <p className="concept-statement">{concept ? concept.statement : id}</p>
                <MasteryBar value={effectiveMastery(record)} label={concept?.label ?? id} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="lesson-block">
        <h2>Check yourself</h2>
        {pool.length === 0 ? (
          <p className="muted">No comprehension questions are loaded for this lesson yet.</p>
        ) : current ? (
          <QuestionCard
            question={current}
            // No answer-dependent counter here — see the note in Practice.tsx: it would
            // re-shuffle the choices at the moment feedback appears.
            seed={`${sessionId}:lesson:${lesson.id}`}
            mode="immediate"
            onAnswered={(correct) => handleAnswered(current, correct)}
            onNext={next}
            position={{ index: asked, total: Math.max(pool.length, asked) }}
          />
        ) : quizDone ? (
          <div className="quiz-done">
            <p>You have worked through this lesson&rsquo;s questions.</p>
            <button type="button" className="btn btn-secondary" onClick={start}>
              Review again
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={start}>
            Start comprehension questions
          </button>
        )}
      </section>

      <section className="lesson-block">
        <h2>Lesson mastery</h2>
        <MasteryBar value={lessonMastery} label={lesson.title} />
        <div className="lesson-actions">
          <button type="button" className="btn btn-secondary" onClick={start}>
            Review
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allMastered}
            onClick={() => {
              completeLesson(lesson.id, true);
              navigate('/topics');
            }}
          >
            {alreadyMarked ? 'Marked mastered' : 'Mark mastered'}
          </button>
        </div>
        {!allMastered ? (
          <div className="gate-reasons">
            <p className="muted">Mark mastered unlocks when the engine agrees:</p>
            <ul>
              {gateReasons.length > 0 ? (
                gateReasons.map((reason) => <li key={reason}>{reason}</li>)
              ) : (
                <li>Answer this lesson&rsquo;s questions to build a mastery score.</li>
              )}
            </ul>
          </div>
        ) : null}
      </section>

      <p className="lesson-footer-link">
        <Link to={`/practice/${lesson.topicId}`}>Practice more questions from this topic</Link>
      </p>
    </Screen>
  );
}
