import { useMemo } from 'react';
import { EmptyState, MasteryBar, Screen } from '../components/Shell';
import { content, conceptsForTopic, lessonsForTopic } from '../content';
import { aggregateMastery } from '../lib/mastery';
import { Link } from '../router';
import { useAppState } from '../state/useAppState';

export function Topics() {
  const { records } = useAppState();
  const rows = useMemo(
    () =>
      content.topics.map((topic) => ({
        topic,
        lessons: lessonsForTopic(topic.id),
        mastery: aggregateMastery(conceptsForTopic(topic.id).map((c) => c.id), records),
      })),
    [records],
  );

  return (
    <Screen title="Study Handbook" subtitle="Chapters in the order the handbook teaches them">
      {rows.length === 0 ? (
        <EmptyState
          title="No topics loaded"
          message="Handbook topics have not been added to this build yet."
        />
      ) : (
        <ul className="topic-list">
          {rows.map(({ topic, lessons, mastery }) => (
            <li key={topic.id} className="topic-row">
              <div className="topic-head">
                <span className="topic-chapter">Chapter {topic.chapter}</span>
                <h2 className="topic-title">{topic.title}</h2>
              </div>
              <p className="topic-blurb">{topic.blurb}</p>
              <MasteryBar value={mastery} label={topic.title} />
              <div className="topic-actions">
                {lessons.map((lesson) => (
                  <Link key={lesson.id} to={`/lesson/${lesson.id}`} className="btn btn-secondary">
                    {lesson.title}
                  </Link>
                ))}
                <Link to={`/practice/${topic.id}`} className="btn btn-quiet">
                  Practice questions
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
