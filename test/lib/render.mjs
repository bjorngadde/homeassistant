/*
 * Shared render core for the test scripts: a tiny DOM stub, a fake Home Assistant invented from a card config,
 * the state scenarios, and renderAll(), which renders every screen of one card build to HTML strings.
 * The cards only build strings, so no real DOM is needed.
 */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';

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
const FIXED = Date.parse('2026-10-05T12:00:00Z');

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

// ---------------------------------------------------------------- fake Home Assistant
const ENTITY =
  /^(light|switch|sensor|binary_sensor|vacuum|camera|image|button|input_boolean|input_select|input_text|input_number|script|alarm_control_panel|person|weather|media_player|climate|calendar|water_heater|number|select|lock|cover|fan)\.[a-z0-9_]+$/;
function collect(o, out = new Set()) {
  if (typeof o === 'string') {
    if (ENTITY.test(o)) out.add(o);
  } else if (Array.isArray(o)) o.forEach((x) => collect(x, out));
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) {
      if (ENTITY.test(k)) out.add(k);
      collect(v, out);
    }
  return out;
}
const title = (s) => s.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function buildHass(fixture, over = {}) {
  const ids = collect(fixture);
  const states = {},
    entities = {},
    areas = {},
    floors = {};
  const stamp = '2026-10-05T11:00:00Z';
  const put = (id, state, attrs = {}) => {
    states[id] = {
      entity_id: id,
      state,
      attributes: { friendly_name: title(id.split('.')[1]), ...attrs },
      last_changed: stamp,
      last_updated: stamp,
    };
  };

  // areas: every string in the usual area lists of the config
  const areaIds = new Set([
    ...(fixture.area_order || []),
    ...Object.keys(fixture.others || {}),
    ...(fixture.more_order || []),
    ...(fixture.more_exclude || []),
  ]);
  const cfgFloors = fixture.floors || [];
  cfgFloors.forEach((f) => (f.areas || []).forEach((a) => areaIds.add(a)));
  (fixture.tiles || []).forEach((t) => t.area && areaIds.add(t.area));
  const floorIds = cfgFloors.map((f) => f.floor).filter(Boolean);
  floorIds.forEach((f) => {
    floors[f] = { floor_id: f, name: title(f), level: 0 };
  });
  const claimed = new Map();
  cfgFloors.forEach((f) => (f.areas || []).forEach((a) => claimed.set(a, f.floor || null)));
  let rr = 0;
  for (const a of [...areaIds].sort()) {
    const fid = claimed.has(a) ? claimed.get(a) : floorIds.length ? floorIds[rr++ % floorIds.length] : null;
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
    else if (dom === 'weather')
      put(id, 'partlycloudy', { temperature: 11.4, humidity: 71, wind_speed: 14, wind_gust_speed: 25, forecast: [] });
    else if (dom === 'sensor' || dom === 'input_number' || dom === 'number')
      put(id, String(((hash(id) % 900) / 10 + 3).toFixed(1)), { unit_of_measurement: '' });
    else if (dom === 'image' || dom === 'camera')
      put(id, dom === 'camera' ? 'idle' : 'unknown', { entity_picture: '/api/x/' + id });
    else if (dom === 'media_player') put(id, 'idle');
    else if (dom === 'calendar') put(id, 'off', { message: '' });
    else if (dom === 'light') put(id, hash(id) % 2 ? 'on' : 'off', { brightness: 150 });
    else put(id, hash(id) % 3 ? 'off' : 'on');
    if (dom === 'light' && (fixture.exclude || []).includes(id))
      states[id].attributes.entity_id = [`light.${Object.keys(areas)[0] || 'x'}_lamp`];
    if (!entities[id]) entities[id] = { entity_id: id, labels: [] };
  }
  for (const [id, s] of Object.entries(over))
    if (states[id]) Object.assign(states[id], typeof s === 'string' ? { state: s } : s);
  return {
    states,
    entities,
    areas,
    floors,
    devices: {},
    user: { id: 'u1', name: 'User', is_admin: false },
    language: 'en',
    locale: { language: 'en' },
    themes: {},
    config: { time_zone: 'UTC' },
    services: { tibber: { get_prices: {} } },
    ...fakeBackend(),
  };
}

// ---------------------------------------------------------------- fake backend data
// Answers the calls the cards make after the first hass update (prices, calendars, statistics, logbook,
// forecasts) with fixed data around FIXED, so those screens are rendered with content, not "Loading…".
// Integer arithmetic only, so every machine produces the same numbers.
const HOUR = 3600000,
  DAY = 24 * HOUR;
const DAY0 = Date.parse('2026-10-05T00:00:00Z');
const iso = (t) => new Date(t).toISOString();
const CONDITIONS = ['sunny', 'partlycloudy', 'cloudy', 'rainy', 'partlycloudy', 'sunny'];

