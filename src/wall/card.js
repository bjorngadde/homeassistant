/* house-wall: the card shell. Config, hass setter, watched entities, calendar and forecast, doorbell, fit to
 * screen, clock and idle timers, actions and the mode switch in _render(). Each mode lives in views/. */

import { WALL_DEFAULTS } from './constants.js';
import { checkConfig, mergeConfig } from '../shared/config.js';
import { areaOf } from '../shared/hass.js';
import { W } from './helpers.js';
import { WALL_SCHEMA } from './schema.js';
import { CSS } from './styles.js';
import { dayView } from './views/day.js';
import { weatherView } from './views/weather.js';
import { leaveView } from './views/leave.js';
import { roomsView } from './views/rooms.js';
import { doorView } from './views/door.js';
import { nightView } from './views/night.js';
import { alarmView } from './views/alarm.js';

export class HouseWallCard extends HTMLElement {
  constructor() {
    super();
    this._mode = 'day';
    this._sig = '';
    this._busy = {};
    this._events = [];
    this._hourly = [];
    this._daily = [];
    this._prev = {};
    this._lastTouch = Date.now();
    this._doorAt = 0;
  }

  setConfig(config) {
    checkConfig('house-wall', config || {}, WALL_SCHEMA);
    this._config = mergeConfig(WALL_DEFAULTS, config || {});
    this._sig = '';
  }
  getCardSize() {
    return 8;
  }
  getGridOptions() {
    return { columns: 'full', rows: 'auto' };
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${CSS}</style><div class="root"></div>`;
      this._root = /** @type {HTMLElement} */ (root.querySelector('.root'));
      root.addEventListener('click', (ev) => this._onClick(ev));
      this._onResize = () => this._fit();
    }
    window.addEventListener('resize', this._onResize);
    this._fit();
    // kiosk mode and the HA shell may settle after the first paint: measure again
    this._fitTimers = [300, 1500, 5000].map((ms) => setTimeout(() => this._fit(), ms));
    this._tick();
    this._calTimer = setInterval(() => this._loadCalendar(), 15 * 60 * 1000);
    if (this._hass) {
      this._subscribeForecast();
      this._loadCalendar();
    }
  }

  disconnectedCallback() {
    clearInterval(this._alarmTimer);
    this._alarmTimer = null;
    clearTimeout(this._tickTimer);
    clearInterval(this._calTimer);
    clearTimeout(this._doorTimer);
    this._stopCam();
    window.removeEventListener('resize', this._onResize);
    (this._fitTimers || []).forEach(clearTimeout);
    this._unsubForecasts();
  }

  set hass(h) {
    const first = !this._hass;
    const connChanged = this._hass && this._hass.connection !== h.connection;
    this._hass = h;
    if (!this._config) this.setConfig({});
    if (first || connChanged) {
      this._subscribeForecast();
      this._loadCalendar();
    }
    this._watchDoorbell(first);
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._busy = {};
      this._render();
    }
  }

  /* ---------- data ---------- */
  _s(id) {
    return id && this._hass ? this._hass.states[id] : undefined;
  }
  _on(id) {
    const s = this._s(id);
    return !!s && s.state === 'on';
  }

  _leaves(id, seen) {
    seen = seen || new Set();
    if (seen.has(id)) return [];
    seen.add(id);
    const s = this._s(id);
    if (!s) return [];
    const members = s.attributes && s.attributes.entity_id;
    if (Array.isArray(members) && members.length) return members.flatMap((m) => this._leaves(m, seen));
    return [id];
  }

  _usable(id) {
    const h = this._hass,
      s = h.states[id];
    if (!s || !id.startsWith('light.') || Array.isArray(s.attributes.entity_id)) return false;
    if ((this._config.exclude || []).includes(id)) return false;
    const reg = h.entities && h.entities[id];
    return !(reg && (reg.hidden || reg.entity_category || (reg.labels || []).includes('do_not_operate')));
  }

  _areaOf(id) {
    return areaOf(this._hass, id);
  }

  _tileLeaves(t) {
    if (!t.area) return this._leaves(t.entity);
    const h = this._hass;
    if (this._areaCacheFor !== h.entities) {
      this._areaCacheFor = h.entities;
      this._areaCache = {};
    }
    if (!this._areaCache[t.area]) {
      const out = [];
      for (const id in h.states)
        if (id.startsWith('light.') && this._usable(id) && this._areaOf(id) === t.area) out.push(id);
      this._areaCache[t.area] = out;
    }
    const out = this._areaCache[t.area];
    return out.length ? out : this._leaves(t.entity);
  }

  /* areas that have lights but no tile on Day (kids' rooms, toilet, basement, outdoors ...) */
  _moreAreas() {
    const h = this._hass,
      c = this._config;
    const skip = new Set([...c.tiles.map((t) => t.area), ...(c.more_exclude || [])].filter(Boolean));
    const order = c.more_order || [];
    const out = [];
    for (const id in h.areas || {}) {
      if (skip.has(id)) continue;
      const leaves = this._tileLeaves({ area: id });
      if (leaves.length) out.push({ id, name: (h.areas[id] && h.areas[id].name) || id, leaves });
    }
    out.sort((a, b) => {
      const ia = order.indexOf(a.id),
        ib = order.indexOf(b.id);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.name.localeCompare(b.name);
    });
    return out;
  }

  _watched() {
    const c = this._config;
    const ids = [
      ...c.headline,
      c.weather,
      c.outdoor,
      c.price,
      c.school,
      c.alarm,
      c.vacuum,
      c.doorbell.ring,
      c.doorbell.person,
      c.doorbell.light,
    ];
    c.people.forEach((p) => ids.push(p.entity));
    c.doors.forEach((d) => ids.push(d.entity));
    c.tiles.forEach((t) => {
      ids.push(t.entity, t.door);
      this._tileLeaves(t).forEach((l) => ids.push(l));
    });
    this._moreAreas().forEach((a) => a.leaves.forEach((l) => ids.push(l)));
    return ids.filter(Boolean);
  }

  _signature() {
    this._ids = [...new Set(this._watched())];
    let lightSig = 0;
    const st = this._hass.states;
    for (const id in st) if (id.charCodeAt(0) === 108 && id.startsWith('light.') && st[id].state === 'on') lightSig++;
    return (
      this._ids
        .map((id) => {
          const s = st[id];
          return s ? s.last_updated : '-';
        })
        .join('|') +
      '|' +
      lightSig
    );
  }

  async _loadCalendar() {
    if (!this._hass) return;
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const q = `?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
    const out = [];
    for (const cal of this._config.calendars) {
      try {
        const evs = await this._hass.callApi('GET', `calendars/${cal}${q}`);
        (evs || []).forEach((e) => out.push(e));
      } catch (_err) {
        /* calendar unavailable: skip */
      }
    }
    this._events = out;
    this._sig = '';
    this._render();
  }

