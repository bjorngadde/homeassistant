/*
 * Node render core for the test scripts: a tiny DOM stub plus the fake Home Assistant from fake-hass.mjs,
 * and renderAll(), which renders every screen of one card build to HTML strings.
 * The cards only build strings, so no real DOM is needed.
 */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { buildHass, FIXED, scenarios, screensOf } from './fake-hass.mjs';

export { buildHass, scenarios };

// The cards format times with the process time zone; pin it so renders match on every machine.
process.env.TZ = 'UTC';

export const TAGS = { v5: 'house-v5-card', wall: 'house-wall-card' };

/** The built file that holds a card inside a dist/ folder: the combined bundle if there is one, else the per-card file. */
export function buildFile(distDir, card) {
  for (const name of ['house-cards.js', `house-${card}.js`]) {
    const f = path.join(distDir, name);
    if (fs.existsSync(f)) return f;
  }
  throw new Error(`no build for ${card} in ${distDir}; run npm run build`);
}

// ---------------------------------------------------------------- DOM stub
function makeContext(errors) {
  const registry = new Map();
  class FakeShadow {
    constructor() {
      this._html = '';
      this._rootEl = {
        className: '',
        innerHTML: '',
        style: {},
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener() {},
        setAttribute() {},
      };
    }
    set innerHTML(v) {
      this._html = String(v);
    }
    get innerHTML() {
      return this._html;
    }
    get firstChild() {
      return this._html ? {} : null;
    }
    addEventListener() {}
    removeEventListener() {}
    querySelector(sel) {
      return sel === '.root' ? this._rootEl : null;
    }
    querySelectorAll() {
      return [];
    }
  }
  class HTMLElement {
    attachShadow() {
      this.shadowRoot = new FakeShadow();
      return this.shadowRoot;
    }
    scrollIntoView() {}
    addEventListener() {}
    removeEventListener() {}
    setAttribute() {}
  }
  const ctx = {
    HTMLElement,
    customElements: { get: (n) => registry.get(n), define: (n, c) => registry.set(n, c) },
    document: {
      querySelector: () => null,
      createElement: () => ({ setAttribute() {}, style: {} }),
      head: { appendChild() {} },
      body: {},
      addEventListener() {},
      removeEventListener() {},
    },
    history: { state: null, pushState() {}, replaceState() {}, back() {} },
    location: { href: 'http://localhost/' },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    setInterval: () => 0,
    clearInterval() {},
    setTimeout: () => 0,
    clearTimeout() {},
    scrollTo() {},
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false }),
    Image: class {
      set src(v) {
        this._s = v;
      }
      get src() {
        return this._s;
      }
    },
    innerWidth: 400,
    innerHeight: 800,
    devicePixelRatio: 2,
    fetch: async () => ({ ok: false, json: async () => ({}) }),
    console: { info() {}, log() {}, warn() {}, error: (...a) => errors.push(a.map(String).join(' ')) },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    `(() => { const R = Date, F = ${FIXED}; globalThis.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(F); } static now() { return F; } }; })();`,
    ctx,
  );
  return { ctx, registry };
}

// ---------------------------------------------------------------- render
/** Renders every screen of one card build in every scenario. Returns { [scenario]: { out: { [screen]: html }, errors } }. */
export async function renderScenarios(card, file, cfg, fixture) {
  const res = {};
  for (const sc of scenarios(fixture)) res[sc.name] = await renderAll(card, file, cfg, fixture, sc.over);
  return res;
}

const settle = () => new Promise((r) => setImmediate(r));

export async function renderAll(card, file, cfg, fixture, over) {
  const tag = TAGS[card];
  if (!tag) throw new Error(`unknown card "${card}" (v5 or wall)`);
  const errors = [];
  const { ctx, registry } = makeContext(errors);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  const Card = registry.get(tag);
  if (!Card) throw new Error(`${file} did not register ${tag}`);
  const el = new Card();
  el.setConfig(cfg);
  if (card === 'wall') el.connectedCallback();
  el.hass = buildHass(fixture, over);
  for (let i = 0; i < 3; i++) await settle(); // let the fake backend answer the first fetches
  const out = {};
  if (card === 'wall') out.styles = el.shadowRoot.innerHTML; // the wall card writes its stylesheet once, outside the per-mode HTML
  for (const [name, show] of screensOf(card, el._hass)) {
    show(el);
    out[name] = card === 'wall' ? el._root.innerHTML : el.shadowRoot.innerHTML;
  }
  return { out, errors };
}

/** Index of the first differing character and a short excerpt of both strings around it. */
export function firstDiff(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const cut = (s) => s.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, ' ');
  return { at: i, a: cut(a), b: cut(b) };
}
