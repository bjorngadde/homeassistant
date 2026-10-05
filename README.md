# House dashboard cards

Two custom Lovelace cards for a Home Assistant house dashboard, shipped together in one file, `house-cards.js`:

| Card | For | Source |
|---|---|---|
| `custom:house-v5-card` | Phone dashboard: Home, Security, Energy, Climate, one screen per room, one for the robot vacuum | `src/v5/` |
| `custom:house-wall-card` | Calm 480×480 screen for a Shelly Wall Display: day, weather, "Leaving?", more rooms, doorbell, night, alarm entry-delay warning | `src/wall/` |

Rooms and lights are discovered from Home Assistant's floors, areas and entity registry. Everything specific to one house (entity ids, area ids, names) is supplied through the **card config** in the dashboard, so this repo contains no ids. See `config.example.yaml` for every key, with placeholder values.

## What the cards expect from Home Assistant

- Optional room scenes: an `input_select.<area_id>_scene` helper per room (options in order) and a `script.room_scene` script that takes `room` and `scene`. Rooms that have the helper get a scene button row.
- Optional "Clean, then arm": a script and a boolean helper, set in `clean_then_arm`.
- Alarmo for the alarm panel, Tibber for prices, SMHI for weather, a Roborock vacuum with the Xiaomi map extractor for the vacuum screen. Every section that has no configured entity is simply left empty.

## Install

Add this repository to HACS as a custom repository (category: Dashboard) and download it. HACS installs `house-cards.js` from the latest release and adds it as a dashboard resource; that one resource provides both cards. Then put the real values in the card config of each dashboard (`type: custom:house-v5-card` or `type: custom:house-wall-card`).

## Develop

Node 20+. The cards are plain JavaScript ES modules in `src/`, bundled by esbuild; the dev tools (esbuild, Biome, TypeScript for type checks) are dev dependencies only, nothing is added to what the dashboard loads.

```sh
npm install
git config core.hooksPath .githooks   # run the leak check before every commit
npm run verify                        # lint + format check, types, render snapshots, leak check
npm run build                         # dist/house-cards.js (+ source map)
npm run format                        # apply Biome formatting and safe lint fixes
npm run snapshot:update               # after an intended visual change; review the snapshot diff
npm run equiv -- --ref main           # render equivalence: a git commit vs the working tree
npm run preview                       # screenshots of every screen in headless Chromium, .private/preview/index.html
```

`npm test` builds and renders both cards against a fake Home Assistant built from the placeholder configs in `test/fixtures/`, and compares the HTML of every screen with `test/snapshots/`. It needs no real config, so CI runs it on every push. `npm run equiv` compares two builds screen by screen; pass `--v5 <json> --wall <json>` to use real card configs, and keep those outside the repo.

`npm run preview` renders every screen in a real browser against the same fake Home Assistant and saves PNGs plus an `index.html` gallery in `.private/preview/` (git-ignored). Add `--all` for every scenario (alarm armed, entry delay, door open, ...). It uses playwright-core: in Claude Code cloud sessions Chromium is pre-installed; elsewhere run `npx playwright-core install chromium` once or set `CHROME_PATH`.

## Release

Bump `version` in `package.json`, merge to `main`, then push a tag `v<version>`. The release workflow checks, builds and publishes a GitHub release with `house-cards.js` attached; HACS offers it as an update.

## License

MIT, see `LICENSE`.
