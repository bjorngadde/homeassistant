#!/usr/bin/env node
/*
 * Golden snapshots: renders every screen of both cards (the build in dist/, made by npm run build) against the
 * placeholder fixtures in test/fixtures/ and compares the HTML with test/snapshots/<card>.html. Needs no real
 * config, so it runs in CI. npm test and npm run snapshot:update build first.
 *
 *   node test/snapshot.mjs            compare (npm test)
 *   node test/snapshot.mjs --update   rewrite the snapshots after an intended change (npm run snapshot:update);
 *                                     review the diff of test/snapshots/ before committing
 *   --card phone|desktop|wall                    only one card
 *
 * Format: one "<!-- ==== scenario · screen ==== -->" line before each screen's exact HTML. A leading <style>
 * block is stored once and a screen identical to an earlier one is stored as a reference, which keeps the
 * files small and the diffs focused on what changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderScenarios, firstDiff, buildFile, CARDS, FIXTURE } from './lib/render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const update = argv.includes('--update');
const only = argv.includes('--card') ? argv[argv.indexOf('--card') + 1] : '';

const SEP = /^<!-- ==== (.+?) ==== (?:same as (.+?) )?-->$/;
const sepLine = (name, same) => `<!-- ==== ${name} ==== ${same ? `same as ${same} ` : ''}-->`;

/** Ordered [name, html] pairs -> snapshot text. */
function serialize(card, entries) {
  const lines = [
    `<!-- house-${card} render snapshot from test/fixtures/${FIXTURE[card]}.json. Regenerate with: npm run snapshot:update -->`,
  ];
  const styles = new Map(),
    seen = new Map();
  for (const [name, html] of entries) {
    const m = html.match(/^<style>([\s\S]*?)<\/style>/);
    let body = html;
    if (m) {
      if (!styles.has(m[1])) {
        const id = `style ${styles.size + 1}`;
        styles.set(m[1], id);
        lines.push(sepLine(id), m[1]);
      }
      body = `<style>{{${styles.get(m[1])}}}</style>` + html.slice(m[0].length);
    }
    if (seen.has(body)) {
      lines.push(sepLine(name, seen.get(body)));
      continue;
    }
    seen.set(body, name);
    lines.push(sepLine(name), body);
  }
  return lines.join('\n') + '\n';
}

/** Snapshot text -> Map(name -> exact html). */
function parse(text) {
  const blocks = new Map(),
    order = [];
  let cur = null,
    buf = [];
  const flush = () => {
    if (cur) blocks.set(cur.name, cur.same ? { same: cur.same } : { body: buf.join('\n') });
    buf = [];
  };
  for (const line of text.replace(/\n$/, '').split('\n').slice(1)) {
    const m = line.match(SEP);
    if (m) {
      flush();
      cur = { name: m[1], same: m[2] };
      order.push(m[1]);
    } else buf.push(line);
  }
  flush();
  const resolve = (name) => {
    const b = blocks.get(name);
    return b.same ? resolve(b.same) : b.body;
  };
  const out = new Map();
  for (const name of order) {
    if (name.startsWith('style ')) continue;
    out.set(
      name,
      resolve(name).replace(/\{\{(style \d+)\}\}/, (_, id) => resolve(id)),
    );
  }
  return out;
}

let failed = 0;
for (const card of CARDS) {
  if (only && only !== card) continue;
  const fixture = JSON.parse(fs.readFileSync(path.join(root, `test/fixtures/${FIXTURE[card]}.json`), 'utf8'));
  const res = await renderScenarios(card, buildFile(path.join(root, 'dist'), card), fixture, fixture);
  const entries = [];
  const errors = [];
  for (const [sc, r] of Object.entries(res)) {
    for (const [screen, html] of Object.entries(r.out)) {
      entries.push([`${sc} · ${screen}`, html]);
      const err = html.match(/house-(phone|v5|wall): [^<]*/);
      if (err || !html) errors.push(`${sc} · ${screen}: ${err ? err[0] : 'empty render'}`);
    }
    r.errors.forEach((e) => errors.push(`${sc}: console.error ${e.slice(0, 160)}`));
  }
  if (errors.length) {
    failed++;
    console.log(`FAIL   ${card}: render errors\n` + errors.map((e) => '   ' + e).join('\n'));
    continue;
  }

  const snapFile = path.join(root, `test/snapshots/${card}.html`);
  const text = serialize(card, entries);
  if (update) {
    fs.mkdirSync(path.dirname(snapFile), { recursive: true });
    fs.writeFileSync(snapFile, text);
    console.log(`wrote  ${path.relative(root, snapFile)} (${entries.length} screens)`);
    continue;
  }
  if (!fs.existsSync(snapFile)) {
    failed++;
    console.log(`FAIL   ${card}: no snapshot yet, run: npm run snapshot:update`);
    continue;
  }
  const expected = parse(fs.readFileSync(snapFile, 'utf8'));
  let bad = 0;
  for (const [name, html] of entries) {
    const want = expected.get(name);
    if (want === html) continue;
    bad++;
    if (bad > 10) continue;
    if (want === undefined) {
      console.log(`NEW    ${card} · ${name}`);
      continue;
    }
    const d = firstDiff(want, html);
    console.log(`DIFF   ${card} · ${name}\n   snapshot: …${d.a}\n   now     : …${d.b}`);
  }
  const names = new Set(entries.map(([n]) => n));
  for (const name of expected.keys())
    if (!names.has(name)) {
      bad++;
      console.log(`GONE   ${card} · ${name}`);
    }
  if (bad) failed++;
  console.log(
    `${bad ? 'FAIL' : 'ok  '}   ${card}: ${entries.length - bad}/${entries.length} screens match test/snapshots/${card}.html`,
  );
}
if (failed && !update)
  console.log(
    '\nIf the change is intended: npm run snapshot:update, then review the diff of test/snapshots/ before committing.',
  );
process.exit(failed ? 1 : 0);
