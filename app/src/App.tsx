import { useEffect } from 'react';
import { Screen } from './components/Shell';
import { Link, useRoute } from './router';
import { About } from './screens/About';
import { Home } from './screens/Home';
import { LessonScreen } from './screens/Lesson';
import { Missed } from './screens/Missed';
import { MockExam } from './screens/MockExam';
import { Practice } from './screens/Practice';
import { ProgressScreen } from './screens/Progress';
import { QuickLesson } from './screens/QuickLesson';
import { ReadinessScreen } from './screens/Readiness';
import { SettingsScreen } from './screens/Settings';
import { JustStart } from './screens/JustStart';
import { NumberDrill } from './screens/NumberDrill';
import { Handbook } from './screens/Handbook';
import { Signs } from './screens/Signs';
import { Topics } from './screens/Topics';
import { WeakAreas } from './screens/WeakAreas';
import { useAppState } from './state/useAppState';

function NotFound({ path }: { path: string }) {
  return (
    <Screen title="Page not found">
      <p className="lead">Nothing lives at {path}.</p>
      <Link to="/" className="btn btn-primary">
        Back to Home
      </Link>
    </Screen>
  );
}

function renderRoute(segments: string[], path: string) {
  const [first, second] = segments;
  switch (first) {
    case undefined:
      return <Home />;
    case 'start':
      return <JustStart />;
    case 'topics':
      return <Topics />;
    case 'quick':
      return <QuickLesson />;
    case 'signs':
      return <Signs />;
    case 'numbers':
      return <NumberDrill />;
    case 'handbook':
      return <Handbook />;
    case 'weak':
      return <WeakAreas />;
    case 'missed':
      return <Missed />;
    case 'exam':
      return <MockExam />;
    case 'progress':
      return <ProgressScreen />;
    case 'readiness':
      return <ReadinessScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'about':
      return <About />;
    case 'lesson':
      return second ? <LessonScreen lessonId={second} /> : <NotFound path={path} />;
    case 'practice':
      return second ? <Practice topicId={second} /> : <NotFound path={path} />;
    default:
      return <NotFound path={path} />;
  }
}

export default function App() {
  const route = useRoute();
  const { settings, loading } = useAppState();

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
  }, [settings.textScale]);

  if (loading) {
    return (
      <div className="app-loading" role="status">
        Loading WV Permit Coach…
      </div>
    );
  }

  return <div className="app">{renderRoute(route.segments, route.path)}</div>;
}
