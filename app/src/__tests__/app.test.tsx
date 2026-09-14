import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { content } from '../content';
import { DISCLAIMER } from '../components/Shell';
import { MOCK_SIZE } from '../lib/exam';
import { AppStateProvider } from '../state/AppState';

function renderApp() {
  return render(
    <AppStateProvider>
      <App />
    </AppStateProvider>,
  );
}

async function goto(path: string) {
  await act(async () => {
    window.location.hash = `#${path}`;
  });
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  localStorage.clear();
  window.location.hash = '#/';
});

afterEach(cleanup);

describe('app shell', () => {
  it('renders the home screen with the goal and the disclaimer', async () => {
    renderApp();
    expect(await screen.findByText('WV Permit Coach')).toBeDefined();
    expect(screen.getByText(/Learn the rule\. Don.t memorize the button\./)).toBeDefined();
    expect(screen.getByText(/Goal: consistently score 22\+\/25 before DMV/)).toBeDefined();
    expect(screen.getByText(DISCLAIMER)).toBeDefined();
    for (const label of [
      'Study Handbook',
      'Quick Lesson',
      'Road Signs',
      'Weak Areas',
      'Missed Questions',
      '25-Question Mock Exam',
      'Progress',
    ]) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it('routes to every main screen without crashing', async () => {
    renderApp();
    await screen.findByText('WV Permit Coach');
    const screens: [string, string][] = [
      ['/topics', 'Study Handbook'],
      ['/signs', 'Road Signs'],
      ['/weak', 'Weak Areas'],
      ['/missed', 'Missed Questions'],
      ['/progress', 'Progress'],
      ['/readiness', 'Study Readiness'],
      ['/settings', 'Settings'],
      ['/about', 'About'],
    ];
    for (const [path, heading] of screens) {
      await goto(path);
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeDefined();
    }
  });

  it('shows an honest empty state instead of inventing signs', async () => {
    renderApp();
    await goto('/signs');
    const heading = await screen.findByRole('heading', { level: 1, name: 'Road Signs' });
    expect(heading).toBeDefined();
    if (content.signs.length < 2) {
      expect(screen.getByText('No sign data loaded')).toBeDefined();
    }
  });
});

describe('the miss experience', () => {
  it('shows verdict, correct answer, rule, why and the handbook page on a wrong answer', async () => {
    const lesson = content.lessons.find((l) =>
      content.questions.some((q) => l.conceptIds.includes(q.conceptId)),
    );
    expect(lesson).toBeDefined();
    renderApp();
    await goto(`/lesson/${lesson!.id}`);
    fireEvent.click(await screen.findByText('Start comprehension questions'));

    const questionText = (await screen.findByRole('heading', { level: 2, name: /\?/ })).textContent;
    const asked = content.questions.find((q) => q.question === questionText);
    expect(asked).toBeDefined();

    const wrongText = asked!.choices.find((_, i) => i !== asked!.correctAnswer)!;
    fireEvent.click(screen.getByText(wrongText));

    const panel = await screen.findByRole('alert');
    expect(within(panel).getByText('Incorrect.')).toBeDefined();
    expect(panel.textContent).toContain(asked!.choices[asked!.correctAnswer]);
    expect(panel.textContent).toContain(asked!.explanation);
    expect(panel.textContent).toContain(`printed page ${asked!.source.printedPage}`);
    expect(within(panel).getByText('Study this rule')).toBeDefined();
  });
});

describe('mock exam', () => {
  it('serves a balanced 25-question exam and scores it on submit', async () => {
    renderApp();
    await goto('/exam');
    expect(await screen.findByText(`0 of ${MOCK_SIZE} answered`)).toBeDefined();

    // No feedback is shown before submitting.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Incorrect.')).toBeNull();

    fireEvent.click(screen.getByText(/Submit exam/));
    await waitFor(() => expect(screen.getByText('Mock Exam Result')).toBeDefined());
    // Everything unanswered counts as incorrect.
    expect(screen.getByText(`0 / ${MOCK_SIZE}`)).toBeDefined();
    expect(screen.getByText('Study What I Missed')).toBeDefined();
  });
});