  _subscribeForecast() {
    const h = this._hass;
    if (!h || !h.connection || !this._config.weather) return;
    this._unsubForecasts();
    const sub = (type, key) =>
      h.connection
        .subscribeMessage(
          (msg) => {
            this[key] = (msg && msg.forecast) || [];
            if (key === '_hourly' || this._mode === 'weather') {
              this._sig = '';
              this._render();
            }
          },
          { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: this._config.weather },
        )
        .catch(() => null);
    this._unsubFc = [sub('hourly', '_hourly'), sub('daily', '_daily')];
  }

  _unsubForecasts() {
    (this._unsubFc || []).forEach((p) => p && p.then((u) => u && u()).catch(() => {}));
    this._unsubFc = null;
  }

  /* ---------- doorbell ---------- */
  _watchDoorbell(first) {
    const d = this._config.doorbell;
    const ring = this._on(d.ring),
      person = this._on(d.person);
    const was = this._prev;
    this._prev = { ring, person };
    if (first) return;
    if ((ring && !was.ring) || (person && !was.person)) {
      this._doorAt = Date.now();
      clearTimeout(this._doorTimer);
      this._doorTimer = null;
      this._setMode('door');
      return;
    }
    if (this._mode === 'door' && !ring && !person && !this._doorTimer) {
      this._doorTimer = setTimeout(
        () => {
          this._doorTimer = null;
          if (this._mode === 'door') this._setMode(this._restMode());
        },
        (d.close_after || 120) * 1000,
      );
    }
  }

