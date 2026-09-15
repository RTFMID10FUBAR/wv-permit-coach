#!/usr/bin/env python3
"""Extract the WV Motorcycle Operator Manual to clean, page-anchored text.

DIFFERENT PROBLEM FROM THE CAR HANDBOOK. This PDF's fonts map correctly (no glyph-id
runs, no control bytes), but the embedded font has no mapping for the "fi" or "fl"
ligatures, so every occurrence silently loses the second letter: "traffic" extracts as
"traffc", "first" as "frst", "inflation" as "infation". PyMuPDF cannot recover it — the
information is not in the font, with or without TEXT_PRESERVE_LIGATURES.

WHY THIS USES A REVIEWED TABLE AND NOT A RULE
An automatic dictionary rule was tried and rejected, because this document breaks it in
both directions:
  * "fogging" (a face shield fogs) is absent from the 1934 word list, so the rule
    "repaired" it to "flogging";
  * "feet" is a real word, but so is "fleet", and the rule turned 10 distance
    references into fleets;
  * "refective" passes as a word because stripping -ive leaves "refect", an archaic
    entry meaning to refresh, so a genuine repair to "reflective" was skipped.
Silently turning feet into fleets, in a manual about following distance, is exactly the
failure this project cannot ship. There are only ~42 candidates in the whole manual, so
every one was listed and read; the reviewed result is the table below. Words outside the
table are left exactly as extracted and reported, so nothing is ever guessed.

SOURCE NOTE: this manual is the Motorcycle Safety Foundation's Motorcycle Operator
Manual, 18th edition, published by WV DMV. It is NOT a work of the State of West
Virginia. See docs/SOURCE_AUDIT.md.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import fitz

HERE = Path(__file__).resolve().parent
SRC = HERE / "Motorcycle_Operator_Manual.pdf"
OUT = HERE / "motorcycle_clean.txt"

WORDS = {w.strip().lower() for w in open("/usr/share/dict/words", encoding="utf-8",
                                         errors="ignore") if len(w.strip()) > 1}

# Reviewed 2026-09-15 against the full candidate list. Deliberately EXCLUDED after
# review: Feet/feet (the body part, not a fleet) and fogging (a face shield fogs).
REPAIRS = {
    "Artifcial": "Artificial", "Traffc": "Traffic", "beneft": "benefit",
    "certifed": "certified", "confdently": "confidently", "confict": "conflict",
    "confrm": "confirm", "defnition": "definition", "diffcult": "difficult",
    "fashing": "flashing", "Fashing": "Flashing", "feld": "field", "fex": "flex",
    "Fex": "Flex", "fght": "fight", "fle": "file", "fles": "files", "fnd": "find",
    "fnding": "finding", "fne": "fine", "fnger": "finger", "fngers": "fingers",
    "frm": "firm", "frmly": "firmly", "frst": "first",
    "fst": "fist", "ft": "fit", "fts": "fits", "fttings": "fittings",
    "fuid": "fluid", "Fuid": "Fluid", "fuids": "fluids", "fve": "five",
    "fx": "fix", "fxed": "fixed", "fy": "fly", "fying": "flying",
    "fapping": "flapping", "fash": "flash", "fat": "flat", "fats": "flats",
    "infation": "inflation", "infuence": "influence", "muffer": "muffler",
    "profle": "profile", "qualifed": "qualified", "refector": "reflector",
    "refectors": "reflectors", "Refective": "Reflective", "refective": "reflective",
    "signifcant": "significant", "specifc": "specific",
    "specifcations": "specifications", "modifcations": "modifications",
    "suffcient": "sufficient", "suffciently": "sufficiently", "traffc": "traffic",
    "chafng": "chafing",
}

repaired: dict[str, str] = {}
unrepaired: set[str] = set()


def is_word(w: str) -> bool:
    return w.lower().strip("'") in WORDS


def fix_ligatures(text: str) -> str:
    """Apply the reviewed table. Anything outside it is left exactly as extracted."""
    def repl(m: re.Match) -> str:
        w = m.group(0)
        fixed = REPAIRS.get(w)
        if fixed is not None:
            repaired[w] = fixed
            return fixed
        if not is_word(w) and len(w) > 2 and "f" in w.lower():
            unrepaired.add(w)
        return w

    return re.sub(r"[A-Za-z']+", repl, text)


def main() -> int:
    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        return 1
    doc = fitz.open(SRC)
    out: list[str] = []
    for pno in range(len(doc)):
        lines: list[str] = []
        for b in doc[pno].get_text("dict")["blocks"]:
            if b.get("type") != 0:
                continue
            for line in b["lines"]:
                txt = "".join(s["text"] for s in line["spans"]).rstrip()
                if txt.strip():
                    lines.append(fix_ligatures(txt))
        out.append(f"<<<PAGE {pno + 1}>>>")
        out.extend(lines)
    OUT.write_text("\n".join(out) + "\n", encoding="utf-8")

    body = OUT.read_text(encoding="utf-8")
    words = re.findall(r"[A-Za-z']{2,}", body)
    known = sum(1 for w in words if is_word(w))
    print(f"pages={len(doc)}  words={len(words)}  in-dictionary={100 * known / len(words):.1f}%")
    print(f"repairs applied: {len(repaired)} distinct")
    if unrepaired:
        print(f"left as extracted ({len(unrepaired)}): {', '.join(sorted(unrepaired)[:14])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
