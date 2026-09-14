#!/usr/bin/env python3
"""Merge per-chapter content parts into the five bundle files the app imports.

Content is authored one file per chapter group under content/data/parts/ so that work
can proceed in parallel without two authors editing the same JSON. This merges them,
refusing on duplicate ids rather than silently letting the last writer win.

Run: python3 tools/merge_content.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / "app" / "src" / "content" / "data" / "parts"
OUT = ROOT / "app" / "src" / "content" / "data"
KINDS = ("topics", "concepts", "lessons", "questions", "signs")
KEY = {"topics": "id", "concepts": "id", "lessons": "id",
       "questions": "id", "signs": "key"}


def main() -> int:
    if not PARTS.exists():
        print(f"no parts directory at {PARTS}", file=sys.stderr)
        return 1
    merged: dict[str, list] = {k: [] for k in KINDS}
    origin: dict[str, dict[str, str]] = {k: {} for k in KINDS}
    problems: list[str] = []

    for f in sorted(PARTS.glob("*.json")):
        try:
            part = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            problems.append(f"{f.name}: invalid JSON: {exc}")
            continue
        for kind in KINDS:
            for item in part.get(kind, []):
                k = item.get(KEY[kind])
                if k is None:
                    problems.append(f"{f.name}: {kind} entry with no {KEY[kind]}")
                    continue
                if k in origin[kind]:
                    problems.append(
                        f"duplicate {kind} {KEY[kind]}={k!r} in {f.name} "
                        f"(already defined in {origin[kind][k]})")
                    continue
                origin[kind][k] = f.name
                merged[kind].append(item)

    if problems:
        for p in problems:
            print(f"  ERROR {p}")
        print(f"\n{len(problems)} problem(s) — nothing written")
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    for kind in KINDS:
        if kind == "topics":
            merged[kind].sort(key=lambda t: t.get("order", 0))
        (OUT / f"{kind}.json").write_text(
            json.dumps(merged[kind], indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8")
    print("merged from", len(list(PARTS.glob("*.json"))), "part file(s):",
          " ".join(f"{k}={len(merged[k])}" for k in KINDS))
    return 0


if __name__ == "__main__":
    sys.exit(main())
