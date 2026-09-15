#!/usr/bin/env python3
"""Generate docs/QUESTION_COVERAGE.md from the merged content bundle.

This is generated, never hand-written, so the coverage numbers cannot drift away from
the content they describe. It also reports GAPS — handbook chapters with thin or no
coverage — because an honest coverage report is one that says what is missing.

Run: python3 tools/gen_coverage.py
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "app" / "src" / "content" / "data"
OUT = ROOT / "docs" / "QUESTION_COVERAGE.md"

CHAPTERS = [
    ("I", "Driver's License Information", 11, 25),
    ("II", "Driver Responsibilities", 26, 30),
    ("III", "Driving Impaired or Under the Influence", 31, 33),
    ("IV", "Examination Procedures and Requirements", 34, 43),
    ("V", "Traffic Control Devices", 44, 51),
    ("VI", "Traffic Laws and Rules of the Road", 52, 66),
    ("VII", "Driving on Interstates", 67, 70),
    ("VIII", "Defensive Driving", 71, 79),
    ("IX", "Emergency Situations", 80, 87),
]


def load(name: str) -> list:
    f = DATA / f"{name}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else []


def main() -> int:
    topics = load("topics")
    concepts = load("concepts")
    lessons = load("lessons")
    questions = load("questions")
    signs = load("signs")

    # Course matters here: motorcycle-manual page numbers overlap the car handbook's
    # (both are PDF pages), so counting them together reported "11 of 5 pages cited".
    course_of = {t["id"]: t.get("course", "car") for t in topics}
    car_questions = [q for q in questions if course_of.get(q["topicId"], "car") == "car"]
    moto_questions = [q for q in questions if course_of.get(q["topicId"], "car") == "motorcycle"]

    by_topic = {t["id"]: t for t in topics}
    q_by_topic = Counter(q["topicId"] for q in questions)
    c_by_topic = Counter(c["topicId"] for c in concepts)
    l_by_topic = Counter(l["topicId"] for l in lessons)
    q_by_chapter: Counter = Counter()
    pages_by_chapter = defaultdict(set)
    for q in car_questions:
        src = q.get("source", {})
        q_by_chapter[src.get("chapter")] += 1
        pages_by_chapter[src.get("chapter")].add(src.get("pdfPage"))
    for s in signs:
        src = s.get("source", {})
        pages_by_chapter[src.get("chapter")].add(src.get("printedPage"))

    qtypes = Counter(q.get("questionType") for q in questions)
    diffs = Counter(q.get("difficulty") for q in questions)
    q_by_concept = Counter(q["conceptId"] for q in questions)

    L: list[str] = []
    L.append("# Question Coverage\n")
    L.append(f"Generated {date.today().isoformat()} by `tools/gen_coverage.py` — "
             "do not edit by hand.\n")
    L.append(f"**{len(questions)} questions** · {len(concepts)} concepts · "
             f"{len(lessons)} lessons · {len(topics)} topics · {len(signs)} signs\n")
    L.append(f"By course: **{len(car_questions)} car** (Class E) · "
             f"**{len(moto_questions)} motorcycle** (F endorsement). "
             f"{sum(1 for q in questions if q.get('imageKey'))} questions show a figure "
             f"from the handbook.\n")
    L.append("\nThe chapter table below covers the **car** handbook only; the motorcycle "
             "manual has its own page numbering and is summarised separately.\n")

    L.append("\n## By handbook chapter\n")
    L.append("| Chapter | Title | Printed pages | Questions | Pages cited | Status |")
    L.append("|---|---|---|---|---|---|")
    for num, title, a, b in CHAPTERS:
        n = q_by_chapter.get(num, 0)
        # Count only pages that actually fall inside this chapter's PDF range.
        cited = sorted(p for p in pages_by_chapter.get(num, set())
                       if p is not None and a <= p <= b)
        span = f"{a-10}–{b-10}"
        if n == 0:
            status = "**NOT COVERED**"
        elif n < 8:
            status = "thin"
        else:
            status = "covered"
        pages = f"{len(cited)} of {b-a+1}" if cited else "—"
        L.append(f"| {num} | {title} | {span} | {n} | {pages} | {status} |")

    L.append("\n## By topic\n")
    L.append("| Topic | Chapter | Concepts | Lessons | Questions | Exam weight |")
    L.append("|---|---|---|---|---|---|")
    for t in sorted(topics, key=lambda x: x.get("order", 0)):
        L.append(f"| {t['title']} | {t.get('chapter','')} | {c_by_topic[t['id']]} | "
                 f"{l_by_topic[t['id']]} | {q_by_topic[t['id']]} | "
                 f"{t.get('examWeight', 1)} |")

    L.append("\n## Question mix\n")
    L.append("A concept tested only one way can be answered from memory of that one "
             "question. The spread below is the anti-memorisation guarantee.\n")
    L.append("| Question type | Count |")
    L.append("|---|---|")
    for k, v in qtypes.most_common():
        L.append(f"| {k} | {v} |")
    L.append("\n| Difficulty | Count |")
    L.append("|---|---|")
    for k, v in diffs.most_common():
        L.append(f"| {k} | {v} |")

    L.append("\n## Gaps and thin coverage\n")
    gaps = []
    for num, title, a, b in CHAPTERS:
        n = q_by_chapter.get(num, 0)
        if n == 0:
            gaps.append(f"- **Chapter {num} ({title}) has no questions.**")
        elif n < 8:
            gaps.append(f"- Chapter {num} ({title}) has only {n} question(s).")
    thin = [cid for cid, n in q_by_concept.items() if n < 2]
    if thin:
        gaps.append(f"- {len(thin)} concept(s) have fewer than 2 questions: "
                    f"{', '.join(sorted(thin)[:12])}"
                    f"{' …' if len(thin) > 12 else ''}")
    uncovered = [c["id"] for c in concepts if q_by_concept[c["id"]] == 0]
    if uncovered:
        gaps.append(f"- {len(uncovered)} concept(s) have NO questions: "
                    f"{', '.join(sorted(uncovered)[:12])}")
    single_type = []
    per_concept_types = defaultdict(set)
    for q in questions:
        per_concept_types[q["conceptId"]].add(q.get("questionType"))
    for cid, kinds in per_concept_types.items():
        if len(kinds) < 2 and q_by_concept[cid] >= 2:
            single_type.append(cid)
    if single_type:
        gaps.append(f"- {len(single_type)} concept(s) are tested with only one question "
                    f"type: {', '.join(sorted(single_type)[:12])}")
    L.append("\n".join(gaps) if gaps else "None. Every chapter has coverage and every "
             "concept has at least two questions of differing type.")

    L.append("\n## How to verify\n")
    L.append("```bash\npython3 tools/merge_content.py && python3 tools/validate_content.py\n"
             "python3 tools/gen_coverage.py\n```\n")
    L.append("`validate_content.py` asserts that every `sourceQuote` appears verbatim on "
             "the handbook page it cites. See `docs/SOURCE_AUDIT.md`.\n")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(L), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} — {len(questions)} questions, "
          f"{sum(1 for _, _, _, _ in CHAPTERS)} chapters assessed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
