import type { CourseId } from '../content/types';

/**
 * The two licences this app studies for.
 *
 * The pass marks are NOT the same and this is the most important difference to get
 * right: the Class E knowledge test requires 19 of 25, while the motorcycle knowledge
 * examination requires a grade of 80% or better, which is 20 of 25. Both figures are
 * verified against the handbook — see docs/SOURCE_AUDIT.md.
 *
 * `targetScore` is this app's practice target, deliberately above the official minimum
 * to leave margin for test-day error. It is a training choice, not a legal requirement,
 * and the UI says so.
 */
export interface CourseConfig {
  id: CourseId;
  label: string;
  shortLabel: string;
  /** What the learner is working toward. */
  credential: string;
  examSize: number;
  passMark: number;
  targetScore: number;
  /** Shown under the pass mark so the official standard is never misstated. */
  passNote: string;
}

export const COURSES: Record<CourseId, CourseConfig> = {
  car: {
    id: 'car',
    label: "Car — Class E driver's licence",
    shortLabel: 'Car',
    credential: 'Class E instruction permit / driver’s licence',
    examSize: 25,
    passMark: 19,
    targetScore: 22,
    passNote: 'The official requirement is 19 of 25 correct.',
  },
  motorcycle: {
    id: 'motorcycle',
    label: 'Motorcycle — F endorsement',
    shortLabel: 'Motorcycle',
    credential: 'Motorcycle instruction permit / F endorsement',
    examSize: 25,
    passMark: 20,
    targetScore: 23,
    passNote:
      'The official requirement is a grade of 80% or better — 20 of 25 correct.',
  },
};

export const DEFAULT_COURSE: CourseId = 'car';

export function courseConfig(id: CourseId | undefined): CourseConfig {
  return COURSES[id ?? DEFAULT_COURSE] ?? COURSES[DEFAULT_COURSE];
}

export const COURSE_LIST: CourseConfig[] = [COURSES.car, COURSES.motorcycle];
