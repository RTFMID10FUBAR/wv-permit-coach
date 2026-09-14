import type { Concept, Topic } from '../content/types';
import { MOCK_PASS_MARK, MOCK_TARGET_SCORE } from './exam';
import { aggregateMastery, effectiveMastery, firstAttemptAccuracy } from './mastery';
import type { ConceptMastery, MockResult } from './types';

export type ReadinessLabel = 'Not Ready' | 'Getting There' | 'Likely Ready' | 'Strong';

export const READINESS_DISCLAIMER =
  'Study Readiness describes your practice results in this app only. It does not predict or guarantee your result on the real DMV test.';

export interface ReadinessSignal {
  id: string;
  label: string;
  value: number;
  display: string;
  target: string;
  met: boolean;
  detail: string;
}

export interface ReadinessBreakdown {
  label: ReadinessLabel;
  score: number;
  signals: ReadinessSignal[];
  blockers: string[];
  nextStep: string;
  disclaimer: string;
}

export interface ReadinessInput {
  mocks: readonly MockResult[];
  records: Record<string, ConceptMastery>;
  topics: readonly Topic[];
  concepts: readonly Concept[];
  now?: number;
}

const STRONG = {
  targetMocks: 3,
  recentAverageRatio: MOCK_TARGET_SCORE / 25,
  firstAttempt: 0.8,
  spread: 0.8,
  recovery: 0.7,
  maxWeakTopics: 0,
};