  _restMode() {
    const n = this._config.night;
    return n &&
      W.inWindow(new Date(), n.from, n.to) &&
      Date.now() - this._lastTouch >= (n.idle == null ? 60 : n.idle) * 1000
      ? 'night'
      : 'day';
  }

  _setMode(m) {
    if (m === this._mode) return;
    this._mode = m;
    if (m !== 'door') this._stopCam();
    this._render();
  }

  _startCam() {
    const cam = this._s(this._config.doorbell.camera);
    const img = this._root && this._root.querySelector('.cam img');
    if (!cam || !img) return;
    this._stopCam();
    let loading = false;
    const pull = () => {
      if (loading || this._mode !== 'door') return;
      const s = this._s(this._config.doorbell.camera);
      if (!s) return;
      loading = true;
      const next = new Image();
      next.onload = () => {
        loading = false;
        this._camSrc = next.src;
        const cur = /** @type {HTMLImageElement} */ (this._root.querySelector('.cam img'));
        if (cur) cur.src = next.src;
      };
      next.onerror = () => {
        loading = false;
      };
      next.src = `/api/camera_proxy/${s.entity_id}?token=${s.attributes.access_token}&t=${Date.now()}`;
    };
    pull();
    this._camTimer = setInterval(pull, 1000);
  }

  _stopCam() {
    clearInterval(this._camTimer);
    this._camTimer = null;
    if (this._mode !== 'door') this._camSrc = '';
  }

  /* ---------- fit to screen ---------- */
  _fit() {
    if (!this._root || !this.isConnected) return;
    const vw = window.innerWidth,
      vh = window.innerHeight;
    const r = this.getBoundingClientRect();
    const top = Math.max(0, r.top + (window.scrollY || 0));
    const w = Math.max(240, Math.min(r.width || vw, vw));
    const h = Math.max(240, vh - top);
    const s = Math.min(1, w / 480, h / 480);
    const key = `${w}x${h}`;
    if (key === this._fitKey) return;
    this._fitKey = key;
    this.style.height = h + 'px';
    const st = this._root.style;
    st.width = w / s + 'px';
    st.height = h / s + 'px';
    st.transform = s < 1 ? `scale(${s})` : '';
    if (window.scrollY) window.scrollTo(0, 0);
  }

  /* ---------- clock + idle ---------- */
  _tick() {
    clearTimeout(this._tickTimer);
    const now = new Date();
    if (this._root) {
      const t = W.hhmm(now);
      this._root.querySelectorAll('[data-clock]').forEach((el) => {
        if (el.textContent !== t) el.textContent = t;
      });
      this._fit();
      const idle = Date.now() - this._lastTouch;
      if (this._mode === 'door' && Date.now() - this._doorAt > 10 * 60 * 1000) this._setMode(this._restMode());
      else if (
        (this._mode === 'leave' || this._mode === 'weather' || this._mode === 'rooms') &&
        idle > (this._config.leave_idle || 90) * 1000
      )
        this._setMode('day');
      else if (this._mode === 'day' && this._restMode() === 'night') this._setMode('night');
      else if (this._mode === 'night' && this._restMode() === 'day') this._setMode('day');
      if (this._day !== now.getDate()) {
        this._day = now.getDate();
        this._loadCalendar();
      } else if (this._mode === 'day' && !!this._lunchDishes() !== !!this._lunchShown) this._render();
    }
    this._tickTimer = setTimeout(() => this._tick(), 60500 - now.getSeconds() * 1000 - (now.getMilliseconds() % 1000));
  }

  /* ---------- actions ---------- */
  _call(domain, service, data) {
    return this._hass.callService(domain, service, data).catch(() => {
      this._busy = {};
      this._render();
    });
  }

