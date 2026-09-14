#!/usr/bin/env python3
"""Extract the WV Driver's Licensing Handbook to clean, page-anchored text.

WHY THIS EXISTS
Some runs in the official PDF are set in CID Type0 / Identity-H fonts with NO
ToUnicode map, so they extract as raw glyph ids instead of characters. In these
fonts the glyph id is the character code minus 31:
    "8IP\\x01.VTU\\x01#F\\x01-JDFOTFE" + 31  ->  "Who Must Be Licensed"

THE TRAP
'A'-'Z' occupy the same byte range as the broken glyph ids, so blanket-shifting a
page destroys the text that was already correct ("Driver's License Information"
becomes "criver's kicense hnformation"). Font name alone is not a safe selector
either: the SAME font name appears both correctly mapped and unmapped in this file.

THE RULE USED HERE  (decided per span, then verified)
  1. A span containing C0 control bytes is unmapped -- correctly mapped text never
     contains them. Decode it.
  2. Otherwise decode only if the decoded form contains strictly MORE real English
     words than the original, scored against /usr/share/dict/words.
Both directions are reported at the end so the result can be checked, not trusted.
"""
import re, sys, fitz
from pathlib import Path

SRC, OUT = "Drivers_Licensing_Handbook.pdf", "handbook_clean.txt"
SHIFT = 31
CTRL = set(range(0x01, 0x20))

WORDS = {w.strip().lower() for w in open("/usr/share/dict/words", encoding="utf-8",
                                         errors="ignore") if len(w.strip()) > 1}
WORDS |= {"a", "i", "dmv", "wv", "id", "mph", "bac", "cdl", "usa", "us"}


def decode(s: str) -> str:
    return "".join(chr(ord(c) + SHIFT) if 0x01 <= ord(c) <= 0x7E - SHIFT else c
                   for c in s)


def english_score(s: str) -> int:
    return sum(1 for t in re.findall(r"[A-Za-z']{2,}", s)
               if t.lower().strip("'") in WORDS)


def main():
    doc = fitz.open(SRC)
    pages, n_ctrl, n_dict, n_left = {}, 0, 0, 0
    for pno in range(len(doc)):
        # Collect every span with its geometry. Spans are grouped by BASELINE, not by
        # PyMuPDF line objects: kerning splits a single visual line into several line
        # objects, which chopped words in half ("traffi" + "c") in an earlier pass.
        items = []
        for b in doc[pno].get_text("dict")["blocks"]:
            if b.get("type") != 0:
                continue
            for line in b["lines"]:
                for sp in line["spans"]:
                    t = sp["text"]
                    if any(ord(c) in CTRL for c in t):
                        t = decode(t); n_ctrl += 1
                    else:
                        d = decode(t)
                        if english_score(d) > english_score(t):
                            t = d; n_dict += 1
                        else:
                            n_left += 1
                    if t.strip():
                        x0, y0, x1, y1 = sp["bbox"]
                        items.append((round(y0, 1), x0, x1, t))

        # Bucket by baseline within a small tolerance, then order left to right.
        rows = {}
        for y, x0, x1, t in items:
            key = next((k for k in rows if abs(k - y) <= 2.0), y)
            rows.setdefault(key, []).append((x0, x1, t))

        out = []
        for y in sorted(rows):
            parts = sorted(rows[y])
            buf = ""
            prev_x1 = None
            for x0, x1, t in parts:
                if prev_x1 is not None:
                    gap = x0 - prev_x1
                    # A real word space in this document is ~2pt or more at body size;
                    # a sub-point gap means the renderer split one word into two spans.
                    if gap > 1.2 and not buf.endswith(" ") and not t.startswith(" "):
                        buf += " "
                buf += t
                prev_x1 = x1
            if buf.strip():
                out.append(buf.rstrip())
        pages[pno] = out

    body = []
    for pno in range(len(doc)):
        body.append(f"<<<PAGE {pno+1}>>>")
        body.extend(pages.get(pno, []))
    Path(OUT).write_text("\n".join(body) + "\n", encoding="utf-8")

    txt = Path(OUT).read_text(encoding="utf-8")
    residual = sum(1 for c in txt if 0x01 <= ord(c) < 0x20 and c not in "\n\t\r")
    words = re.findall(r"[A-Za-z']{2,}", txt)
    known = sum(1 for w in words if w.lower().strip("'") in WORDS)
    print(f"pages={len(doc)}")
    print(f"spans decoded by control-byte rule : {n_ctrl}")
    print(f"spans decoded by dictionary rule   : {n_dict}")
    print(f"spans left untouched               : {n_left}")
    print(f"residual control chars             : {residual}")
    print(f"recognised-word ratio              : {known}/{len(words)} = {100*known/len(words):.1f}%")
    return 0 if residual == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
