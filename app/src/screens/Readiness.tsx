import { useMemo } from 'react';
import { Screen } from '../components/Shell';
import { content } from '../content';
import { computeReadiness } from '../lib/readiness';
import { useAppState } from '../state/useAppState';

export function ReadinessScreen() {
  const { records, mocks } = useAppState();
  const readiness = useMemo(
    () => computeReadiness({ mocks, records, topics: content.topics, concepts: content.concepts }),
    [mocks, records],
  );

  return (
    <Screen title="Study Readiness" subtitle={`Current label: ${readiness.label}`}>
      <p className="lead">{readiness.nextStep}</p>

      <h2>What the label is made of</h2>
      <ul className="signal-list">
        {readiness.signals.map((signal) => (
          <li key={signal.id} className={signal.met ? 'signal signal-met' : 'signal'}>
            <div className="signal-head">
              <span className="signal-label">{signal.label}</span>
              <span className="signal-value">{signal.display}</span>
            </div>
            <p className="signal-detail">{signal.detail}</p>
            <p className="signal-target">
              Target for Strong: {signal.target} — {signal.met ? 'met' : 'not met'}
            </p>
          </li>
        ))}
      </ul>

      {readiness.blockers.length > 0 ? (
        <>
          <h2>What is holding the label back</h2>
          <ul className="blocker-list">
            {readiness.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="readiness-disclaimer">{readiness.disclaimer}</p>
    </Screen>
  );
}
