# WV Permit Coach

**Learn the rule. Don't memorize the button.**

A free, offline, installable study app for the **West Virginia knowledge tests** — the
Class E driver's permit and the motorcycle F endorsement — built directly from the
official West Virginia handbooks.

No account. No ads. No tracking. No network calls while you study.

> **Unofficial study aid. Not affiliated with or endorsed by the West Virginia Division
> of Motor Vehicles. Study content is based on the West Virginia Driver's Licensing
> Handbook and identified official sources.**

---

## Why this exists

Most permit-practice sites let you click through random multiple-choice questions until
you remember which answer looks right. That gets people through a practice quiz and then
fails them at the DMV, because they learned a question bank instead of the rules.

This app is built the other way round, and it is built for someone who **will not sit
down and read the handbook**. So it doesn't ask her to.

**One tap on Start goes straight into a question.** No topic to choose, no chapter, no
lesson to read first. When she gets one wrong, the rule comes to her — at the moment she
has a reason to want it.

## How the learning loop actually works

**Answer → if wrong, the correct answer leads → the rule and why → lock it in → the same
rule comes back later in a different form.**

- **The correct answer is the loudest thing on the screen.** Retention comes from the
  right answer, not from dwelling on the wrong one. Her mistake is addressed underneath,
  briefly and specifically: *"You picked 'X'"* followed by why that particular choice is
  wrong — not a generic explanation.
- **Lock it in.** After a miss she has to tap the correct answer herself before moving
  on. Reading an answer is recognition; producing it is retrieval, and retrieval is what
  survives to test day.
- **Missed questions come back until she gets them right.** A missed concept goes to the
  top of the queue, but returns as a *different question on the same rule* — re-testing
  the rule, not re-showing the answer. It stays weighted in later sessions and only
  clears when she answers that exact question correctly, which then counts extra toward
  mastery.
- **Mastery is per concept, never per question.** One lucky answer can never mark
  anything mastered: it takes several correct answers, across more than one session,
  including at least one applied or scenario question. There is a test that proves this.
- **Every concept is tested more than one way** — direct, scenario, reversed, "which is
  NOT correct", and sign-recognition — so a rule learned here still fires when the real
  exam words it differently.

## What's in it

| | |
|---|---|
| **Start** | One tap, straight into questions. The front door. |
| **Road Signs** | Real sign images from the handbook, plus locally drawn SVG signs. Show the sign → name the meaning, and the reverse. |
| **Numbers and Limits** | Every exact figure — 500 ft vs 200 ft dimming, 0.05 vs 0.08 BAC, 15 mph school zones. Pure recall, drilled. |
| **Weak Areas** | Topics ranked weakest first; tap one to drill it. |
| **Missed Questions** | Everything she got wrong, grouped by rule. |
| **25-Question Mock Exam** | Timed, balanced across topics, no feedback until submit, unanswered counts wrong — like the real thing. |
| **Progress** | Mastery by topic, mock history, JSON export, printable summary. |
| **By Topic / Quick Lesson** | For when she *does* want to read. Optional, never required. |
| **The Handbook** | The whole official book, searchable, offline — and **interactive**: read a page, then answer the questions drawn from *that page*. |
| **Read aloud** | Optional speech, using the device's own voice. No cloud service. |

### Two courses, one app

Pick **Car** or **Motorcycle**. Same engine, same mastery model, different content — and
**different pass marks, which are not interchangeable**:

| | Questions | To pass | App's practice target |
|---|---|---|---|
| Class E (car) | 25 | **19** | 22+ |
| Motorcycle (F endorsement) | 25 | **20** (80%) | 23+ |

Both figures are verified against the handbooks, not assumed.

## Accuracy: enforced by the build, not promised

Every question, concept, lesson and sign carries a **verbatim quote** from the official
source, with chapter, section and both the printed and PDF page numbers.
`tools/validate_content.py` asserts that each quote **actually appears on the page it
cites**. Content that cannot be found in the official PDF fails validation and does not
ship. It also checks there is exactly one correct answer, no duplicate choices, no
missing explanations, no duplicate ids, and that every concept is tested at least two
different ways.