function fakeBackend() {
  const hourly = Array.from({ length: 48 }, (_, i) => ({
    datetime: iso(FIXED + (i + 1) * HOUR),
    condition: CONDITIONS[i % CONDITIONS.length],
    temperature: 6 + ((i * 5) % 9),
    precipitation: i % 7 === 3 ? 0.6 : 0,
    wind_speed: 10 + (i % 5),
    wind_gust_speed: 18 + (i % 7),
    humidity: 60 + (i % 20),
  }));
  const daily = Array.from({ length: 7 }, (_, i) => ({
    datetime: iso(DAY0 + (i + 1) * DAY),
    condition: CONDITIONS[(i * 2) % CONDITIONS.length],
    temperature: 9 + (i % 4),
    templow: 2 + (i % 3),
    precipitation: i % 3 === 1 ? 2.4 : 0,
  }));
  const prices = Array.from({ length: 48 }, (_, h) => ({
    start_time: iso(DAY0 + h * HOUR),
    price: (40 + ((h * 37) % 120)) / 100,
  }));
  const events = [
    { summary: 'All-day example', start: { date: '2026-10-05' }, end: { date: '2026-10-06' } },
    {
      summary: 'Example appointment',
      start: { dateTime: '2026-10-05T15:30:00Z' },
      end: { dateTime: '2026-10-05T16:30:00Z' },
    },
    {
      summary: 'Example evening',
      start: { dateTime: '2026-10-05T18:00:00Z' },
      end: { dateTime: '2026-10-05T20:00:00Z' },
    },
    {
      summary: 'Example tomorrow',
      start: { dateTime: '2026-10-06T08:15:00Z' },
      end: { dateTime: '2026-10-06T09:00:00Z' },
    },
  ];
  const calendars = [];
  return {
    callService: async (domain, service) =>
      domain === 'tibber' && service === 'get_prices' ? { response: { prices: { 'Example home': prices } } } : {},
    // first calendar asked for gets all events, every other calendar only the last one (no duplicates on screen)
    callApi: async (method, path) => {
      if (method !== 'GET' || !path.startsWith('calendars/')) return [];
      const cal = path.slice(10).split('?')[0];
      if (!calendars.length) calendars.push(cal);
      return cal === calendars[0] ? events : events.slice(-1).map((e) => ({ ...e, summary: e.summary + ' (2)' }));
    },
    callWS: async (msg) => {
      if (msg.type === 'recorder/statistics_during_period') {
        const out = {};
        msg.statistic_ids.forEach((id, k) => {
          out[id] = Array.from({ length: 24 }, (_, i) => ({
            start: FIXED - (24 - i) * HOUR,
            mean: 4 + k * 8 + ((i * 3) % 5),
          }));
        });
        return out;
      }
      if (msg.type === 'logbook/get_events') {
        return msg.entity_ids.flatMap((id, k) => [
          { entity_id: id, state: 'on', when: (FIXED - (k + 1) * 2 * HOUR) / 1000 },
          { entity_id: id, state: 'armed_away', when: (FIXED - (k + 3) * HOUR) / 1000 },
          { entity_id: id, state: 'disarmed', when: (FIXED - (k + 1) * HOUR) / 1000 },
        ]);
      }
      return [];
    },
    connection: {
      subscribeMessage: async (cb, msg) => {
        if (msg.type === 'weather/subscribe_forecast')
          Promise.resolve().then(() => cb({ forecast: msg.forecast_type === 'daily' ? daily : hourly }));
        return () => {};
      },
    },
  };
}

// ---------------------------------------------------------------- scenarios
export function scenarios(fixture) {
  const get = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), fixture);
  const list = [{ name: 'idle house', over: {} }];
  const alarm = get('alarm'),
    vac = get('vacuum'),
    pend = get('clean_then_arm.pending');
  if (alarm) {
    list.push({ name: 'armed away', over: { [alarm]: 'armed_away' } });
    list.push({
      name: 'entry delay',
      over: {
        [alarm]: { state: 'pending', attributes: { open_sensors: {}, delay: 30, expiration: '2026-10-05T12:00:20Z' } },
      },
    });
    list.push({ name: 'triggered', over: { [alarm]: 'triggered' } });
    if (vac)
      list.push({
        name: 'cleaning mode, vacuum out',
        over: { [alarm]: 'armed_custom_bypass', [vac]: 'cleaning', ...(pend ? { [pend]: 'on' } : {}) },
      });
  }
  if (vac) list.push({ name: 'vacuum cleaning', over: { [vac]: 'cleaning' } });
  const door = (get('doors') || [])[0];
  if (door) list.push({ name: 'door open', over: { [door]: 'on' } });
  return list;
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
  if (card === 'wall') {
    out.styles = el.shadowRoot.innerHTML; // the wall card writes its stylesheet once, outside the per-mode HTML
    for (const mode of ['day', 'weather', 'leave', 'rooms', 'door', 'night']) {
      el._mode = mode;
      el._render();
      out[mode] = el._root.innerHTML;
    }
  } else {
    const screens = [
      ['home', null],
      ['security', null],
      ['energy', null],
      ['climate', null],
    ];
    Object.keys(el._hass.areas)
      .sort()
      .forEach((a) => screens.push(['home', a]));
    screens.push(['home', '@vacuum']);
    for (const [tab, room] of screens) {
      el._tab = tab;
      el._room = room;
      el._ver++;
      el._render();
      out[`${tab}${room ? ' / ' + room : ''}`] = el.shadowRoot.innerHTML;
    }
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
