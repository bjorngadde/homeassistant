/* house-phone: the card shell. Config, hass setter, timers, data fetching, render loop, clicks and hold-to-confirm,
 * structure helpers and routing. Each screen lives in views/ and is mixed into the prototype at the end. */

import { PHONE_DEFAULTS, COLOR, ICON } from './constants.js';
import { checkConfig, mergeConfig } from '../shared/config.js';
import { P } from './helpers.js';
import { PHONE_SCHEMA } from './schema.js';
import { CSS } from './styles.js';
import { homeView } from './views/home.js';
import { roomView } from './views/room.js';
import { vacuumView } from './views/vacuum.js';
import { securityView } from './views/security.js';
import { energyView } from './views/energy.js';
import { climateView } from './views/climate.js';

export class HousePhoneCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tab = 'home';
    this._room = null;
    this._cam = null;
    this._prices = [];
    this._events = [];
    this._fcH = [];
    this._fcD = [];
    this._stats = {};
    this._log = [];
    this._sig = '';
    this._ver = 0;
    this._watch = new Set();
    this._holding = null;
    this._dirty = false;
    this._imgs = {};
    this._subs = [];
    this._vacSel = [];
  }

  static getStubConfig() {
    return {};
  }
  setConfig(config) {
    checkConfig('house-phone', config || {}, PHONE_SCHEMA);
    this._config = mergeConfig(PHONE_DEFAULTS, config || {});
    this._ver++;
  }
  getCardSize() {
    return 20;
  }
  getGridOptions() {
    return { columns: 'full' };
  }

  set hass(h) {
    const first = !this._hass;
    this._hass = h;
    if (first) this._start();
    this._schedule();
  }

  connectedCallback() {
    if (this._hass && !this._timers) this._start();
  }
  disconnectedCallback() {
    this._stop();
  }

  _start() {
    if (this._timers) return;
    if (!document.querySelector('link[data-house-phone-font]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
      l.setAttribute('data-house-phone-font', '1');
      document.head.appendChild(l);
    }
    if (!this._bound) {
      this._bound = true;
      this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
      this.shadowRoot.addEventListener('pointerdown', (ev) => this._onHoldStart(ev));
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) =>
        this.shadowRoot.addEventListener(t, (ev) => this._onHoldEnd(ev), true),
      );
      this.shadowRoot.addEventListener('contextmenu', (ev) => {
        const t = /** @type {Element} */ (ev.target);
        if (t.closest && t.closest('[data-hold]')) ev.preventDefault();
      });
      this._onPop = () => {
        const r = (history.state && history.state.housePhoneRoom) || null;
        if (this._room !== r) {
          this._room = r;
          this._ver++;
          this._schedule();
        }
      };
      window.addEventListener('popstate', this._onPop);
    }
    this._timers = [
      setInterval(() => {
        this._ver++;
        this._schedule();
      }, 30000),
      setInterval(() => this._fetchPrices(), 15 * 60000),
      setInterval(() => this._fetchEvents(), 10 * 60000),
      setInterval(() => this._fetchStats(), 30 * 60000),
      setInterval(() => this._fetchLog(), 2 * 60000),
      setInterval(() => this._refreshCams(), 10000),
    ];
    this._fetchPrices();
    this._fetchEvents();
    this._fetchStats();
    this._fetchLog();
    this._subscribeForecast();
  }

  _stop() {
    (this._timers || []).forEach(clearInterval);
    this._timers = null;
    this._subs.forEach((p) =>
      Promise.resolve(p)
        .then((u) => typeof u === 'function' && u())
        .catch(() => {}),
    );
    this._subs = [];
    if (this._onPop) {
      window.removeEventListener('popstate', this._onPop);
      this._bound = false;
    }
  }

  /* ---------- data ---------- */
  _me() {
    const h = this._hass,
      uid = h.user && h.user.id;
    return this._config.people.find((p) => h.states[p] && h.states[p].attributes.user_id === uid) || null;
  }

  async _fetchPrices() {
    const h = this._hass;
    if (!h || !h.services || !h.services.tibber) return;
    const d0 = new Date();
    d0.setHours(0, 0, 0, 0);
    const d2 = new Date(d0);
    d2.setDate(d2.getDate() + 2);
    d2.setMinutes(-1);
    try {
      const res = await h.callService(
        'tibber',
        'get_prices',
        { start: P.localStamp(d0), end: P.localStamp(d2) },
        undefined,
        false,
        true,
      );
      const homes = (res && res.response && res.response.prices) || {};
      const list = homes[Object.keys(homes)[0]] || [];
      this._prices = list.map((p) => ({ t: new Date(p.start_time).getTime(), p: p.price })).sort((a, b) => a.t - b.t);
      this._ver++;
      this._schedule();
    } catch (_e) {
      /* keep previous */
    }
  }

  async _fetchEvents() {
    const h = this._hass;
    if (!h) return;
    const me = this._me();
    const cals = (me && this._config.calendars[me]) || this._config.calendars.default || [];
    const d0 = new Date();
    d0.setHours(0, 0, 0, 0);
    const s = d0.toISOString(),
      e = new Date(d0.getTime() + 3 * 86400000).toISOString();
    const out = [];
    await Promise.all(
      cals
        .filter((c) => h.states[c])
        .map(async (cal) => {
          try {
            const list = await h.callApi(
              'GET',
              `calendars/${cal}?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`,
            );
            for (const ev of list || []) {
              const allDay = !!(ev.start && ev.start.date && !ev.start.dateTime);
              const st = allDay ? new Date(ev.start.date + 'T00:00:00') : new Date(ev.start.dateTime || ev.start);
              const en = allDay ? new Date(ev.end.date + 'T00:00:00') : new Date(ev.end.dateTime || ev.end);
              out.push({ summary: ev.summary || '', start: st.getTime(), end: en.getTime(), allDay, cal });
            }
          } catch (_err) {
            /* ignore a failing calendar */
          }
        }),
    );
    this._events = out.sort((a, b) => a.start - b.start);
    this._ver++;
    this._schedule();
  }

  async _fetchStats() {
    const h = this._hass,
      c = this._config.climate;
    if (!h || !h.callWS) return;
    const ids = [c.down, c.up, c.out].filter((x) => h.states[x]);
    const end = new Date(),
      start = new Date(end.getTime() - 25 * 3600000);
    try {
      const res = await h.callWS({
        type: 'recorder/statistics_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: ids,
        period: 'hour',
        types: ['mean'],
      });
      const out = {};
      for (const [id, rows] of Object.entries(res || {})) {
        out[id] = rows
          .map((r) => ({ t: typeof r.start === 'number' ? r.start : new Date(r.start).getTime(), v: r.mean }))
          .filter((r) => r.v != null);
      }
      this._stats = out;
      this._ver++;
      this._schedule();
    } catch (_e) {
      /* ignore */
    }
  }

  async _fetchLog() {
    const h = this._hass;
    if (!h || !h.callWS) return;
    const ids = this._config.recent.map((r) => r.entity).filter((x) => h.states[x]);
    if (!ids.length) return;
    const end = new Date(),
      start = new Date(end.getTime() - 24 * 3600000);
    try {
      const res = await h.callWS({
        type: 'logbook/get_events',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: ids,
      });
      const out = [];
      for (const r of res || []) {
        const def = this._config.recent.find((x) => x.entity === r.entity_id);
        if (!def) continue;
        let what = null;
        if (def.states) what = def.states[r.state] || null;
        else if (r.state === 'on') what = def.on;
        if (!what) continue;
        const t = typeof r.when === 'number' ? r.when * 1000 : new Date(r.when).getTime();
        out.push({ t, what, where: def.where, entity: r.entity_id });
      }
      out.sort((a, b) => b.t - a.t);
      this._log = out;
      this._ver++;
      this._schedule();
    } catch (_e) {
      /* ignore */
    }
  }

  _subscribeForecast() {
    const h = this._hass,
      w = this._config.weather;
    if (!h || !h.connection || !h.states[w]) return;
    for (const type of ['hourly', 'daily']) {
      try {
        const p = h.connection.subscribeMessage(
          (msg) => {
            if (type === 'hourly') this._fcH = msg.forecast || [];
            else this._fcD = msg.forecast || [];
            this._ver++;
            this._schedule();
          },
          { type: 'weather/subscribe_forecast', entity_id: w, forecast_type: type },
        );
        this._subs.push(p);
      } catch (_e) {
        /* ignore */
      }
    }
  }

  /* camera snapshots are kept as live Image elements so re-renders do not flicker */
  _camUrl(id) {
    const s = this._hass.states[id];
    if (!s || !s.attributes.access_token) return null;
    return `/api/camera_proxy/${id}?token=${s.attributes.access_token}&t=${Math.floor(Date.now() / 10000)}`;
  }
  _refreshCams(ids) {
    if (!this._hass || this._tab !== 'security') return;
    const list = ids || this._config.cameras.map((c) => c.entity).filter((id) => this._hass.states[id]);
    for (const id of list) {
      const url = this._camUrl(id);
      if (!url) continue;
      const img = new Image();
      img.alt = '';
      img.onload = () => {
        this._imgs[id] = img;
        this._placeCams();
      };
      img.src = url;
    }
  }
  _placeCams() {
    this.shadowRoot.querySelectorAll('[data-slot]').forEach((slot) => {
      const img = this._imgs[slot.getAttribute('data-slot')];
      if (!img) return;
      const first = /** @type {HTMLImageElement} */ (slot.firstChild);
      const clone = first && first.src === img.src ? null : img.cloneNode();
      if (clone) {
        slot.innerHTML = '';
        slot.appendChild(clone);
      }
    });
  }

  /* ---------- render loop ---------- */
  _schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      this._render();
    });
  }
  _signature() {
    const h = this._hass;
    let s = this._ver + '|' + this._tab + '|' + this._room + '|' + this._cam + '|' + this._vacSel.join(',') + '|';
    for (const id of this._watch) {
      const x = h.states[id];
      s += (x ? x.last_updated : '-') + ',';
    }
    return s + (h.entities ? Object.keys(h.entities).length : 0);
  }
  _render() {
    if (!this._hass || !this._config) return;
    if (this._holding) {
      this._dirty = true;
      return;
    }
    const sig = this._signature();
    if (sig === this._sig && this.shadowRoot.firstChild) return;
    this._watch = new Set();
    let body;
    try {
      body = this._view();
    } catch (e) {
      body = `<div class="page"><div class="card empty">house-phone: ${P.esc(e.message)}</div></div>`;
      console.error(e);
    }
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="root">${body}${this._tabsHtml()}</div>`;
    this._sig = this._signature();
    this._placeCams();
  }
  _s(id) {
    if (id) this._watch.add(id);
    return id ? this._hass.states[id] : undefined;
  }
  _n(id) {
    const s = this._s(id);
    if (!s) return null;
    const v = parseFloat(s.state);
    return isNaN(v) ? null : v;
  }
  _on(id) {
    const s = this._s(id);
    return !!s && s.state === 'on';
  }

  /* ---------- actions ---------- */
  _call(domain, service, data) {
    return this._hass.callService(domain, service, data);
  }
  _onClick(ev) {
    const el = ev.target.closest && ev.target.closest('[data-a]');
    if (!el) return;
    const a = el.getAttribute('data-a'),
      v = el.getAttribute('data-v'),
      w = el.getAttribute('data-w');
    const h = this._hass;
    P.haptic(el, 'light');
    switch (a) {
      case 'tab':
        this._tab = v;
        this._room = null;
        this._ver++;
        this._render();
        this._top();
        if (v === 'security') this._refreshCams();
        break;
      case 'room':
        this._room = v;
        this._ver++;
        this._render();
        this._top();
        try {
          history.pushState({ housePhoneRoom: v }, '', location.href);
        } catch (_e) {
          /* ignore */
        }
        break;
      case 'back':
        if (history.state && history.state.housePhoneRoom) history.back();
        else {
          this._room = null;
          this._ver++;
          this._render();
        }
        break;
      case 'room-toggle': {
        const lights = this._roomLights(v).filter((id) => h.states[id].state !== 'unavailable');
        const on = lights.filter((id) => h.states[id].state === 'on');
        if (on.length) this._call('light', 'turn_off', { entity_id: on });
        else if (lights.length) this._call('light', 'turn_on', { entity_id: lights });
        break;
      }
      case 'floor-off': {
        const on = this._floorAreas(parseInt(v, 10))
          .flatMap((ar) => this._roomLights(ar))
          .filter((id) => h.states[id].state === 'on');
        if (on.length) this._call('light', 'turn_off', { entity_id: on });
        break;
      }
      case 'light':
        if (h.states[v] && h.states[v].state !== 'unavailable') this._call('light', 'toggle', { entity_id: v });
        break;
      case 'bri':
        this._call('light', 'turn_on', { entity_id: v, brightness_pct: parseInt(w, 10) });
        break;
      case 'scene':
        if (v && w) this._call('script', 'room_scene', { room: v, scene: w });
        break;
      case 'room-bri': {
        const ids = this._roomLights(v).filter(
          (id) => h.states[id].state !== 'unavailable' && P.dimmable(h.states[id]),
        );
        if (ids.length) this._call('light', 'turn_on', { entity_id: ids, brightness_pct: parseInt(w, 10) });
        break;
      }
      case 'toggle':
        if (P.safe(h, v)) this._call('homeassistant', 'toggle', { entity_id: v });
        break;
      case 'media': {
        const svc = { vd: 'volume_down', vu: 'volume_up', pp: 'media_play_pause', off: 'turn_off' }[w];
        if (svc) this._call('media_player', svc, { entity_id: v });
        break;
      }
      case 'vac':
        this._call('vacuum', w, { entity_id: v });
        break;
      case 'vac-room': {
        const seg = parseInt(v, 10);
        this._vacSel = this._vacSel.includes(seg) ? this._vacSel.filter((x) => x !== seg) : [...this._vacSel, seg];
        this._render();
        break;
      }
      case 'vac-clear':
        this._vacSel = [];
        this._render();
        break;
      case 'vac-rooms': {
        if (!this._vacSel.length) break;
        const order = this._config.vac.rooms.map((r) => r.segment);
        const segs = [...this._vacSel].sort((a, b) => order.indexOf(a) - order.indexOf(b));
        this._call('xiaomi_miio', 'vacuum_clean_segment', { entity_id: this._config.vacuum, segments: segs });
        this._vacSel = [];
        this._render();
        break;
      }
      case 'cam':
        this._cam = v;
        this._ver++;
        this._render();
        break;
      case 'cam-open':
      case 'more':
        this.dispatchEvent(
          new CustomEvent('hass-more-info', { detail: { entityId: v }, bubbles: true, composed: true }),
        );
        break;
      case 'goto-cam':
        this._tab = 'security';
        this._room = null;
        this._cam = v;
        this._ver++;
        this._render();
        this._top();
        this._refreshCams();
        break;
      case 'base': {
        const cur = this._n(this._config.climate.base);
        const s = h.states[this._config.climate.base];
        if (cur == null || !s) break;
        const step = s.attributes.step || 0.5,
          min = s.attributes.min ?? 5,
          max = s.attributes.max ?? 29;
        const next = Math.min(max, Math.max(min, Math.round((cur + (w === 'up' ? step : -step)) * 100) / 100));
        this._call('input_number', 'set_value', { entity_id: this._config.climate.base, value: next });
        break;
      }
      default:
        break;
    }
  }
  _top() {
    try {
      this.scrollIntoView({ block: 'start' });
      window.scrollTo({ top: 0 });
    } catch (_e) {
      /* ignore */
    }
  }

  /* hold-to-confirm for alarm actions */
  _onHoldStart(ev) {
    const el = ev.target.closest && ev.target.closest('[data-hold]');
    if (!el) return;
    ev.preventDefault();
    const ms = this._config.hold_ms || 900;
    const fill = el.querySelector('.fill');
    fill.style.transition = 'none';
    fill.style.width = '0';
    void fill.offsetWidth;
    fill.style.transition = `width ${ms}ms linear`;
    fill.style.width = '100%';
    P.haptic(el, 'light');
    const service = el.getAttribute('data-hold');
    this._holding = {
      el,
      fill,
      timer: setTimeout(() => {
        P.haptic(el, 'medium');
        if (service === 'press') this._call('button', 'press', { entity_id: el.getAttribute('data-v') });
        else if (service.startsWith('script:'))
          this._call('script', 'turn_on', { entity_id: 'script.' + service.slice(7) });
        else this._call('alarm_control_panel', service, { entity_id: this._config.alarm });
        const tx = el.querySelector('.tx small');
        if (tx) tx.textContent = 'Sent';
        this._holding = null;
        setTimeout(() => {
          this._ver++;
          this._render();
        }, 400);
      }, ms),
    };
  }
  _onHoldEnd(ev) {
    const hd = this._holding;
    if (!hd) return;
    if (ev && ev.type !== 'pointerup' && ev.target !== hd.el) return;
    clearTimeout(hd.timer);
    hd.fill.style.transition = 'width 150ms ease-out';
    hd.fill.style.width = '0';
    this._holding = null;
    if (this._dirty) {
      this._dirty = false;
      setTimeout(() => this._render(), 160);
    }
  }

  /* ---------- structure ---------- */
  _areaName(a) {
    const x = this._hass.areas && this._hass.areas[a];
    return x ? x.name : a;
  }
  _floorAreas(i) {
    const h = this._hass,
      f = this._config.floors[i];
    if (!f) return [];
    const claimed = new Set(this._config.floors.flatMap((x) => x.areas || []));
    const list = f.areas
      ? [...f.areas]
      : Object.values(h.areas || {})
          .filter((a) => a.floor_id === f.floor && !claimed.has(a.area_id))
          .map((a) => a.area_id);
    const order = this._config.area_order || [];
    list.sort((a, b) => {
      const ia = order.indexOf(a),
        ib = order.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return this._areaName(a).localeCompare(this._areaName(b));
    });
    return list.filter((a) => this._roomLights(a).length || (this._config.others[a] || []).length);
  }
  _byArea() {
    const h = this._hass;
    if (
      this._bac &&
      this._bac.e === h.entities &&
      this._bac.d === h.devices &&
      this._bac.s === Object.keys(h.states).length
    )
      return this._bac.m;
    const m = {};
    for (const id of Object.keys(h.entities || {})) {
      if (
        !id.startsWith('light.') ||
        !P.usable(h, id) ||
        P.isGroup(h.states[id]) ||
        (this._config.exclude || []).includes(id)
      )
        continue;
      const a = P.areaOf(h, id);
      if (!a) continue;
      (m[a] = m[a] || []).push(id);
    }
    const nm = (id, a) => P.shortName(h.states[id].attributes.friendly_name || id, this._areaName(a));
    for (const a of Object.keys(m)) m[a].sort((x, y) => nm(x, a).localeCompare(nm(y, a)));
    this._bac = { e: h.entities, d: h.devices, s: Object.keys(h.states).length, m };
    return m;
  }
  _roomLights(a) {
    const ids = this._byArea()[a] || [];
    ids.forEach((id) => this._watch.add(id));
    return ids;
  }
  _roomTemp(a) {
    const h = this._hass;
    const ids = Object.keys(h.entities || {}).filter(
      (id) =>
        id.startsWith('sensor.') &&
        P.usable(h, id) &&
        P.areaOf(h, id) === a &&
        h.states[id].attributes.device_class === 'temperature',
    );
    const perDev = {};
    ids.forEach((id) => {
      const d = h.entities[id].device_id;
      if (d) perDev[d] = (perDev[d] || 0) + 1;
    });
    const vals = ids
      .filter((id) => {
        const d = h.entities[id].device_id;
        return !d || perDev[d] <= 2;
      })
      .filter((id) => !/device_temperature|chamber|nozzle|bed_|_hp_|screen/.test(id))
      .map((id) => parseFloat(h.states[id].state))
      .filter((v) => !isNaN(v) && v > 5 && v < 35);
    const m = P.median(vals);
    return m == null ? null : m.toFixed(1) + '°';
  }
  _openDoors() {
    return this._config.doors.filter((id) => this._on(id));
  }

  /* ---------- price analysis ---------- */
  _hourly() {
    const byHour = new Map();
    for (const q of this._prices) {
      const d = new Date(q.t);
      d.setMinutes(0, 0, 0);
      const k = d.getTime();
      (byHour.get(k) || byHour.set(k, []).get(k)).push(q.p);
    }
    /** @type {{ t: number, p: number, rank?: number }[]} */
    const hours = [...byHour.entries()].map(([t, ps]) => ({ t, p: ps.reduce((a, b) => a + b, 0) / ps.length }));
    const byDay = {};
    hours.forEach((x) => (byDay[P.dayStart(x.t)] = byDay[P.dayStart(x.t)] || []).push(x));
    Object.values(byDay).forEach((list) => {
      const s = [...list].sort((a, b) => a.p - b.p);
      s.forEach((x, i) => {
        x.rank = (i + 1) / s.length;
      });
    });
    return hours.sort((a, b) => a.t - b.t);
  }
  _rankColor(r) {
    return r > 0.75 ? COLOR.red : r > 0.5 ? COLOR.orangeBar : r > 0.25 ? COLOR.yellow : COLOR.teal;
  }
  _priceStatus() {
    const q = this._prices;
    if (!q.length) return null;
    const byDay = {};
    q.forEach((x) => (byDay[P.dayStart(x.t)] = byDay[P.dayStart(x.t)] || []).push(x));
    const rank = new Map();
    Object.values(byDay).forEach((list) => {
      const s = [...list].sort((a, b) => a.p - b.p);
      s.forEach((x, i) => rank.set(x.t, (i + 1) / s.length));
    });
    const now = Date.now();
    const idx = q.findIndex((x, i) => x.t <= now && (i === q.length - 1 || q[i + 1].t > now));
    if (idx < 0) return null;
    const cls = (t) => {
      const r = rank.get(t);
      return r > 0.75 ? 'high' : r <= 0.25 ? 'low' : 'mid';
    };
    const c0 = cls(q[idx].t);
    let change = null;
    for (let i = idx + 1; i < q.length; i++) {
      if (cls(q[i].t) !== c0) {
        change = q[i];
        break;
      }
    }
    const at = change ? P.hm(change.t) : null,
      to = change ? cls(change.t) : null;
    if (c0 === 'high') return { text: at ? `Expensive until ${at}` : 'Expensive', color: COLOR.orange };
    if (c0 === 'low') return { text: at ? `Cheap until ${at}` : 'Cheap', color: COLOR.teal };
    if (to === 'high') return { text: `Expensive from ${at}`, color: COLOR.sub };
    if (to === 'low') return { text: `Cheap from ${at}`, color: COLOR.sub };
    return { text: 'Normal price', color: COLOR.sub };
  }
  _priceNow() {
    const s = this._s(this._config.price);
    const v = s ? parseFloat(s.state) : NaN;
    return { ore: isNaN(v) ? null : Math.round(v * 100), rank: s ? s.attributes.intraday_price_ranking : null };
  }

  /* ---------- views ---------- */
  _view() {
    if (this._tab === 'home' && this._room === '@vacuum') return this._vacuumView();
    if (this._tab === 'home' && this._room) return this._roomView(this._room);
    const v = {
      home: () => this._homeView(),
      security: () => this._securityView(),
      energy: () => this._energyView(),
      climate: () => this._climateView(),
    }[this._tab];
    return `<div class="page">${v ? v() : ''}</div>`;
  }

  _header(title, sub) {
    const now = new Date();
    return `<div class="head"><div class="col" style="gap:1px"><div class="h1">${P.esc(title)}</div><div class="s12 mute">${P.esc(sub)}</div></div><div class="clock num">${P.hm(now)}</div></div>`;
  }

  _tabsHtml() {
    const alert =
      this._openDoors().length > 0 || ['triggered', 'pending'].includes((this._s(this._config.alarm) || {}).state);
    const tabs = [
      ['home', 'Home', ICON.home],
      ['security', 'Security', ICON.shieldOk],
      ['energy', 'Energy', ICON.bolt],
      ['climate', 'Climate', ICON.therm],
    ];
    return `<nav class="tabs"><div class="in">${tabs.map(([k, label, ic]) => `<button data-a="tab" data-v="${k}" class="${this._tab === k ? 'sel' : ''}" aria-label="${label}"><span class="pill">${P.svg(ic)}${k === 'security' && alert && this._tab !== 'security' ? '<span class="badge"></span>' : ''}</span><span class="t">${label}</span></button>`).join('')}</div></nav>`;
  }
}

// the screens: one object of methods per file, see views/
Object.assign(HousePhoneCard.prototype, homeView, roomView, vacuumView, securityView, energyView, climateView);
