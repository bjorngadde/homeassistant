# CLAUDE.md

Two Home Assistant Lovelace cards (phone card `house-v5`, hall wall display `house-wall`), plain JavaScript ES modules in `src/`, bundled by esbuild, no runtime dependencies. See `README.md` for what they do and `config.example.yaml` for every config key.

## Hard rules

1. **Nothing that identifies the house goes into this repo**: no real entity ids, area or floor ids, people's names, pet or device names, addresses, account ids. That includes code, comments, tests, docs, commit messages and PR text. The repo is public (HACS cannot install from a private repo), so treat all history as public.
2. The real values live in the card config of the Home Assistant dashboards (the dashboards `mobile-v5` and `wall-v2`, one card each). Code ships only neutral defaults for anything house-specific.
3. Run the leak check before every commit: `git config core.hooksPath .githooks` (once per clone), and for the strong version `export SCRUB_DENYLIST=<file outside the repo>` (see below). `npm run check` runs it by hand. New entries in `scripts/scrub-allow.txt` must be reviewed: only property accesses, CSS selectors and public hosts.
4. Commit with the owner's GitHub noreply identity (`<github-username>@users.noreply.github.com`, set `user.name` / `user.email` locally) so no personal email ends up in history.

## Code map

Edit `src/`, never `dist/` (build output, not committed). After any change: `npm run verify` (lint, types, render snapshots, leak check).

| To change | Edit |
|---|---|
| Phone card: a tab or screen | `src/v5/views/` — `home.js` (Home tab: greeting, alarm banner, today, energy glance, floors, active now), `room.js` (one room), `vacuum.js` (vacuum screen), `security.js` (Security tab and the alarm block), `energy.js` (Energy tab, car), `climate.js` (Climate tab, chart, weather, heat pump) |
| Phone card: data, timers, clicks, hold-to-confirm, routing, tab bar | `src/v5/card.js` |
| Phone card: defaults, palette (`V5C`), icons (`V5I`), weather maps | `src/v5/constants.js` |
| Phone card: pure helpers (`v5.esc`, time formats, SVG, registry checks) | `src/v5/helpers.js` |
| Phone card: CSS | `src/v5/styles.js` |
| Wall card: a mode | `src/wall/views/` — `day.js` (Day screen and the helpers other modes share), `weather.js`, `leave.js` ("Leaving?"), `rooms.js` ("More rooms"), `door.js` (doorbell), `night.js`, `alarm.js` (entry delay / triggered) |
| Wall card: data, doorbell, fit to screen, clock, actions, mode switch | `src/wall/card.js` |
| Wall card: defaults and timings / helpers (`W`) / icons and weather maps / CSS | `src/wall/constants.js` / `helpers.js` / `icons.js` / `styles.js` |
| Card registration and version log line | `src/v5/index.js`, `src/wall/index.js` |

How the split works: each file in `views/` exports one object of methods that `card.js` copies onto the card's prototype (`Object.assign(HouseV5Card.prototype, homeView, ...)`), so `this` is the card everywhere and views call each other's methods freely. A new view method needs no registration; a new view file is imported in `card.js` and listed in `views.d.ts` (which tells the type checker about it). A field that only a view sets is declared in `views.d.ts` too.

## Getting the real config (outside the repo)

With the Home Assistant MCP server connected, read the card config of each dashboard (`ha_config_get_dashboard`, card at `views[0].cards[0]`), and save it as JSON in a scratch directory outside the repo. Then:

```sh
printf '%s\n' <names that are not ids: people, pets, ...> > extras.txt
node scripts/make-denylist.mjs v5.json wall.json --extra extras.txt > denylist.txt
SCRUB_DENYLIST=denylist.txt node scripts/scrub-check.mjs
npm run equiv -- --ref <commit> --v5 v5.json --wall wall.json
```

`npm run equiv` takes the reference build from a git commit (default `HEAD`) and the candidate from the working tree, and renders both with the same config. For an older build outside git, call `test/render-equivalence.mjs` directly (`--help`). Both cards must stay at 100 % identical screens (with the real configs: v5 119 screens, wall 49; the wall count includes one "styles" entry per scenario since 2026-10-05, it was 42 before). The harness is the safety net for any refactor.

