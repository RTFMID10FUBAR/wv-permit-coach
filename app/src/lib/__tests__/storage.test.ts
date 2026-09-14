import { beforeEach, describe, expect, it } from 'vitest';
import { createBackend, wrapBackend } from '../storage';
import { createConceptMastery } from '../mastery';

describe('progress store fallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to web storage when IndexedDB is unavailable and round-trips data', async () => {
    const backend = await createBackend();
    expect(['indexeddb', 'localstorage', 'memory']).toContain(backend.kind);
    const store = wrapBackend(backend);

    const record = { ...createConceptMastery('c1'), attempts: 2, correct: 1, masteryScore: 0.5 };
    await store.putMastery(record);
    expect((await store.getMastery()).c1.masteryScore).toBe(0.5);

    await store.setSettings({ textScale: 1.35, speechEnabled: true });
    expect(await store.getSettings()).toEqual({ textScale: 1.35, speechEnabled: true });

    await store.setSeenQuestions(['q1', 'q2']);
    expect(await store.getSeenQuestions()).toEqual(['q1', 'q2']);

    await store.clearProgress();
    expect(await store.getMastery()).toEqual({});
    expect(await store.getSeenQuestions()).toEqual([]);
    // Settings survive a progress reset.
    expect((await store.getSettings()).textScale).toBe(1.35);
  });

  it('returns defaults when nothing has been saved', async () => {
    const store = wrapBackend(await createBackend());
    expect(await store.getSettings()).toEqual({ textScale: 1, speechEnabled: false });
    expect(await store.getMocks()).toEqual([]);
  });
});
