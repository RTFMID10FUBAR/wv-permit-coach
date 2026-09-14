# WV Permit Coach

**Learn the rule. Don't memorize the button.**

A free, offline, installable study app for the **West Virginia learner's permit / Class E
knowledge test**, built directly from the official West Virginia Driver's Licensing
Handbook.

> **Unofficial study aid. Not affiliated with or endorsed by the West Virginia Division of
> Motor Vehicles. Study content is based on the West Virginia Driver's Licensing Handbook
> and identified official sources.**

---

## Why this exists

Most permit-practice sites let you click through random multiple-choice questions until
you've memorised which answer looks right. That gets people through a practice quiz and
then fails them at the DMV, because they learned a question bank instead of the rules.

This app is built the other way round:

**Read the actual rule → plain-English explanation → answer a comprehension question →
find out *why* the answer is right → review anything missed → get re-tested on the same
concept in a different form → and only then take full mock exams.**

Design decisions that follow from that:

- **Mastery is tracked per concept, not per question.** Answering one question correctly
  can never mark a concept mastered. It takes several correct answers, across more than one
  session, including at least one applied/scenario question.
- **Missing a question never just says "wrong."** It shows the correct answer, the
  governing rule, a plain-English explanation of *why*, and the handbook chapter and page —
  then re-queues a **different** question on the same concept later.
- **Every question is traceable to the handbook.** Each one carries the chapter, section,
  printed page and a verbatim source quote.
- **Questions are original.** Nothing is copied from commercial practice-test banks, and
  nothing here is claimed to be an actual DMV question.

## Source and accuracy

All content derives from the official handbook:

| | |
|---|---|
| Document | West Virginia Driver's Licensing Handbook, **Revised 07/2026** |
| Source | `https://webapps.transportation.wv.gov/TWS/DMV/Drivers_Licensing_Handbook.pdf` |
| Retrieved | 2026-09-14 |
| SHA-256 | `45082246ab6df6c75d0968a680b6a7ad26d334aeb2e547871dea3fd7c7828a7a` |

The exact copy used is committed under `source_material/` so anyone can verify the content
against the same bytes.

**Accuracy is enforced by the build, not by good intentions.** Every piece of study content
carries a verbatim `sourceQuote`, and `tools/validate_content.py` asserts that the quote
actually appears on the handbook page it cites. Content that cannot be found in the
official PDF fails validation. See [`docs/SOURCE_AUDIT.md`](docs/SOURCE_AUDIT.md) for the
full provenance record, the extraction method, known limitations, and the officially
verified exam parameters.

### Officially verified exam parameters

Confirmed against Chapter IV of the handbook (not taken on trust):

- The knowledge examination has **at least 25 questions**
- **19 of 25 correct** is required to pass
- The examination is **timed**, and unanswered questions count as incorrect
- Applicants who fail may **not be retested twice within one week** (§17B-2-6)

The app's practice target is deliberately **22/25**, above the official minimum, to leave
margin for test-day mistakes. The official 19/25 requirement is stated plainly in the app.

## Privacy

- No account, no login, no sign-up
- No ads, no analytics, no tracking
- No personal data transmitted anywhere
- No network calls during ordinary study
- All progress is stored locally on your own device, and you can export or delete it

## Install on a phone

The app is a PWA — it installs from the browser and works with no internet afterwards.

See [`docs/INSTALL.md`](docs/INSTALL.md) for step-by-step instructions, including serving it
on your home network to install it on an Android phone.

## Build it yourself

```bash
cd app
npm install
npm run dev        # development
npm run build      # production build into app/dist
npm run preview    # serve the production build
```

Verification:

```bash
cd app && npm run lint && npm run typecheck && npm test && npm run build
python3 tools/validate_content.py     # from the repo root — checks every quote against the PDF
```

## Contributing

Corrections to study content are genuinely welcome — accuracy matters more here than
features. If you find a question that misstates a rule, please open an issue citing the
handbook chapter and printed page. Content changes must keep a verbatim `sourceQuote` that
passes `tools/validate_content.py`.

Please do **not** submit questions copied from commercial practice-test sites.

## Licence

Project code and original study content: **MIT** — see [`LICENSE`](LICENSE).

`source_material/Drivers_Licensing_Handbook.pdf` is a publication of the **West Virginia
Division of Motor Vehicles**, included unmodified for verification and offline reference.
It is **not** covered by this project's MIT licence and remains the work of its publisher.
All rights in that document belong to the State of West Virginia. If you are the publisher
and would prefer it not be redistributed here, open an issue and it will be removed and
replaced with a download script.

This project is not affiliated with, sponsored by, or endorsed by the West Virginia
Division of Motor Vehicles or the State of West Virginia.
