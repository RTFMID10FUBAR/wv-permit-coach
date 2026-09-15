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
 * Just Start.
 *
 * The front door, and deliberately the only thing on the home screen that looks like a
 * beginning. Everything else in the app asks the learner to choose a topic, a chapter or
 * a drill first, and a learner who is avoiding the handbook will read that as homework
 * and close the app.
 *
 * So: one tap, straight into a question. No topic list, no chapter, no reading, no
 * decision. The rule arrives only when she gets something wrong — the miss panel does
 * the teaching, at the moment she has a reason to care about it.
 *
 * The question selection is the same spaced-review engine used everywhere else, so this
 * is not a lesser mode: weak concepts, outstanding misses and unseen material are
 * prioritised exactly as they are in focused practice, just without making her pick.
 */
export function JustStart() {
  const { records, rng, sessionId, answerQuestion } = useAppState();

  const pool = useMemo(() => content.questions, []);
  const [sessionState, setSessionState] = useState<SessionReviewState>(emptySessionState);
  const [current, setCurrent] = useState<Question | null>(() =>
    selectNextQuestion(pool, records, emptySessionState(), rng),
  );
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);

  const handleAnswered = useCallback(
    (question: Question, wasCorrect: boolean) => {
      answerQuestion(question, wasCorrect);
      setSessionState((prev) => noteAnswered(prev, question, wasCorrect));
      setAnswered((n) => n + 1);
      if (wasCorrect) setCorrect((n) => n + 1);
    },
    [answerQuestion],
  );

  const next = useCallback(() => {
    setCurrent(selectNextQuestion(pool, records, sessionState, rng));
  }, [pool, records, sessionState, rng]);

  if (pool.length === 0) {
    return (
      <Screen title="Start" back="/">
        <EmptyState
          title="No questions loaded"
          message="Study content has not been added to this build yet."
        />
      </Screen>
    );
  }

  return (
    <Screen title="Start" back="/">
      {answered > 0 ? (
        <p className="muted start-score">
          {correct} of {answered} right so far
        </p>
      ) : (
        <p className="lead">
          Answer whatever comes up. If you get one wrong, the rule comes to you — no need
          to go looking for it.
        </p>
      )}

      {current ? (
        <QuestionCard
          question={current}
          seed={`${sessionId}:start`}
          mode="immediate"
          onAnswered={(wasCorrect) => handleAnswered(current, wasCorrect)}
          onNext={next}
          nextLabel="Next"
        />
      ) : (
        <EmptyState
          title="That is everything for now"
          message={`${correct} of ${answered} right this session.`}
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
