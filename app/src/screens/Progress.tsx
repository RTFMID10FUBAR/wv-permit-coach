import { useMemo, useState } from 'react';
import { EmptyState, MasteryBar, Screen } from '../components/Shell';
import { content } from '../content';
import { MOCK_PASS_MARK, MOCK_TARGET_SCORE } from '../lib/exam';
import { buildPlainSummary, buildProgressExport, downloadJson } from '../lib/exportProgress';
import { bandLabel } from '../lib/mastery';
import { rankTopicsByMastery } from '../lib/review';
import { Link } from '../router';
import { useAppState } from '../state/useAppState';

export function ProgressScreen() {
  const { records, mocks, lessons, storageKind, answeredQuestionIds } = useAppState();
  const [summary, setSummary] = useState<string | null>(null);

  const ranked = useMemo(
    () => rankTopicsByMastery(content.topics, content.concepts, records),
    [records],
  );
  const exportData = useMemo(
    () =>
      buildProgressExport({
        topics: content.topics,
        concepts: content.concepts,
        records,
        mocks,
        lessons,
        seenQuestionIds: [...answeredQuestionIds],
      }),
    [records, mocks, lessons, answeredQuestionIds],
  );

  const answered = exportData.questionCounts.answered;

  return (
    <Screen title="Progress" subtitle="Everything stays on this device">
      <section className="stat-row">
        <div className="stat">
          <span className="stat-value">{answered}</span>
          <span className="stat-label">questions answered</span>
        </div>
        <div className="stat">
          <span className="stat-value">{exportData.questionCounts.correct}</span>
          <span className="stat-label">correct</span>
        </div>
        <div className="stat">
          <span className="stat-value">{exportData.questionCounts.distinctQuestions}</span>
          <span className="stat-label">distinct questions seen</span>
        </div>
        <div className="stat">
          <span className="stat-value">{mocks.length}</span>
          <span className="stat-label">mock exams</span>
        </div>
        <div className="stat">
          <span className="stat-value">{lessons.length}</span>
          <span className="stat-label">lessons completed</span>
        </div>
      </section>

      <h2>Mastery by topic</h2>
      {ranked.length === 0 ? (
        <EmptyState title="No topics yet" message="Topic mastery appears once content is loaded." />
      ) : (
        <ul className="progress-topics">
          {ranked
            .slice()
            .sort((a, b) => b.masteryScore - a.masteryScore)
            .map((row) => (
              <li key={row.topicId}>
                <div className="progress-topic-head">
                  <Link to={`/practice/${row.topicId}`}>{row.title}</Link>
                  <span className="muted">{bandLabel(row.band)}</span>
                </div>
                <MasteryBar value={row.masteryScore} label={row.title} />
              </li>
            ))}
        </ul>
      )}

      <h2>Mock exam history</h2>
      {mocks.length === 0 ? (
        <p className="muted">
          No mock exams yet. <Link to="/exam">Take one</Link> — the goal is {MOCK_TARGET_SCORE}+/25,
          pass mark {MOCK_PASS_MARK}/25.
        </p>
      ) : (
        <table className="mock-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Score</th>
              <th scope="col">Time</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {mocks
              .slice()
              .reverse()
              .map((mock) => (
                <tr key={mock.id}>
                  <td>{new Date(mock.finishedAt).toLocaleDateString()}</td>
                  <td>
                    {mock.score}/{mock.total}
                  </td>
                  <td>
                    {Math.floor(mock.durationSeconds / 60)}m {mock.durationSeconds % 60}s
                  </td>
                  <td>{mock.score >= MOCK_TARGET_SCORE ? 'At goal' : mock.passed ? 'Pass' : 'Below pass'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <h2>Export</h2>
      <div className="export-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            downloadJson(`wv-permit-coach-progress-${new Date().toISOString().slice(0, 10)}.json`, exportData)
          }
        >
          Export Progress (JSON)
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSummary(buildPlainSummary(exportData))}
        >
          Plain summary
        </button>
        {summary ? (
          <button type="button" className="btn btn-quiet" onClick={() => window.print()}>
            Print this page
          </button>
        ) : null}
      </div>
      {summary ? <pre className="plain-summary">{summary}</pre> : null}

      <p className="muted storage-note">
        Saved locally using {storageKind === 'indexeddb' ? 'IndexedDB' : storageKind === 'localstorage' ? 'local storage' : 'this session only (no storage available)'}.
        No account, no network, no analytics.
      </p>
    </Screen>
  );
}
