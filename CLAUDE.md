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

- `npm test` renders every screen of both cards against the placeholder configs in `test/fixtures/` (every id starts with `example`) and compares with `test/snapshots/<card>.html` (v5: 77 screens, wall: 49). After an intended visual change run `npm run snapshot:update` and review the snapshot diff: it shows exactly which screens changed.
- The fake Home Assistant lives in `test/lib/render.mjs` (DOM stub, states invented from the config, scenarios, and fixed answers for prices, calendars, statistics, logbook and forecasts). Its clock is fixed at 2026-10-05 12:00 UTC.
- CI (`.github/workflows/ci.yml`) runs the leak check and `npm test` on every push and PR, plus the HACS validation action. The optional repository secret `SCRUB_DENYLIST_TERMS` (the denylist file's content) adds the private denylist; CI runs the check with `--quiet`, which prints only `file:line`, never a term.

## State of play (2026-10-05)

- Both cards (0.2.0, neutral defaults) are live and served by HACS. The inline resources are deleted. The real values are in the card configs of the two dashboards. Render equivalence against the old inline builds was 119/119 (v5) and 42/42 (wall).
- The phone card has been checked on the phone. The wall display was switched afterwards and still needs a visual check after a page reload (day grid, weather, "Leaving?", more rooms).
- There are two dashboard resources: `house-v5.js` (managed by HACS) and `house-wall.js` (added by hand, same folder, same `?hacstag=` format). Resource ids are not recorded here; list the resources and match the file name.
- HACS tracks commits on `main` (no releases yet), so the "version" it shows is a short commit hash. Rollback: `ha_manage_hacs` `download` with an older commit, or revert on `main` and download again.
- Inline publishing (a whole file through `ha_config_set_dashboard_resource`) is no longer the normal path. It stays available as an emergency fallback: inline modules must not contain the hash character and should stay under ~128 KB.

## Delivery through HACS

Verified:
- HACS downloads the whole of `dist/`, not only the main file named in `hacs.json`. `house-wall.js` is served from the same folder as `house-v5.js`.

Still to verify (do it with the first real release after this one):
- Refresh flow: `ha_manage_hacs` with `update_information`, then `download` with a version. HACS polls custom repositories only about every 48 h by itself.
- Cache: HACS bumps the `?hacstag=` only on its own main-file resource. After a download, check whether the hand-added `house-wall.js` resource gets a new tag too. If not, set it by hand to the same tag as the `house-v5.js` resource (`ha_config_set_dashboard_resource` with the new url) or the wall display keeps its cached copy. The wall display also needs a page reload to load new code.
- Subfolders and split modules: confirm HACS downloads nested folders under `dist/`. Relative `import` URLs do not carry `?hacstag=`, so a split module can be served stale from the browser cache even when the entry file is new. Test this with a tiny change in one module before relying on native ES modules; a single bundled file per card avoids the problem.

## Next task: improve DX and code quality (agreed plan, 2026-10-05)

Goal: smaller edits, fewer tokens per change, checks that run without the real config, less risk when changing one screen. Hard constraint for every step: identical rendering (harness above, 119/119 and 42/42), no behavior change unless a step says so. One commit per step.

Decisions taken:
- **One combined bundle**, `house-cards.js`, registers both cards. HACS manages the only resource, so `?hacstag=` cache busting covers the wall display too (replaces the hand-added `house-wall.js` resource and the open "Cache" item above).
- **Tagged releases built by CI**: GitHub Actions builds the bundle on a tag and attaches it to the release; `dist/` is no longer committed. HACS then shows versions, update notices and rollback by version.
- **Build step with dev-only tools**: the npm registry was reachable on 2026-10-05 (esbuild, Biome, TypeScript all resolved). Nothing is added at runtime.
- **Formatter pass** (Biome, about 120 columns) in its own output-neutral commit.
- Not now: Lit (needs a DOM-level comparison in the harness first; later, one screen at a time) and a visual card editor (configs are too large for one).

Phases:
0. **Safety net without the real config.** Done 2026-10-05 (see "Checks that need no real config"). Commit a fixture made only of placeholder ids (from `config.example.yaml`), record golden snapshots of every screen of the current build, and compare against them in `npm test`. Add `npm run equiv -- --ref <commit>` that builds the reference from git by itself. GitHub Actions on push and PR: leak check, snapshot test, build, HACS validation action. If the denylist goes into a GitHub secret, first give `scrub-check.mjs` a quiet mode that prints only `file:line` (CI logs must never show a term).
1. **Tooling.** `src/` plus esbuild (bundle, source maps; version injected from `package.json`, so no version constants in the code), Biome (lint and format), `tsc --noEmit --checkJs` over JSDoc types (a small own type file for `hass` and both configs; not `custom-card-helpers`, it is unmaintained). One command, `npm run verify` (lint, typecheck, tests, build), and a SessionStart hook that runs `npm ci` in cloud sessions.
2. **Mechanical split.** `src/shared/`, `src/v5/` (shell, CSS, constants, one file per screen) and `src/wall/` (shell, CSS, one file per mode). View methods move as they are into per-screen objects that are attached to the class prototype (`Object.assign(HouseV5Card.prototype, homeView)`), so `this._s(...)` and every other body stay unchanged. Seams, by name:
   - `house-v5.js`: constants and helpers (`V5C`, `V5I`, `V5W`, `V5WMAP`, `V5WTEXT`, `v5`), `V5_CSS`, the card shell (`HouseV5Card`: config, hass setter, timers, click and hold handling, routing), and one group of view methods per screen: home (`_homeView`, `_alarmBanner`, `_todayCard`, `_energyGlance`, `_floorsHtml`, `_activeNow`), room (`_roomView`), vacuum (`_vacuumView`), security (`_securityView`, `_alarmBlock`), energy (`_energyView`, `_carCard`), climate (`_climateView`, `_tempChart`, `_weatherCard`, `_heatPumpCard`).
   - `house-wall.js`: helpers (`W`, `ICON`, `WX_ICON`, `WX_TEXT`), `CSS`, and the card class with one view method per mode (day, weather, leave, rooms, door, night, alarm).
3. **Delivery.** Entry `src/index.js` builds `house-cards.js`; `hacs.json` `filename` points to it. Release workflow on tags. One-off migration in Home Assistant: download the release through HACS, delete the old `house-v5.js` and `house-wall.js` resources (match by file name), check the new resource, reload the wall display. Update README, `config.example.yaml` comments and this file.
4. **Quality.** Merge duplicated helpers only where the output is identical (the two `esc` functions differ: the wall card also escapes `'`). Validate the config in `setConfig`: throw on wrong types (Home Assistant shows an error card), warn on unknown keys (catches YAML typos). Later: a local preview page with a fake Home Assistant and Playwright screenshots of every screen (Chromium is pre-installed in cloud sessions), so changes can be seen without touching the live house.

For agents: keep a file map in this file ("to change the energy screen, edit `src/v5/energy.js`") and add a repo skill for the release flow (build, tag, HACS download, check resources, reload the wall display).
