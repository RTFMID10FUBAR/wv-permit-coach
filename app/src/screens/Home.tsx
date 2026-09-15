import { useMemo } from 'react';
import { Disclaimer } from '../components/Shell';
import { content, contentCounts, contentIsEmpty } from '../content';
import { MOCK_TARGET_SCORE } from '../lib/exam';
import { computeReadiness } from '../lib/readiness';
import { Link } from '../router';
import { useAppState } from '../state/useAppState';

const MENU: { to: string; label: string; hint: string }[] = [
  { to: '/topics', label: 'Study Handbook', hint: 'Work the chapters in order' },
  { to: '/quick', label: 'Quick Lesson', hint: 'One short lesson, picked for you' },
  { to: '/signs', label: 'Road Signs', hint: 'Shape, colour and meaning drills' },
  { to: '/numbers', label: 'Numbers and Limits', hint: 'Distances, speeds, ages, limits' },
  { to: '/weak', label: 'Weak Areas', hint: 'Your lowest-mastery topics first' },
  { to: '/missed', label: 'Missed Questions', hint: 'Everything you got wrong' },
  { to: '/exam', label: '25-Question Mock Exam', hint: 'Timed, no feedback until you submit' },
  { to: '/progress', label: 'Progress', hint: 'Mastery, mock history, export' },
  { to: '/handbook', label: 'The Handbook', hint: 'Read and search the official book' },
];

export function Home() {
  const { records, mocks, loading } = useAppState();
  const readiness = useMemo(
    () =>
      computeReadiness({
        mocks,
        records,
        topics: content.topics,
        concepts: content.concepts,
      }),
    [mocks, records],
  );

  return (
    <main className="screen home">
      <header className="home-header">
        <h1 className="app-title">WV Permit Coach</h1>
        <p className="app-subtitle">Learn the rule. Don&rsquo;t memorize the button.</p>
      </header>

      <section className={`readiness-card readiness-${readiness.label.replace(/\s+/g, '-').toLowerCase()}`}>
        <p className="readiness-eyebrow">Today&rsquo;s study readiness</p>
        <p className="readiness-label">{readiness.label}</p>
        <p className="readiness-next">{readiness.nextStep}</p>
        <Link to="/readiness" className="btn btn-quiet">
          Why this label?
        </Link>
      </section>

      <p className="goal-banner">Goal: consistently score {MOCK_TARGET_SCORE}+/25 before DMV</p>

      {contentIsEmpty ? (
        <div className="empty-state">
          <h2>No study content loaded yet</h2>
          <p>
            The handbook content files have not been added to this build. Every screen below will
            work as soon as they are. Nothing here is filled in with made-up questions.
          </p>
        </div>
      ) : null}

      <nav className="menu">
        {MENU.map((item) => (
          <Link key={item.to} to={item.to} className="menu-item">
            <span className="menu-label">{item.label}</span>
            <span className="menu-hint">{item.hint}</span>
          </Link>
        ))}
      </nav>

      <p className="content-counts">
        {loading
          ? 'Loading your saved progress…'
          : `${contentCounts.questions} questions · ${contentCounts.lessons} lessons · ${contentCounts.signs} signs · works offline`}
      </p>

      <nav className="secondary-nav">
        <Link to="/settings">Settings</Link>
        <Link to="/about">About</Link>
      </nav>

      <footer className="home-footer">
        <Disclaimer />
      </footer>
    </main>
  );
}
