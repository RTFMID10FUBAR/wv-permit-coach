import { Disclaimer, Screen } from '../components/Shell';
import { contentCounts, contentIssues } from '../content';
import { MOCK_PASS_MARK, MOCK_TARGET_SCORE } from '../lib/exam';
import { READINESS_DISCLAIMER } from '../lib/readiness';

export function About() {
  return (
    <Screen title="About" subtitle="WV Permit Coach">
      <p className="lead">Learn the rule. Don&rsquo;t memorize the button.</p>

      <h2>How this app works</h2>
      <ul className="about-list">
        <li>Mastery is tracked per rule, not per question, so memorising one answer proves nothing.</li>
        <li>Answer order and question order are shuffled every session. Wording and numbers are never altered.</li>
        <li>Every question and rule cites the handbook chapter and printed page it came from.</li>
        <li>
          Mock exams are 25 questions balanced across topics by exam weight; the pass mark used here
          is {MOCK_PASS_MARK}/25 and the study goal is {MOCK_TARGET_SCORE}+/25.
        </li>
        <li>No account, no network calls, no analytics, no ads. Progress never leaves this device.</li>
      </ul>

      <h2>Study Readiness</h2>
      <p>{READINESS_DISCLAIMER}</p>

      <h2>Content loaded in this build</h2>
      <ul className="about-list">
        <li>{contentCounts.topics} topics</li>
        <li>{contentCounts.lessons} lessons</li>
        <li>{contentCounts.concepts} concepts</li>
        <li>{contentCounts.questions} questions</li>
        <li>{contentCounts.signs} road signs</li>
      </ul>
      {contentIssues.length > 0 ? (
        <>
          <h2>Content notes</h2>
          <ul className="about-list">
            {contentIssues.map((issue) => (
              <li key={issue.message}>{issue.message}</li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>Disclaimer</h2>
      <Disclaimer />
    </Screen>
  );
}
