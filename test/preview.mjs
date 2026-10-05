#!/usr/bin/env node
/*
 * Screenshots of every screen of both cards in a real browser (headless Chromium through playwright-core),
 * rendered from dist/ against the fake Home Assistant in test/lib/fake-hass.mjs. For looking at a change
 * without touching the live house; not a test.
 *
 *   npm run preview                                     placeholder fixtures, "idle house" scenario
 *   npm run preview -- --all                            every scenario (alarm armed, entry delay, door open, ...)
 *   npm run preview -- --phone <phone.json> --wall <wall.json> real card configs (kept OUTSIDE the repo)
 *   --card phone|desktop|wall  only one card   --width <px>  desktop viewport width (default 1440)          --out <dir>   output folder (default .private/preview, git-ignored)
 *
 * Writes <out>/<card>/<scenario>/<screen>.png and <out>/index.html (all screenshots on one page).
 * Chromium: the pre-installed one in Claude Code cloud sessions (PLAYWRIGHT_BROWSERS_PATH); elsewhere run
 * `npx playwright-core install chromium` once, or set CHROME_PATH to a Chrome/Chromium binary.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { FIXED } from './lib/fake-hass.mjs';
import { CARDS, FIXTURE } from './lib/render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d = '') => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const outDir = path.resolve(arg('out', path.join(root, '.private/preview')));
const VIEWPORT = {
  phone: { width: 390, height: 844 },
  desktop: { width: Number(arg('width')) || 1440, height: 900 },
  wall: { width: 480, height: 480 },
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.map': 'application/json' };
// camera snapshots and the vacuum map: a neutral placeholder instead of a broken image
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="rgb(60,70,90)"/><text x="320" y="190" font-family="sans-serif" font-size="28" fill="rgb(200,208,222)" text-anchor="middle">image</text></svg>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    return res.end(PLACEHOLDER);
  }
  const file = path.join(root, path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, ''));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, 'localhost', r));
const origin = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const safe = (s) => s.replace(/[^\w.-]+/g, '_');
const shots = [];
const warnings = new Set();
try {
  for (const card of CARDS) {
    if (arg('card') && arg('card') !== card) continue;
    const config = JSON.parse(
      fs.readFileSync(
        arg(card) || arg(FIXTURE[card]) || path.join(root, `test/fixtures/${FIXTURE[card]}.json`),
        'utf8',
      ),
    );
    const context = await browser.newContext({
      viewport: VIEWPORT[card],
      timezoneId: 'UTC',
      locale: 'en-GB',
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // (requests outside the local server are blocked on purpose and do not count)
    page.on('console', (m) => m.type() === 'error' && m.location().url.startsWith(origin) && errors.push(m.text()));
    // only the local server: no fonts or anything else from the internet, so screenshots are repeatable
    await page.route('**/*', (r) => (r.request().url().startsWith(origin) ? r.continue() : r.abort()));
    await page.clock.setFixedTime(new Date(FIXED));
    await page.goto(`${origin}/test/preview.html`);
    await page.waitForFunction(() => window.previewReady);
    const scenarios = argv.includes('--all')
      ? await page.evaluate((f) => window.preview.scenarioNames(f), config)
      : ['idle house'];
    for (const scenario of scenarios) {
      const screens = await page.evaluate(
        ([c, cfg, sc]) => window.preview.mount(c, cfg, cfg, sc),
        [card, config, scenario],
      );
      for (const screen of screens) {
        await page.evaluate((s) => window.preview.show(s), screen);
        if (card !== 'wall') {
          // a viewport as tall as the page, so the fixed tab bar sits at the bottom as on a phone
          await page.setViewportSize(VIEWPORT[card]);
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ ...VIEWPORT[card], height: Math.max(VIEWPORT[card].height, height) });
        }
        // layout guard: an element placed directly on a page that ends up without width or height is invisible
        // (the desktop card's main camera once collapsed to 0 x 0)
        const collapsed = await page.evaluate(() =>
          [...document.querySelector('body > *:last-child').shadowRoot.querySelectorAll('.page > *')]
            .filter((e) => {
              if (!e.childElementCount && !e.textContent.trim()) return false; // empty on purpose (no thumbnails)
              const r = e.getBoundingClientRect();
              return r.width < 1 || r.height < 1;
            })
            .map((e) => `${e.tagName.toLowerCase()}.${e.className}`),
        );
        if (collapsed.length) warnings.add(`${card} · ${screen}: no width or height: ${collapsed.join(', ')}`);
        const file = path.join(outDir, card, safe(scenario), `${safe(screen)}.png`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file });
        shots.push({ card, scenario, screen, file: path.relative(outDir, file) });
      }
    }
    if (errors.length) console.log(`${card}: browser errors:\n  ${[...new Set(errors)].join('\n  ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
fs.writeFileSync(
  path.join(outDir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>House cards preview</title><style>body{font:14px sans-serif;background:#111;color:#ddd;margin:16px}figure{display:inline-block;margin:0 12px 16px 0;vertical-align:top}img{width:300px;display:block;border:1px solid #333}figcaption{max-width:300px}</style>` +
    shots
      .map(
        (s) =>
          `<figure><img src="${esc(s.file)}" loading="lazy"><figcaption>${esc(`${s.card} · ${s.scenario} · ${s.screen}`)}</figcaption></figure>`,
      )
      .join('') +
    '\n',
);
if (warnings.size) console.log(`layout warnings:\n  ${[...warnings].join('\n  ')}`);
console.log(`preview: ${shots.length} screenshots in ${path.relative(root, outDir) || outDir}/ (open index.html)`);
