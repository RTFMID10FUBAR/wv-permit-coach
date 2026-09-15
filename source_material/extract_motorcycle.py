#!/usr/bin/env python3
"""Extract the WV Motorcycle Operator Manual to clean, page-anchored text.

DIFFERENT PROBLEM FROM THE CAR HANDBOOK. This PDF's fonts map correctly (no glyph-id
runs, no control bytes), but the embedded font has no mapping for the "fi" ligature, so
every occurrence silently loses the i: "traffic" extracts as "traffc", "first" as "frst",
"difficult" as "diffcult". 113 words are affected. PyMuPDF cannot recover it — the
information is simply not in the font, with or without TEXT_PRESERVE_LIGATURES.

THE REPAIR, and why it is safe:
A word is treated as a dropped ligature ONLY when
  (a) it is not a real word, AND
  (b) inserting an "i" after an "f" turns it into a real word,
checked against /usr/share/dict/words. Both conditions must hold, so a correctly
extracted word is never touched and no guess is ever made about an unknown word.
Anything that fails the test is left exactly as extracted and counted in the report.

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
WORDS |= {"motorcycle", "motorcycles", "msf", "mph", "atv", "dot", "helmets", "riders",
          "braking", "swerving", "countersteering", "tires", "signalling", "signaling"}

repaired: dict[str, str] = {}
unrepaired: set[str] = set()


def is_word(w: str) -> bool:
    return w.lower().strip("'") in WORDS


def fix_ligatures(text: str) -> str:
    def repl(m: re.Match) -> str:
        w = m.group(0)
        if is_word(w) or "f" not in w.lower():
            return w
        # Try inserting an i after each f, left to right; accept the first real word.
        low = w.lower()
        for i, ch in enumerate(low):
            if ch != "f":
                continue
            cand = w[: i + 1] + "i" + w[i + 1 :]
            if is_word(cand):
                repaired[w] = cand
                return cand
        if len(w) > 2:
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
        page = doc[pno]
        lines: list[str] = []
        for b in page.get_text("dict")["blocks"]:
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
    print(f"pages={len(doc)}  words={len(words)}  recognised={100 * known / len(words):.1f}%")
    print(f"ligature words repaired: {len(repaired)} distinct "
          f"({', '.join(f'{k}->{v}' for k, v in list(repaired.items())[:8])}"
          f"{' …' if len(repaired) > 8 else ''})")
    if unrepaired:
        print(f"left as extracted (no safe repair): {len(unrepaired)} distinct "
              f"— {', '.join(sorted(unrepaired)[:10])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
