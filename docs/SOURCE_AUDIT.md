# Source Audit — WV Permit Coach

This document records exactly where the study content comes from, how it was obtained,
and what could not be established. It exists so that any claim in the app can be traced
back to the official source, and so that a reader can tell verified fact from inference.

## 1. Primary source

| Field | Value |
|---|---|
| Document | West Virginia Driver's Licensing Handbook |
| Publisher | West Virginia Department of Transportation, Division of Motor Vehicles |
| Revision shown on cover | **Revised 07/2026** |
| Retrieved from | `https://webapps.transportation.wv.gov/TWS/DMV/Drivers_Licensing_Handbook.pdf` |
| Linked from | `https://dmv.wv.gov/driver-services/drivers/drivers-licensing-handbooks` ("Download the Driver's Licensing Handbook") |
| Retrieval date | **2026-09-14T18:16:01Z** |
| HTTP status | 200, `content-type: application/pdf` |
| Server `last-modified` | Wed, 26 Aug 2026 14:52:11 GMT |
| File size | 17,209,872 bytes |
| Pages | 90 |
| **SHA-256** | `45082246ab6df6c75d0968a680b6a7ad26d334aeb2e547871dea3fd7c7828a7a` |
| Local copy | `source_material/Drivers_Licensing_Handbook.pdf` |

PDF internal metadata (`pdfinfo`), recorded because it disagrees slightly with the cover:

- Title: `Drivers-Handbook-2022_update.indd`
- Creator: Adobe InDesign 17.1 (Macintosh); Producer: Acrobat Distiller 26.0 (Windows)
- CreationDate: 2026-08-04; ModDate: 2026-08-04

**Reading of that discrepancy:** the InDesign source file is named for a 2022 update, but the
cover states Revised 07/2026 and the PDF was produced 2026-08-04. The cover date is treated
as the document's revision. The filename is an artifact of the publisher's working file, not
a statement about content currency. This is recorded rather than resolved — it is not
possible to tell from the PDF alone which sections were touched in the 2026 revision.

### 1a. The URL in common circulation is dead

`https://transportation.wv.gov/DMV/DMVFormSearch/Drivers_Licensing_Handbook_web.pdf` — the
URL widely cited for this handbook, and the one this project was originally pointed at —
returns **HTTP 301 then 404**, serving an HTML page titled
"404 - Not Found - Site Under Construction | WV Division of Motor Vehicles". WV DMV has
moved to the `dmv.wv.gov` domain. The 404 body was preserved as
`source_material/404_evidence_Drivers_Licensing_Handbook_web.html` so this finding can be
re-checked rather than taken on trust.

Anyone verifying this project should use the `webapps.transportation.wv.gov` URL above and
compare the SHA-256.

## 2. Text extraction and its limits

`source_material/extract_handbook.py` produces `handbook_clean.txt`, which is what the
content validator checks quotes against.

**Why a custom extractor was necessary.** Parts of the PDF are set in CID Type0 /
Identity-H fonts carrying **no ToUnicode map**, so standard extraction returns raw glyph
ids rather than characters — `pdftotext` renders the cover as `Revised 0/202` and chapter
headings as `8IP.VTU#F-JDFOTFEUP%SJWF`. In these fonts the glyph id is the character code
minus 31.

**The trap, and how it was avoided.** `A`–`Z` occupy the same byte range as the broken
glyph ids, so shifting a whole page corrupts the text that was already correct
("Driver's License Information" becomes "criver's kicense hnformation"). Font name is also
not a safe selector: the same font name appears in this file both correctly mapped and
unmapped. The extractor therefore decides **per span**:

1. a span containing C0 control bytes is unmapped (correct text never contains them) — decode it;
2. otherwise decode only if the decoded form contains strictly **more real English words**
   than the original, scored against `/usr/share/dict/words`.

Spans are then grouped by **baseline geometry** rather than by the PDF's line objects,
because kerning splits single visual lines into several line objects and was chopping words
in half (`traffic` → `traffi` + `c`, 64 occurrences).

**Verified result:** 2,033 spans decoded by the control-byte rule, 95 by the dictionary
rule, 0 residual control characters, 0 split-word fragments. Cover text decodes to
"Revised 07/2026", independently confirmed by rendering page 1 to an image and reading it.

**Known residual limitations:**

- A small number of proper nouns in the DMV regional-office address block (city names) and
  a few table headers remain imperfect. These are addresses and layout furniture, not
  study content, and no question depends on them.
