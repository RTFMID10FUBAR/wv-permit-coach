/**
 * Regression: answering a question must not re-order the choices.
 *
 * Found by driving the production build in a browser on 2026-09-14. Practice and Lesson
 * were passing an answer counter inside the shuffle seed, so the moment a learner
 * answered, the seed changed, the memo re-ran and the options visibly jumped while the
 * feedback panel was open. Grading was still correct (it keys on original indices), but
 * the rows moved under the learner, which makes correct feedback look wrong.
 */
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { QuestionCard } from '../QuestionCard';
import { AppStateProvider } from '../../state/AppState';
import type { Question } from '../../content/types';

const question: Question = {
  id: 'q-stability-001',
  topicId: 't',
  subtopic: 's',
  conceptId: 'c',
  question: 'Which is the correct answer?',
  choices: ['alpha', 'bravo', 'charlie', 'delta'],
  correctAnswer: 2,
  explanation: 'Because charlie is the correct one, for the purposes of this test.',
  questionType: 'direct',
  difficulty: 'core',
  source: {
    sourceDocument: 'test',
    chapter: 'V',
    chapterTitle: 'Traffic Control Devices',
    section: 'test',
    pdfPage: 44,
    printedPage: 34,
    sourceQuote: 'irrelevant to this test but required by the type',
    verifiedDate: '2026-09-14',
  },
};

// Queries are scoped to each render's own container: without cleanup between tests
// the previous render is still mounted and text lookups match twice.
afterEach(cleanup);

function order(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('.choice-text')).map((el) => el.textContent ?? '');
}

describe('QuestionCard choice stability', () => {
  it('keeps the same choice order after the learner answers', () => {
    const { container } = render(
      <AppStateProvider>
        <QuestionCard question={question} seed="stable-seed" mode="immediate" />
      </AppStateProvider>,
    );

    const before = order(container);
    expect(before).toHaveLength(4);

    // Answer with whatever is sitting in the first position.
    fireEvent.click(within(container).getByText(before[0]));

    expect(order(container)).toEqual(before);
  });

  it('still reveals feedback after answering', () => {
    const { container } = render(
      <AppStateProvider>
        <QuestionCard question={question} seed="stable-seed-2" mode="immediate" />
      </AppStateProvider>,
    );
    fireEvent.click(within(container).getByText('alpha'));
    // 'alpha' is never the correct answer, so the miss panel must appear.
    expect(within(container).getByText(/Incorrect/i)).toBeTruthy();
    expect(order(container)).toContain('alpha');
  });
});
