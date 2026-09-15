#!/usr/bin/env python3
"""Validate WV Permit Coach study content against the official handbook.

THE POINT OF THIS FILE
Anyone can write a plausible-sounding DMV question. This validator refuses to accept
one unless its `sourceQuote` appears VERBATIM on the handbook page it claims. That
turns "source-backed" from a promise into a build gate: content that cannot be found
in the official PDF fails, loudly, with the page it was looked for on.

Run:  python3 tools/validate_content.py
Exit: 0 = every check passed. Non-zero = content is not shippable.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDBOOK = ROOT / "source_material" / "handbook_clean.txt"
CONTENT = ROOT / "app" / "src" / "content" / "data"

VALID_CHAPTERS = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"}
VALID_QTYPES = {"direct", "scenario", "reversed", "negative", "sign", "application"}
VALID_DIFF = {"core", "moderate", "tricky"}
PAGE_OFFSET = 10  # printed page + 10 == pdf page, verified against the table of contents

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def norm(s: str) -> str:
    """Whitespace- and punctuation-tolerant form for quote matching.

    The PDF uses curly quotes, non-breaking spaces and section symbols that are easy to
    mistype by hand. Normalising these is fair; normalising WORDS away would defeat the
    purpose, so only whitespace and quote glyphs are touched.
    """
    s = s.replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip().lower()


def load_pages() -> dict[int, str]:
    if not HANDBOOK.exists():
        err(f"handbook text missing: {HANDBOOK} — run source_material/extract_handbook.py")
        return {}
    raw = HANDBOOK.read_text(encoding="utf-8")
    parts = re.split(r"<<<PAGE (\d+)>>>\n", raw)
    return {int(parts[i]): norm(parts[i + 1]) for i in range(1, len(parts), 2)}


def check_source(pages: dict[int, str], where: str, src: dict) -> None:
    for field in ("sourceDocument", "chapter", "section", "pdfPage",
                  "printedPage", "sourceQuote", "verifiedDate"):
        if not src.get(field) and src.get(field) != 0:
            err(f"{where}: source missing '{field}'")
            return
    if src["chapter"] not in VALID_CHAPTERS:
        err(f"{where}: bad chapter {src['chapter']!r}")
    pdf, printed = src["pdfPage"], src["printedPage"]
    if pdf - printed != PAGE_OFFSET:
        err(f"{where}: pdfPage {pdf} and printedPage {printed} disagree "
            f"(expected difference of {PAGE_OFFSET})")
    page = pages.get(pdf)
    if page is None:
        err(f"{where}: cites pdfPage {pdf}, which is not in the handbook")
        return
    q = norm(src["sourceQuote"])
    if len(q) < 25:
        err(f"{where}: sourceQuote is too short to be evidence ({len(q)} chars)")
        return
    if q in page:
        return
    # Allow the quote to straddle a page break onto the next page.
    nxt = pages.get(pdf + 1, "")
    if q in norm(page + " " + nxt):
        warn(f"{where}: quote spans pages {pdf}-{pdf+1}")
        return
    found_on = [p for p, txt in pages.items() if q in txt]
    hint = f" — but it IS on page(s) {found_on}" if found_on else ""
    err(f"{where}: sourceQuote NOT FOUND on pdf page {pdf}{hint}\n"
        f"        quote: {src['sourceQuote'][:110]!r}")


def main() -> int:
    pages = load_pages()
    if not CONTENT.exists():
        err(f"content directory missing: {CONTENT}")
        print_report()
        return 1

    bundle: dict[str, list] = {}
    for name in ("topics", "concepts", "lessons", "questions", "signs"):
        f = CONTENT / f"{name}.json"
        if not f.exists():
            err(f"missing content file: {f.relative_to(ROOT)}")
            bundle[name] = []
            continue
        try:
            bundle[name] = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            err(f"{name}.json is not valid JSON: {exc}")
            bundle[name] = []

    topic_ids = {t["id"] for t in bundle["topics"]}
    concept_ids = {c["id"] for c in bundle["concepts"]}

    # ---- topics ----
    seen: set[str] = set()
    for t in bundle["topics"]:
        if t["id"] in seen:
            err(f"duplicate topic id {t['id']}")
        seen.add(t["id"])
        if t.get("chapter") not in VALID_CHAPTERS:
            err(f"topic {t['id']}: bad chapter {t.get('chapter')!r}")

    # ---- concepts ----
    seen = set()
    for c in bundle["concepts"]:
        w = f"concept {c.get('id')}"
        if c["id"] in seen:
            err(f"duplicate concept id {c['id']}")
        seen.add(c["id"])
        if c.get("topicId") not in topic_ids:
            err(f"{w}: unknown topicId {c.get('topicId')!r}")
        if not c.get("statement", "").strip():
            err(f"{w}: empty statement")
        check_source(pages, w, c.get("source", {}))

    # ---- lessons ----
    seen = set()
    for l in bundle["lessons"]:
        w = f"lesson {l.get('id')}"
        if l["id"] in seen:
            err(f"duplicate lesson id {l['id']}")
        seen.add(l["id"])
        if l.get("topicId") not in topic_ids:
            err(f"{w}: unknown topicId {l.get('topicId')!r}")
        for field in ("plainEnglish", "whyItMatters", "example", "title"):
            if not str(l.get(field, "")).strip():
                err(f"{w}: empty {field}")
        if not l.get("rules"):
            err(f"{w}: no rules")
        for i, r in enumerate(l.get("rules", [])):
            check_source(pages, f"{w} rule[{i}]", r.get("source", {}))
        for cid in l.get("conceptIds", []):
            if cid not in concept_ids:
                err(f"{w}: unknown conceptId {cid!r}")

    # ---- questions ----
    seen = set()
    seen_text: dict[str, str] = {}
    by_concept: dict[str, list] = {}
    for q in bundle["questions"]:
        w = f"question {q.get('id')}"
        if q["id"] in seen:
            err(f"duplicate question id {q['id']}")
        seen.add(q["id"])

        key = norm(q.get("question", ""))
        if key in seen_text:
            err(f"{w}: duplicate question text, same as {seen_text[key]}")
        seen_text[key] = q["id"]

        if q.get("topicId") not in topic_ids:
            err(f"{w}: unknown topicId {q.get('topicId')!r}")
        if q.get("conceptId") not in concept_ids:
            err(f"{w}: unknown conceptId {q.get('conceptId')!r}")
        by_concept.setdefault(q.get("conceptId"), []).append(q)

        choices = q.get("choices", [])
        if len(choices) < 3:
            err(f"{w}: needs at least 3 choices, has {len(choices)}")
        if len(choices) != len({norm(c) for c in choices}):
            err(f"{w}: duplicate choices")
        for c in choices:
            if not str(c).strip():
                err(f"{w}: blank choice")
        ca = q.get("correctAnswer")
        if not isinstance(ca, int) or not (0 <= ca < len(choices)):
            err(f"{w}: correctAnswer {ca!r} is not a valid index into {len(choices)} choices")
        if not q.get("explanation", "").strip():
            err(f"{w}: empty explanation")
        elif len(q["explanation"]) < 40:
            warn(f"{w}: explanation is very short — it should teach, not just assert")
        ce = q.get("choiceExplanations")
        if ce is not None:
            if not isinstance(ce, list) or len(ce) != len(choices):
                err(f"{w}: choiceExplanations must have one entry per choice "
                    f"({len(choices)}), got {len(ce) if isinstance(ce, list) else type(ce).__name__}")
            else:
                if isinstance(ca, int) and 0 <= ca < len(ce) and ce[ca]:
                    err(f"{w}: choiceExplanations[{ca}] is the CORRECT answer and must be null")
                for i, note in enumerate(ce):
                    if i == ca:
                        continue
                    if note is not None and len(str(note).strip()) < 25:
                        err(f"{w}: choiceExplanations[{i}] is too short to explain anything")
        if q.get("questionType") not in VALID_QTYPES:
            err(f"{w}: bad questionType {q.get('questionType')!r}")
        if q.get("difficulty") not in VALID_DIFF:
            err(f"{w}: bad difficulty {q.get('difficulty')!r}")
        check_source(pages, w, q.get("source", {}))

        # An "all of the above" style answer teaches nothing and is trivially guessable.
        for c in choices:
            if norm(c) in {"all of the above", "none of the above", "both a and b"}:
                warn(f"{w}: uses a throwaway choice {c!r}")

    # ---- anti-memorisation coverage ----
    for cid, qs in by_concept.items():
        if len(qs) < 2:
            warn(f"concept {cid}: only {len(qs)} question — a concept needs several "
                 f"forms so it cannot be answered from memory of one")
        else:
            kinds = {q.get("questionType") for q in qs}
            if len(kinds) < 2:
                warn(f"concept {cid}: all {len(qs)} questions are '{kinds.pop()}' type — "
                     f"add a scenario or reversed form")
    for cid in concept_ids:
        if cid not in by_concept:
            err(f"concept {cid} has NO questions")

    # ---- signs ----
    seen = set()
    for s in bundle["signs"]:
        w = f"sign {s.get('key')}"
        if s["key"] in seen:
            err(f"duplicate sign key {s['key']}")
        seen.add(s["key"])
        for field in ("name", "category", "shape", "bg", "fg", "meaning", "action"):
            if not str(s.get(field, "")).strip():
                err(f"{w}: empty {field}")
        check_source(pages, w, s.get("source", {}))

    sign_keys = {s["key"] for s in bundle["signs"]}
    for q in bundle["questions"]:
        if q.get("signKey") and q["signKey"] not in sign_keys:
            err(f"question {q['id']}: unknown signKey {q['signKey']!r}")

    print(f"topics={len(bundle['topics'])} concepts={len(bundle['concepts'])} "
          f"lessons={len(bundle['lessons'])} questions={len(bundle['questions'])} "
          f"signs={len(bundle['signs'])}")
    print_report()
    return 1 if errors else 0


def print_report() -> None:
    for w in warnings:
        print(f"  WARN  {w}")
    for e in errors:
        print(f"  ERROR {e}")
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")


if __name__ == "__main__":
    sys.exit(main())
