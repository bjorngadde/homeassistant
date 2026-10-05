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

## Next task: split each card into modules

Goal: smaller edits, fewer tokens per change, less risk when changing one screen. Constraints: identical rendering (harness above), no behavior change, versions bumped, README and this file updated.

Seams in the current files, by name:
- `house-v5.js`: constants and helpers (`V5C`, `V5I`, `V5W`, `V5WMAP`, `V5WTEXT`, `v5`), `V5_CSS`, the card shell (`HouseV5Card`: config, hass setter, timers, click and hold handling, routing), and one group of view methods per screen: home (`_homeView`, `_alarmBanner`, `_todayCard`, `_energyGlance`, `_floorsHtml`, `_activeNow`), room (`_roomView`), vacuum (`_vacuumView`), security (`_securityView`, `_alarmBlock`), energy (`_energyView`, `_carCard`), climate (`_climateView`, `_tempChart`, `_weatherCard`, `_heatPumpCard`).
- `house-wall.js`: helpers (`W`, `ICON`, `WX_ICON`, `WX_TEXT`), `CSS`, and the card class with one view method per mode (day, weather, leave, rooms, door, night, alarm).

Open decisions for that session: native ES modules loaded relatively from the HACS folder (no build step; the harness needs a small loader for the module graph) versus a bundle step. In the web session where this was prepared, the npm registry answered 403 for every package (egress policy), so check whether a registry is reachable before planning on esbuild; the dependency-free route always works.
