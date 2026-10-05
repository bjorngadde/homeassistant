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
import vm from 'node:vm';
import fs from 'node:fs';

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
const TAG = { v5: 'house-v5-card', wall: 'house-wall-card' }[CARD];
if (!TAG) { console.error('--card must be v5 or wall'); process.exit(2); }
const FIXED = Date.parse('2026-10-05T12:00:00Z');

// ---------------------------------------------------------------- DOM stub
function makeContext(errors) {
  const registry = new Map();
  class FakeShadow {
    constructor() { this._html = ''; this._rootEl = { className: '', innerHTML: '', style: {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, setAttribute() {} }; }
    set innerHTML(v) { this._html = String(v); }
    get innerHTML() { return this._html; }
    get firstChild() { return this._html ? {} : null; }
    addEventListener() {} removeEventListener() {}
    querySelector(sel) { return sel === '.root' ? this._rootEl : null; } querySelectorAll() { return []; }
  }
  class HTMLElement {
    attachShadow() { this.shadowRoot = new FakeShadow(); return this.shadowRoot; }
    scrollIntoView() {} addEventListener() {} removeEventListener() {} setAttribute() {}
  }
  const ctx = {
    HTMLElement,
    customElements: { get: (n) => registry.get(n), define: (n, c) => registry.set(n, c) },
    document: { querySelector: () => null, createElement: () => ({ setAttribute() {}, style: {} }), head: { appendChild() {} }, body: {}, addEventListener() {}, removeEventListener() {} },
    history: { state: null, pushState() {}, replaceState() {}, back() {} },
    location: { href: 'http://localhost/' },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
    scrollTo() {}, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }),
    Image: class { set src(v) { this._s = v; } get src() { return this._s; } },
    innerWidth: 400, innerHeight: 800, devicePixelRatio: 2, fetch: async () => ({ ok: false, json: async () => ({}) }),
    console: { info() {}, log() {}, warn() {}, error: (...a) => errors.push(a.map(String).join(' ')) },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(`(() => { const R = Date, F = ${FIXED}; globalThis.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(F); } static now() { return F; } }; })();`, ctx);
  return { ctx, registry };
}

// ---------------------------------------------------------------- fake Home Assistant
const ENTITY = /^(light|switch|sensor|binary_sensor|vacuum|camera|image|button|input_boolean|input_select|input_text|input_number|script|alarm_control_panel|person|weather|media_player|climate|calendar|water_heater|number|select|lock|cover|fan)\.[a-z0-9_]+$/;
function collect(o, out = new Set()) {
  if (typeof o === 'string') { if (ENTITY.test(o)) out.add(o); }
  else if (Array.isArray(o)) o.forEach((x) => collect(x, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (ENTITY.test(k)) out.add(k); collect(v, out); }
  return out;
}
const title = (s) => s.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function buildHass(fixture, over = {}) {
  const ids = collect(fixture);
  const states = {}, entities = {}, areas = {}, floors = {};
  const stamp = '2026-10-05T11:00:00Z';
  const put = (id, state, attrs = {}) => { states[id] = { entity_id: id, state, attributes: { friendly_name: title(id.split('.')[1]), ...attrs }, last_changed: stamp, last_updated: stamp }; };

  // areas: every string in the usual area lists of the config
  const areaIds = new Set([...(fixture.area_order || []), ...Object.keys(fixture.others || {}), ...(fixture.more_order || []), ...(fixture.more_exclude || [])]);
  const cfgFloors = fixture.floors || [];
  cfgFloors.forEach((f) => (f.areas || []).forEach((a) => areaIds.add(a)));
  (fixture.tiles || []).forEach((t) => t.area && areaIds.add(t.area));
  const floorIds = cfgFloors.map((f) => f.floor).filter(Boolean);
  floorIds.forEach((f) => { floors[f] = { floor_id: f, name: title(f), level: 0 }; });
  const claimed = new Map(); cfgFloors.forEach((f) => (f.areas || []).forEach((a) => claimed.set(a, f.floor || null)));
  let rr = 0;
  for (const a of [...areaIds].sort()) {
    const fid = claimed.has(a) ? claimed.get(a) : (floorIds.length ? floorIds[rr++ % floorIds.length] : null);
    areas[a] = { area_id: a, name: title(a), floor_id: fid };
    ['ceiling', 'lamp'].forEach((k, i) => {
      const id = `light.${a}_${k}`;
      put(id, (hash(id) + i) % 2 ? 'on' : 'off', { brightness: 120 + (hash(id) % 100) });
      entities[id] = { entity_id: id, area_id: a, labels: [] };
    });
  }
  // configured entities
  const people = [...(fixture.people || [])].map((p) => (typeof p === 'string' ? p : p.entity)).filter(Boolean);
  for (const id of ids) {
    if (states[id]) continue;
    const [dom] = id.split('.');
    if (dom === 'person') put(id, 'home', { user_id: id === people[0] ? 'u1' : 'u' + hash(id) });
    else if (dom === 'alarm_control_panel') put(id, 'disarmed', { supported_features: 26 });
    else if (dom === 'vacuum') put(id, 'docked', { battery_level: 82, status: 'Charging' });
    else if (dom === 'weather') put(id, 'partlycloudy', { temperature: 11.4, humidity: 71, wind_speed: 14, wind_gust_speed: 25, forecast: [] });
    else if (dom === 'sensor' || dom === 'input_number' || dom === 'number') put(id, String(((hash(id) % 900) / 10 + 3).toFixed(1)), { unit_of_measurement: '' });
    else if (dom === 'image' || dom === 'camera') put(id, dom === 'camera' ? 'idle' : 'unknown', { entity_picture: '/api/x/' + id });
    else if (dom === 'media_player') put(id, 'idle');
    else if (dom === 'calendar') put(id, 'off', { message: '' });
    else if (dom === 'light') put(id, hash(id) % 2 ? 'on' : 'off', { brightness: 150 });
    else put(id, hash(id) % 3 ? 'off' : 'on');
    if (dom === 'light' && (fixture.exclude || []).includes(id)) states[id].attributes.entity_id = [`light.${Object.keys(areas)[0] || 'x'}_lamp`];
    if (!entities[id]) entities[id] = { entity_id: id, labels: [] };
  }
  for (const [id, s] of Object.entries(over)) if (states[id]) Object.assign(states[id], typeof s === 'string' ? { state: s } : s);
  return {
    states, entities, areas, floors, devices: {}, user: { id: 'u1', name: 'User', is_admin: false }, language: 'en', locale: { language: 'en' },
    themes: {}, config: { time_zone: 'UTC' },
    callService: async () => {}, callApi: async () => [], callWS: async () => [], connection: { subscribeMessage: async () => () => {} },
  };
}

// ---------------------------------------------------------------- scenarios
function scenarios(fixture) {
  const get = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), fixture);
  const list = [{ name: 'idle house', over: {} }];
  const alarm = get('alarm'), vac = get('vacuum'), pend = get('clean_then_arm.pending');
  if (alarm) {
    list.push({ name: 'armed away', over: { [alarm]: 'armed_away' } });
    list.push({ name: 'entry delay', over: { [alarm]: { state: 'pending', attributes: { open_sensors: {}, delay: 30, expiration: '2026-10-05T12:00:20Z' } } } });
    list.push({ name: 'triggered', over: { [alarm]: 'triggered' } });
    if (vac) list.push({ name: 'cleaning mode, vacuum out', over: { [alarm]: 'armed_custom_bypass', [vac]: 'cleaning', ...(pend ? { [pend]: 'on' } : {}) } });
  }
  if (vac) list.push({ name: 'vacuum cleaning', over: { [vac]: 'cleaning' } });
  const door = (get('doors') || [])[0];
  if (door) list.push({ name: 'door open', over: { [door]: 'on' } });
  return list;
}

