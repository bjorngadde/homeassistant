#!/usr/bin/env node
/*
 * Leak check: fails when the working tree contains anything that identifies one particular house.
 *
 *   node scripts/scrub-check.mjs [--denylist <file>] [--quiet]      (or set SCRUB_DENYLIST)
 *
 * 1. Generic check (always): entity-id-like tokens, e-mail addresses, private IP addresses, MAC / device
 *    hex ids and unknown URL hosts in every file git would commit (tracked, staged or untracked and not
 *    ignored). Known harmless hits (CSS selectors, local variables, public hosts) live in
 *    scripts/scrub-allow.txt. Placeholder ids whose object id starts with "example" are always fine.
 * 2. Private denylist (optional): every line of the file is searched for, case-insensitively, in all
 *    files. Build it from the real card config with scripts/make-denylist.mjs and keep it OUTSIDE the repo.
 *
 * Exit code 1 when anything is found. Prints file:line and the offending text; with --quiet only file:line and
 * the kind of finding, never the text (use it wherever the output can be read by others, such as CI logs).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const quiet = argv.includes('--quiet');
const denyPath = (argv.includes('--denylist') ? argv[argv.indexOf('--denylist') + 1] : process.env.SCRUB_DENYLIST) || '';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const listed = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }).toString('utf8').split('\0').filter(Boolean);
const SKIP = new Set(['scripts/scrub-allow.txt', 'package-lock.json']);
const files = listed.filter((f) => !SKIP.has(f) && fs.existsSync(path.join(root, f)));

const allowLines = fs.readFileSync(path.join(root, 'scripts/scrub-allow.txt'), 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
const allowTokens = new Set(allowLines.filter((l) => !l.startsWith('host:')));
const allowHosts = new Set(allowLines.filter((l) => l.startsWith('host:')).map((l) => l.slice(5)));

const DOMAINS = 'light|switch|sensor|binary_sensor|vacuum|camera|image|button|input_boolean|input_select|input_text|input_number|input_datetime|script|automation|alarm_control_panel|person|weather|media_player|climate|calendar|water_heater|lock|cover|fan|scene|device_tracker|todo|siren|rest_command';
const ENTITY = new RegExp(`(?<![\\w.$-])((?:${DOMAINS})\\.[a-z0-9_]+)\\b(?!\\()`, 'g');
const OTHER = [
  ['e-mail address', /\b[\w.+-]+@(?!users\.noreply\.github\.com)[\w-]+\.[\w.-]+\b/g],
  ['private IP address', /\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}(?:\.\d{1,3})?\b/g],
  ['MAC address', /\b[0-9a-f]{2}(?::[0-9a-f]{2}){5}\b/gi],
  ['device id (12+ hex digits)', /\b[0-9a-f]{12,}\b/gi],
];
const URL = /https?:\/\/([a-z0-9.-]+)[^\s'"`)<>]*/gi;

const findings = [];
const isText = (buf) => !buf.subarray(0, 4000).includes(0);

for (const f of files) {
  const buf = fs.readFileSync(path.join(root, f));
  if (!isText(buf)) continue;
  const lines = buf.toString('utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(ENTITY)) {
      const tok = m[1];
      if (/^[a-z_]+\.example/.test(tok) || allowTokens.has(tok)) continue;
      findings.push([f, i + 1, 'entity-like token', tok]);
    }
    for (const [label, re] of OTHER) for (const m of line.matchAll(re)) findings.push([f, i + 1, label, m[0]]);
    for (const m of line.matchAll(URL)) if (!allowHosts.has(m[1].toLowerCase())) findings.push([f, i + 1, 'URL host not allowed', m[1]]);
  });
}

if (denyPath) {
  const terms = fs.readFileSync(denyPath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  for (const f of files) {
    const buf = fs.readFileSync(path.join(root, f));
    if (!isText(buf)) continue;
    const lines = buf.toString('utf8').toLowerCase().split('\n');
    lines.forEach((line, i) => { for (const t of terms) if (line.includes(t.toLowerCase())) findings.push([f, i + 1, 'denylist term', t]); });
  }
} else {
  console.error('note: no denylist given (--denylist or SCRUB_DENYLIST); only the generic checks ran.');
}

for (const [f, line, what, text] of findings) console.log(quiet ? `${f}:${line}  ${what}` : `${f}:${line}  ${what}: ${text}`);
console.log(findings.length ? `scrub-check: ${findings.length} finding(s) in ${files.length} files` : `scrub-check: clean (${files.length} files${denyPath ? ', denylist applied' : ''})`);
process.exit(findings.length ? 1 : 0);
