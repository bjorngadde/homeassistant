# CLAUDE.md

Three Home Assistant Lovelace cards (phone card `house-phone`, its big-screen layout `house-desktop`, hall wall display `house-wall`), plain JavaScript ES modules in `src/`, bundled by esbuild, no runtime dependencies. See `README.md` for what they do and `config.example.yaml` for every config key.

## Hard rules

1. **Nothing that identifies the house goes into this repo**: no real entity ids, area or floor ids, people's names, pet or device names, addresses, account ids. That includes code, comments, tests, docs, commit messages and PR text. The repo is public (HACS cannot install from a private repo), so treat all history as public.
2. The real values live in the card config of the Home Assistant dashboards (the dashboards `mobile-v5`, titled "Phone", and `wall-v2`, titled "Hall wall"; one card each. The URLs are leftovers from testing: Home Assistant cannot rename a dashboard URL). Code ships only neutral defaults for anything house-specific.
3. Run the leak check before every commit: `git config core.hooksPath .githooks` (once per clone), and for the strong version `export SCRUB_DENYLIST=<file outside the repo>` (see below). `npm run check` runs it by hand. New entries in `scripts/scrub-allow.txt` must be reviewed: only property accesses, CSS selectors and public hosts.
4. Commit with the owner's GitHub noreply identity (`<github-username>@users.noreply.github.com`, set `user.name` / `user.email` locally) so no personal email ends up in history.

## Code map

Edit `src/`, never `dist/` (build output, not committed). After any change: `npm run verify` (lint, types, render snapshots, leak check).

| To change | Edit |
|---|---|
| Phone card: a tab or screen | `src/phone/views/` — `home.js` (Home tab: greeting, alarm banner, today, energy glance, floors, active now), `room.js` (one room), `vacuum.js` (vacuum screen), `security.js` (Security tab and the alarm block), `energy.js` (Energy tab, car), `climate.js` (Climate tab, chart, weather, heat pump) |
| Phone card: data, timers, clicks, hold-to-confirm, routing, tab bar | `src/phone/card.js` |
| Navigation and back (browser button, Android back, iOS swipe) | `_go()`, `_onPop` and the `tab` / `room` / `back` cases of `_onClick` in `src/phone/card.js`. Rule: leaving Home or opening a room adds a history entry (state keys `housePhoneTab`, `housePhoneRoom`, same URL); moving between other tabs replaces it, so back always goes one level up. Tested in `test/navigation.test.mjs` |
| Phone card: defaults, palette (`COLOR`), icons (`ICON`), weather icons and texts (`WX_PATHS`, `WX_KIND`, `WX_TEXT`) | `src/phone/constants.js` |
| Phone card: pure helpers (`P.esc`, time formats, SVG, registry checks) | `src/phone/helpers.js` |
| Phone card: CSS | `src/phone/styles.js` |
| Desktop card (big screens): layout, overview on Home | `src/desktop/` — `card.js` (subclass of the phone card: `_styles`, `_view`, `_homeView`), `styles.js` (container queries: tab row on top and two columns from 900px, three from 1300px). Same config as the phone card, so screens and data come from `src/phone/`; a change there shows up in both |
| Wall card: a mode | `src/wall/views/` — `day.js` (Day screen and the helpers other modes share), `weather.js`, `leave.js` ("Leaving?"), `rooms.js` ("More rooms"), `door.js` (doorbell), `night.js`, `alarm.js` (entry delay / triggered) |
| Wall card: data, doorbell, fit to screen, clock, actions, mode switch | `src/wall/card.js` |
| Wall card: defaults and timings / helpers (`W`) / icons and weather maps / CSS | `src/wall/constants.js` / `helpers.js` / `icons.js` / `styles.js` |
| Card registration and version log line | `src/phone/index.js`, `src/wall/index.js`, both bundled by `src/index.js` |
| Config schema (checked in `setConfig`) | `src/phone/schema.js`, `src/wall/schema.js`; notation and checker in `src/shared/config.js` |
| Code both cards share | `src/shared/` — `config.js` (merge with defaults, validation), `hass.js` (`areaOf`) |

