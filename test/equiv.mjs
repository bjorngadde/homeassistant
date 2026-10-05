#!/usr/bin/env node
/*
 * Render equivalence against a git commit: takes the reference build from <rev> (default HEAD), the candidate
 * from the working tree, and runs test/render-equivalence.mjs for both cards.
 *
 *   npm run equiv                                      HEAD vs working tree, placeholder fixtures
 *   npm run equiv -- --ref main                        another commit, branch or tag
 *   npm run equiv -- --v5 <v5.json> --wall <wall.json> real card configs (kept OUTSIDE the repo); the same
 *                                                      config is used for both builds and to invent the fake
 *                                                      Home Assistant, as in CLAUDE.md
 *   --card v5|wall                                     only one card
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d = '') => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const rev = arg('ref', 'HEAD');
const BUILD = { v5: 'dist/house-v5.js', wall: 'dist/house-wall.js' };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'house-equiv-'));
let failed = 0;
try {
  for (const card of Object.keys(BUILD)) {
    if (arg('card') && arg('card') !== card) continue;
    const ref = path.join(tmp, `${card}.js`);
    try {
      fs.writeFileSync(ref, execFileSync('git', ['show', `${rev}:${BUILD[card]}`], { cwd: root, maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] }));
    } catch (e) {
      console.error(`cannot read ${BUILD[card]} at ${rev}: ${String(e.stderr || e.message).trim()}`);
      failed++; continue;
    }
    const config = arg(card) || path.join(root, `test/fixtures/${card}.json`);
    console.log(`== ${card}: ${rev} vs working tree (${arg(card) ? 'given config' : 'placeholder fixture'})`);
    const r = spawnSync(process.execPath, [path.join(root, 'test/render-equivalence.mjs'), '--card', card,
      '--ref', ref, '--ref-config', config, '--cand', path.join(root, BUILD[card]), '--cand-config', config, '--fixture', config], { stdio: 'inherit' });
    if (r.status !== 0) failed++;
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
