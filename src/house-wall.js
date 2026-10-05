/* house-wall — calm 480x480 screen for the Shelly Wall Display in the hall.
 * Modes: day (clock, weather, AI line, room tiles), weather (tap the weather: today in detail),
 * leave (checklist + all lights off), rooms (the rooms that do not fit on Day), door (doorbell camera, opens by itself) and night (dim clock, tap to wake).
 * Deliberately has NO alarm controls: Alarmo has no PIN, so arming/disarming stays on the phones.
 * Built to be cheap on weak hardware: re-renders only when a watched entity changes,
 * clock ticks once a minute, no shadows, blur or live video streams (the only animation is the alarm screen).
 * Alarm entry delay / triggered: full-screen red view with countdown that overrides every mode, doorbell included.
 * The layout is designed for 480x480 and scaled down to whatever space the browser really gives it
 * (status bars, leftover header space, pixel density), so it never needs to scroll.
 * Day screen: room tiles get small icons and are taller, except while the school lunch card is showing (it needs the space).
 */
const WALL_VERSION = __VERSION__; // injected by scripts/build.mjs from package.json
// Everything specific to one house (entity ids, area ids, names) comes from the card config; see config.example.yaml.
// Timings stay here as defaults and can be overridden in the card config.
const WALL_DEFAULTS = {
  headline: [], // input_text entities holding the AI headline (first non-empty one is used)
  weather: '',
  outdoor: '',
  price: '',
  calendars: [],
  school: '', // calendar with an all-day lunch event per school day
  // school lunch card replaces the AI line in this window on school days
  lunch: { from: '06:30', to: '08:30' },
  alarm: '',
  entry_delay: 30 /* seconds; only used when Alarmo does not report the delay itself */,
  vacuum: '',
  people: [], // [{ entity, short, name }]
  doors: [], // [{ entity, name }]
  // 8 room tiles on Day (4 columns x 3 rows together with "Leaving?" and "More rooms", each 2 wide)
  // [{ name, entity, area, icon, door? }]
  tiles: [],
  // "More rooms" screen: every other area that has lights. Areas with a Day tile are skipped automatically.
  more_exclude: [],
  more_order: [],
  doorbell: { camera: '', ring: '', person: '', light: '', close_after: 120 },
  night: { from: '22:30', to: '06:00', idle: 60 },
  leave_idle: 90,
  // light groups without a member list (ZHA groups): never counted as single lights
  exclude: [],
  // left alone by "Turn off all lights"
  all_off_exclude: [],
};

const W = {
  merge(a, b) {
    const out = { ...a };
    for (const k of Object.keys(b || {})) {
      const v = b[k];
      out[k] =
        v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])
          ? W.merge(a[k], v)
          : v;
    }
    return out;
  },
  esc(s) {
    return String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
    );
  },
  hhmm(d) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },
  mins(s) {
    const [h, m] = String(s).split(':').map(Number);
    return h * 60 + (m || 0);
  },
  inWindow(d, from, to) {
    const n = d.getHours() * 60 + d.getMinutes(),
      a = W.mins(from),
      b = W.mins(to);
    return a <= b ? n >= a && n < b : n >= a || n < b;
  },
  svg(paths, size, stroke, width) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke || 'currentColor'}" stroke-width="${width || 2}" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
  },
};