A new config key goes into four places: the defaults (`constants.js`), the schema (`schema.js`), `config.example.yaml` and the fixture in `test/fixtures/` (a unit test fails if a default is missing from the schema).

How the split works: each file in `views/` exports one object of methods that `card.js` copies onto the card's prototype (`Object.assign(HousePhoneCard.prototype, homeView, ...)`), so `this` is the card everywhere and views call each other's methods freely. A new view method needs no registration; a new view file is imported in `card.js` and listed in `views.d.ts` (which tells the type checker about it). A field that only a view sets is declared in `views.d.ts` too.

## Getting the real config (outside the repo)

With the Home Assistant MCP server connected, read the card config of each dashboard (`ha_config_get_dashboard`, card at `views[0].cards[0]`), and save it as JSON in a scratch directory outside the repo. Then:

```sh
printf '%s\n' <names that are not ids: people, pets, ...> > extras.txt
node scripts/make-denylist.mjs phone.json wall.json --extra extras.txt > denylist.txt
SCRUB_DENYLIST=denylist.txt node scripts/scrub-check.mjs
npm run equiv -- --ref <commit> --phone phone.json --wall wall.json
```

`npm run equiv` takes the reference build from a git commit (default `HEAD`) and the candidate from the working tree, and renders both with the same config. For an older build outside git, call `test/render-equivalence.mjs` directly (`--help`). Both cards must stay at 100 % identical screens (with the real configs: phone 119 screens, desktop 119 (same config), wall 49; the wall count includes one "styles" entry per scenario since 2026-10-05, it was 42 before). The harness is the safety net for any refactor.

## Checks that need no real config

