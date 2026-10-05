#!/usr/bin/env node
/*
 * Renders a card twice (reference build vs candidate build) against the same fake Home Assistant
 * and compares the HTML of every screen. No dependencies: the cards only build strings, so a tiny
 * DOM stub is enough.
 *
 *   node test/render-equivalence.mjs --card v5 \
 *        --ref  <reference.js>  [--ref-config  <json>] \
 *        --cand <candidate.js>  [--cand-config <json>] \
 *        --fixture <json>        # real card config; used ONLY to invent a matching fake Home Assistant
 *   add --smoke to render only the candidate (no comparison) and report render errors
 *
 * The fixture/config JSON files hold real entity ids: keep them outside the repo (.private/ is ignored).
 */
import fs from 'node:fs';
import { TAGS, renderAll, scenarios, firstDiff } from './lib/render.mjs';

process.on('unhandledRejection', () => {});
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.length === 0) {
  console.log(`Renders a card twice (reference build vs candidate build) against the same fake Home Assistant
and compares the HTML of every screen.

  node test/render-equivalence.mjs --card v5|wall \\
       --ref  <reference.js>  [--ref-config  <json>] \\
       --cand <candidate.js>  [--cand-config <json>] \\
       --fixture <json>   real card config, used only to invent a matching fake Home Assistant
  --smoke   render only the candidate (no comparison) and report render errors

Config and fixture files hold real ids: keep them outside the repo.`);
  process.exit(0);
}
const arg = (n, d = '') => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const readJson = (p) => (p ? JSON.parse(fs.readFileSync(p, 'utf8')) : {});

const CARD = arg('card', 'v5');
if (!TAGS[CARD]) { console.error('--card must be v5 or wall'); process.exit(2); }

const fixture = readJson(arg('fixture'));
const candCfg = readJson(arg('cand-config')), refCfg = readJson(arg('ref-config'));
let bad = 0, total = 0, smokeErrors = 0;
for (const sc of scenarios(fixture)) {
  const cand = await renderAll(CARD, arg('cand'), candCfg, fixture, sc.over);
  if (flag('smoke')) {
    for (const [k, html] of Object.entries(cand.out)) { total++; if (html.includes('house-v5:') || html.includes('house-wall:') || !html) { smokeErrors++; console.log(`ERROR  ${sc.name} · ${k}: ${(html.match(/house-(v5|wall): [^<]*/) || ['(empty)'])[0]}`); } }
    continue;
  }
  const ref = await renderAll(CARD, arg('ref'), refCfg, fixture, sc.over);
  for (const k of Object.keys(ref.out)) {
    total++;
    const a = ref.out[k], b = cand.out[k];
    if (a === b) continue;
    bad++;
    const d = firstDiff(a, b);
    console.log(`DIFF   ${sc.name} · ${k}\n   ref : …${d.a}\n   cand: …${d.b}`);
  }
  if (cand.errors.length || ref.errors.length) console.log(`note   ${sc.name}: console errors ref=${ref.errors.length} cand=${cand.errors.length} (${[...ref.errors, ...cand.errors][0].slice(0, 120)})`);
}
const failed = flag('smoke') ? smokeErrors : bad;
console.log(`${flag('smoke') ? 'smoke' : 'equivalence'}: ${total - failed}/${total} screens ok`);
process.exit(failed ? 1 : 0);