const LIKELY = {
  passingMocks: 2,
  recentAverageRatio: MOCK_PASS_MARK / 25,
  firstAttempt: 0.7,
  spread: 0.6,
  recovery: 0.5,
  maxWeakTopics: 1,
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function computeReadiness(input: ReadinessInput): ReadinessBreakdown {
  const now = input.now ?? Date.now();
  const { mocks, records, topics, concepts } = input;

  const sorted = [...mocks].sort((a, b) => a.finishedAt - b.finishedAt);
  const recent = sorted.slice(-3);
  const recentRatio =
    recent.length === 0
      ? 0
      : recent.reduce((acc, m) => acc + (m.total > 0 ? m.score / m.total : 0), 0) / recent.length;
  const targetMocks = sorted.filter((m) => m.total > 0 && m.score / m.total >= MOCK_TARGET_SCORE / 25);
  const passingMocks = sorted.filter((m) => m.total > 0 && m.score / m.total >= MOCK_PASS_MARK / 25);

  const topicScores = topics.map((topic) => {
    const ids = concepts.filter((c) => c.topicId === topic.id).map((c) => c.id);
    return { topic, score: aggregateMastery(ids, records, now), conceptCount: ids.length };
  });
  const scoredTopics = topicScores.filter((t) => t.conceptCount > 0);
  const weakTopics = scoredTopics.filter((t) => t.score < 0.4);
  const spread =
    scoredTopics.length === 0
      ? 0
      : scoredTopics.filter((t) => t.score >= 0.65).length / scoredTopics.length;

  const formerlyMissed = Object.values(records).filter((r) => r.everMissed);
  const recovered = formerlyMissed.filter(
    (r) => r.missedQuestionIds.length === 0 && effectiveMastery(r, now) >= 0.65,
  );
  const recovery = formerlyMissed.length === 0 ? 1 : recovered.length / formerlyMissed.length;

  const firstAttempt = firstAttemptAccuracy(records);
  const answered = Object.values(records).reduce((acc, r) => acc + r.attempts, 0);

  const signals: ReadinessSignal[] = [
    {
      id: 'mocks-at-target',
      label: `Mock exams scoring ${MOCK_TARGET_SCORE}+/25`,
      value: targetMocks.length,
      display: `${targetMocks.length}`,
      target: `${STRONG.targetMocks} or more`,
      met: targetMocks.length >= STRONG.targetMocks,
      detail: `Strong requires at least ${STRONG.targetMocks} separate mock exams at ${MOCK_TARGET_SCORE}/25 or better. You have ${targetMocks.length}.`,
    },
    {
      id: 'recent-average',
      label: 'Average of last 3 mock exams',
      value: recentRatio,
      display: recent.length === 0 ? 'No mocks yet' : `${(recentRatio * 25).toFixed(1)}/25`,
      target: `${MOCK_TARGET_SCORE}/25`,
      met: recent.length > 0 && recentRatio >= STRONG.recentAverageRatio,
      detail:
        recent.length === 0
          ? 'Take a 25-question mock exam to start this measurement.'
          : `Your last ${recent.length} mock exam(s) averaged ${(recentRatio * 25).toFixed(1)} out of 25.`,
    },
    {
      id: 'weak-topics',
      label: 'Topics still below 40% mastery',
      value: weakTopics.length,
      display: `${weakTopics.length}${scoredTopics.length ? ` of ${scoredTopics.length}` : ''}`,
      target: 'None',
      met: scoredTopics.length > 0 && weakTopics.length === 0,
      detail:
        weakTopics.length === 0
          ? 'No topic is sitting below 40% mastery.'
          : `Weakest: ${weakTopics
              .slice()
              .sort((a, b) => a.score - b.score)
              .slice(0, 3)
              .map((t) => `${t.topic.title} (${pct(t.score)})`)
              .join(', ')}.`,
    },
    {
      id: 'first-attempt',
      label: 'First-attempt accuracy',
      value: firstAttempt,
      display: answered === 0 ? 'No answers yet' : pct(firstAttempt),
      target: pct(STRONG.firstAttempt),
      met: answered > 0 && firstAttempt >= STRONG.firstAttempt,
      detail:
        'How often you get a question right the first time you ever see it — the closest thing here to a cold test.',
    },
    {
      id: 'spread',
      label: 'Topics at 65% mastery or better',
      value: spread,
      display: scoredTopics.length === 0 ? 'No topics scored' : pct(spread),
      target: pct(STRONG.spread),
      met: scoredTopics.length > 0 && spread >= STRONG.spread,
      detail: 'Readiness means being even across topics, not excellent at one.',
    },
    {
      id: 'recovery',
      label: 'Recovery on rules you previously missed',
      value: recovery,
      display: formerlyMissed.length === 0 ? 'Nothing missed yet' : pct(recovery),
      target: pct(STRONG.recovery),
      met: formerlyMissed.length === 0 ? answered > 0 : recovery >= STRONG.recovery,
      detail:
        formerlyMissed.length === 0
          ? 'Once you miss something, this tracks whether you actually fixed it.'
          : `${recovered.length} of ${formerlyMissed.length} previously-missed rules are now back above 65%.`,
    },
  ];

  const blockers: string[] = [];
  const strong =
    targetMocks.length >= STRONG.targetMocks &&
    recent.length > 0 &&
    recentRatio >= STRONG.recentAverageRatio &&
    scoredTopics.length > 0 &&
    weakTopics.length <= STRONG.maxWeakTopics &&
    spread >= STRONG.spread &&
    firstAttempt >= STRONG.firstAttempt &&
    recovery >= STRONG.recovery;

  const likely =
    passingMocks.length >= LIKELY.passingMocks &&
    recent.length > 0 &&
    recentRatio >= LIKELY.recentAverageRatio &&
    scoredTopics.length > 0 &&
    weakTopics.length <= LIKELY.maxWeakTopics &&
    spread >= LIKELY.spread &&
    firstAttempt >= LIKELY.firstAttempt &&
    recovery >= LIKELY.recovery;

  const overallMastery = aggregateMastery(concepts.map((c) => c.id), records, now);
  const gettingThere = answered >= 20 || overallMastery >= 0.35 || sorted.length >= 1;

  let label: ReadinessLabel;
  if (strong) label = 'Strong';
  else if (likely) label = 'Likely Ready';
  else if (gettingThere) label = 'Getting There';
  else label = 'Not Ready';

  if (!strong) {
    if (targetMocks.length < STRONG.targetMocks) {
      blockers.push(
        `${STRONG.targetMocks - targetMocks.length} more mock exam(s) at ${MOCK_TARGET_SCORE}+/25 needed for Strong.`,
      );
    }
    if (weakTopics.length > STRONG.maxWeakTopics) {
      blockers.push(`${weakTopics.length} topic(s) still below 40% mastery.`);
    }
    if (answered === 0 || firstAttempt < STRONG.firstAttempt) {
      blockers.push(`First-attempt accuracy is ${answered === 0 ? 'not measured yet' : pct(firstAttempt)}; ${pct(STRONG.firstAttempt)} needed.`);
    }
    if (scoredTopics.length === 0 || spread < STRONG.spread) {
      blockers.push(`Only ${scoredTopics.length === 0 ? '0%' : pct(spread)} of topics are at 65%+ mastery.`);
    }
    if (formerlyMissed.length > 0 && recovery < STRONG.recovery) {
      blockers.push(`${formerlyMissed.length - recovered.length} previously-missed rule(s) are not fixed yet.`);
    }
  }

  const weakest = scoredTopics.slice().sort((a, b) => a.score - b.score)[0];
  const nextStep =
    label === 'Strong'
      ? 'Keep taking mock exams to stay sharp, and re-check anything you miss.'
      : sorted.length === 0
        ? 'Take a 25-question mock exam to get a real baseline.'
        : weakTopics.length > 0 && weakest
          ? `Work your weakest topic next: ${weakest.topic.title}.`
          : 'Run another mock exam, then study every question you miss.';

  const metCount = signals.filter((s) => s.met).length;

  return {
    label,
    score: signals.length === 0 ? 0 : metCount / signals.length,
    signals,
    blockers,
    nextStep,
    disclaimer: READINESS_DISCLAIMER,
  };
}
