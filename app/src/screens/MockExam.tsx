import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { SourceLine } from '../components/SourceLine';
import { EmptyState, Screen } from '../components/Shell';
import { conceptById, content, lessonForConcept, topicById } from '../content';
import type { Question } from '../content/types';
import {
  MOCK_DURATION_SECONDS,
  MOCK_PASS_MARK,
  MOCK_SIZE,
  MOCK_TARGET_SCORE,
  buildMockExam,
  scoreMock,
} from '../lib/exam';
import { createRng } from '../lib/random';
import type { MockResult } from '../lib/types';
import { Link, navigate } from '../router';
import { useAppState } from '../state/useAppState';

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MockExam() {
  const { rng, sessionId, answerQuestion, saveMock } = useAppState();
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const plan = useMemo(() => {
    startedAt.current = Date.now();
    return buildMockExam(content.questions, content.topics, createRng(`${sessionId}:exam:${attempt}`), MOCK_SIZE);
  }, [sessionId, attempt]);

  const exam = plan.questions;
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<MockResult | null>(null);
  const [remaining, setRemaining] = useState(MOCK_DURATION_SECONDS);

  const submit = useCallback(
    (reason: 'submitted' | 'time') => {
      if (result || exam.length === 0) return;
      const finished = scoreMock(exam, chosen, {
        id: `mock-${Date.now()}`,
        startedAt: startedAt.current,
        finishedAt: Date.now(),
      });
      for (const question of exam) {
        answerQuestion(question, chosen[question.id] === question.correctAnswer);
      }
      saveMock(finished);
      setResult(finished);
      if (reason === 'time') setRemaining(0);
    },
    [result, exam, chosen, answerQuestion, saveMock],
  );

  useEffect(() => {
    if (result || exam.length === 0) return;
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [result, exam.length]);

  useEffect(() => {
    if (remaining === 0 && !result && exam.length > 0) submit('time');
  }, [remaining, result, exam.length, submit]);

  const restart = useCallback(() => {
    setChosen({});
    setIndex(0);
    setResult(null);
    setRemaining(MOCK_DURATION_SECONDS);
    setAttempt((n) => n + 1);
  }, []);

  if (exam.length === 0) {
    return (
      <Screen title="25-Question Mock Exam">
        <EmptyState
          title="Not enough questions loaded"
          message="A mock exam needs question content in this build. Nothing here is generated or guessed."
        />
      </Screen>
    );
  }

  if (result) {
    const missed = result.answers.filter((a) => !a.correct);
    const missedConcepts = [...new Set(missed.map((a) => a.conceptId))];
    const byId = new Map(exam.map((q) => [q.id, q]));
    return (
      <Screen title="Mock Exam Result" subtitle={`Pass mark is ${MOCK_PASS_MARK} of ${result.total}`}>
        <section className={`exam-result ${result.passed ? 'exam-pass' : 'exam-fail'}`}>
          <p className="exam-score">
            {result.score} / {result.total}
          </p>
          <p className="exam-verdict">
            {result.passed ? 'Pass' : 'Below the pass mark'} · finished in {formatClock(result.durationSeconds)}
          </p>
          <p className="muted">
            {result.score >= MOCK_TARGET_SCORE
              ? `At or above your ${MOCK_TARGET_SCORE}+/25 goal.`
              : `Goal is ${MOCK_TARGET_SCORE}+/25 consistently before DMV.`}
          </p>
        </section>

        <h2>By category</h2>
        <ul className="breakdown-list">
          {result.byTopic
            .slice()
            .sort((a, b) => a.correct / a.asked - b.correct / b.asked)
            .map((row) => (
              <li key={row.topicId} className="breakdown-row">
                <span>{topicById.get(row.topicId)?.title ?? row.topicId}</span>
                <span>
                  {row.correct}/{row.asked}
                </span>
              </li>
            ))}
        </ul>

        {missed.length > 0 ? (
          <>
            <h2>What you missed</h2>
            <ul className="missed-list">
              {missed.map((answerRow) => {
                const question = byId.get(answerRow.questionId);
                if (!question) return null;
                const concept = conceptById.get(question.conceptId);
                return (
                  <li key={question.id} className="missed-group">
                    <p className="missed-question-text">{question.question}</p>
                    <p className="missed-answer">
                      Correct answer: {question.choices[question.correctAnswer]}
                    </p>
                    <p className="missed-your-answer">
                      {answerRow.chosenIndex === null
                        ? 'You left this unanswered — unanswered counts as incorrect.'
                        : `You chose: ${question.choices[answerRow.chosenIndex]}`}
                    </p>
                    {concept ? (
                      <p className="missed-rule">
                        <span className="miss-key">Rule:</span> {concept.statement}
                      </p>
                    ) : null}
                    <p className="missed-why">{question.explanation}</p>
                    <SourceLine source={question.source} showQuote />
                  </li>
                );
              })}
            </ul>
            <p className="muted">
              Concepts to fix: {missedConcepts.length}
              {missedConcepts.length > 0
                ? ` — ${missedConcepts
                    .map((id) => conceptById.get(id)?.label ?? id)
                    .slice(0, 6)
                    .join(', ')}`
                : ''}
            </p>
          </>
        ) : (
          <p className="lead">You missed nothing on this exam.</p>
        )}

        <div className="result-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              const first = missedConcepts[0];
              const lesson = first ? lessonForConcept(first) : null;
              navigate(lesson ? `/lesson/${lesson.id}` : '/missed');
            }}
            disabled={missedConcepts.length === 0}
          >
            Study What I Missed
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={restart}>
            Take another mock exam
          </button>
          <Link to="/progress" className="btn btn-quiet btn-block">
            See progress
          </Link>
        </div>
      </Screen>
    );
  }

  const current: Question = exam[index];
  const answeredCount = exam.filter((q) => chosen[q.id] !== undefined && chosen[q.id] !== null).length;

  return (
    <Screen title="25-Question Mock Exam" subtitle="No feedback until you submit — like the real thing">
      <div className="exam-bar">
        <span className={remaining <= 60 ? 'exam-timer exam-timer-low' : 'exam-timer'}>
          ⏱ {formatClock(remaining)}
        </span>
        <span className="exam-progress">
          {answeredCount} of {exam.length} answered
        </span>
      </div>
      <div className="exam-progress-track" aria-hidden="true">
        <div className="exam-progress-fill" style={{ width: `${(answeredCount / exam.length) * 100}%` }} />
      </div>
      {plan.shortfall > 0 ? (
        <p className="warning-note">
          Only {exam.length} questions are available in this build, so this exam is short of {MOCK_SIZE}.
        </p>
      ) : null}

      <QuestionCard
        question={current}
        seed={`${sessionId}:exam:${attempt}`}
        mode="deferred"
        chosenOriginalIndex={chosen[current.id] ?? null}
        onSelect={(originalIndex) => setChosen((prev) => ({ ...prev, [current.id]: originalIndex }))}
        position={{ index: index + 1, total: exam.length }}
      />

      <div className="exam-nav">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIndex((i) => Math.min(exam.length - 1, i + 1))}
          disabled={index === exam.length - 1}
        >
          Next
        </button>
      </div>

      <ol className="exam-grid" aria-label="Jump to question">
        {exam.map((question, i) => (
          <li key={question.id}>
            <button
              type="button"
              className={`exam-dot${i === index ? ' exam-dot-current' : ''}${
                chosen[question.id] !== undefined && chosen[question.id] !== null ? ' exam-dot-answered' : ''
              }`}
              onClick={() => setIndex(i)}
              aria-label={`Question ${i + 1}${chosen[question.id] != null ? ' (answered)' : ''}`}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      <button type="button" className="btn btn-primary btn-block" onClick={() => submit('submitted')}>
        Submit exam{answeredCount < exam.length ? ` (${exam.length - answeredCount} unanswered count as wrong)` : ''}
      </button>
    </Screen>
  );
}