const ICON = {
  bulb: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z'],
  sconce: ['M12 2v2', 'M8 7l4-3 4 3', 'M8 7h8v9H8z', 'M12 10v3', 'M12 16v5', 'M9 21h6'],
  door: ['M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17', 'M3 21h18', 'M14 12h.01'],
  sofa: [
    'M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3',
    'M2 11a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z',
    'M6 19v2',
    'M18 19v2',
  ],
  tv: ['M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z', 'M17 2l-5 5-5-5'],
  monitor: ['M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 20h8', 'M12 16v4'],
  stairs: ['M4 20h4v-4h4v-4h4V8h4'],
  grid: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  leave: ['M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8', 'M10 12h11', 'M18 9l3 3-3 3'],
  check: ['M5 12l5 5L20 7'],
  warn: ['M12 7v6', 'M12 17h.01'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  okCircle: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M8 12l3 3 5-5'],
  alert: ['M12 3l10 18H2z', 'M12 10v4', 'M12 17.5h.01'],
  food: ['M5 3v7a2 2 0 0 0 4 0V3', 'M7 3v18', 'M17 21V3c-2 1-3 3.5-3 7 0 2 1 3 3 3'],
  sun: [
    'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z',
    'M12 1v2',
    'M12 21v2',
    'M4.2 4.2l1.4 1.4',
    'M18.4 18.4l1.4 1.4',
    'M1 12h2',
    'M21 12h2',
    'M4.2 19.8l1.4-1.4',
    'M18.4 5.6l1.4-1.4',
  ],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  cloud: ['M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z'],
  partly: [
    'M12 2v2',
    'M4.9 4.9l1.4 1.4',
    'M20 12h2',
    'M15.9 6.3A5 5 0 0 0 8.1 10',
    'M16 20H8a5 5 0 1 1 4.6-7h1.9a3.5 3.5 0 1 1 0 7z',
  ],
  rain: ['M17.5 15H9a6 6 0 1 1 5.7-8h2.8a4 4 0 1 1 0 8z', 'M8 18l-1 3', 'M12 18l-1 3', 'M16 18l-1 3'],
  snow: ['M17.5 15H9a6 6 0 1 1 5.7-8h2.8a4 4 0 1 1 0 8z', 'M8 19h.01', 'M12 21h.01', 'M16 19h.01'],
  storm: ['M17.5 15H9a6 6 0 1 1 5.7-8h2.8a4 4 0 1 1 0 8z', 'M13 16l-3 4h4l-3 4'],
  fog: ['M4 10h16', 'M4 14h16', 'M6 18h12', 'M7 6h10'],
  wind: ['M3 8h11a3 3 0 1 0-3-3', 'M3 16h15a3 3 0 1 1-3 3', 'M3 12h18'],
};
const WX_ICON = {
  'clear-night': 'moon',
  sunny: 'sun',
  partlycloudy: 'partly',
  cloudy: 'cloud',
  fog: 'fog',
  rainy: 'rain',
  pouring: 'rain',
  snowy: 'snow',
  'snowy-rainy': 'snow',
  hail: 'snow',
  lightning: 'storm',
  'lightning-rainy': 'storm',
  windy: 'wind',
  'windy-variant': 'wind',
  exceptional: 'alert',
};
const WX_TEXT = {
  'clear-night': 'clear',
  sunny: 'sunny',
  partlycloudy: 'partly cloudy',
  cloudy: 'cloudy',
  fog: 'fog',
  rainy: 'rain',
  pouring: 'heavy rain',
  snowy: 'snow',
  'snowy-rainy': 'sleet',
  hail: 'hail',
  lightning: 'thunder',
  'lightning-rainy': 'thunder',
  windy: 'windy',
  'windy-variant': 'windy',
  exceptional: 'unusual weather',
};

const CSS = `
:host{display:block;position:relative;overflow:hidden;--bg:rgb(14,19,32);--card:rgb(24,32,51);--card2:rgb(34,44,68);--line:rgba(255,255,255,0.06);--fg:rgb(230,234,242);--mut:rgb(154,166,188);--dim:rgb(111,124,148);
--teal:rgb(61,214,196);--amber:rgb(246,196,83);--amberbg:rgb(42,36,22);--red:rgb(255,107,107);--redfg:rgb(255,156,156);--orange:rgb(255,178,122);--blue:rgb(143,184,255)}
*{box-sizing:border-box}
button{all:unset;cursor:pointer;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.root{position:absolute;left:0;top:0;width:480px;height:480px;transform-origin:0 0;overflow:hidden;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Roboto,sans-serif;contain:strict;user-select:none;-webkit-user-select:none}
.root.night{background:rgb(5,7,11)}
.pane{position:absolute;inset:0;padding:18px 18px 16px;display:flex;flex-direction:column;gap:10px}
.pane>*{flex-shrink:0}.pane>.grow{flex-shrink:1;min-height:0}
.top{display:flex;justify-content:space-between;align-items:flex-start}
.clock{font-size:64px;font-weight:700;line-height:.95;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.date{font-size:15px;font-weight:600;color:var(--mut);margin-top:6px}
.wx{display:flex;align-items:center;gap:10px;padding-top:4px}
.wxt{display:flex;flex-direction:column;align-items:flex-end}
.temp{font-size:34px;font-weight:700;line-height:1}
.hint{font-size:13px;font-weight:700;color:var(--blue);margin-top:2px;white-space:nowrap}
.head{font-size:17px;font-weight:600;line-height:1.27;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;gap:6px;flex-wrap:nowrap;overflow:hidden;min-height:29px}
.chip{flex:0 1 auto;min-width:0;background:var(--card2);border-radius:8px;padding:6px 9px;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip b{color:var(--mut)}
.chip.soon{background:rgba(61,214,196,0.14)}.chip.soon b{color:var(--teal)}
.chip.cheap{background:rgba(61,214,196,0.14);color:var(--teal)}
.chip.dear{background:rgba(255,159,67,0.14);color:var(--orange)}
.banner{display:flex;align-items:center;gap:10px;background:rgba(255,107,107,0.16);border:1px solid rgba(255,107,107,0.5);color:var(--redfg);border-radius:12px;padding:8px 12px;font-size:15px;font-weight:800}
.grow{flex-grow:1}
.lunch{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px}
.lunch .ib{background:rgba(61,214,196,0.18);color:var(--teal);flex-shrink:0}
.ll{font-size:13px;font-weight:700;color:var(--teal)}
.ld{font-size:20px;font-weight:800;line-height:1.2;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lv{font-size:13px;color:var(--mut);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.grid2 .tile{height:72px;padding:10px 14px}
.tile{height:60px;border-radius:14px;background:var(--card);border:1px solid var(--line);padding:8px 10px;display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0}
.grid.icons .tile{height:74px;justify-content:space-between}
.grid.icons .tile.lv{justify-content:center}
.tile.on{background:var(--amberbg);border-color:rgba(246,196,83,0.35)}
.tile.busy{opacity:.55}
.tile.wide{grid-column:span 2;padding:8px 12px}
.ti{width:22px;height:22px;border-radius:7px;background:var(--card2);color:var(--mut);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tile.on .ti{background:var(--amber);color:var(--amberbg)}
.tx{min-width:0}
.ib{width:34px;height:34px;border-radius:10px;background:var(--card2);display:flex;align-items:center;justify-content:center;color:var(--mut)}
.on .ib{background:var(--amber);color:var(--amberbg)}
.tn{font-size:14px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile.on .tn{color:var(--amber)}
.grid2 .tn{font-size:16px}
.ts{font-size:12px;line-height:1.2;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ts.warn{color:var(--redfg)}
.wt{display:flex;align-items:center;gap:8px;color:var(--teal)}
.badges{display:flex;gap:4px}
.bdg{width:24px;height:24px;border-radius:8px;background:var(--card2);color:var(--dim);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}
.bdg.home{background:rgba(61,214,196,0.18);color:var(--teal)}
.wn{font-size:17px;font-weight:800;color:var(--fg);flex-grow:1}
.ws{font-size:12px;line-height:1.2;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lh{display:flex;justify-content:space-between;align-items:baseline}
.lt{font-size:30px;font-weight:800}
.link{font-size:15px;font-weight:700;color:var(--teal);padding:8px 4px}
.list{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:0 14px;height:52px;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.dot{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(61,214,196,0.18);color:var(--teal)}
.dot.bad{background:rgba(255,107,107,0.18);color:var(--red)}
.dot.info{background:var(--card2);color:var(--mut)}
.rt{display:flex;flex-direction:column;flex-grow:1;min-width:0}
.rn{font-size:16px;font-weight:700}
.rs{font-size:13px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bad+.rt .rs{color:var(--redfg)}
.act{flex-shrink:0;background:var(--card2);border-radius:10px;padding:10px 14px;font-size:14px;font-weight:800}
.big{height:80px;border-radius:18px;background:var(--card);color:var(--teal);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center}
.big.lit{background:var(--amber);color:var(--amberbg)}
.big .l1{font-size:22px;font-weight:800}.big .l2{font-size:13px;opacity:.8}
.alarmv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:28px;text-align:center;color:rgb(255,255,255);background:rgb(150,24,30);animation:apulse 1s ease-in-out infinite alternate}
.alarmv.hot{background:rgb(200,28,36);animation-duration:.5s}
@keyframes apulse{from{background-color:rgb(110,16,22)}to{background-color:rgb(205,30,38)}}
.alarmv .al{font-size:18px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;display:flex;align-items:center;gap:10px}
.alarmv .an{font-size:150px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.04em}
.alarmv .at{font-size:30px;font-weight:800;line-height:1.15}
.alarmv .as{font-size:17px;font-weight:600;opacity:.85}
.alarmv .ao{margin-top:10px;font-size:16px;font-weight:700;background:rgba(0,0,0,0.25);border-radius:10px;padding:8px 14px}
.door{position:absolute;inset:0;display:flex;flex-direction:column;background:rgb(0,0,0)}
.cam{position:relative;flex:0 0 74%;background:rgb(30,36,50);overflow:hidden}
.cam img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.live{position:absolute;top:14px;left:14px;display:flex;align-items:center;gap:6px;background:rgba(14,19,32,0.75);border-radius:8px;padding:6px 10px;font-size:13px;font-weight:800;letter-spacing:.06em}
.live i{width:8px;height:8px;border-radius:4px;background:var(--red)}
.cap{position:absolute;left:0;right:0;bottom:0;padding:30px 16px 12px;background:linear-gradient(0deg,rgba(0,0,0,0.7),rgba(0,0,0,0))}
.cap .t{font-size:24px;font-weight:800}.cap .s{font-size:14px;color:rgb(200,208,222)}
.dbtn{flex-grow:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;background:var(--bg)}
.dbtn button{border-radius:16px;background:var(--card2);display:flex;align-items:center;justify-content:center;gap:10px;font-size:17px;font-weight:800}
.dbtn button.lit{background:var(--amber);color:var(--amberbg)}
.nightp{position:absolute;inset:0;padding:26px;display:flex;flex-direction:column;justify-content:space-between;color:rgb(92,102,122)}
.nclock{font-size:104px;font-weight:600;line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.nsub{font-size:16px;font-weight:600;color:rgb(62,70,88);margin-top:4px}
.nst{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700}
.nst.bad{color:rgb(170,90,90)}
.nwake{font-size:13px;color:rgb(62,70,88);margin-top:8px}
.wnow{display:flex;align-items:center;gap:14px;color:var(--mut)}
.wbig{font-size:44px;font-weight:700;line-height:1;color:var(--fg)}.wbig span{font-size:18px;font-weight:600;color:var(--mut);margin-left:8px}
.wsub{font-size:13px;color:var(--mut);margin-top:5px}
.wsum{font-size:14px;font-weight:600;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:9px 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wsum b{color:var(--blue)}
.hours{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px 6px}
.hr{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--mut)}
.hr .t{font-size:16px;font-weight:700;color:var(--fg)}
.pb{width:14px;height:24px;display:flex;align-items:flex-end;background:rgba(143,184,255,0.08);border-radius:3px;overflow:hidden}
.pb i{display:block;width:100%;background:var(--blue)}
.hr .mm{font-size:11px;color:var(--blue);min-height:13px}
.days{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.dayr{display:flex;align-items:center;gap:12px;height:46px;padding:0 14px;border-top:1px solid var(--line);color:var(--mut)}.dayr:first-child{border-top:0}
.dayr .dn{width:86px;font-size:15px;font-weight:700;color:var(--fg)}
.dayr .dt{font-size:15px;font-weight:700;color:var(--fg);min-width:70px}
.dayr .dx{font-size:13px;margin-left:auto;white-space:nowrap}
`;

class HouseWallCard extends HTMLElement {
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
    this._config = W.merge(WALL_DEFAULTS, config || {});
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
      this._root = root.querySelector('.root');
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
    const h = this._hass,
      reg = h.entities && h.entities[id];
    if (!reg) return null;
    if (reg.area_id) return reg.area_id;
    const dev = reg.device_id && h.devices && h.devices[reg.device_id];
    return (dev && dev.area_id) || null;
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
        const cur = this._root.querySelector('.cam img');
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

  /* ---------- alarm (entry delay / triggered) ---------- */
  _alarmLeft(al) {
    const a = al.attributes || {};
    const exp = a.expiration ? Date.parse(a.expiration) : NaN;
    const delay = Number(a.delay) > 0 ? Number(a.delay) : this._config.entry_delay || 30;
    const end = !isNaN(exp) ? exp : Date.parse(al.last_changed) + delay * 1000;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }

  _alarmTicker(on) {
    if (!on) {
      clearInterval(this._alarmTimer);
      this._alarmTimer = null;
      return;
    }
    if (this._alarmTimer) return;
    this._alarmTimer = setInterval(() => {
      const al = this._s(this._config.alarm),
        el = this._root && this._root.querySelector('.an');
      if (!al || al.state !== 'pending') {
        clearInterval(this._alarmTimer);
        this._alarmTimer = null;
        return;
      }
      if (el) el.textContent = this._alarmLeft(al);
    }, 250);
  }

  _alarmView(al) {
    const open = Object.keys((al.attributes && al.attributes.open_sensors) || {}).map((id) => {
      const s = this._s(id);
      return (s && s.attributes.friendly_name) || id;
    });
    const what = open.length ? open.join(', ') + ' opened' : '';
    if (al.state === 'triggered') {
      return `<div class="alarmv hot"><div class="al">${W.svg(ICON.alert, 26)}Alarm</div>
        <div class="at">The alarm has gone off</div><div class="as">Disarm from your phone</div>
        ${what ? `<div class="ao">${W.esc(what)}</div>` : ''}</div>`;
    }
    return `<div class="alarmv"><div class="al">${W.svg(ICON.alert, 26)}Alarm is armed</div>
      <div class="an">${this._alarmLeft(al)}</div>
      <div class="at">Disarm now</div><div class="as">Use the app on your phone</div>
      ${what ? `<div class="ao">${W.esc(what)}</div>` : ''}</div>`;
  }

  _dateText(d) {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  _outTemp() {
    const o = this._s(this._config.outdoor),
      w = this._s(this._config.weather);
    const v = o && !isNaN(parseFloat(o.state)) ? parseFloat(o.state) : w && w.attributes.temperature;
    return v == null || isNaN(v) ? '–' : Math.round(v) + '°';
  }

  _rainHint() {
    const w = this._s(this._config.weather);
    const now = Date.now();
    const next = (this._hourly || []).filter((f) => Date.parse(f.datetime) + 3600000 > now).slice(0, 12);
    const wet = (f) =>
      (f.precipitation || 0) >= 0.2 ||
      ['rainy', 'pouring', 'snowy', 'snowy-rainy', 'lightning-rainy', 'hail'].includes(f.condition);
    const hr = (f) => String(new Date(f.datetime).getHours()).padStart(2, '0') + ':00';
    if (next.length) {
      if (wet(next[0])) {
        const dry = next.find((f) => !wet(f));
        return dry ? 'rain until ' + hr(dry) : 'rain all evening';
      }
      const r = next.find(wet);
      if (r) return 'rain from ' + hr(r);
    }
    return w ? WX_TEXT[w.state] || w.state : '';
  }

  _chips() {
    const now = new Date(),
      nowMs = now.getTime();
    const chips = [];
    const timed = [],
      allDay = [];
    for (const e of this._events) {
      const sd = e.start && (e.start.dateTime || e.start.date),
        ed = e.end && (e.end.dateTime || e.end.date);
      if (!sd) continue;
      if (e.start.date && !e.start.dateTime) {
        allDay.push(e);
        continue;
      }
      if (Date.parse(ed || sd) > nowMs) timed.push({ e, t: Date.parse(sd) });
    }
    timed.sort((a, b) => a.t - b.t);
    timed.slice(0, 2).forEach(({ e, t }, i) => {
      const soon = t - nowMs < 2 * 3600000;
      chips.push(
        `<div class="chip${soon && i === 0 ? ' soon' : ''}"><b>${t <= nowMs ? 'Now' : W.hhmm(new Date(t))}</b> ${W.esc(e.summary)}</div>`,
      );
    });
    if (chips.length < 2 && allDay.length)
      chips.push(`<div class="chip"><b>Today</b> ${W.esc(allDay[0].summary)}</div>`);
    const p = this._s(this._config.price);
    if (p && !isNaN(parseFloat(p.state))) {
      const ore = Math.round(parseFloat(p.state) * 100);
      const rank = p.attributes.intraday_price_ranking;
      const cls = rank == null ? '' : rank <= 0.33 ? ' cheap' : rank >= 0.67 ? ' dear' : '';
      const word = rank == null ? '' : rank <= 0.33 ? ' · cheap' : rank >= 0.67 ? ' · pricey' : '';
      chips.push(`<div class="chip${cls}" style="flex-shrink:0">${ore} öre${word}</div>`);
    }
    return chips.join('');
  }

  _lunchDishes() {
    const now = new Date(),
      c = this._config;
    const sc = this._s(c.school);
    if (!sc || !sc.attributes.message || !c.lunch || !W.inWindow(now, c.lunch.from, c.lunch.to)) return null;
    const st = sc.attributes.start_time && new Date(String(sc.attributes.start_time).replace(' ', 'T'));
    if (!st || st.toDateString() !== now.toDateString()) return null;
    return String(sc.attributes.message)
      .split('|')
      .map((d) => d.replace(/\s+serveras\s+/i, ' ').trim())
      .filter(Boolean);
  }

  _lunch(dishes) {
    return `<div class="lunch"><div class="ib">${W.svg(ICON.food, 18)}</div><div style="min-width:0">
      <div class="ll">Today's school lunch</div><div class="ld">${W.esc(dishes[0])}</div>
      ${dishes[1] ? `<div class="lv">Veg: ${W.esc(dishes[1])}</div>` : ''}</div></div>`;
  }

  _headline() {
    for (const id of this._config.headline) {
      const s = this._s(id);
      if (s && s.state && !['unknown', 'unavailable', ''].includes(s.state)) return s.state;
    }
    return '';
  }

  _tileState(t) {
    const s = this._s(t.entity);
    const leaves = this._tileLeaves(t);
    const on = leaves.filter((l) => this._on(l)).length;
    const any = on > 0 || (s && s.state === 'on');
    let sub =
      !s || s.state === 'unavailable'
        ? 'Unavailable'
        : any
          ? leaves.length > 1
            ? on === leaves.length
              ? 'All on'
              : `${on} of ${leaves.length} on`
            : 'On'
          : 'Off';
    let warn = false;
    if (t.door && this._on(t.door)) {
      sub = any ? 'On · door open' : 'Door open';
      warn = true;
    }
    return { any, sub, warn };
  }

  _people() {
    return this._config.people.map((p) => {
      const s = this._s(p.entity);
      return { ...p, home: !!s && s.state === 'home' };
    });
  }

  _openDoors() {
    return this._config.doors.filter((d) => this._on(d.entity));
  }

  _litRooms() {
    const ids = this._lightsOn();
    const rooms = [...new Set(ids.map((id) => this._areaName(id)))];
    return { ids, rooms };
  }

  _dayView() {
    const c = this._config,
      now = new Date();
    const w = this._s(c.weather);
    const icon = ICON[WX_ICON[w && w.state] || 'cloud'];
    const alarm = this._s(c.alarm);
    const triggered = alarm && alarm.state === 'triggered';
    const lunch = this._lunchDishes();
    this._lunchShown = !!lunch;
    // room tiles get icons and more height, except while the school lunch card needs the space
    const icons = !lunch;
    const people = this._people();
    const doors = this._openDoors();
    const lit = this._litRooms();
    const leaveSub =
      [
        doors.length ? (doors.length === 1 ? doors[0].name + ' open' : doors.length + ' doors open') : '',
        lit.rooms.length ? lit.rooms.length + (lit.rooms.length === 1 ? ' room lit' : ' rooms lit') : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'All good to go';
    const ti = (name) => (icons ? `<div class="ti">${W.svg(ICON[name] || ICON.bulb, 14)}</div>` : '');
    const tiles = c.tiles
      .map((t, i) => {
        const st = this._tileState(t);
        return `<button class="tile${st.any ? ' on' : ''}${this._busy[i] ? ' busy' : ''}" data-a="tile" data-v="${i}">
        ${ti(t.icon)}<div class="tx"><div class="tn">${W.esc(t.name)}</div><div class="ts${st.warn ? ' warn' : ''}">${W.esc(st.sub)}</div></div></button>`;
      })
      .join('');
    const more = this._moreAreas();
    const moreLit = more.filter((a) => a.leaves.some((l) => this._on(l)));
    const moreSub = moreLit.length
      ? moreLit.length === 1
        ? moreLit[0].name + ' on'
        : moreLit.length + ' rooms on'
      : more.map((a) => a.name).join(', ');
    const moreTile = more.length
      ? `<button class="tile wide${moreLit.length ? ' on' : ''}" data-a="rooms">
        ${ti('grid')}<div class="tx"><div class="tn">More rooms ›</div><div class="ts">${W.esc(moreSub)}</div></div></button>`
      : '';
    const mid = triggered
      ? `<div class="banner">${W.svg(ICON.alert, 22)}Alarm triggered · disarm from your phone</div>`
      : (lunch ? this._lunch(lunch) : `<div class="head">${W.esc(this._headline())}</div>`) +
        `<div class="chips">${this._chips()}</div>`;
    return `<div class="pane">
      <div class="top">
        <div><div class="clock" data-clock>${W.hhmm(now)}</div><div class="date">${W.esc(this._dateText(now))}</div></div>
        <button class="wx" data-a="wx">${W.svg(icon, 44, 'rgb(154,166,188)', 1.6)}<div class="wxt"><div class="temp">${this._outTemp()}</div><div class="hint">${W.esc(this._rainHint())}</div></div></button>
      </div>
      ${mid}
      <div class="grow"></div>
      <div class="grid${icons ? ' icons' : ''}">
        <button class="tile wide" data-a="leave" style="justify-content:center">
          <div class="wt">${W.svg(ICON.leave, 22)}<div class="wn">Leaving?</div><div class="badges">${people.map((p) => `<div class="bdg${p.home ? ' home' : ''}">${W.esc(p.short)}</div>`).join('')}</div></div>
          <div class="ws">${W.esc(leaveSub)}</div>
        </button>
        ${tiles}
        ${moreTile}
      </div>
    </div>`;
  }

  _roomsView() {
    const tiles = this._moreAreas()
      .map((a) => {
        const on = a.leaves.filter((l) => this._on(l)).length;
        const sub = on
          ? a.leaves.length > 1
            ? on === a.leaves.length
              ? 'All on'
              : `${on} of ${a.leaves.length} on`
            : 'On'
          : 'Off';
        return `<button class="tile${on ? ' on' : ''}${this._busy['a:' + a.id] ? ' busy' : ''}" data-a="area" data-v="${W.esc(a.id)}">
        <div class="tn">${W.esc(a.name)}</div><div class="ts">${sub}</div></button>`;
      })
      .join('');
    return `<div class="pane" style="gap:10px">
      <div class="lh"><div class="lt">More rooms</div><button class="link" data-a="day">Done</button></div>
      <div class="grid2">${tiles}</div>
    </div>`;
  }

  _ms(v) {
    const w = this._s(this._config.weather);
    const unit = (w && w.attributes.wind_speed_unit) || 'km/h';
    const n = parseFloat(v) || 0;
    return Math.round(unit === 'km/h' ? n / 3.6 : unit === 'mph' ? n * 0.447 : n);
  }

  _weatherView() {
    const c = this._config,
      now = new Date(),
      nowMs = now.getTime();
    const w = this._s(c.weather),
      a = (w && w.attributes) || {};
    const icon = (cond) => ICON[WX_ICON[cond] || 'cloud'];
    const hours = (this._hourly || []).filter((f) => Date.parse(f.datetime) + 3600000 > nowMs);
    const today = hours.filter((f) => new Date(f.datetime).toDateString() === now.toDateString());
    const temps = today.map((f) => f.temperature).filter((t) => t != null);
    const rain = today.reduce((sum, f) => sum + (f.precipitation || 0), 0);
    const gust = today.reduce((m, f) => Math.max(m, this._ms(f.wind_gust_speed || f.wind_speed)), 0);
    const sum = [
      temps.length ? `${Math.round(Math.min(...temps))}–${Math.round(Math.max(...temps))}°` : '',
      rain >= 0.1 ? `<b>${rain.toFixed(1)} mm rain</b>` : 'dry',
      gust ? `gusts ${gust} m/s` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const cols = hours
      .slice(0, 8)
      .map((f) => {
        const mm = f.precipitation || 0;
        const hgt = Math.min(24, Math.round((mm / 2) * 24));
        return `<div class="hr"><div>${String(new Date(f.datetime).getHours()).padStart(2, '0')}</div>
        ${W.svg(icon(f.condition), 26, 'rgb(154,166,188)', 1.6)}
        <div class="t">${Math.round(f.temperature)}°</div>
        <div class="pb"><i style="height:${mm > 0 && hgt < 2 ? 2 : hgt}px"></i></div>
        <div class="mm">${mm >= 0.1 ? mm.toFixed(1) : ''}</div></div>`;
      })
      .join('');
    const days = (this._daily || [])
      .filter((f) => {
        const d = new Date(f.datetime);
        d.setHours(0, 0, 0, 0);
        const t = new Date(now);
        t.setHours(0, 0, 0, 0);
        return d > t;
      })
      .slice(0, 3)
      .map((f, i) => {
        const d = new Date(f.datetime);
        const name = i === 0 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' });
        const mm = f.precipitation || 0;
        return `<div class="dayr"><div class="dn">${name}</div>${W.svg(icon(f.condition), 24, 'rgb(154,166,188)', 1.6)}
        <div class="dt">${f.templow != null ? Math.round(f.templow) + '° – ' : ''}${Math.round(f.temperature)}°</div>
        <div class="dx">${mm >= 0.1 ? mm.toFixed(1) + ' mm · ' : ''}wind ${this._ms(f.wind_speed)} m/s</div></div>`;
      })
      .join('');
    const nowBits = [`Wind ${this._ms(a.wind_speed)} m/s`];
    if (a.wind_gust_speed) nowBits[0] += ` (gusts ${this._ms(a.wind_gust_speed)})`;
    if (a.humidity != null) nowBits.push(`${Math.round(a.humidity)}% humidity`);
    return `<div class="pane" style="gap:10px">
      <div class="lh"><div class="lt">Weather</div><button class="link" data-a="day">Done</button></div>
      <div class="wnow">${W.svg(icon(w && w.state), 56, 'rgb(154,166,188)', 1.5)}
        <div><div class="wbig">${this._outTemp()}<span>${W.esc(w ? WX_TEXT[w.state] || w.state : '')}</span></div>
        <div class="wsub">${W.esc(nowBits.join(' · '))}</div></div></div>
      ${today.length ? `<div class="wsum">Rest of today · ${sum}</div>` : ''}
      ${cols ? `<div class="hours">${cols}</div>` : '<div class="wsum">Waiting for the SMHI forecast…</div>'}
      <div class="grow"></div>
      ${days ? `<div class="days">${days}</div>` : ''}
    </div>`;
  }

  _row(good, name, sub, act, info) {
    return `<div class="row"><div class="dot${info ? ' info' : good ? '' : ' bad'}">${W.svg(info ? ICON.shield : good ? ICON.check : ICON.warn, 16, null, info ? 2 : 3)}</div>
      <div class="rt"><div class="rn">${W.esc(name)}</div><div class="rs">${W.esc(sub)}</div></div>${act || ''}</div>`;
  }

  _leaveView() {
    const c = this._config;
    const doors = this._openDoors();
    const lit = this._litRooms();
    const people = this._people();
    const vac = this._s(c.vacuum);
    const alarm = this._s(c.alarm);
    const rows = [];
    rows.push(
      this._row(
        !doors.length,
        'Doors',
        doors.length
          ? doors.map((d) => d.name).join(', ') + (doors.length === 1 ? ' is open' : ' are open')
          : 'All closed',
      ),
    );
    rows.push(
      this._row(
        !lit.ids.length,
        'Lights',
        lit.ids.length ? `${lit.ids.length} on · ${lit.rooms.join(', ')}` : 'All off',
      ),
    );
    if (vac) {
      const vs = vac.state;
      const running = ['cleaning', 'returning'].includes(vs);
      const bad = ['error', 'unavailable'].includes(vs);
      const label =
        {
          docked: 'Docked',
          idle: 'Idle',
          cleaning: 'Cleaning',
          returning: 'Going home',
          paused: 'Paused',
          error: 'Needs help',
          unavailable: 'Unavailable',
        }[vs] || vs;
      const act =
        !running && !bad
          ? `<button class="act" data-a="vac"${this._busy.vac ? ' style="opacity:.55"' : ''}>Start</button>`
          : '';
      rows.push(
        this._row(
          !bad,
          vac.attributes.friendly_name || 'Vacuum',
          label + (vac.attributes.battery_level != null ? ` · ${vac.attributes.battery_level}%` : ''),
          act,
        ),
      );
    }
    const home = people.filter((p) => p.home).map((p) => p.name),
      away = people.filter((p) => !p.home).map((p) => p.name);
    rows.push(
      this._row(
        true,
        'People',
        [home.length ? home.join(' & ') + ' home' : '', away.length ? away.join(' & ') + ' away' : '']
          .filter(Boolean)
          .join(' · '),
      ),
    );
    if (alarm) {
      const armed = alarm.state.startsWith('armed');
      rows.push(
        this._row(
          true,
          'Alarm',
          (armed ? 'Armed' : alarm.state === 'arming' ? 'Arming' : 'Not armed') + ' · set it from your phone',
          '',
          true,
        ),
      );
    }
    const n = lit.ids.length;
    return `<div class="pane" style="gap:10px">
      <div class="lh"><div class="lt">Leaving?</div><button class="link" data-a="day">Done</button></div>
      <div class="list">${rows.join('')}</div>
      <div class="grow"></div>
      <button class="big${n ? ' lit' : ''}" data-a="alloff"${this._busy.alloff ? ' style="opacity:.6"' : ''}>
        <span class="l1">${n ? 'Turn off all lights' : 'All lights are off'}</span><span class="l2">${n ? (lit.rooms.length === 1 ? '1 room still lit' : lit.rooms.length + ' rooms still lit') : 'Bye!'}</span>
      </button>
    </div>`;
  }

  _doorView() {
    const d = this._config.doorbell;
    const ring = this._on(d.ring);
    const at = W.hhmm(new Date(this._doorAt || Date.now()));
    const light = this._s(d.light);
    const lit = light && light.state === 'on';
    return `<div class="door">
      <div class="cam"><img alt=""${this._camSrc ? ` src="${W.esc(this._camSrc)}"` : ''}>
        <div class="live"><i></i>DOORBELL</div>
        <div class="cap"><div class="t">${ring ? 'Doorbell rang' : 'Someone at the door'}</div><div class="s">${ring ? 'Rang' : 'Person seen'} ${at} · closes by itself</div></div>
      </div>
      <div class="dbtn">
        <button data-a="doorlight" class="${lit ? 'lit' : ''}"${this._busy.doorlight ? ' style="opacity:.6"' : ''}>${W.svg(ICON.sconce, 22)}${lit ? 'Light on' : 'Entrance light'}</button>
        <button data-a="doorclose">Close</button>
      </div>
    </div>`;
  }

  _nightView() {
    const c = this._config,
      now = new Date();
    const w = this._s(c.weather);
    const doors = this._openDoors();
    const lit = this._litRooms();
    const bits = [doors.length ? doors.map((d) => d.name).join(', ') + ' open' : 'Doors closed'];
    bits.push(lit.ids.length ? `${lit.ids.length} light${lit.ids.length === 1 ? '' : 's'} on` : 'lights off');
    const ok = !doors.length;
    return `<button class="nightp" data-a="wake">
      <div><div class="nclock" data-clock>${W.hhmm(now)}</div>
      <div class="nsub">${W.esc(this._dateText(now))} · ${this._outTemp()} ${W.esc(w ? WX_TEXT[w.state] || '' : '')}</div></div>
      <div><div class="nst${ok ? '' : ' bad'}">${W.svg(ok ? ICON.okCircle : ICON.alert, 20, ok ? 'rgb(62,143,134)' : 'rgb(170,90,90)')}${W.esc(bits.join(' · '))}</div>
      <div class="nwake">Tap anywhere to wake</div></div>
    </button>`;
  }
}

if (!customElements.get('house-wall-card')) customElements.define('house-wall-card', HouseWallCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'house-wall-card')) {
  window.customCards.push({
    type: 'house-wall-card',
    name: 'House wall',
    description:
      'Calm 480x480 wall display: clock, weather, AI line, room lights, leaving checklist, doorbell. No alarm controls.',
  });
}
console.info('house-wall ' + WALL_VERSION);
