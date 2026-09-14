import { useCallback, useMemo, useState } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { EmptyState, MasteryBar, Screen } from '../components/Shell';
import { conceptsForTopic, lessonsForTopic, questionsForTopic, topicById } from '../content';
import type { Question } from '../content/types';
import { aggregateMastery } from '../lib/mastery';
import { emptySessionState, noteAnswered, selectNextQuestion } from '../lib/review';
import type { SessionReviewState } from '../lib/review';
import { Link } from '../router';
import { useAppState } from '../state/useAppState';

export function Practice({ topicId }: { topicId: string }) {
  const { records, rng, sessionId, answerQuestion } = useAppState();
  const topic = topicById.get(topicId) ?? null;
  const pool = useMemo(() => questionsForTopic(topicId), [topicId]);
  const lessons = useMemo(() => lessonsForTopic(topicId), [topicId]);

  const [sessionState, setSessionState] = useState<SessionReviewState>(emptySessionState);
  const [current, setCurrent] = useState<Question | null>(() =>
    selectNextQuestion(pool, records, emptySessionState(), rng),
  );
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const mastery = useMemo(
    () => aggregateMastery(conceptsForTopic(topicId).map((c) => c.id), records),
    [topicId, records],
  );

  const handleAnswered = useCallback(
    (question: Question, correct: boolean) => {
      answerQuestion(question, correct);
      setSessionState((prev) => noteAnswered(prev, question, correct));
      setAnswered((n) => n + 1);
      if (correct) setCorrectCount((n) => n + 1);
    },
    [answerQuestion],
  );

  const next = useCallback(() => {
    setCurrent(selectNextQuestion(pool, records, sessionState, rng));
  }, [pool, records, sessionState, rng]);

  if (!topic) {
    return (
      <Screen title="Topic not found" back="/weak" backLabel="Weak Areas">
        <EmptyState title="Unknown topic" message="That topic is not in this build." />
      </Screen>
    );
  }

  return (
    <Screen
      title={topic.title}
      subtitle={`Focused practice · Chapter ${topic.chapter}`}
      back="/weak"
      backLabel="Weak Areas"
    >
      <div className="practice-status">
        <MasteryBar value={mastery} label={topic.title} />
        <p className="muted">
          This session: {correctCount} correct of {answered} answered
        </p>
      </div>

      {lessons.length > 0 ? (
        <p className="practice-lessons">
          Read first:{' '}
          {lessons.map((lesson, index) => (
            <span key={lesson.id}>
              {index > 0 ? ' · ' : ''}
              <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link>
            </span>
          ))}
        </p>
      ) : null}

      {pool.length === 0 ? (
        <EmptyState
          title="No questions for this topic yet"
          message="Questions for this chapter have not been added to this build."
        />
      ) : current ? (
        <QuestionCard
          question={current}
          // The seed must NOT include a counter that changes when an answer is given:
          // that re-seeds the shuffle at reveal time and the choices visibly jump under
          // the learner while the feedback is on screen. QuestionCard already keys its
          // memo by question id, so every question still gets its own order.
          seed={`${sessionId}:practice:${topicId}`}
          mode="immediate"
          onAnswered={(correct) => handleAnswered(current, correct)}
          onNext={next}
        />
      ) : (
        <EmptyState
          title="Practice queue empty"
          message="You have worked every question available for this topic in this session."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const fresh = emptySessionState();
                setSessionState(fresh);
                setCurrent(selectNextQuestion(pool, records, fresh, rng));
              }}
            >
              Go again
            </button>
          }
        />
      )}
    </Screen>
  );
}
