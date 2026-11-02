"""Frame 6 data: Nvidia's 5-day stock reaction to every event in Ashley's policy event list.

    python scripts/build_policy_strip.py   # data/events.csv + data/prices/NVDA.csv -> story/data/policy_events.js

The reaction is the same one check_story_numbers.py checks for frame 6: the close 5 trading days after the
event (the event day, or the next trading day if it fell on a weekend or holiday, counts as day 1) divided
by the close the trading day before, minus 1.
"""
import bisect
import csv
import json
import statistics
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

with open(REPO / "data" / "prices" / "NVDA.csv", encoding="utf-8") as f:
    px = [(r["date"], float(r["close"])) for r in csv.DictReader(f)]
dates = [d for d, _ in px]

events = []
with open(REPO / "data" / "events.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        i = bisect.bisect_left(dates, r["date"])
        if i < 1 or i + 4 >= len(px):
            print("skipped (no prices around it):", r["date"], r["event"])
            continue
        events.append({"date": r["date"], "event": r["event"], "category": r["category"],
                       "description": r["description"], "source": r["source"],
                       "reaction": round(px[i + 4][1] / px[i - 1][1] - 1, 4)})

out = REPO / "story" / "data" / "policy_events.js"
out.parent.mkdir(exist_ok=True)
out.write_text("window.POLICY_EVENTS = " + json.dumps({"lastPrice": dates[-1], "events": events}, indent=1) + ";\n",
               encoding="utf-8")

ctrl = [e["reaction"] for e in events if e["category"] == "US Export Control"]
print(f"wrote {out.relative_to(REPO)}: {len(events)} events; export controls n={len(ctrl)}, "
      f"median {100 * statistics.median(ctrl):+.1f}%, range {100 * min(ctrl):+.1f}% to {100 * max(ctrl):+.1f}%")
