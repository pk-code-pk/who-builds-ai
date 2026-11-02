# Who builds AI models? (story page)

The scrolling data story for our CS 1710 final project. Prototype I, Milestone 8.

## View it

Open `story/index.html` in a browser. It works straight from the file (no server needed) because D3, Scrollama and
the data are all loaded with plain `<script>` tags. Other pages:

- `prototype-who-builds/index.html` the Who Builds AI Models? dashboard (sector timeline, lab bubbles, concentration curve)
- `country-share/index.html` country share of notable models per year, full page with a data table
- `index.html` (repo root) the 3D chip front page, which links into the story
- `hub.html` (repo root) Ashley's "Trends in AI" hub, linked from the chip and the story
- `chip-policy.html` Ashley's Chip Policy Shock Map (was Prototype A at the root)
- `story/drafts/drafts.html` the Milestone 8 static mockups of frames 1 and 7 (both are built now; kept for the process book)

## Dark theme

The story page is dark navy from top to bottom (`<html data-theme="dark">`). The shared chart colors and their dark
versions live in `country-share/country_share_chart.css`. The dashboard and the country page stay light on their own,
and switch to dark with `?theme=dark` (the story's iframes pass it). The drafts page does the same, and
`render_screenshots.py` saves both a light and a dark copy of each draft.

## Libraries

- D3 v7 (`prototype-who-builds/d3.v7.min.js`, shared by every page)
- Fonts: Fraunces (headlines) and Source Sans 3 (text) from Google Fonts. Offline, the page falls back to Georgia and
  Helvetica/Arial and still works.
- Scrollama 3.2.0 (`story/vendor/scrollama.min.js`, MIT license in `story/vendor/scrollama.LICENSE`), the same scroll
  library as Lab 5. It tells the page which text step is on screen so the chart can change with it.

`story_v1_backup/` (repo root) is the earlier, plainer version of this page, kept as a fallback. It uses the same
data and charts. Delete it before zipping if we don't need it.

## 3D chip page and model credit

`index.html` (repo root) is the 3D chip front page: each part of the chip links to a part of the story. Notes on it,
and on using it as the hub's header, are in `CHIP_PAGE_NOTES.md`.

- 3D model: ["Microchip - Prototype"](https://sketchfab.com/3d-models/microchip-prototype-7d00abe914664a17b4bf18c6e851e7eb)
  by re1monsen, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Modified: textures resized,
  compressed (ground removed, glow colors changed). The same credit is in the page footer, which the license requires.
- three.js r170 (MIT license, `vendor/three/LICENSE`), bundled into `vendor/three/three.chip.min.js`.

## Rebuild the data

Only needed if the Epoch CSV or the event list changes. Python 3, no extra packages.

```bash
python scripts/build_who_builds_data.py   # CSV -> prototype-who-builds/data/who_builds.js
python scripts/build_country_share.py     # CSV + data/events.csv + data/prices/NVDA.csv -> country-share/data/country_share.js
python scripts/build_policy_strip.py      # data/events.csv + data/prices/NVDA.csv -> story/data/policy_events.js
python scripts/check_story_numbers.py     # recomputes every number the story states, fails if one is off
```

Screenshots and the two draft images (needs `pip install playwright` and `python -m playwright install chromium`):

```bash
python scripts/render_screenshots.py      # opens every page headless, fails on any console error
```

## Files

```
story/index.html                 the story page: 8 frames in 4 parts (hook, rising insights, main message, solution)
story/story.css                  page layout
story/js/story.js                wiring: scroll steps, linked views, iframe sizing, progress nav
story/js/labs_per_year.js        frame 4 bar chart (labs per year), linked to the lab bubbles
story/js/sector_bars.js          frame 1: 2014 vs 2026 bars by who built the models, grow in on scroll
story/js/lab_clusters.js         frame 7: lab bubbles for 2024 to 2026, one cluster or split by home country
story/js/policy_strip.js         frame 6: Ashley's chip policy strip chart, one dot per event by Nvidia's 5-day move
story/data/policy_events.js      generated frame 6 data (events + 5-day reactions)
story/js/hero_dots.js            opening chart: all 931 models as dots, changed by the hero's scroll steps
story/drafts/drafts.html         Milestone 8 design drafts for frames 1 and 7 (no longer used by the story)
story/img/                       PNGs of those drafts (kept, not used by the story)
country-share/country_share_chart.js   country share chart (used by the story and the full page)
country-share/country_share_chart.css  its styles, plus the shared color variables
country-share/data/country_share.js    generated data
prototype-who-builds/            the dashboard, embedded in frames 2, 4 and 8 with URL options
scripts/                         data builds, number checks, screenshots
```

## Data fields

`window.WHO_BUILDS` (prototype-who-builds/data/who_builds.js)

- `models[]`: `name`, `date` (publication date), `year`, `sector` (Academia only, Academia + Industry, Industry only,
  Other), `orgs` (labs after merging one company's units), `country` (US, China, US + China, Other)
- `labCountry`: each lab's home country group (US, China, Other)
- `lastDate`, `source`

`window.COUNTRY_SHARE` (country-share/data/country_share.js)

- `years[]`: `year`, `total`, counts for `US`, `US + China`, `China`, `Other`, and `partial` for the unfinished year
- `windows[]`: the same counts for the two years before the Oct 7, 2022 controls, the two years after, and the two after that
- `events[]`: US export-control events from `data/events.csv` with `date`, `event`, `description`, and `nvda5`
  (Nvidia's 5-day reaction)
- `controls`, `groups`, `lastDate`, `source`, `eventSource`

## Counting rules

- Sector comes from Epoch's organization type. A university and a company together is its own sector.
- A model built by several labs counts once for each lab in the lab views ("lab credits").
- One company's research units count as one lab: Google Brain, Google Research, Google DeepMind and DeepMind are
  Google; Facebook AI Research, Facebook AI and Meta AI are Meta; Microsoft Research and Microsoft Research Asia are
  Microsoft; plus Alibaba DAMO Academy, Huawei Noah's Ark Lab and Salesforce Research.
- Each model counts once for country: US if a US organization built it and no Chinese one did, China the other way
  round, US + China if both, Other if neither. Hong Kong counts as China.
- Each lab's country is the one it is listed under on most of its models (the CSV lists one country per organization,
  in order). Ties go to its most recent model. Ten labs that the CSV never pairs cleanly are set by hand in
  `LAB_COUNTRY_OVERRIDE`.
- 2026 runs through Sep 30, 2026, so it is a partial year.