Questions are **original**. Nothing is copied from commercial practice-test banks, and
nothing here is claimed to be an actual DMV question.

### Sources

| | |
|---|---|
| WV Driver's Licensing Handbook | **Revised 07/2026**, 90 pages, SHA-256 `45082246…` |
| WV Motorcycle Operator Manual | MSF 18th edition, 58 pages, SHA-256 `3153bb43…` |

Both were retrieved from the live WV DMV links in September 2026. The driver's handbook
is committed under `source_material/` so anyone can verify the content against the exact
bytes used.

**Verified exam parameters** (confirmed in the handbooks, not taken on trust): at least
25 questions, drawn from the handbook's basic knowledge, traffic rules, regulations,
signs and markings; 19 of 25 to pass the Class E test; the exam is timed and unanswered
questions count as incorrect; a failed applicant may not be retested twice within one
week (§17B-2-6); the motorcycle exam requires 80%.

See **[`docs/SOURCE_AUDIT.md`](docs/SOURCE_AUDIT.md)** for full provenance, the text
extraction method and its known limits, handbook statements that conflict with each other
(recorded, not silently fixed), and what was deliberately excluded.
**[`docs/QUESTION_COVERAGE.md`](docs/QUESTION_COVERAGE.md)** is generated from the content
and reports gaps as well as coverage.

## Privacy

- No account, no login, no sign-up
- No ads, no analytics, no tracking
- No personal data leaves the device
- No network calls during ordinary study
- Progress is stored locally and can be exported or deleted

## Install it on a phone

It's a PWA — installs from the browser, then works with no internet at all. An Android
APK can also be built, with the handbook PDF bundled inside so it needs no download.

See **[`docs/INSTALL.md`](docs/INSTALL.md)** for step-by-step instructions, including
serving it over your home Wi-Fi to install on a phone.

## Build it yourself

```bash
cd app
npm install
npm run build      # production build into app/dist
npm run preview    # serve it
```

Verification — all four must pass:

```bash
cd app && npm run lint && npm run typecheck && npm test && npm run build
python3 tools/validate_content.py     # from the repo root: checks every quote against the PDFs
```

Regenerating derived artifacts:

```bash
python3 source_material/extract_handbook.py     # PDF -> page-anchored text
python3 source_material/extract_motorcycle.py
python3 tools/extract_figures.py                # sign/diagram figures from handbook pages
python3 tools/gen_handbook_text.py              # bundle the handbook into the app
python3 tools/merge_content.py                  # merge authored parts -> content bundle
python3 tools/gen_coverage.py                   # regenerate the coverage report
```

## Contributing

Corrections to study content are genuinely welcome — accuracy matters more here than
features. If you find a question that misstates a rule, please open an issue citing the
handbook chapter and printed page. Content changes must keep a verbatim `sourceQuote`
that passes `tools/validate_content.py`.

Please do **not** submit questions copied from commercial practice-test sites.

## Licence

Project code and original study content: **MIT** — see [`LICENSE`](LICENSE).

`source_material/Drivers_Licensing_Handbook.pdf` is a publication of the **West Virginia
Division of Motor Vehicles**, included unmodified for verification and offline reference.
It is **not** covered by this project's MIT licence.

The **Motorcycle Operator Manual** is the **Motorcycle Safety Foundation's** work
(18th edition), published by WV DMV — originally developed under contract to NHTSA and
supplied free to state licensing agencies. It is **not** a work of the State of West
Virginia and is **not** redistributed in this repository; the build fetches it locally.
Motorcycle questions here are original and derived from it.

This project is not affiliated with, sponsored by, or endorsed by the West Virginia
Division of Motor Vehicles, the State of West Virginia, or the Motorcycle Safety
Foundation.
