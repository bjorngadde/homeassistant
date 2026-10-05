# House dashboard cards

Two custom Lovelace cards for a Home Assistant house dashboard, written as plain JavaScript modules with no dependencies:

| File | Card | For |
|---|---|---|
| `dist/house-v5.js` | `custom:house-v5-card` | Phone dashboard: Home, Security, Energy, Climate, one screen per room, one for the robot vacuum |
| `dist/house-wall.js` | `custom:house-wall-card` | Calm 480×480 screen for a Shelly Wall Display: day, weather, "Leaving?", more rooms, doorbell, night, alarm entry-delay warning |

Rooms and lights are discovered from Home Assistant's floors, areas and entity registry. Everything specific to one house (entity ids, area ids, names) is supplied through the **card config** in the dashboard, so this repo contains no ids. See `config.example.yaml` for every key, with placeholder values.

## What the cards expect from Home Assistant

- Optional room scenes: an `input_select.<area_id>_scene` helper per room (options in order) and a `script.room_scene` script that takes `room` and `scene`. Rooms that have the helper get a scene button row.
- Optional "Clean, then arm": a script and a boolean helper, set in `clean_then_arm`.
- Alarmo for the alarm panel, Tibber for prices, SMHI for weather, a Roborock vacuum with the Xiaomi map extractor for the vacuum screen. Every section that has no configured entity is simply left empty.

## Install

Add this repository to HACS as a custom repository (category: Dashboard), install it, then put the real values in the card config of your dashboard. The second card, `house-wall.js`, is added as a resource that points at the same installed folder.

## Develop

No build step and no dependencies; Node 20+ is enough.

```sh
git config core.hooksPath .githooks   # run the leak check before every commit
npm run check                         # leak check, see scripts/scrub-check.mjs
npm test                              # render every screen and compare with test/snapshots/
npm run snapshot:update               # after an intended visual change; review the snapshot diff
npm run equiv -- --ref main           # render equivalence: a git commit vs the working tree
```

`npm test` renders both cards against a fake Home Assistant built from the placeholder configs in `test/fixtures/` and compares the HTML of every screen with `test/snapshots/`. It needs no real config, so CI runs it on every push together with the leak check and the HACS validation. `npm run equiv` compares two builds screen by screen; pass `--v5 <json> --wall <json>` to use real card configs, and keep those outside the repo.

## License

MIT, see `LICENSE`.
