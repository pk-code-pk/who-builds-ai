"""Frame 3 data: every notable model since 2012 with a recorded training cost or training compute.

    python scripts/build_frontier.py   # Epoch CSV -> story/data/frontier.js

Uses the same rows and columns as the frame 3 checks in check_story_numbers.py: models published in 2012 or later,
"Training compute cost (2023 USD)" and "Training compute (FLOP)". A model is kept if it has either one.
"""
import csv
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CSV_PATH = REPO / "prototype-who-builds" / "data" / "notable_ai_models.csv"


def num(v):
    try:
        return float(v)
    except ValueError:
        return None


models = []
with open(CSV_PATH, encoding="utf-8") as f:
    for r in csv.DictReader(f):
        d = r["Publication date"]
        if not d[:4].isdigit() or int(d[:4]) < 2012:
            continue
        cost, flop = num(r["Training compute cost (2023 USD)"]), num(r["Training compute (FLOP)"])
        if cost is None and flop is None:
            continue
        models.append({"model": r["Model"], "org": r["Organization"], "date": d[:10], "cost": cost, "flop": flop})

last = max(m["date"] for m in models)
out = REPO / "story" / "data" / "frontier.js"
out.parent.mkdir(exist_ok=True)
out.write_text("window.FRONTIER = " + json.dumps({"lastDate": last, "models": models}) + ";\n", encoding="utf-8")
print(f"wrote {out.relative_to(REPO)}: {len(models)} models, {sum(m['cost'] is not None for m in models)} with a cost, "
      f"{sum(m['flop'] is not None for m in models)} with compute, last date {last}")
