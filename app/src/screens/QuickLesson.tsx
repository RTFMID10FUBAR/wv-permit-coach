import { useEffect, useMemo } from 'react';
import { EmptyState, Screen } from '../components/Shell';
import { content, conceptsForTopic } from '../content';
import type { Lesson } from '../content/types';
import { aggregateMastery, effectiveMastery } from '../lib/mastery';
import { Link, navigate } from '../router';
import { useAppState } from '../state/useAppState';

/** Lowest-mastery lesson wins; unseen concepts break ties toward new material. */
function pickLesson(
  lessons: readonly Lesson[],
  records: Parameters<typeof aggregateMastery>[1],
): Lesson | null {
  if (lessons.length === 0) return null;
  const scored = lessons.map((lesson) => {
    const ids = lesson.conceptIds;
    const mastery = ids.length === 0 ? 1 : aggregateMastery(ids, records);
    const unseen = ids.filter((id) => !records[id] || records[id].attempts === 0).length;
    const outstanding = ids.reduce(
      (acc, id) => acc + (records[id]?.missedQuestionIds.length ?? 0),
      0,
    );
    return { lesson, rank: mastery - unseen * 0.05 - outstanding * 0.1 };
  });
  scored.sort((a, b) => a.rank - b.rank || a.lesson.id.localeCompare(b.lesson.id));
  return scored[0].lesson;
}

export function QuickLesson() {
  const { records } = useAppState();
  const lesson = useMemo(() => pickLesson(content.lessons, records), [records]);

  const reason = useMemo(() => {
    if (!lesson) return '';
    const topicMastery = aggregateMastery(
      conceptsForTopic(lesson.topicId).map((c) => c.id),
      records,
    );
    const unseen = lesson.conceptIds.filter((id) => !records[id] || records[id].attempts === 0);
    if (unseen.length > 0) return 'It contains rules you have not practised yet.';
    const weakest = lesson.conceptIds
      .map((id) => (records[id] ? effectiveMastery(records[id]) : 0))
      .sort((a, b) => a - b)[0];
    return `Its topic is at ${Math.round(topicMastery * 100)}% mastery and its weakest rule is at ${Math.round((weakest ?? 0) * 100)}%.`;
  }, [lesson, records]);

  useEffect(() => {
    if (!lesson) return;
    const timer = window.setTimeout(() => navigate(`/lesson/${lesson.id}`), 900);
    return () => window.clearTimeout(timer);
  }, [lesson]);

  return (
    <Screen title="Quick Lesson" subtitle="One short lesson, chosen from your own results">
      {lesson ? (
        <div className="quick-pick">
          <p className="quick-eyebrow">Opening now</p>
          <h2>{lesson.title}</h2>
          <p>{reason}</p>
          <Link to={`/lesson/${lesson.id}`} className="btn btn-primary btn-block">
            Open {lesson.title}
          </Link>
        </div>
      ) : (
        <EmptyState
          title="No lessons loaded"
          message="Lesson content has not been added to this build yet."
        />
      )}
    </Screen>
  );
}