- Some decorative/quote glyphs in headings render as stray `i`/`w` characters.
- **Images were not extracted.** Road signs in the handbook are images. Sign content in
  this app is authored from the handbook's *written* descriptions of shape, colour and
  meaning, and drawn locally as SVG. No handbook imagery is reproduced.

## 3. Structure ingested

Page numbering note: **the printed page number is the PDF page number minus 10.** Both are
recorded on every citation — the printed number so a learner can find it in the real book,
the PDF number so the validator can check the quote.

| Chapter | Title | PDF pages | Printed pages |
|---|---|---|---|
| I | Driver's License Information | 11–25 | 1–15 |
| II | Driver Responsibilities | 26–30 | 16–20 |
| III | Driving Impaired or Under the Influence | 31–33 | 21–23 |
| IV | Examination Procedures and Requirements | 34–43 | 24–33 |
| V | Traffic Control Devices | 44–51 | 34–41 |
| VI | Traffic Laws and Rules of the Road | 52–66 | 42–56 |
| VII | Driving on Interstates | 67–70 | 57–60 |
| VIII | Defensive Driving | 71–79 | 61–69 |
| IX | Emergency Situations | 80–87 | 70–77 |

Front matter (pp. 1–10) is definitions, office locations and the table of contents.
Pages 88–90 are back matter.

## 4. Exam parameters — verified against the source

The project brief supplied these parameters and instructed that they be confirmed rather
than trusted. All were located in **Chapter IV, PDF page 34 (printed page 24)**, except the
retest rule at **PDF page 36 (printed page 26)**. Quoted verbatim:

| Claim | Status | Handbook text |
|---|---|---|
| At least 25 questions | **VERIFIED** | "The knowledge examination has at least 25 questions based on the basic knowledge, traffic rules, regulations, signs, and markings found in the handbook." |
| Covers basic knowledge, traffic rules, regulations, signs, markings | **VERIFIED** | same sentence as above |
| 19 of 25 required to pass | **VERIFIED** | "You must answer 19 out of the 25 questions correctly to pass the test." |
| The examination is timed | **VERIFIED** | "There is a time limit on the test and any questions not answered in the prescribed time will be considered incorrect." |
| Unanswered questions count as incorrect | **VERIFIED** | same sentence as above |
| No retest twice within one week | **VERIFIED** | "Applicants who fail either the knowledge or road skills test may not be tested twice within a period of one (1) week, in accordance with §17B-2-6, West Virginia State Code." |

Related facts recorded while verifying the above:

- Vision standard is 20/40 with both eyes, with or without corrective lenses (PDF p. 34).
- Automated testing is given at all locations; audio versions are available for the reading
  impaired (PDF p. 34).
- The knowledge test fee is $7.50 per attempt (PDF p. 20).
- A separate 25-question **motorcycle** knowledge examination exists (PDF p. 24) — distinct
  from the Class E test this app studies for, and out of scope.

**The app's training target is 22/25, not the official 19/25.** That is a deliberate
instructional choice to leave margin for test-day error, not a claim about the official
standard. The app states the official 19/25 requirement plainly.

## 5. Flagged: statements not silently changed

Per the project rule, anything that looked outdated or ambiguous is recorded here rather
than corrected in the content:

- **PDF p. 42 carries "REV 7/2014"** on an embedded form (vehicle safety inspection /
  basic control skills). That form appears older than the handbook revision. No study
  content is drawn from it.
- The cover/metadata date discrepancy described in §1.
- No content in this app is drawn from any source other than this handbook. Where a
  handbook statement would need current West Virginia Code to confirm, the content states
  what the handbook says and cites the handbook — it does not assert current law
  independently. The one statutory cite reproduced (§17B-2-6) is quoted as the handbook
  prints it and has **not** been independently verified against the Code.

## 6. Excluded assumptions

The following were deliberately **not** used:

- Commercial DMV practice-test question banks — not consulted, not scraped, not paraphrased.
- Any claim that a question is an actual DMV exam question.
- Any rule, distance, speed, fee or penalty not stated in this handbook.
- Handbook imagery, including road-sign artwork and any state seal or DMV logo.

## 7. How to re-verify this audit

```bash
cd /Volumes/JarvisSSD/WV_DMV_Learner_App
shasum -a 256 source_material/Drivers_Licensing_Handbook.pdf   # expect 45082246ab6d...
python3 source_material/extract_handbook.py                     # expect 0 residual control chars
python3 tools/merge_content.py && python3 tools/validate_content.py
```

The validator asserts that every `sourceQuote` in the content appears verbatim on the
handbook page it cites. Content that cannot be found in the official PDF fails the build.