// ---------------------------------------------------------------- render
function renderAll(file, cfg, fixture, over) {
  const errors = [];
  const { ctx, registry } = makeContext(errors);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  const Card = registry.get(TAG);
  if (!Card) throw new Error(`${file} did not register ${TAG}`);
  const card = new Card();
  card.setConfig(cfg);
  if (CARD === 'wall') card.connectedCallback();
  card.hass = buildHass(fixture, over);
  const out = {};
  if (CARD === 'wall') {
    for (const mode of ['day', 'weather', 'leave', 'rooms', 'door', 'night']) {
      card._mode = mode; card._render();
      out[mode] = card._root.innerHTML;
    }
  } else {
    const screens = [['home', null], ['security', null], ['energy', null], ['climate', null]];
    Object.keys(card._hass.areas).sort().forEach((a) => screens.push(['home', a]));
    screens.push(['home', '@vacuum']);
    for (const [tab, room] of screens) {
      card._tab = tab; card._room = room; card._ver++;
      card._render();
      out[`${tab}${room ? ' / ' + room : ''}`] = card.shadowRoot.innerHTML;
    }
  }
  return { out, errors };
}

const fixture = readJson(arg('fixture'));
const candCfg = readJson(arg('cand-config')), refCfg = readJson(arg('ref-config'));
let bad = 0, total = 0, smokeErrors = 0;
for (const sc of scenarios(fixture)) {
  const cand = renderAll(arg('cand'), candCfg, fixture, sc.over);
  if (flag('smoke')) {
    for (const [k, html] of Object.entries(cand.out)) { total++; if (html.includes('house-v5:') || html.includes('house-wall:') || !html) { smokeErrors++; console.log(`ERROR  ${sc.name} · ${k}: ${(html.match(/house-(v5|wall): [^<]*/) || ['(empty)'])[0]}`); } }
    continue;
  }
  const ref = renderAll(arg('ref'), refCfg, fixture, sc.over);
  for (const k of Object.keys(ref.out)) {
    total++;
    const a = ref.out[k], b = cand.out[k];
    if (a === b) continue;
    bad++;
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    console.log(`DIFF   ${sc.name} · ${k}\n   ref : …${a.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, ' ')}\n   cand: …${b.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, ' ')}`);
  }
  if (cand.errors.length || ref.errors.length) console.log(`note   ${sc.name}: console errors ref=${ref.errors.length} cand=${cand.errors.length} (${[...ref.errors, ...cand.errors][0].slice(0, 120)})`);
}
const failed = flag('smoke') ? smokeErrors : bad;
console.log(`${flag('smoke') ? 'smoke' : 'equivalence'}: ${total - failed}/${total} screens ok`);
process.exit(failed ? 1 : 0);
