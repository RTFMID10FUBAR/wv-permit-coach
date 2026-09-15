import { useCallback, useMemo, useState } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { EmptyState, Screen } from '../components/Shell';
import { content } from '../content';
import type { Question } from '../content/types';
import { emptySessionState, noteAnswered, selectNextQuestion } from '../lib/review';
import type { SessionReviewState } from '../lib/review';
import { Link } from '../router';
import { useAppState } from '../state/useAppState';

/**
 * Numbers and Limits drill.
 *
 * Exact figures are the most commonly confused material on a rules-of-the-road test —
 * 500 feet versus 200 feet for dimming, 0.05 versus 0.08 BAC, 15 mph in a school zone.
 * They are pure recall, so they respond very well to repeated retrieval in a way that
 * reasoning questions do not.
 *
 * This adds NO new content. It is a filter over questions already verified against the
 * handbook: those whose correct answer states a number with a unit. Deriving the set
 * this way means it cannot drift out of sync with the content or invent a figure.
 */
const NUMERIC =
  /(\b\d[\d,.']*\s*(mph|m\.p\.h|feet|foot|ft|inches|inch|percent|%|years?|months?|days?|hours?|minutes?)\b)|(\$\s?\d)|(\b\d+\s*\/\s*\d+\b)|(\b0\.\d+\b)/i;

export function isNumericQuestion(q: Question): boolean {
  return NUMERIC.test(q.choices[q.correctAnswer] ?? '');
}

export function NumberDrill() {
  const { records, rng, sessionId, answerQuestion } = useAppState();

  const pool = useMemo(() => content.questions.filter(isNumericQuestion), []);
  const [sessionState, setSessionState] = useState<SessionReviewState>(emptySessionState);
  const [current, setCurrent] = useState<Question | null>(() =>
    selectNextQuestion(pool, records, emptySessionState(), rng),
  );
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

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

  if (pool.length === 0) {
    return (
      <Screen title="Numbers and Limits" back="/">
        <EmptyState
          title="No numeric questions loaded"
          message="Study content has not been added to this build yet."
        />
      </Screen>
    );
  }

  return (
    <Screen title="Numbers and Limits" back="/">
      <p className="lead">
        The exact figures — distances, speeds, limits, ages. These are the easiest marks to
        win and the easiest to mix up.
      </p>
      <p className="muted">
        {pool.length} number questions · this session: {correctCount} correct of {answered}
      </p>

      {current ? (
        <QuestionCard
          question={current}
          seed={`${sessionId}:numbers`}
          mode="immediate"
          onAnswered={(correct) => handleAnswered(current, correct)}
          onNext={next}
          nextLabel="Next number"
        />
      ) : (
        <EmptyState
          title="You have worked every number question"
          message={`${correctCount} correct of ${answered} this session.`}
          action={
            <Link to="/" className="btn btn-primary">
              Back to home
            </Link>
          }
        />
      )}
    </Screen>
  );
}
