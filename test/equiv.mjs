#!/usr/bin/env node
/*
 * Render equivalence against a git commit: builds the reference from <rev> (default HEAD) and the candidate from
 * the working tree, then runs test/render-equivalence.mjs for both cards.
 *
 *   npm run equiv                                      HEAD vs working tree, placeholder fixtures
 *   npm run equiv -- --ref main                        another commit, branch or tag
 *   npm run equiv -- --v5 <v5.json> --wall <wall.json> real card configs (kept OUTSIDE the repo); the same
 *                                                      config is used for both builds and to invent the fake
 *                                                      Home Assistant, as in CLAUDE.md
 *   --card v5|wall                                     only one card
 *
 * Old commits that still have the cards committed in dist/ are used as they are; newer ones are built from their
 * own src/ with their own scripts/build.mjs (using this checkout's node_modules).
 */
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFile } from './lib/render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d = '') => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const rev = arg('ref', 'HEAD');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'house-equiv-'));
let failed = 0;
try {
  // reference: the commit's tree, built unless it still carries a build in dist/
  const refDir = path.join(tmp, 'ref');
  fs.mkdirSync(refDir);
  try {
    execSync(`git archive ${JSON.stringify(rev)} | tar -x -C ${JSON.stringify(refDir)}`, {
      cwd: root,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (e) {
    console.error(`cannot read ${rev}: ${String(e.stderr || e.message).trim()}`);
    process.exit(1);
  }
  if (fs.existsSync(path.join(refDir, 'scripts/build.mjs'))) {
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(refDir, 'node_modules'), 'dir');
    execFileSync(process.execPath, [path.join(refDir, 'scripts/build.mjs')], {
      cwd: refDir,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  }
  // candidate: the working tree
  execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  for (const card of ['v5', 'wall']) {
    if (arg('card') && arg('card') !== card) continue;
    const config = arg(card) || path.join(root, `test/fixtures/${card}.json`);
    console.log(`== ${card}: ${rev} vs working tree (${arg(card) ? 'given config' : 'placeholder fixture'})`);
    const r = spawnSync(
      process.execPath,
      [
        path.join(root, 'test/render-equivalence.mjs'),
        '--card',
        card,
        '--ref',
        buildFile(path.join(refDir, 'dist'), card),
        '--ref-config',
        config,
        '--cand',
        buildFile(path.join(root, 'dist'), card),
        '--cand-config',
        config,
        '--fixture',
        config,
      ],
      { stdio: 'inherit' },
    );
    if (r.status !== 0) failed++;
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
