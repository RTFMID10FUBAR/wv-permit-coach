import { useMemo, useState } from 'react';
import { signByKey } from '../content';
import type { Question } from '../content/types';
import { createRng, presentChoices } from '../lib/random';
import { speak, speechAvailable } from '../lib/speech';
import { useAppState } from '../state/useAppState';
import { MissPanel } from './MissPanel';
import { SignSVG } from './SignSVG';
import { SourceLine } from './SourceLine';

interface Props {
  question: Question;
  /** Deterministic per session + question, so a reload reshuffles but a re-render does not. */
  seed: string;
  mode: 'immediate' | 'deferred';
  chosenOriginalIndex?: number | null;
  onSelect?: (originalIndex: number) => void;
  onAnswered?: (correct: boolean) => void;
  onNext?: () => void;
  nextLabel?: string;
  position?: { index: number; total: number };
}

export function QuestionCard({
  question,
  seed,
  mode,
  chosenOriginalIndex = null,
  onSelect,
  onAnswered,
  onNext,
  nextLabel = 'Next question',
  position,
}: Props) {
  const { settings } = useAppState();
  // Keyed by question id so moving to the next question resets the reveal without an effect.
  const [reveal, setReveal] = useState<{ questionId: string; index: number } | null>(null);
  const revealed = reveal && reveal.questionId === question.id ? reveal.index : null;

  const presentation = useMemo(
    () => presentChoices(question.choices, question.correctAnswer, createRng(`${seed}:${question.id}`)),
    [question, seed],
  );

  const sign = question.signKey ? signByKey.get(question.signKey) : undefined;
  const canSpeak = settings.speechEnabled && speechAvailable();
  const answered = revealed !== null;
  const correct = answered && revealed === question.correctAnswer;

  const choose = (originalIndex: number) => {
    if (mode === 'deferred') {
      onSelect?.(originalIndex);
      return;
    }
    if (answered) return;
    setReveal({ questionId: question.id, index: originalIndex });
    onAnswered?.(originalIndex === question.correctAnswer);
  };

  const selected = mode === 'deferred' ? chosenOriginalIndex : revealed;

  return (
    <section className="question-card" aria-live="polite">
      {position ? (
        <p className="question-position">
          Question {position.index} of {position.total}
        </p>
      ) : null}
      {sign ? (
        <div className="question-sign">
          <SignSVG sign={sign} size={150} title="Road sign for this question" />
        </div>
      ) : null}
      <h2 className="question-text">{question.question}</h2>
      {canSpeak ? (
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => speak(`${question.question}. ${presentation.choices.map((c, i) => `Option ${i + 1}. ${c.text}`).join('. ')}`)}
        >
          Read question aloud
        </button>
      ) : null}
      <ul className="choice-list">
        {presentation.choices.map((choice, index) => {
          const isSelected = selected === choice.originalIndex;
          const isCorrectChoice = choice.originalIndex === question.correctAnswer;
          const state =
            mode === 'immediate' && answered
              ? isCorrectChoice
                ? ' choice-correct'
                : isSelected
                  ? ' choice-wrong'
                  : ''
              : isSelected
                ? ' choice-selected'
                : '';
          return (
            <li key={choice.originalIndex}>
              <button
                type="button"
                className={`choice${state}`}
                onClick={() => choose(choice.originalIndex)}
                disabled={mode === 'immediate' && answered}
                aria-pressed={isSelected}
              >
                <span className="choice-marker">{String.fromCharCode(65 + index)}</span>
                <span className="choice-text">{choice.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {mode === 'immediate' && answered ? (
        correct ? (
          <div className="correct-panel" role="status">
            <p className="correct-verdict">Correct.</p>
            <p>{question.explanation}</p>
            <SourceLine source={question.source} />
          </div>
        ) : (
          <MissPanel question={question} />
        )
      ) : null}

      {mode === 'immediate' && answered && onNext ? (
        <button type="button" className="btn btn-primary btn-block" onClick={onNext}>
          {nextLabel}
        </button>
      ) : null}
    </section>
  );
}
