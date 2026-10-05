---
name: release
description: Release a new version of the house dashboard cards (house-cards.js) and roll it out to Home Assistant through HACS. Use when asked to release, publish, ship or deploy the cards, or to get a change onto the phone or the wall display.
---

# Release the cards

A release is a git tag `vX.Y.Z` on `main`. The release workflow (`.github/workflows/release.yml`) checks the tag against `package.json`, runs the leak check, lint, types and render snapshots, builds `dist/house-cards.js` and publishes a GitHub release with it attached. HACS installs from the latest release.

## 1. Prepare (on a branch, merged through a PR)

1. `npm run verify` is green.
2. For anything that may change rendering, also run the real-config equivalence (CLAUDE.md, "Getting the real config"): `npm run equiv -- --ref <last release tag> --phone <phone.json> --wall <wall.json>`. Differences must be exactly the intended ones.
3. Bump `version` in `package.json` (patch: fixes; minor: new screens or config keys; major: config keys renamed or removed) and run `npm install` so `package-lock.json` follows.
4. Merge to `main` (ask the user before merging if they have not said so).

## 2. Tag and publish

Either way works; the Release workflow then checks, builds and publishes:

- Run the Release workflow by hand on `main` (GitHub "Actions" tab, "Run workflow"; or the GitHub MCP tool `actions_run_trigger` with `workflow_id: release.yml`, `ref: main`). It creates the tag `v<package.json version>` itself and stops if that tag exists. Use this from Claude Code cloud sessions: their git proxy does not let tags through (`git push origin <tag>` ends in "unexpected disconnect").
- Or push the tag from a normal clone:

  ```sh
  git fetch origin main && git checkout main && git pull
  git tag v$(node -p "require('./package.json').version") && git push origin --tags
  ```

Wait for the Release workflow to finish green; the release page must list `house-cards.js`.

## 3. Roll out in Home Assistant (Home Assistant MCP server)

1. `ha_manage_hacs` `update_information` for this repository (HACS polls custom repositories only about every 48 h by itself), then `download` with the new version.
2. `ha_config_list_dashboard_resources`: exactly one resource for this repository, `/hacsfiles/<repo folder>/house-cards.js?hacstag=...`, and its tag changed with the download. Old resources for `house-v5.js` or `house-wall.js` must not exist (they would 404).
3. The phone picks the new code up on its next dashboard load. The wall display keeps the old code until its page reloads: ask the user to reload it (or reload it through the kiosk browser if they have set that up), then check the day grid, weather, "Leaving?" and "More rooms".
4. Rollback: `ha_manage_hacs` `download` with the previous version.

## Emergency fallback

If HACS is unavailable: `npm run build`, then publish `dist/house-cards.js` as an inline resource through `ha_config_set_dashboard_resource`. Remove the `//# sourceMappingURL=` line first (an inline data: URI must not contain the hash character) and keep it under about 128 KB.
