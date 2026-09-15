/**
 * WV Permit Coach — content data contract.
 *
 * Every study object is traceable to the official West Virginia Driver's Licensing
 * Handbook. `sourceQuote` is load-bearing, not decoration: the validator asserts that
 * the quote appears VERBATIM on the cited PDF page of the real handbook. A question
 * whose quote cannot be found on its page fails the build. That is the anti-invention
 * guarantee for this app's content.
 */

/** Roman numeral chapter of the handbook, as printed. */
export type ChapterId = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX';

export type QuestionType =
  | 'direct' // states the rule back
  | 'scenario' // a driving situation requiring application
  | 'reversed' // given the rule, pick the situation
  | 'negative' // "which is NOT correct?"
  | 'sign' // identify a sign or its meaning
  | 'application'; // multi-step reasoning from the rule

export type Difficulty = 'core' | 'moderate' | 'tricky';

/** Where a fact came from. Both page numbers are kept: the handbook prints a page
 *  number 10 lower than the PDF page, and a learner checking the printed book needs
 *  the printed number while the validator needs the PDF page. */
export interface SourceRef {
  sourceDocument: string;
  chapter: ChapterId;
  chapterTitle: string;
  section: string;
  pdfPage: number;
  printedPage: number;
  /** Verbatim span from the handbook. MUST appear on `pdfPage`. */
  sourceQuote: string;
  verifiedDate: string; // ISO date the quote was machine-verified against the PDF
}

/** A single testable idea. Mastery is tracked per concept, never per question, so a
 *  learner cannot reach "mastered" by memorising one question's answer position. */
export interface Concept {
  id: string;
  topicId: string;
  label: string;
  /** The rule in one sentence, plain English. */
  statement: string;
  source: SourceRef;
}

export interface Question {
  id: string;
  topicId: string;
  subtopic: string;
  conceptId: string;
  question: string;
  choices: string[];
  /** Index into `choices`, in authored order. Presentation shuffles at runtime. */
  correctAnswer: number;
  /** Why the answer is right — the part that does the teaching. */
  explanation: string;
  /**
   * Optional, parallel to `choices`: why THAT specific wrong choice is wrong.
   *
   * Explaining only why the correct answer is correct leaves a learner who picked a
   * distractor to work out their own error. Where these exist the miss panel names the
   * chosen answer and addresses it directly, BEFORE revealing the correct one.
   *
   * The entry for `correctAnswer` is null. Absent entries fall back to restating the
   * governing rule against the chosen answer — honest, and never invented.
   */
  choiceExplanations?: (string | null)[];
  questionType: QuestionType;
  difficulty: Difficulty;
  source: SourceRef;
  /** Optional sign key for visual questions, resolved against the sign registry. */
  signKey?: string;
}

export interface Lesson {
  id: string;
  topicId: string;
  title: string;
  /** The operative rules, quoted or closely paraphrased, each source-backed. */
  rules: { text: string; source: SourceRef }[];
  plainEnglish: string;
  whyItMatters: string;
  /** A concrete driving situation that makes the rule stick. */
  example: string;
  conceptIds: string[];
  estimatedMinutes: number;
}

export interface Topic {
  id: string;
  title: string;
  chapter: ChapterId;
  /** Display order on the study path. */
  order: number;
  /** Short line shown under the title on the topic list. */
  blurb: string;
  examWeight: number; // relative share of mock-exam questions, 1 = normal
}

/** Road signs are drawn as local SVG from these specs — no third-party imagery, and
 *  nothing that could be mistaken for an official seal. */
export interface SignSpec {
  key: string;
  name: string;
  /** MUTCD-style category driving the shape/colour rules taught in Chapter V. */
  category:
    | 'regulatory'
    | 'warning'
    | 'guide'
    | 'construction'
    | 'school'
    | 'railroad'
    | 'services';
  shape:
    | 'octagon'
    | 'triangle-down'
    | 'diamond'
    | 'rectangle-v'
    | 'rectangle-h'
    | 'pennant'
    | 'circle'
    | 'pentagon'
    | 'crossbuck';
  bg: string;
  fg: string;
  /** Text rendered inside the sign, if any. */
  legend?: string;
  /** What the sign means, plain English. */
  meaning: string;
  /** What the driver must actually DO. */
  action: string;
  source: SourceRef;
}

export interface ContentBundle {
  topics: Topic[];
  concepts: Concept[];
  lessons: Lesson[];
  questions: Question[];
  signs: SignSpec[];
}
