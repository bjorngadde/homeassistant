# CLAUDE.md

Two Home Assistant Lovelace cards (phone card `house-v5`, hall wall display `house-wall`), plain JavaScript, no dependencies. See `README.md` for what they do and `config.example.yaml` for every config key.

## Hard rules

1. **Nothing that identifies the house goes into this repo**: no real entity ids, area or floor ids, people's names, pet or device names, addresses, account ids. That includes code, comments, tests, docs, commit messages and PR text. The repo is private today but is meant to become public (HACS cannot install from a private repo), so treat all history as public.
2. The real values live in the card config of the Home Assistant dashboards (the dashboards `mobile-v5` and `wall-v2`, one card each). Code ships only neutral defaults for anything house-specific.
3. Run the leak check before every commit: `git config core.hooksPath .githooks` (once per clone), and for the strong version `export SCRUB_DENYLIST=<file outside the repo>` (see below). `npm run check` runs it by hand. New entries in `scripts/scrub-allow.txt` must be reviewed: only property accesses, CSS selectors and public hosts.
4. Commit with the owner's GitHub noreply identity (`<github-username>@users.noreply.github.com`, set `user.name` / `user.email` locally) so no personal email ends up in history.

## Getting the real config (outside the repo)

With the Home Assistant MCP server connected, read the card config of each dashboard (`ha_config_get_dashboard`, card at `views[0].cards[0]`), and save it as JSON in a scratch directory outside the repo. Then:

```sh
printf '%s\n' <names that are not ids: people, pets, ...> > extras.txt
node scripts/make-denylist.mjs v5.json wall.json --extra extras.txt > denylist.txt
SCRUB_DENYLIST=denylist.txt node scripts/scrub-check.mjs
node test/render-equivalence.mjs --card v5   --ref <old build> --cand dist/house-v5.js   --cand-config v5.json   --fixture v5.json
node test/render-equivalence.mjs --card wall --ref <old build> --cand dist/house-wall.js --cand-config wall.json --fixture wall.json
```

`--ref` is a build whose rendering you want to preserve (for a refactor: the build before your change, with no config if it still has the defaults baked in, or with the same config). Both cards must stay at 100 % identical screens (v5: 119 screens, wall: 42, with the current fixture). The harness is the safety net for any refactor.

## State of play (2026-10-05)

- The live dashboards still run the old inline versions of both cards (v5 0.1.7, wall 0.1.6) with the house defaults baked in. The dashboards' card configs now carry the real values, identical to those defaults, so the `dist/` versions (0.2.0, neutral defaults, same code otherwise) can replace them with no visible change. Verified: render equivalence 119/119 (v5) and 42/42 (wall).
- Not done yet, in order: make the repo public (the owner does this), add it to HACS as a custom Dashboard repository, install, switch the dashboard resources from the inline modules to the HACS files, check on the phone and the wall display, then delete the inline resources.
- Until then, publishing means sending a whole file with `ha_config_set_dashboard_resource` as inline content (find the resource by listing resources and matching the file's header comment). Inline modules must not contain the hash character and should stay under ~128 KB. A listing with `include_content=True` for one resource is large: the result is saved to a file, so extract it with `jq -r '.resources[0]._content'` instead of reading it into context.

## Delivery through HACS: assumptions to verify with a tiny first release

- `hacs.json` names `house-v5.js` as the main file. Does HACS download everything in `dist/` (needed for `house-wall.js` and for split modules), or only the main file? If only the main file, bundle, or use a second repository.
- Refresh flow: `ha_manage_hacs` with `update_information`, then `download` with a version. HACS polls custom repositories only about every 48 h by itself.
- Cache: HACS resource URLs carry `?hacstag=<version>`; confirm the phone app and the wall display pick up a new release without a manual cache reset.

## Next task: split each card into modules

Goal: smaller edits, fewer tokens per change, less risk when changing one screen. Constraints: identical rendering (harness above), no behavior change, versions bumped, README and this file updated.

Seams in the current files, by name:
- `house-v5.js`: constants and helpers (`V5C`, `V5I`, `V5W`, `V5WMAP`, `V5WTEXT`, `v5`), `V5_CSS`, the card shell (`HouseV5Card`: config, hass setter, timers, click and hold handling, routing), and one group of view methods per screen: home (`_homeView`, `_alarmBanner`, `_todayCard`, `_energyGlance`, `_floorsHtml`, `_activeNow`), room (`_roomView`), vacuum (`_vacuumView`), security (`_securityView`, `_alarmBlock`), energy (`_energyView`, `_carCard`), climate (`_climateView`, `_tempChart`, `_weatherCard`, `_heatPumpCard`).
- `house-wall.js`: helpers (`W`, `ICON`, `WX_ICON`, `WX_TEXT`), `CSS`, and the card class with one view method per mode (day, weather, leave, rooms, door, night, alarm).

Open decisions for that session: native ES modules loaded relatively from the HACS folder (no build step; the harness needs a small loader for the module graph) versus a bundle step. In the web session where this was prepared, the npm registry answered 403 for every package (egress policy), so check whether a registry is reachable before planning on esbuild; the dependency-free route always works.