- `npm run verify`: Biome (lint and format check), `tsc` type check, render snapshots, leak check. Run it before every commit.
- `npm test` runs the unit tests (`test/*.test.mjs`, node:test: config merge and validation, the built bundle, and navigation: clicks on the built card against a fake browser history), then builds `dist/house-cards.js` and renders every screen of both cards against the placeholder configs in `test/fixtures/` (every id starts with `example`), comparing with `test/snapshots/<card>.html` (phone: 77 screens, desktop: 77 with the phone fixture, wall: 49). After an intended visual change run `npm run snapshot:update` and review the snapshot diff: it shows exactly which screens changed.
- The fake Home Assistant lives in `test/lib/fake-hass.mjs` (states and registries invented from the config, fixed answers for prices, calendars, statistics, logbook and forecasts, the scenarios and the screen list); `test/lib/render.mjs` adds the DOM stub for Node. The clock is fixed at 2026-10-05 12:00 UTC.
- Types: `tsconfig.json` checks `src/` as JavaScript with JSDoc (not strict). `src/types.d.ts` holds globals; `src/<card>/views.d.ts` tells the checker which methods the views add to the card.
- CI (`.github/workflows/ci.yml`) runs the leak check, lint, types and snapshots on every push and PR; HACS validation runs on `main` only (a branch has no committed `dist/`, and GitHub detects the license on the default branch). The optional repository secret `SCRUB_DENYLIST_TERMS` (the denylist file's content) adds the private denylist; CI runs the check with `--quiet`, which prints only `file:line`, never a term.
- Cloud sessions run `.claude/hooks/session-start.sh` (npm install, git hooks) on start.
- To *see* a change: `npm run preview` (add `--all` for every scenario, `--card phone|wall` for one card) writes a PNG per screen to `.private/preview/<card>/<scenario>/<screen>.png` (git-ignored); open the PNGs with the Read tool. It renders in headless Chromium against the fake Home Assistant in `test/lib/fake-hass.mjs` (the same one the snapshots use), with the clock fixed and the internet blocked (fallback font instead of Manrope, grey placeholders for camera and map images). With `--phone/--wall <real config>` the screenshots show real names: keep them local. The preview also prints **layout warnings** for any element placed directly on a page that ends up with no width or height (how a collapsed main camera on the desktop card was caught); treat them as bugs.

## Delivery: releases through HACS

- `dist/house-cards.js` registers both cards. It is built by the release workflow (`.github/workflows/release.yml`) when a tag `vX.Y.Z` matching `package.json` is pushed, and attached to the GitHub release. `hacs.json` names it, so HACS installs it from the latest release and manages its one dashboard resource (with `?hacstag=` cache busting for both cards).
- The whole flow, including the Home Assistant side (HACS refresh, resource check, wall display reload, rollback, emergency inline fallback), is the repo skill `.claude/skills/release/SKILL.md`.
- HACS polls custom repositories only about every 48 h: use `ha_manage_hacs` `update_information`, then `download`.
- The wall display needs a page reload to load new code.

## State of play (2026-10-05)

- Live in Home Assistant: **0.6.0**, installed by HACS from the GitHub release, as **one** dashboard resource: `/hacsfiles/homeassistant/house-cards.js?hacstag=...` (managed by HACS). Resource ids are not recorded here; list the resources and match the file name.
- Dashboards using these cards: `mobile-v5` (title "Phone", `house-phone-card`), `house-desktop` (title "House", `house-desktop-card`, created 2026-10-05 as the first version of the big-screen dashboard) and `wall-v2` (title "Hall wall", `house-wall-card`). The URLs `mobile-v5` and `wall-v2` are leftovers from testing; Home Assistant cannot rename a dashboard URL.
- The House dashboard's card config is a **copy** of the phone dashboard's (only `type` differs). A change to one (a new camera, a room setting) must be made in both until the desktop card can read the phone dashboard's config itself (an open idea).
- The phone card's old name `house-v5-card` is no longer registered (since 0.5.0).
- Still to check by eye: the phone dashboard, the House dashboard in a browser, and the wall display after a page reload (day grid, weather, "Leaving?", "More rooms"). Phone and wall render identically to 0.2.0 in the harness (real configs 119/119 and 49/49); the desktop card renders all 119 screens of the real phone config without errors.
- Dashboard screenshots through the Home Assistant MCP server need its "dashboard screenshot" beta feature, which is off; use `npm run preview` (`--card desktop --width <px>` for the big-screen card).
- Older dashboards (Mobile v2, Mobile v3, Mobile dashboard, Wall display), the Overview dashboard and an inline resource for an earlier card (`house-v3`) are not part of this repo and stay as they are for now.
- Releasing from a Claude Code cloud session: tags cannot be pushed through its git proxy, so run the Release workflow on `main` by hand (it creates the tag); see the release skill.

## Plan status (agreed 2026-10-05)

Goal: smaller edits, fewer tokens per change, checks that run without the real config, less risk when changing one screen. Constraint for every step: identical rendering unless a step says so; one commit per step.

0. Safety net without the real config: done (snapshots, `npm run equiv`, CI, `scrub-check --quiet`).
1. Tooling: done (esbuild, Biome, `tsc` checkJs, `npm run verify`, SessionStart hook, MIT license).
2. Mechanical split into `src/phone/` and `src/wall/`: done (see the code map).
3. Delivery: done (one bundle, release workflow, release skill; 0.3.0 released and installed, old resources removed).
4. Quality: done, including the browser preview (`npm run preview`). Shared helpers (`mergeConfig`, `areaOf`; `esc`, `svg`, the time format and the weather texts differ between the cards on purpose and stay separate) and config validation in `setConfig` (both real configs: no errors, no warnings).

Not now: Lit (needs a DOM-level comparison in the harness first; later, one screen at a time) and a visual card editor (the configs are too large for one).
