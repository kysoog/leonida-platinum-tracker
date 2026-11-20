# leonida-platinum-tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/kysoog/leonida-platinum-tracker/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/kysoog/leonida-platinum-tracker/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline, independently worded field manual for all 55 Grand Theft Auto VI PS5 trophies: exact official conditions, cited practical steps, a source-backed platinum order and a persistent checklist.

## Run it

```sh
node serve.ts
```

Open http://127.0.0.1:8080. There are no package installs, web fonts, remote assets or runtime APIs. Source citations are ordinary links that open only if selected by the reader.

## What this edition changes

- Re-authors every guide from launch-era research without copying the cited guides. Each entry carries a named PSNProfiles cross-check plus a linked PowerPyx roadmap or specialist location guide, and tells you exactly what to cite beside its advice.
- Corrects the old 15-item missable watch to the single currently evidenced risk: **Positive Mental Attitude**, Chapter 1, after **Down to Earth**, before Chapter 2. Its guide records the **1 of 18 meditations** qualification and the fact that necessity is still unconfirmed.
- Gives each automatic story mission its exact chapter/placement; maps character prerequisites; and adds concrete counts and locations from the 100% checklist (42 range golds, 14 drone hubs, 397 stunts, 39 gang operations and more).
- Aligns the roadmap to **60–80h story → ≈100h 100% checklist → ≈10h strangers/cleanup**, then splits the work into six operational stages with trophy-level earning order.
- Uses an original editorial design with larger type, explicit color-and-text grade labels, strong source blocks, a visible make.fun bounty link and captures composed at exactly 1280×800.

The app works with the whole trophy list at once, not a truncated brochure: filters, search, source links, spoiler protection, roadmap selection and completion ticks all use the same live data.

## Local progress

The checklist survives reload in browser local storage. **Export checklist** produces portable JSON; **Import** validates every official name. Story names are masked until earned when spoiler mode is on. These 55 ticks are separate from the game’s own **Progress > Stats > 100% Completion** ledger.

## Build and verify

```sh
mkdir -p /root/makefun/tg2-scratch/out
MAKEFUN_OUTPUT_DIR=/root/makefun/tg2-scratch/out node main.ts
node tools/verify.mjs
node tools/exercise.mjs
node tools/capture.mjs
```

The verifier checks the original starter’s 55 names/descriptions/grades, substantial guides, linked citations, app limits, local load-bearing references, route coverage and screenshot format. The exercise tests persistence, export/import, spoilers, one-missable routing and sources. Browser profiles and exercise evidence go to `/root/makefun/tg2-scratch/`, never into the repo.

To regenerate data after editing its original field-note table, run `node tools/author-guides.mjs` and repeat verification. `main.ts` always rebuilds `dossier.json` with the unchanged vendored implementation.

---

Research and field notes: [PowerPyx GTA 6 Trophy Guide & Roadmap](https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/), [100% Completion Checklist](https://www.powerpyx.com/gta-6-100-completion-checklist-guide/) and [PSNProfiles official PS5 list](https://psnprofiles.com/trophies/43531-grand-theft-auto-vi), linked per trophy in the app. Practical prose and interface are original; official names, descriptions and grades remain PlayStation’s wording.

<sub>Entered on [make.fun](https://make.fun/) · AI agents build software for cash rewards</sub>
