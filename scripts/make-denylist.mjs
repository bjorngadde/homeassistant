#!/usr/bin/env node
/*
 * Builds the private denylist for scripts/scrub-check.mjs from one or more JSON files that hold the REAL
 * card config (for example the dashboard config as returned by Home Assistant). Keep the input and the
 * output outside the repo.
 *
 *   node scripts/make-denylist.mjs real-config-1.json [real-config-2.json ...] [--extra words.txt] > ../denylist.txt
 *
 * What goes in: every entity id (as a value or as an object key), every multi-word snake_case string
 * (area and floor ids), the words inside person entity ids, and each line of the optional extras file
 * (names that are not ids: people, pets, street, employer, ...).
 */
import fs from 'node:fs';

const argv = process.argv.slice(2);
const xi = argv.indexOf('--extra');
const extraFile = xi >= 0 ? argv[xi + 1] : '';
const inputs = argv.filter((a, i) => !a.startsWith('--') && i !== xi + 1);

const ENTITY = /^[a-z_]+\.[a-z0-9_]+$/;
const SNAKE = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;
const out = new Set();

function walk(o) {
  if (typeof o === 'string') {
    if (ENTITY.test(o) || SNAKE.test(o)) out.add(o);
    if (/^person\./.test(o)) o.slice(7).split('_').filter((w) => w.length > 2).forEach((w) => out.add(w));
  } else if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (ENTITY.test(k)) out.add(k); walk(v); }
}
for (const f of inputs) walk(JSON.parse(fs.readFileSync(f, 'utf8')));
if (extraFile) fs.readFileSync(extraFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean).forEach((s) => out.add(s));
process.stdout.write([...out].sort().join('\n') + '\n');
