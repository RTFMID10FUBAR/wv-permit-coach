import { useMemo } from 'react';
import { SourceLine } from '../components/SourceLine';
import { EmptyState, MasteryBar, Screen } from '../components/Shell';
import { content, lessonForConcept, topicById } from '../content';
import { bandLabel } from '../lib/mastery';
import { groupMissedByConcept } from '../lib/review';
import { Link } from '../router';
import { useAppState } from '../state/useAppState';

export function Missed() {
  const { records } = useAppState();
  const groups = useMemo(
    () => groupMissedByConcept(records, content.questions, content.concepts),
    [records],
  );

  return (
    <Screen
      title="Missed Questions"
      subtitle="Grouped by the rule behind them — fix the rule, not the question"
    >
      {groups.length === 0 ? (
        <EmptyState
          title="Nothing missed yet"
          message="Questions you get wrong will collect here, with the rule and where to read it."
          action={
            <Link to="/exam" className="btn btn-primary">
              Take a mock exam
            </Link>
          }
        />
      ) : (
        <ul className="missed-list">
          {groups.map((group) => {
            const lesson = lessonForConcept(group.conceptId);
            const topic = topicById.get(group.topicId);
            return (
              <li key={group.conceptId} className="missed-group">
                <h2 className="missed-concept">
                  {group.concept ? group.concept.label : group.conceptId}
                </h2>
                {topic ? <p className="missed-topic">{topic.title}</p> : null}
                {group.concept ? <p className="missed-rule">{group.concept.statement}</p> : null}
                <MasteryBar value={group.masteryScore} label={group.concept?.label} />
                <p className="missed-band">{bandLabel(group.band)}</p>
                <ul className="missed-questions">
                  {group.questions.map((question) => (
                    <li key={question.id}>
                      <p className="missed-question-text">{question.question}</p>
                      <p className="missed-answer">
                        Correct answer: {question.choices[question.correctAnswer]}
                      </p>
                      <p className="missed-why">{question.explanation}</p>
                      <SourceLine source={question.source} />
                    </li>
                  ))}
                </ul>
                <Link
                  to={lesson ? `/lesson/${lesson.id}` : `/practice/${group.topicId}`}
                  className="btn btn-primary"
                >
                  Study this rule
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
