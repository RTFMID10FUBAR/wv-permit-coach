import type { Concept, Topic } from '../content/types';
import { aggregateMastery, classifyMastery, effectiveMastery } from './mastery';
import type { ConceptMastery, LessonCompletion, MockResult, ProgressExport } from './types';

export interface ExportInput {
  topics: readonly Topic[];
  concepts: readonly Concept[];
  records: Record<string, ConceptMastery>;
  mocks: readonly MockResult[];
  lessons: readonly LessonCompletion[];
  now?: number;
}

export function buildProgressExport(input: ExportInput): ProgressExport {
  const now = input.now ?? Date.now();
  const topicRows = input.topics.map((topic) => {
    const ids = input.concepts.filter((c) => c.topicId === topic.id).map((c) => c.id);
    const score = aggregateMastery(ids, input.records, now);
    return {
      topicId: topic.id,
      title: topic.title,
      conceptsSeen: ids.filter((id) => (input.records[id]?.attempts ?? 0) > 0).length,
      masteryPercent: Math.round(score * 100),
      score,
    };
  });

  const answered = Object.values(input.records).reduce((acc, r) => acc + r.attempts, 0);
  const correct = Object.values(input.records).reduce((acc, r) => acc + r.correct, 0);

  return {
    exportedAt: new Date(now).toISOString(),
    app: 'WV Permit Coach',
    topicsStudied: topicRows.map(({ topicId, title, conceptsSeen, masteryPercent }) => ({
      topicId,
      title,
      conceptsSeen,
      masteryPercent,
    })),
    questionCounts: {
      answered,
      correct,
      incorrect: answered - correct,
      distinctQuestions: new Set(
        Object.values(input.records).flatMap((r) => r.missedQuestionIds),
      ).size,
    },
    mockScores: input.mocks.map((m) => ({
      date: new Date(m.finishedAt).toISOString(),
      score: m.score,
      total: m.total,
      passed: m.passed,
      durationSeconds: m.durationSeconds,
    })),
    weakTopics: topicRows
      .filter((t) => t.score < 0.4)
      .sort((a, b) => a.score - b.score)
      .map(({ topicId, title, masteryPercent }) => ({ topicId, title, masteryPercent })),
    masteryByConcept: Object.values(input.records).map((r) => ({
      conceptId: r.conceptId,
      masteryScore: Number(effectiveMastery(r, now).toFixed(4)),
      band: classifyMastery(r, now),
      attempts: r.attempts,
    })),
    lessonsCompleted: input.lessons.map((l) => ({
      lessonId: l.lessonId,
      completedAt: new Date(l.completedAt).toISOString(),
      markedMastered: l.markedMastered,
    })),
  };
}

export function buildPlainSummary(data: ProgressExport): string {
  const lines: string[] = [
    'WV Permit Coach — Progress Summary',
    `Generated: ${new Date(data.exportedAt).toLocaleString()}`,
    '',
    `Questions answered: ${data.questionCounts.answered} (correct ${data.questionCounts.correct}, incorrect ${data.questionCounts.incorrect})`,
    `Mock exams taken: ${data.mockScores.length}`,
  ];
  if (data.mockScores.length > 0) {
    const best = data.mockScores.reduce((a, b) => (b.score > a.score ? b : a));
    lines.push(`Best mock score: ${best.score}/${best.total}`);
    lines.push(
      `Recent mocks: ${data.mockScores
        .slice(-5)
        .map((m) => `${m.score}/${m.total}`)
        .join(', ')}`,
    );
  }
  lines.push('', 'Mastery by topic:');
  for (const topic of data.topicsStudied) {
    lines.push(`  ${topic.title}: ${topic.masteryPercent}% (${topic.conceptsSeen} concepts seen)`);
  }
  if (data.weakTopics.length > 0) {
    lines.push('', 'Weak topics to study next:');
    for (const topic of data.weakTopics) lines.push(`  ${topic.title} — ${topic.masteryPercent}%`);
  }
  lines.push(
    '',
    'Unofficial study aid. Not affiliated with or endorsed by the West Virginia Division of Motor Vehicles.',
  );
  return lines.join('\n');
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
