#!/usr/bin/env python3
"""Extract teaching figures from the handbook so questions can show what they mean.

WHY, AND WHAT IS DELIBERATELY EXCLUDED
Some rules cannot be taught in words. A yellow diamond's meaning lives entirely in its
pictogram, so nine legend-less diamonds drawn as SVG would all look identical and a
"what does this sign mean" question would be unanswerable. Figures fix that.

What this takes: the SIGN pictograms and the instructional DIAGRAMS (turn paths, lane
positions, truck blind spots, hand signals). What it does NOT take: decorative
photography. The handbook credits stock photographers on its cover, those images teach
nothing, and shipping them is a rights question with no upside.

Selection is by geometry and page, then reviewed on a contact sheet before anything is
wired to a question — nothing is attached sight-unseen.

Run: python3 tools/extract_figures.py
"""
from __future__ import annotations

import json
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "source_material" / "Drivers_Licensing_Handbook.pdf"
OUT = ROOT / "app" / "public" / "figures"
SHEET = ROOT / "source_material" / "figure_contact_sheet"
MANIFEST = ROOT / "source_material" / "figures_manifest.json"

# Pages whose images are instructional. Chapter V signs and markings, plus the specific
# diagram pages identified by reading the chapters.
FIGURE_PAGES = set(range(44, 52)) | {53, 54, 58, 59, 60, 62, 68, 72, 76}

# A figure must be big enough to read and not so big it is a page-filling photo.
MIN_W, MIN_H = 40, 40
MAX_FRACTION = 0.55  # of page area
DPI = 200


def main() -> int:
    doc = fitz.open(PDF)
    OUT.mkdir(parents=True, exist_ok=True)
    SHEET.mkdir(parents=True, exist_ok=True)
    figures = []

    for pno in sorted(FIGURE_PAGES):
        if pno - 1 >= len(doc):
            continue
        page = doc[pno - 1]
        page_area = abs(page.rect.width * page.rect.height)
        seen_rects: list[fitz.Rect] = []

        for img in page.get_images(full=True):
            xref = img[0]
            try:
                rects = page.get_image_rects(xref)
            except Exception:
                continue
            for r in rects:
                if r.width < MIN_W or r.height < MIN_H:
                    continue
                if abs(r.width * r.height) > page_area * MAX_FRACTION:
                    continue
                # Skip near-duplicates of something already captured on this page.
                if any(abs(r & s) > 0.8 * abs(r) for s in seen_rects if (r & s).is_valid):
                    continue
                seen_rects.append(r)

                pad = 4
                clip = fitz.Rect(r.x0 - pad, r.y0 - pad, r.x1 + pad, r.y1 + pad) & page.rect
                key = f"p{pno:03d}_{len(seen_rects):02d}"
                pix = page.get_pixmap(clip=clip, dpi=DPI)
                pix.save(OUT / f"{key}.png")
                figures.append({
                    "key": key,
                    "pdfPage": pno,
                    "printedPage": pno - 10,
                    "width": pix.width,
                    "height": pix.height,
                    "rect": [round(v, 1) for v in (clip.x0, clip.y0, clip.x1, clip.y1)],
                })

    # Contact sheets so a human can see every candidate before any is used.
    by_page: dict[int, list] = {}
    for f in figures:
        by_page.setdefault(f["pdfPage"], []).append(f)
    for pno, items in by_page.items():
        page = doc[pno - 1]
        pix = page.get_pixmap(dpi=110)
        pix.save(SHEET / f"page_{pno:03d}.png")

    MANIFEST.write_text(json.dumps(figures, indent=2), encoding="utf-8")
    total_kb = sum((OUT / f"{f['key']}.png").stat().st_size for f in figures) / 1024
    print(f"extracted {len(figures)} figures from {len(by_page)} pages, {total_kb:.0f} KB total")
    print(f"  images   -> {OUT.relative_to(ROOT)}")
    print(f"  contact  -> {SHEET.relative_to(ROOT)}")
    print(f"  manifest -> {MANIFEST.relative_to(ROOT)}")
    for pno in sorted(by_page):
        print(f"    p{pno:>3} (printed {pno - 10:>3}): {len(by_page[pno])} figure(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
