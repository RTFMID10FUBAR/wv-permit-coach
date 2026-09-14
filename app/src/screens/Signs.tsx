import { useCallback, useMemo, useState } from 'react';
import { SignSVG } from '../components/SignSVG';
import { SourceLine } from '../components/SourceLine';
import { EmptyState, Screen } from '../components/Shell';
import { content } from '../content';
import { createRng } from '../lib/random';
import { SIGN_DRILL_MODES, SIGN_MODE_LABEL, buildSignDrill } from '../lib/signs';
import type { SignDrill, SignDrillMode } from '../lib/signs';
import { speak, speechAvailable } from '../lib/speech';
import { useAppState } from '../state/useAppState';

export function Signs() {
  const { sessionId, signStats, recordSign, settings } = useAppState();
  const signs = content.signs;

  const [round, setRound] = useState(0);
  const [mode, setMode] = useState<SignDrillMode | 'mixed'>('mixed');
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState({ asked: 0, correct: 0 });

  const activeMode: SignDrillMode =
    mode === 'mixed' ? SIGN_DRILL_MODES[round % SIGN_DRILL_MODES.length] : mode;

  const weakestKey = useMemo(() => {
    const scored = signs
      .map((sign) => {
        const stat = signStats[sign.key];
        const accuracy = stat && stat.attempts > 0 ? stat.correct / stat.attempts : -1;
        return { key: sign.key, accuracy, attempts: stat?.attempts ?? 0 };
      })
      .sort((a, b) => a.accuracy - b.accuracy || a.attempts - b.attempts);
    return scored[0]?.key;
  }, [signs, signStats]);

  const drill: SignDrill | null = useMemo(
    () =>
      buildSignDrill(
        signs,
        activeMode,
        createRng(`${sessionId}:signs:${round}`),
        4,
        round % 2 === 0 ? weakestKey : undefined,
      ),
    [signs, activeMode, sessionId, round, weakestKey],
  );

  const answer = useCallback(
    (index: number) => {
      if (chosen !== null || !drill) return;
      setChosen(index);
      const isCorrect = index === drill.correctIndex;
      recordSign(drill.answer.key, isCorrect);
      setScore((prev) => ({ asked: prev.asked + 1, correct: prev.correct + (isCorrect ? 1 : 0) }));
    },
    [chosen, drill, recordSign],
  );

  if (signs.length < 2) {
    return (
      <Screen title="Road Signs" subtitle="Shape, colour and meaning">
        <EmptyState
          title="No sign data loaded"
          message="Road sign specifications have not been added to this build yet."
        />
      </Screen>
    );
  }

  const canSpeak = settings.speechEnabled && speechAvailable();

  return (
    <Screen title="Road Signs" subtitle="Every sign is drawn locally — shape and colour are part of the answer">
      <div className="mode-switch" role="group" aria-label="Drill type">
        {(['mixed', ...SIGN_DRILL_MODES] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`chip${mode === option ? ' chip-active' : ''}`}
            onClick={() => {
              setMode(option);
              setChosen(null);
              setRound((r) => r + 1);
            }}
          >
            {option === 'mixed' ? 'Mixed' : SIGN_MODE_LABEL[option]}
          </button>
        ))}
      </div>

      <p className="muted">
        {SIGN_MODE_LABEL[activeMode]} · this session: {score.correct} correct of {score.asked}
      </p>

      {drill ? (
        <section className="question-card">
          {drill.mode === 'sign-to-meaning' ? (
            <div className="question-sign">
              <SignSVG sign={drill.answer} size={170} title="Road sign to identify" />
            </div>
          ) : null}
          <h2 className="question-text">{drill.prompt}</h2>
          {canSpeak ? (
            <button type="button" className="btn btn-quiet" onClick={() => speak(drill.prompt)}>
              Read question aloud
            </button>
          ) : null}

          {drill.textOptions ? (
            <ul className="choice-list">
              {drill.textOptions.map((text, index) => (
                <li key={text}>
                  <button
                    type="button"
                    className={`choice${
                      chosen === null
                        ? ''
                        : index === drill.correctIndex
                          ? ' choice-correct'
                          : chosen === index
                            ? ' choice-wrong'
                            : ''
                    }`}
                    onClick={() => answer(index)}
                    disabled={chosen !== null}
                  >
                    <span className="choice-marker">{String.fromCharCode(65 + index)}</span>
                    <span className="choice-text">{text}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {drill.signOptions ? (
            <ul className="sign-choice-grid">
              {drill.signOptions.map((option, index) => (
                <li key={option.key}>
                  <button
                    type="button"
                    className={`sign-choice${
                      chosen === null
                        ? ''
                        : index === drill.correctIndex
                          ? ' choice-correct'
                          : chosen === index
                            ? ' choice-wrong'
                            : ''
                    }`}
                    onClick={() => answer(index)}
                    disabled={chosen !== null}
                    aria-label={`Option ${String.fromCharCode(65 + index)}`}
                  >
                    <SignSVG sign={option} size={110} title={`Option ${String.fromCharCode(65 + index)}`} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {chosen !== null ? (
            <div className={chosen === drill.correctIndex ? 'correct-panel' : 'miss-panel'} role="status">
              <p className={chosen === drill.correctIndex ? 'correct-verdict' : 'miss-verdict'}>
                {chosen === drill.correctIndex ? 'Correct.' : 'Incorrect.'}
              </p>
              <p>
                <span className="miss-key">Sign:</span> {drill.answer.name}
              </p>
              <p>
                <span className="miss-key">Meaning:</span> {drill.answer.meaning}
              </p>
              <p>
                <span className="miss-key">What you must do:</span> {drill.answer.action}
              </p>
              <SourceLine source={drill.answer.source} showQuote={chosen !== drill.correctIndex} />
            </div>
          ) : null}

          {chosen !== null ? (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                setChosen(null);
                setRound((r) => r + 1);
              }}
            >
              Next sign
            </button>
          ) : null}
        </section>
      ) : (
        <EmptyState
          title="Not enough signs to build a drill"
          message="At least two distinct signs are needed to make a question."
        />
      )}
    </Screen>
  );
}