  _toggleEntity(id, key, leaves) {
    leaves = leaves || this._leaves(id);
    const lit = leaves.filter((l) => this._on(l));
    const anyOn = lit.length > 0 || this._on(id);
    const domain = id.split('.')[0];
    if (key != null) {
      this._busy[key] = true;
    }
    if (anyOn && domain === 'light')
      this._call('light', 'turn_off', { entity_id: [...new Set([id, ...lit.filter((l) => l.startsWith('light.'))])] });
    else
      this._call(domain === 'light' || domain === 'switch' ? domain : 'homeassistant', anyOn ? 'turn_off' : 'turn_on', {
        entity_id: id,
      });
    this._render();
  }

  /* areas on the "More rooms" screen have no group entity: act on their lights directly */
  _toggleArea(area) {
    const leaves = this._tileLeaves({ area });
    const lit = leaves.filter((l) => this._on(l));
    const ids = lit.length
      ? lit
      : leaves.filter((l) => {
          const s = this._s(l);
          return s && s.state !== 'unavailable';
        });
    if (!ids.length) return;
    this._busy['a:' + area] = true;
    this._call('light', lit.length ? 'turn_off' : 'turn_on', { entity_id: ids });
    this._render();
  }

  _lightsOn() {
    const h = this._hass,
      ex = new Set(this._config.all_off_exclude || []);
    const out = [];
    for (const id in h.states) {
      if (!id.startsWith('light.') || ex.has(id) || h.states[id].state !== 'on' || !this._usable(id)) continue;
      out.push(id);
    }
    return out;
  }

  _areaName(id) {
    const h = this._hass,
      area = this._areaOf(id);
    return (area && h.areas && h.areas[area] && h.areas[area].name) || 'Other';
  }

  _onClick(ev) {
    this._lastTouch = Date.now();
    const el = ev.composedPath().find((n) => n.dataset && n.dataset.a);
    if (!el) return;
    const a = el.dataset.a,
      v = el.dataset.v;
    const c = this._config;
    if (a === 'wake') this._setMode('day');
    else if (a === 'leave') this._setMode('leave');
    else if (a === 'wx') this._setMode('weather');
    else if (a === 'rooms') this._setMode('rooms');
    else if (a === 'day') this._setMode('day');
    else if (a === 'tile') this._toggleEntity(c.tiles[+v].entity, +v, this._tileLeaves(c.tiles[+v]));
    else if (a === 'area') this._toggleArea(v);
    else if (a === 'alloff') {
      const ids = this._lightsOn();
      if (ids.length) {
        this._busy.alloff = true;
        this._call('light', 'turn_off', { entity_id: ids });
        this._render();
      }
    } else if (a === 'vac') {
      this._busy.vac = true;
      this._call('vacuum', 'start', { entity_id: c.vacuum });
      this._render();
    } else if (a === 'doorlight') this._toggleEntity(c.doorbell.light, 'doorlight');
    else if (a === 'doorclose') {
      clearTimeout(this._doorTimer);
      this._doorTimer = null;
      this._setMode('day');
    }
  }

  /* ---------- views ---------- */
  _render() {
    if (!this._root || !this._hass) return;
    const m = this._mode;
    // Alarm entry delay / triggered beats every other screen (doorbell included). Informational only, no controls.
    const al = this._s(this._config.alarm);
    const urgent = al && (al.state === 'pending' || al.state === 'triggered');
    this._alarmTicker(urgent && al.state === 'pending');
    if (urgent) {
      clearInterval(this._camTimer);
      this._camTimer = null;
      this._root.className = 'root';
      this._root.innerHTML = this._alarmView(al);
      return;
    }
    this._root.className = 'root' + (m === 'night' ? ' night' : '');
    this._root.innerHTML =
      m === 'leave'
        ? this._leaveView()
        : m === 'weather'
          ? this._weatherView()
          : m === 'rooms'
            ? this._roomsView()
            : m === 'door'
              ? this._doorView()
              : m === 'night'
                ? this._nightView()
                : this._dayView();
    if (m === 'door') this._startCam();
  }
}

// the modes: one object of methods per file, see views/
Object.assign(HouseWallCard.prototype, dayView, weatherView, leaveView, roomsView, doorView, nightView, alarmView);
