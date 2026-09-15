import { useState } from 'react';
import { conceptById, lessonForConcept } from '../content';
import type { Question } from '../content/types';
import { navigate } from '../router';
import { SourceLine } from './SourceLine';

/**
 * The miss experience.
 *
 * Design per Jacob, 2026-09-15: lead with the CORRECT answer, because that is the thing
 * that needs to be retained. The learner's own wrong choice is addressed briefly and
 * secondarily — enough to stop them repeating the specific mistake, not enough to make
 * the wrong answer the memorable part of the screen.
 *
 * The strongest retention step here is `Lock it in`: before moving on, the learner has to
 * pick the correct answer themselves. Reading an answer is recognition; producing it is
 * retrieval, and retrieval is what survives to test day. The concept is then re-queued
 * later in the session with a DIFFERENT question.
 */
export function MissPanel({
  question,
  chosenIndex,
  onStudied,
  onLockedIn,
}: {
  question: Question;
  /** Index into the ORIGINAL choices array. Undefined when the question went unanswered. */
  chosenIndex?: number;
  onStudied?: () => void;
  /** Fired once the learner has re-selected the correct answer. */
  onLockedIn?: () => void;
}) {
  const concept = conceptById.get(question.conceptId) ?? null;
  const lesson = lessonForConcept(question.conceptId);
  const studyTarget = lesson ? `/lesson/${lesson.id}` : `/practice/${question.topicId}`;

  const [lockedIn, setLockedIn] = useState(false);
  const [lockAttempt, setLockAttempt] = useState<number | null>(null);

  const unanswered = chosenIndex === undefined || chosenIndex < 0;
  const authoredNote =
    !unanswered && question.choiceExplanations
      ? question.choiceExplanations[chosenIndex] ?? null
      : null;
  const whyWrong =
    authoredNote ??
    (concept ? `The rule is: ${concept.statement}` : 'That is not what the handbook says.');

  const lockChoice = (i: number) => {
    setLockAttempt(i);
    if (i === question.correctAnswer && !lockedIn) {
      setLockedIn(true);
      onLockedIn?.();
    }
  };

  return (
    <div className="miss-panel" role="alert">
      <p className="miss-verdict">{unanswered ? 'Not answered.' : 'Incorrect.'}</p>

      {/* The correct answer is the loudest thing on this panel, by design. */}
      <p className="miss-answer miss-answer-lead">
        <span className="miss-key">The correct answer is:</span>
        <strong>{question.choices[question.correctAnswer]}</strong>
      </p>

      {concept ? (
        <p className="miss-rule">
          <span className="miss-key">Rule:</span> {concept.statement}
        </p>
      ) : null}
      <p className="miss-why">
        <span className="miss-key">Why it is right:</span> {question.explanation}
      </p>

      {/* Secondary, deliberately quieter: the specific mistake they made. */}
      {!unanswered ? (
        <p className="miss-whywrong">
          <span className="miss-key">You picked “{question.choices[chosenIndex]}”.</span>{' '}
          {whyWrong}
        </p>
      ) : (
        <p className="miss-whywrong">
          <span className="miss-key">You left this unanswered</span> — on the real test an
          unanswered question counts as incorrect.
        </p>
      )}

      <div className="lock-in">
        <p className="lock-in-prompt">
          {lockedIn ? 'Locked in.' : 'Lock it in — tap the correct answer to fix it in memory:'}
        </p>
        <ul className="lock-in-choices">
          {question.choices.map((text, i) => {
            const isCorrect = i === question.correctAnswer;
            const picked = lockAttempt === i;
            const cls = lockedIn && isCorrect
              ? 'lock-choice lock-correct'
              : picked && !isCorrect
                ? 'lock-choice lock-wrong'
                : 'lock-choice';
            return (
              <li key={i}>
                <button
                  type="button"
                  className={cls}
                  disabled={lockedIn}
                  onClick={() => lockChoice(i)}
                >
                  {text}
                </button>
              </li>
            );
          })}
        </ul>
        {lockAttempt !== null && lockAttempt !== question.correctAnswer && !lockedIn ? (
          <p className="lock-in-nudge">Not that one — it is written above. Tap the correct answer.</p>
        ) : null}
      </div>

      <SourceLine source={question.source} showQuote />
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          onStudied?.();
          navigate(studyTarget);
        }}
      >
        Study this rule
      </button>
      <p className="miss-followup">
        You will get a different question on this rule later in this session.
      </p>
    </div>
  );
}
