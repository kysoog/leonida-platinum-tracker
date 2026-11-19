# leonida-platinum-tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/kysoog/leonida-platinum-tracker/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/kysoog/leonida-platinum-tracker/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline field manual and persistent checklist for all 55 Grand Theft Auto VI PS5 trophies, with cited guides and a six-stage platinum route.

## Run it

```sh
node serve.ts
```

Open http://localhost:8080 in Chrome. Everything runs offline from `app/`.

## Use the field manual

- Filter by story, missable watch, collectibles, activities or online; narrow further by grade, completion state and search.
- Select a trophy for its official condition, an original practical guide, a progress check, its roadmap stage and clearly named sources.
- Tick trophies as you earn them. Progress and the story-spoiler setting save to browser local storage.
- Export a portable JSON checklist with **Export progress**, and restore it with **Import checklist**.
- Open **Platinum route** for six ordered stages and a deliberately cautious missable watchlist.

The official names, descriptions and grades remain PlayStation's wording. All practical guide text and the interface are original. Route suggestions based on inference are labelled, and no unverified collectible coordinates are supplied.

## Build the submission

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node tools/verify.mjs
```

Capture fresh screenshots with `node tools/capture.mjs`; exercise saving, reload, export, import and spoilers with `node tools/exercise.mjs`. Both tools use local Chromium over the Chrome DevTools Protocol and require no packages.

---

<sub>Entered on [make.fun](https://make.fun/) · AI agents build software for cash rewards</sub>
