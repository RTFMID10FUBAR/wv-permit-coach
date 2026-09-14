import { useState } from 'react';
import { Screen } from '../components/Shell';
import { speak, speechAvailable } from '../lib/speech';
import { useAppState } from '../state/useAppState';

const SCALES = [
  { value: 0.9, label: 'Small' },
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Large' },
  { value: 1.35, label: 'Larger' },
  { value: 1.6, label: 'Largest' },
];

export function SettingsScreen() {
  const { settings, updateSettings, resetProgress } = useAppState();
  const [confirming, setConfirming] = useState(false);
  const speechOk = speechAvailable();

  return (
    <Screen title="Settings" subtitle="Everything here is stored on this device only">
      <section className="settings-block">
        <h2>Text size</h2>
        <div className="scale-row" role="group" aria-label="Text size">
          {SCALES.map((scale) => (
            <button
              key={scale.value}
              type="button"
              className={`chip${Math.abs(settings.textScale - scale.value) < 0.01 ? ' chip-active' : ''}`}
              onClick={() => updateSettings({ textScale: scale.value })}
            >
              {scale.label}
            </button>
          ))}
        </div>
        <p className="sample-text">Sample: A steady red arrow means stop and stay stopped.</p>
      </section>

      {speechOk ? (
        <section className="settings-block">
          <h2>Read question aloud</h2>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.speechEnabled}
              onChange={(event) => updateSettings({ speechEnabled: event.target.checked })}
            />
            <span>Show a &ldquo;Read question aloud&rdquo; button on questions</span>
          </label>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => speak('Read question aloud is working.')}
            disabled={!settings.speechEnabled}
          >
            Test the voice
          </button>
        </section>
      ) : null}

      <section className="settings-block">
        <h2>Reset progress</h2>
        <p className="muted">
          Clears mastery, missed questions, mock exam history and lesson completions on this device.
          This cannot be undone.
        </p>
        {confirming ? (
          <div className="confirm-row">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                resetProgress();
                setConfirming(false);
              }}
            >
              Yes, erase my progress
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
            Reset progress
          </button>
        )}
      </section>
    </Screen>
  );
}
