import { conceptById, lessonForConcept } from '../content';
import type { Question } from '../content/types';
import { navigate } from '../router';
import { SourceLine } from './SourceLine';

/**
 * The miss experience. Order is deliberate: verdict, the right answer, the rule,
 * why it is the rule, where to read it, then a way to go study it.
 */
export function MissPanel({ question, onStudied }: { question: Question; onStudied?: () => void }) {
  const concept = conceptById.get(question.conceptId) ?? null;
  const lesson = lessonForConcept(question.conceptId);

  const studyTarget = lesson
    ? `/lesson/${lesson.id}`
    : `/practice/${question.topicId}`;

  return (
    <div className="miss-panel" role="alert">
      <p className="miss-verdict">Incorrect.</p>
      <p className="miss-answer">
        <span className="miss-key">Correct answer:</span> {question.choices[question.correctAnswer]}
      </p>
      {concept ? (
        <p className="miss-rule">
          <span className="miss-key">Rule:</span> {concept.statement}
        </p>
      ) : null}
      <p className="miss-why">
        <span className="miss-key">Why:</span> {question.explanation}
      </p>
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
      <p className="miss-followup">You will get a different question on this rule later in this session.</p>
    </div>
  );
}
