#!/usr/bin/env python3
"""Bundle the handbook text into the app so it can be read and searched offline.

Two forms ship, for two different jobs:

  * this JSON  — small (~300 KB), searchable, reflows on a phone, always precached.
                 It is the extracted text, so it carries the extraction's known limits
                 (see docs/SOURCE_AUDIT.md) and is labelled as such in the UI.
  * the PDF    — the authoritative document, byte-identical to what WV DMV publishes,
                 copied to public/handbook/ and linked from the reader.

Run: python3 tools/gen_handbook_text.py
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "source_material" / "handbook_clean.txt"
PDF = ROOT / "source_material" / "Drivers_Licensing_Handbook.pdf"
OUT = ROOT / "app" / "src" / "content" / "data" / "handbook_pages.json"
PUBPDF = ROOT / "app" / "public" / "handbook" / "Drivers_Licensing_Handbook.pdf"

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


def chapter_for(pdf_page: int):
    for num, title, a, b in CHAPTERS:
        if a <= pdf_page <= b:
            return num, title
    return None, "Front and back matter"


def main() -> int:
    raw = SRC.read_text(encoding="utf-8")
    parts = re.split(r"<<<PAGE (\d+)>>>\n", raw)
    pages = []
    for i in range(1, len(parts), 2):
        pdf_page = int(parts[i])
        body = parts[i + 1].strip()
        if not body:
            continue
        num, title = chapter_for(pdf_page)
        pages.append({
            "pdfPage": pdf_page,
            "printedPage": pdf_page - 10,
            "chapter": num,
            "chapterTitle": title,
            "text": body,
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")

    PUBPDF.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PDF, PUBPDF)

    kb = OUT.stat().st_size / 1024
    mb = PUBPDF.stat().st_size / (1024 * 1024)
    print(f"wrote {OUT.relative_to(ROOT)}  {len(pages)} pages, {kb:.0f} KB")
    print(f"copied {PUBPDF.relative_to(ROOT)}  {mb:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
