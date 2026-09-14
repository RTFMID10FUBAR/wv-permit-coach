import { useMemo } from 'react';
import { EmptyState, MasteryBar, Screen } from '../components/Shell';
import { content } from '../content';
import { bandLabel } from '../lib/mastery';
import { rankTopicsByMastery } from '../lib/review';
import { Link } from '../router';
import { useAppState } from '../state/useAppState';

export function WeakAreas() {
  const { records } = useAppState();
  const ranked = useMemo(
    () => rankTopicsByMastery(content.topics, content.concepts, records),
    [records],
  );

  return (
    <Screen title="Weak Areas" subtitle="Weakest topics first — tap one to study and drill it">
      {ranked.length === 0 ? (
        <EmptyState
          title="Nothing to rank yet"
          message="Topics will appear here once handbook content is loaded."
        />
      ) : (
        <ol className="weak-list">
          {ranked.map((row) => (
            <li key={row.topicId} className="weak-row">
              <Link to={`/practice/${row.topicId}`} className="weak-link">
                <div className="weak-head">
                  <span className="weak-title">{row.title}</span>
                  <span className="weak-band">{bandLabel(row.band)}</span>
                </div>
                <MasteryBar value={row.masteryScore} label={row.title} />
                <p className="weak-detail">
                  {row.seenConcepts} of {row.conceptCount} concepts practised
                  {row.missedQuestionCount > 0
                    ? ` · ${row.missedQuestionCount} question(s) still missed`
                    : ''}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Screen>
  );
}