## Checks that need no real config

- `npm run verify`: Biome (lint and format check), `tsc` type check, render snapshots, leak check. Run it before every commit.
- `npm test` builds `dist/house-cards.js` and renders every screen of both cards against the placeholder configs in `test/fixtures/` (every id starts with `example`), comparing with `test/snapshots/<card>.html` (v5: 77 screens, wall: 49). After an intended visual change run `npm run snapshot:update` and review the snapshot diff: it shows exactly which screens changed.
- The fake Home Assistant lives in `test/lib/render.mjs` (DOM stub, states invented from the config, scenarios, and fixed answers for prices, calendars, statistics, logbook and forecasts). Its clock is fixed at 2026-10-05 12:00 UTC.
- Types: `tsconfig.json` checks `src/` as JavaScript with JSDoc (not strict). `src/types.d.ts` holds globals; `src/<card>/views.d.ts` tells the checker which methods the views add to the card.
- CI (`.github/workflows/ci.yml`) runs the leak check, lint, types and snapshots on every push and PR; HACS validation runs on `main` only (a branch has no committed `dist/`, and GitHub detects the license on the default branch). The optional repository secret `SCRUB_DENYLIST_TERMS` (the denylist file's content) adds the private denylist; CI runs the check with `--quiet`, which prints only `file:line`, never a term.
- Cloud sessions run `.claude/hooks/session-start.sh` (npm install, git hooks) on start.

## Delivery: releases through HACS

- `dist/house-cards.js` registers both cards. It is built by the release workflow (`.github/workflows/release.yml`) when a tag `vX.Y.Z` matching `package.json` is pushed, and attached to the GitHub release. `hacs.json` names it, so HACS installs it from the latest release and manages its one dashboard resource (with `?hacstag=` cache busting for both cards).
- The whole flow, including the Home Assistant side (HACS refresh, resource check, wall display reload, rollback, emergency inline fallback), is the repo skill `.claude/skills/release/SKILL.md`.
- HACS polls custom repositories only about every 48 h: use `ha_manage_hacs` `update_information`, then `download`.
- The wall display needs a page reload to load new code.

## State of play (2026-10-05)

- Live in Home Assistant: 0.2.0, installed by HACS from a commit on `main` (no releases yet), as two resources: `house-v5.js` (managed by HACS) and `house-wall.js` (added by hand). Resource ids are not recorded here; list the resources and match the file name. The wall display still needs a visual check after a page reload.
- On branch `claude/sweet-allen-qq5p8u` (not yet on `main`): phases 0 to 3 of the plan below, version 0.3.0. Rendering is identical to 0.2.0 on every screen (placeholder fixtures; real configs 119/119 and 49/49).
- **One-off migration to 0.3.0** (needs the branch merged to `main` and Home Assistant reachable): push tag `v0.3.0`, wait for the release, `ha_manage_hacs` `update_information` + `download` 0.3.0, then in the dashboard resources make sure `house-cards.js` is present and delete the old `house-v5.js` and `house-wall.js` resources (both cards would otherwise be defined twice; the second definition is ignored, but the old files 404 after the download). Reload the wall display and check both dashboards.

## Plan status (agreed 2026-10-05)

Goal: smaller edits, fewer tokens per change, checks that run without the real config, less risk when changing one screen. Constraint for every step: identical rendering unless a step says so; one commit per step.

0. Safety net without the real config: done (snapshots, `npm run equiv`, CI, `scrub-check --quiet`).
1. Tooling: done (esbuild, Biome, `tsc` checkJs, `npm run verify`, SessionStart hook, MIT license).
2. Mechanical split into `src/v5/` and `src/wall/`: done (see the code map).
3. Delivery: done in the repo (one bundle, release workflow, release skill); the Home Assistant migration above is still to do.
4. Quality: merge duplicated helpers where the output is identical (the two `esc` functions differ: the wall card also escapes `'`); validate the config in `setConfig`; later a local preview page with Playwright screenshots of every screen (Chromium is pre-installed in cloud sessions).

Not now: Lit (needs a DOM-level comparison in the harness first; later, one screen at a time) and a visual card editor (the configs are too large for one).
