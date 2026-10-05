/* house-v5 — phone dashboard card: Home, Security, Energy, Climate, a screen per room and one for the vacuum.
 * Rooms and lights come from floors, areas and the entity registry. An entity is left out
 * when it is hidden (the "Visible" toggle), is a config/diagnostic entity, or carries the
 * do_not_operate label. Bulk actions ("All off", room toggles) only ever touch lights.
 * NOTE: this file is served as an inline data: URI, so it must not contain the hash character.
 */
const V5_VERSION = __VERSION__; // injected by scripts/build.mjs from package.json
const V5_DNO = 'do_not_operate';

// Everything specific to one house (entity ids, area ids, names, vacuum segment ids) comes from the card config;
// see config.example.yaml. The empty values below only keep the code from tripping over missing keys.
const V5_DEFAULTS = {
  headlines: {}, // person entity -> input_text that holds that person's AI headline
  calendars: { default: [] }, // person entity -> calendars; "default" is used for everyone else
  weather: '',
  price: '',
  alarm: '',
  people: [],
  floors: [], // [{ floor: <floor id>, name }, { name, areas: [<area id>] }]
  area_order: [],
  others: {}, // area id -> non-light entities shown on that room's screen
  exclude: [], // light groups that must not be counted as single lights
  media: [],
  vacuum: '',
  vacuum_name: 'The vacuum',
  clean_then_arm: { script: '', pending: '' },
  vac: {
    map: '',
    room_id: '',
    last_start: '',
    last_end: '',
    last_duration: '',
    last_area: '',
    cur_duration: '',
    cur_area: '',
    rooms: [],
    parts: [],
  },
  doors: [],
  smoke: [],
  cameras: [],
  security_toggles: [],
  camera_alerts: [],
  energy: {},
  car: { name: 'Car' },
  climate: {},
  recent: [],
};

/* palette (rgb only) */
const V5C = {
  bg: 'rgb(14,19,32)',
  card: 'rgb(24,32,51)',
  card2: 'rgb(34,44,68)',
  chip: 'rgb(29,38,59)',
  tab: 'rgb(11,16,27)',
  line: 'rgba(255,255,255,0.06)',
  fg: 'rgb(230,234,242)',
  sub: 'rgb(200,208,222)',
  mute: 'rgb(154,166,188)',
  dim: 'rgb(111,124,148)',
  off: 'rgb(44,55,84)',
  teal: 'rgb(61,214,196)',
  tealSoft: 'rgba(61,214,196,0.16)',
  amber: 'rgb(246,196,83)',
  litBg: 'rgb(42,36,22)',
  litLine: 'rgba(246,196,83,0.35)',
  orange: 'rgb(255,178,122)',
  orangeBar: 'rgb(255,159,67)',
  orangeSoft: 'rgba(255,159,67,0.12)',
  red: 'rgb(255,107,107)',
  redSoft: 'rgb(255,156,156)',
  redBg: 'rgba(255,90,90,0.14)',
  yellow: 'rgb(246,196,83)',
  blue: 'rgb(143,184,255)',
  violet: 'rgb(185,166,255)',
};

const V5I = {
  bulb: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z'],
  chevR: ['m9 18 6-6-6-6'],
  chevL: ['m15 18-6-6 6-6'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  shieldOk: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5'],
  bolt: ['M13 2 4 14h7l-1 8 9-12h-7z'],
  therm: ['M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z', 'M12 17v-6'],
  minus: ['M5 12h14'],
  plus: ['M5 12h14', 'M12 5v14'],
  power: ['M12 2v10', 'M18.4 6.6a9 9 0 1 1-12.8 0'],
  pause: ['M9 6v12', 'M15 6v12'],
  play: ['M8 5v14l11-7z'],
  vacuum: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M12 7a2 2 0 1 0 0 4a2 2 0 1 0 0-4z', 'M8 16h8'],
  target: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z'],
  check: ['M5 12l5 5L20 7'],
  sparkle: [
    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
    'M19 17l.6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6z',
  ],
};
const V5W = {
  sunny: [
    ['M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9z', 'yellow'],
    ['M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', 'yellow'],
  ],
  partlycloudy: [
    ['M9.5 4.5a4 4 0 0 1 5.7 3.3', 'yellow'],
    ['M16 21H8a5 5 0 1 1 4.6-7H14a3.5 3.5 0 1 1 2 7z', 'mute'],
    ['M17 2.5v1.5M21 6.5h1.5M19.8 3.7l-1 1', 'yellow'],
  ],
  cloudy: [['M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z', 'mute']],
  rainy: [
    ['M17.5 15H9a6 6 0 1 1 5.7-8h2.8a4 4 0 1 1 0 8z', 'mute'],
    ['M8 18l-1 3M12 18l-1 3M16 18l-1 3', 'blue'],
  ],
  snowy: [
    ['M17.5 15H9a6 6 0 1 1 5.7-8h2.8a4 4 0 1 1 0 8z', 'mute'],
    ['M8 19h.01M12 21h.01M16 19h.01', 'fg'],
  ],
  night: [['M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z', 'sub']],
};
const V5WMAP = {
  sunny: 'sunny',
  'clear-night': 'night',
  partlycloudy: 'partlycloudy',
  cloudy: 'cloudy',
  fog: 'cloudy',
  windy: 'cloudy',
  'windy-variant': 'cloudy',
  rainy: 'rainy',
  pouring: 'rainy',
  lightning: 'rainy',
  'lightning-rainy': 'rainy',
  hail: 'rainy',
  snowy: 'snowy',
  'snowy-rainy': 'snowy',
  exceptional: 'cloudy',
};
const V5WTEXT = {
  sunny: 'Sunny',
  'clear-night': 'Clear',
  partlycloudy: 'Partly cloudy',
  cloudy: 'Overcast',
  fog: 'Fog',
  windy: 'Windy',
  'windy-variant': 'Windy',
  rainy: 'Rain',
  pouring: 'Heavy rain',
  lightning: 'Thunder',
  'lightning-rainy': 'Thunder and rain',
  hail: 'Hail',
  snowy: 'Snow',
  'snowy-rainy': 'Sleet',
  exceptional: 'Unusual weather',
};

const v5 = {
  esc(s) {
    return String(s == null ? '' : s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  },
  pad(n) {
    return String(n).padStart(2, '0');
  },
  hm(d) {
    d = new Date(d);
    return v5.pad(d.getHours()) + ':' + v5.pad(d.getMinutes());
  },
  localStamp(d) {
    return `${d.getFullYear()}-${v5.pad(d.getMonth() + 1)}-${v5.pad(d.getDate())} ${v5.pad(d.getHours())}:${v5.pad(d.getMinutes())}:00`;
  },
  dayStart(t) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  },
  svg(paths, o = {}) {
    const size = o.size || 20,
      stroke = o.stroke || 'currentColor',
      w = o.width || 2,
      fill = o.fill || 'none';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths.map((d) => `<path d="${d}"></path>`).join('')}</svg>`;
  },
  wsvg(condition, size = 22, width = 1.8) {
    const set = V5W[V5WMAP[condition] || 'cloudy'];
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${set.map(([d, c]) => `<path d="${d}" stroke="${V5C[c]}"></path>`).join('')}</svg>`;
  },
  areaOf(hass, id) {
    const e = hass.entities && hass.entities[id];
    if (!e) return null;
    if (e.area_id) return e.area_id;
    const d = e.device_id && hass.devices && hass.devices[e.device_id];
    return (d && d.area_id) || null;
  },
  usable(hass, id) {
    const e = hass.entities && hass.entities[id];
    if (!e || e.hidden || e.entity_category) return false;
    if ((e.labels || []).includes(V5_DNO)) return false;
    return !!hass.states[id];
  },
  safe(hass, id) {
    /* explicit config entity: only the do_not_operate label disqualifies it */
    const e = hass.entities && hass.entities[id];
    return !!hass.states[id] && !(e && (e.labels || []).includes(V5_DNO));
  },
  isGroup(s) {
    return !!s && Array.isArray(s.attributes.entity_id);
  },
  dimmable(s) {
    const m = s && s.attributes.supported_color_modes;
    if (Array.isArray(m)) return m.some((x) => x !== 'onoff');
    return !!s && 'brightness' in s.attributes;
  },
  pct(s) {
    const b = s && s.attributes.brightness;
    return b == null ? null : Math.max(1, Math.round((b / 255) * 100));
  },
  fnum(v, dec = 1) {
    return v == null || isNaN(v) ? '–' : Number(v).toFixed(dec);
  },
  haptic(el, type) {
    el.dispatchEvent(new CustomEvent('haptic', { detail: type, bubbles: true, composed: true }));
    if (navigator.vibrate) {
      try {
        navigator.vibrate(type === 'medium' ? 25 : 10);
      } catch (_e) {
        /* ignore */
      }
    }
  },
  /* "today 16:32" / "yesterday 16:32" / "Mon 16:32" */
  when(t) {
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const days = Math.round((v5.dayStart(Date.now()) - v5.dayStart(d)) / 86400000);
    const day =
      days === 0
        ? 'today'
        : days === 1
          ? 'yesterday'
          : days < 7
            ? d.toLocaleDateString('en-GB', { weekday: 'short' })
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return day + ' ' + v5.hm(d);
  },
  /* compact form for tight rows: "16:32" today, else "yesterday" / "Mon" / "3 Oct" */
  whenShort(t) {
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const days = Math.round((v5.dayStart(Date.now()) - v5.dayStart(d)) / 86400000);
    return days === 0
      ? v5.hm(d)
      : days === 1
        ? 'yesterday'
        : days < 7
          ? d.toLocaleDateString('en-GB', { weekday: 'short' })
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },
  mins(sec) {
    const m = Math.round(sec / 60);
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + v5.pad(m % 60) + ' min';
  },
  median(arr) {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  },
  shortName(name, areaName) {
    if (!name) return '';
    const a = (areaName || '').toLowerCase();
    let n = name;
    if (a && n.toLowerCase().startsWith(a + ' ')) n = n.slice(a.length + 1);
    return n.charAt(0).toUpperCase() + n.slice(1);
  },
  merge(base, over) {
    const out = { ...base };
    for (const [k, v] of Object.entries(over || {})) {
      if (
        v &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        base[k] &&
        typeof base[k] === 'object' &&
        !Array.isArray(base[k])
      )
        out[k] = { ...base[k], ...v };
      else out[k] = v;
    }
    return out;
  },
};

const V5_CSS = `
:host { display: block; }
* { box-sizing: border-box; }
.root { min-height: 100vh; background: ${V5C.bg}; color: ${V5C.fg}; font-family: Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
.page { max-width: 560px; margin: 0 auto; padding: 18px 16px calc(96px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; }
button { all: unset; cursor: pointer; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
button:focus-visible { outline: 2px solid ${V5C.teal}; outline-offset: 2px; border-radius: 10px; }
.row { display: flex; align-items: center; }
.col { display: flex; flex-direction: column; }
.grow { flex-grow: 1; min-width: 0; }
.ell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.num { font-variant-numeric: tabular-nums; }
.card { background: ${V5C.card}; border: 1px solid ${V5C.line}; border-radius: 18px; }
.pad { padding: 14px 16px; }
.lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: ${V5C.mute}; text-transform: uppercase; }
.sect { display: flex; justify-content: space-between; align-items: center; padding: 6px 4px 0; min-height: 30px; }
.sect .lbl { font-size: 11px; }
.link { font-size: 13px; font-weight: 700; color: ${V5C.teal}; padding: 8px 4px; }
.link.off { color: rgb(74,86,112); }
.head { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px; }
.h1 { font-size: 22px; font-weight: 800; }
.clock { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
.s12 { font-size: 12px; } .s13 { font-size: 13px; } .s14 { font-size: 14px; } .s15 { font-size: 15px; }
.b7 { font-weight: 700; } .b8 { font-weight: 800; }
.mute { color: ${V5C.mute}; } .dimc { color: ${V5C.dim}; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 5px; background: ${V5C.card2}; border-radius: 8px; padding: 5px 8px; font-size: 12px; font-weight: 700; max-width: 100%; }
.chip.warn { background: ${V5C.redBg}; color: ${V5C.redSoft}; }
.chip.next { background: rgba(61,214,196,0.12); }
.grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.tile { display: flex; align-items: stretch; background: ${V5C.card}; border: 1px solid ${V5C.line}; border-radius: 18px; overflow: hidden; min-height: 76px; }
.tile.lit { background: ${V5C.litBg}; border-color: ${V5C.litLine}; }
.tile .tg { width: 54px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.tile .ic { width: 40px; height: 40px; }
.ic { width: 42px; height: 42px; border-radius: 12px; background: ${V5C.card2}; color: ${V5C.mute}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lit .ic, .ic.lit { background: ${V5C.amber}; color: ${V5C.litBg}; }
.tile .op { flex-grow: 1; min-width: 0; display: flex; align-items: center; gap: 2px; padding: 12px 6px 12px 0; }
.tile .nm { font-size: 14px; font-weight: 700; }
.tile .sb { font-size: 13px; color: ${V5C.mute}; }
.sq { width: 44px; height: 44px; border-radius: 10px; background: ${V5C.card2}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sq.pri { background: ${V5C.teal}; color: ${V5C.bg}; }
.list > .li { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-top: 1px solid ${V5C.line}; }
.list > .li:first-child { border-top: 0; }
.dot { width: 10px; height: 10px; border-radius: 5px; flex-shrink: 0; }
.sw { display: block; position: relative; width: 44px; height: 26px; border-radius: 8px; background: ${V5C.off}; flex-shrink: 0; transition: background 150ms; }
.sw i { display: block; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 6px; background: ${V5C.mute}; transition: left 150ms; }
.sw.on { background: ${V5C.teal}; } .sw.on i { left: 21px; background: ${V5C.bg}; }
.swb { padding: 6px 0 6px 6px; flex-shrink: 0; }
.segs { display: flex; gap: 3px; }
.scenes { display: flex; flex-wrap: wrap; gap: 8px; }
.scn { flex: 1 1 auto; min-width: 72px; text-align: center; border-radius: 12px; padding: 12px 14px; font-size: 14px; font-weight: 800; background: ${V5C.card}; border: 1px solid ${V5C.line}; color: ${V5C.fg}; }
.scn.on { background: ${V5C.amber}; border-color: ${V5C.amber}; color: ${V5C.litBg}; }
.segs button { flex: 1 1 0; display: flex; align-items: center; }
.segs button span { display: block; width: 100%; border-radius: 3px; background: ${V5C.off}; }
.segs button.on span { background: ${V5C.amber}; }
.segs.big { height: 44px; } .segs.big button span { height: 40px; border-radius: 6px; }
.segs.small { height: 28px; padding-left: 46px; gap: 2px; } .segs.small button span { height: 8px; }
.hold { position: relative; overflow: hidden; flex: 1 1 0; border-radius: 14px; background: ${V5C.card2}; padding: 16px 8px; text-align: center; user-select: none; -webkit-user-select: none; touch-action: none; }
.hold .fill { position: absolute; top: 0; left: 0; bottom: 0; width: 0; }
.hold .tx { position: relative; display: flex; flex-direction: column; gap: 1px; }
.person { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.person b { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; }
.bars { display: flex; align-items: flex-end; }
.cam { position: relative; border-radius: 18px; overflow: hidden; aspect-ratio: 16 / 9; background: ${V5C.card2}; }
.cam .slot, .thumb .slot { position: absolute; inset: 0; }
.cam img, .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cam .over { position: absolute; left: 0; right: 0; bottom: 0; padding: 24px 12px 10px; background: linear-gradient(0deg, rgba(0,0,0,0.65), rgba(0,0,0,0)); }
.thumbs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.thumb { position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 4 / 3; background: ${V5C.card2}; }
.tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 5; background: ${V5C.tab}; border-top: 1px solid rgba(255,255,255,0.07); padding: 8px 10px calc(10px + env(safe-area-inset-bottom)); }
.tabs .in { max-width: 560px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.tabs button { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 0; color: rgb(135,147,170); }
.tabs button .pill { position: relative; width: 56px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.tabs button.sel { color: ${V5C.teal}; } .tabs button.sel .pill { background: ${V5C.tealSoft}; }
.tabs .badge { position: absolute; top: 4px; right: 12px; width: 8px; height: 8px; border-radius: 4px; background: ${V5C.red}; border: 2px solid ${V5C.tab}; }
.tabs .t { font-size: 11px; font-weight: 700; }
.stat { background: ${V5C.card2}; border-radius: 12px; padding: 9px 10px; display: flex; flex-direction: column; gap: 2px; }
.vrooms { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.vroom { position: relative; text-align: center; border-radius: 12px; padding: 13px 6px; font-size: 14px; font-weight: 800; background: ${V5C.card}; border: 1px solid ${V5C.line}; color: ${V5C.fg}; }
.vroom.on { background: ${V5C.teal}; border-color: ${V5C.teal}; color: ${V5C.bg}; }
.vroom .now { position: absolute; top: 6px; right: 7px; width: 7px; height: 7px; border-radius: 4px; background: ${V5C.amber}; }
.vbtn { flex: 1 1 0; display: flex; align-items: center; justify-content: center; gap: 7px; border-radius: 12px; padding: 13px 10px; font-size: 14px; font-weight: 800; background: ${V5C.card2}; color: ${V5C.fg}; }
.vbtn.pri { background: ${V5C.teal}; color: ${V5C.bg}; }
.vbtn.dis { background: ${V5C.card}; border: 1px solid ${V5C.line}; color: ${V5C.dim}; pointer-events: none; }
.vmap { position: relative; display: flex; justify-content: center; padding: 12px; }
.vmap .slot { width: 100%; display: flex; justify-content: center; min-height: 160px; }
.vmap img { display: block; max-width: 100%; max-height: 62vh; object-fit: contain; }
.bar { height: 6px; border-radius: 3px; background: ${V5C.off}; overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 3px; }
.empty { padding: 14px 16px; color: ${V5C.mute}; font-size: 13px; }
`;

class HouseV5Card extends HTMLElement {
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
    this._config = v5.merge(V5_DEFAULTS, config || {});
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
    if (!document.querySelector('link[data-house-v5-font]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
      l.setAttribute('data-house-v5-font', '1');
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
        const r = (history.state && history.state.houseV5Room) || null;
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
        { start: v5.localStamp(d0), end: v5.localStamp(d2) },
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
      body = `<div class="page"><div class="card empty">house-v5: ${v5.esc(e.message)}</div></div>`;
      console.error(e);
    }
    this.shadowRoot.innerHTML = `<style>${V5_CSS}</style><div class="root">${body}${this._tabsHtml()}</div>`;
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
    v5.haptic(el, 'light');
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
          history.pushState({ houseV5Room: v }, '', location.href);
        } catch (_e) {
          /* ignore */
        }
        break;
      case 'back':
        if (history.state && history.state.houseV5Room) history.back();
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
          (id) => h.states[id].state !== 'unavailable' && v5.dimmable(h.states[id]),
        );
        if (ids.length) this._call('light', 'turn_on', { entity_id: ids, brightness_pct: parseInt(w, 10) });
        break;
      }
      case 'toggle':
        if (v5.safe(h, v)) this._call('homeassistant', 'toggle', { entity_id: v });
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
    v5.haptic(el, 'light');
    const service = el.getAttribute('data-hold');
    this._holding = {
      el,
      fill,
      timer: setTimeout(() => {
        v5.haptic(el, 'medium');
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
        !v5.usable(h, id) ||
        v5.isGroup(h.states[id]) ||
        (this._config.exclude || []).includes(id)
      )
        continue;
      const a = v5.areaOf(h, id);
      if (!a) continue;
      (m[a] = m[a] || []).push(id);
    }
    const nm = (id, a) => v5.shortName(h.states[id].attributes.friendly_name || id, this._areaName(a));
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
        v5.usable(h, id) &&
        v5.areaOf(h, id) === a &&
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
    const m = v5.median(vals);
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
    hours.forEach((x) => (byDay[v5.dayStart(x.t)] = byDay[v5.dayStart(x.t)] || []).push(x));
    Object.values(byDay).forEach((list) => {
      const s = [...list].sort((a, b) => a.p - b.p);
      s.forEach((x, i) => {
        x.rank = (i + 1) / s.length;
      });
    });
    return hours.sort((a, b) => a.t - b.t);
  }
  _rankColor(r) {
    return r > 0.75 ? V5C.red : r > 0.5 ? V5C.orangeBar : r > 0.25 ? V5C.yellow : V5C.teal;
  }
  _priceStatus() {
    const q = this._prices;
    if (!q.length) return null;
    const byDay = {};
    q.forEach((x) => (byDay[v5.dayStart(x.t)] = byDay[v5.dayStart(x.t)] || []).push(x));
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
    const at = change ? v5.hm(change.t) : null,
      to = change ? cls(change.t) : null;
    if (c0 === 'high') return { text: at ? `Expensive until ${at}` : 'Expensive', color: V5C.orange };
    if (c0 === 'low') return { text: at ? `Cheap until ${at}` : 'Cheap', color: V5C.teal };
    if (to === 'high') return { text: `Expensive from ${at}`, color: V5C.sub };
    if (to === 'low') return { text: `Cheap from ${at}`, color: V5C.sub };
    return { text: 'Normal price', color: V5C.sub };
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
    return `<div class="head"><div class="col" style="gap:1px"><div class="h1">${v5.esc(title)}</div><div class="s12 mute">${v5.esc(sub)}</div></div><div class="clock num">${v5.hm(now)}</div></div>`;
  }

  _tabsHtml() {
    const alert =
      this._openDoors().length > 0 || ['triggered', 'pending'].includes((this._s(this._config.alarm) || {}).state);
    const tabs = [
      ['home', 'Home', V5I.home],
      ['security', 'Security', V5I.shieldOk],
      ['energy', 'Energy', V5I.bolt],
      ['climate', 'Climate', V5I.therm],
    ];
    return `<nav class="tabs"><div class="in">${tabs.map(([k, label, ic]) => `<button data-a="tab" data-v="${k}" class="${this._tab === k ? 'sel' : ''}" aria-label="${label}"><span class="pill">${v5.svg(ic)}${k === 'security' && alert && this._tab !== 'security' ? '<span class="badge"></span>' : ''}</span><span class="t">${label}</span></button>`).join('')}</div></nav>`;
  }

  /* HOME */
  _homeView() {
    const hr = new Date().getHours();
    const greet =
      hr < 5
        ? 'Good night'
        : hr < 10
          ? 'Good morning'
          : hr < 17
            ? 'Good afternoon'
            : hr < 22
              ? 'Good evening'
              : 'Good night';
    const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    // the alarm card lives on the Security tab; Home only shows a banner while the alarm is not disarmed
    return [
      this._header(greet, date),
      this._alarmBanner(),
      this._todayCard(),
      this._energyGlance(),
      this._floorsHtml(),
      this._activeNow(),
    ].join('');
  }

  _alarmBanner() {
    const s = this._s(this._config.alarm);
    if (!s || s.state === 'disarmed' || s.state === 'unavailable' || s.state === 'unknown') return '';
    const st = s.state;
    const warn = st === 'arming' || st === 'pending';
    const cleaning = this._cleaningPending();
    const label =
      {
        armed_away: 'Armed away',
        armed_home: 'Armed home',
        armed_night: 'Armed night',
        armed_vacation: 'Armed vacation',
        armed_custom_bypass: 'Armed · cleaning',
        arming: 'Arming…',
        pending: 'Entry delay…',
        triggered: 'Alarm triggered',
      }[st] || st;
    const away = this._config.people.every((p) => {
      const ps = this._s(p);
      return !ps || ps.state !== 'home';
    });
    const hot = st === 'triggered';
    const sub = hot
      ? 'Tap to see what happened'
      : st === 'armed_custom_bypass'
        ? cleaning
          ? `Full alarm once ${this._config.vacuum_name} docks`
          : 'Doors only'
        : st === 'arming' && cleaning
          ? 'Cleaning mode, doors only'
          : `since ${v5.hm(Date.parse(s.last_changed))}${away ? ' · everyone away' : ''}`;
    const fg = hot ? V5C.bg : warn ? V5C.orange : V5C.redSoft;
    return `<button class="card row" data-a="tab" data-v="security" style="gap:12px;padding:14px 16px;background:${hot ? V5C.red : warn ? V5C.orangeSoft : V5C.redBg};border-color:${warn ? 'rgba(255,159,67,0.4)' : 'rgba(255,107,107,0.5)'}${hot ? `;color:${V5C.bg}` : ''}">
      <span class="ic" style="background:${hot ? V5C.bg : warn ? V5C.orangeBar : V5C.red};color:${hot ? V5C.red : V5C.bg}">${v5.svg(V5I.shield)}</span>
      <span class="col grow" style="gap:1px;text-align:left"><span style="font-size:17px;font-weight:800">${v5.esc(label)}</span><span class="s12" style="color:${hot ? V5C.bg : V5C.sub}">${v5.esc(sub)}</span></span>
      <span class="s12 b7" style="color:${fg}">Manage</span><span style="color:${fg};display:flex">${v5.svg(V5I.chevR, { size: 14, width: 2.5 })}</span></button>`;
  }

  _cleaningPending() {
    const c = this._config.clean_then_arm;
    return !!c && this._on(c.pending);
  }

  _todayCard() {
    const me = this._me();
    const hid = me && this._config.headlines[me];
    const hs = this._s(hid);
    const headline = hs && !['unknown', 'unavailable', ''].includes(hs.state) ? hs.state : null;
    const tags = [];
    const w = this._s(this._config.weather);
    if (w) {
      const temp = w.attributes.temperature;
      const soon = this._fcH.slice(0, 8).find((f) => (f.precipitation || 0) >= 0.2);
      const note = soon
        ? `<span style="color:${V5C.blue}">rain from ${v5.pad(new Date(soon.datetime).getHours())}</span>`
        : `<span class="mute">${v5.esc(V5WTEXT[w.state] || w.state)}</span>`;
      tags.push(
        `<span class="chip">${v5.wsvg(soon ? 'rainy' : w.state, 16, 2)}<span>${temp != null ? Math.round(temp) + '°' : ''}</span>${note}</span>`,
      );
    }
    const now = Date.now(),
      t0 = v5.dayStart(now),
      t1 = t0 + 86400000,
      t2 = t1 + 86400000;
    const today = this._events.filter((e) => e.end > now && e.start < t1);
    const tomorrow = this._events.filter((e) => e.start >= t1 && e.start < t2);
    let first = true;
    for (const e of today.slice(0, 4)) {
      const label = e.allDay ? 'Today' : v5.hm(e.start);
      tags.push(
        `<span class="chip${first && !e.allDay ? ' next' : ''}"><span class="num" style="color:${first && !e.allDay ? V5C.teal : V5C.mute}">${label}</span><span class="ell">${v5.esc(e.summary)}</span></span>`,
      );
      if (!e.allDay) first = false;
    }
    for (const e of tomorrow.slice(0, Math.max(1, 4 - today.length))) {
      tags.push(
        `<span class="chip"><span class="mute">Tomorrow${e.allDay ? '' : ' ' + v5.hm(e.start)}</span><span class="ell">${v5.esc(e.summary)}</span></span>`,
      );
    }
    if (!headline && !tags.length) return '';
    return `<div class="card" style="padding:14px 14px 12px;display:flex;flex-direction:column;gap:10px">
      ${headline ? `<div class="row" style="gap:10px;align-items:flex-start"><span style="color:${V5C.violet};flex-shrink:0;margin-top:2px">${v5.svg(V5I.sparkle, { size: 16 })}</span><div class="s15 b7" style="line-height:1.35">${v5.esc(headline)}</div></div>` : ''}
      <div class="chips">${tags.join('')}</div></div>`;
  }

  _energyGlance() {
    const pn = this._priceNow(),
      st = this._priceStatus();
    const hours = this._hourly();
    const nowH = new Date();
    nowH.setMinutes(0, 0, 0);
    const next = hours.filter((x) => x.t >= nowH.getTime()).slice(0, 8);
    const max = Math.max(...hours.map((x) => x.p), 0.01);
    const bars = next
      .map((x, i) => {
        const lbl = i === 0 ? 'now' : i % 2 === 0 ? v5.pad(new Date(x.t).getHours()) : '';
        return `<div class="col" style="align-items:center;gap:4px"><div style="width:14px;height:${Math.round(10 + (x.p / max) * 50)}px;border-radius:4px;background:${this._rankColor(x.rank)};opacity:${i ? 0.8 : 1}"></div><div class="num" style="height:12px;font-size:10px;font-weight:700;color:${i ? V5C.dim : V5C.fg}">${lbl}</div></div>`;
      })
      .join('');
    const chips = [];
    const car = this._config.car;
    const soc = this._n(car.soc);
    if (soc != null) {
      const state = this._on(car.charging) ? 'charging' : this._on(car.plug) ? 'plugged in' : 'unplugged';
      chips.push(
        `<span class="chip"><span style="color:${V5C.teal}">${v5.esc(car.name)}</span> ${Math.round(soc)}% · ${state}</span>`,
      );
    }
    const tin = this._n(this._config.climate.down),
      tout = this._n(this._config.climate.out);
    if (tin != null || tout != null)
      chips.push(`<span class="chip">${v5.fnum(tin)}° in · ${v5.fnum(tout, 0)}° out</span>`);
    this._openDoors().forEach((id) =>
      chips.push(`<span class="chip warn">${v5.esc(this._hass.states[id].attributes.friendly_name || id)} open</span>`),
    );
    return `<button class="card" data-a="tab" data-v="energy" style="display:flex;flex-direction:column;gap:10px;padding:14px 16px">
      <div class="row" style="justify-content:space-between;align-items:flex-end;gap:10px">
        <div class="col" style="gap:3px;min-width:0"><div class="lbl">Electricity</div>
          <div class="row" style="align-items:baseline;gap:6px"><span class="num" style="font-size:34px;font-weight:800;letter-spacing:-0.02em;line-height:1">${pn.ore ?? '–'}</span><span class="s12 mute">öre/kWh</span></div>
          ${st ? `<div class="s13 b7" style="color:${st.color}">${v5.esc(st.text)}</div>` : ''}</div>
        <div class="bars" style="gap:5px">${bars}</div></div>
      ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}</button>`;
  }

  _roomSummary(a) {
    const h = this._hass,
      ids = this._roomLights(a);
    const avail = ids.filter((id) => h.states[id].state !== 'unavailable');
    const n = avail.filter((id) => h.states[id].state === 'on').length,
      t = avail.length;
    return { n, t, total: ids.length, avail };
  }

  _floorsHtml() {
    const h = this._hass;
    return this._config.floors
      .map((f, i) => {
        const areas = this._floorAreas(i);
        if (!areas.length) return '';
        const lit = areas.reduce((a, ar) => a + this._roomSummary(ar).n, 0);
        const tiles = areas
          .map((ar) => {
            const { n, t } = this._roomSummary(ar);
            const oth = (this._config.others[ar] || []).filter((id) => this._s(id));
            let sub =
              t === 0
                ? oth.length
                  ? oth
                      .map(
                        (id) =>
                          `${v5.shortName(h.states[id].attributes.friendly_name || id, this._areaName(ar))} ${h.states[id].state === 'on' ? 'on' : 'off'}`,
                      )
                      .join(' · ')
                  : 'No lights'
                : t === 1
                  ? n
                    ? 'On'
                    : 'Off'
                  : n
                    ? n === t
                      ? 'All on'
                      : `${n} of ${t} on`
                    : 'Off';
            if (!n && t) {
              const doors = this._config.doors.filter((id) => v5.areaOf(h, id) === ar && this._on(id));
              const others = (this._config.others[ar] || []).filter((id) => this._on(id));
              const temp = this._roomTemp(ar);
              if (doors.length) sub += ' · door open';
              else if (others.length)
                sub += ` · ${(h.states[others[0]].attributes.friendly_name || '').toLowerCase()} on`;
              else if (temp) sub += ' · ' + temp;
            }
            return `<div class="tile${n ? ' lit' : ''}">
          ${t ? `<button class="tg" data-a="room-toggle" data-v="${ar}" aria-label="Toggle ${v5.esc(this._areaName(ar))}"><span class="ic">${v5.svg(V5I.bulb)}</span></button>` : `<button class="tg" data-a="room" data-v="${ar}" aria-label="Open ${v5.esc(this._areaName(ar))}"><span class="ic">${v5.svg(V5I.bulb)}</span></button>`}
          <button class="op" data-a="room" data-v="${ar}" aria-label="Open ${v5.esc(this._areaName(ar))}"><span class="col grow" style="gap:2px"><span class="nm ell">${v5.esc(this._areaName(ar))}</span><span class="sb ell">${v5.esc(sub)}</span></span><span style="color:${V5C.dim};flex-shrink:0">${v5.svg(V5I.chevR, { size: 12, width: 2.5 })}</span></button></div>`;
          })
          .join('');
        return `<div class="sect"><div class="lbl">${v5.esc(f.name)}${lit ? ` · ${lit} on` : ''}</div><button class="link${lit ? '' : ' off'}" data-a="floor-off" data-v="${i}">All off</button></div><div class="grid2">${tiles}</div>`;
      })
      .join('');
  }

  _mediaCard(id) {
    const s = this._s(id);
    if (!s) return '';
    const a = s.attributes;
    const title = a.media_title
      ? a.media_artist
        ? `${a.media_title} · ${a.media_artist}`
        : a.media_title
      : a.app_name || (s.state === 'paused' ? 'Paused' : 'Playing');
    const where = [this._areaName(v5.areaOf(this._hass, id)), a.friendly_name].filter(Boolean).join(' · ');
    const playing = s.state === 'playing';
    return `<div class="card row" style="gap:8px;padding:10px 10px 10px 14px">
      <div class="col grow" style="gap:1px"><div class="lbl ell">${v5.esc(where)}</div><div class="s15 b7 ell">${v5.esc(title)}${playing ? '' : ' · paused'}</div></div>
      <button class="sq" data-a="media" data-v="${id}" data-w="vd" aria-label="Volume down">${v5.svg(V5I.minus, { size: 18 })}</button>
      <button class="sq pri" data-a="media" data-v="${id}" data-w="pp" aria-label="Play or pause">${v5.svg(playing ? V5I.pause : V5I.play, { size: 18, width: 2.5 })}</button>
      <button class="sq" data-a="media" data-v="${id}" data-w="vu" aria-label="Volume up">${v5.svg(V5I.plus, { size: 18 })}</button>
      <button class="sq" data-a="media" data-v="${id}" data-w="off" aria-label="Turn off" style="color:${V5C.redSoft}">${v5.svg(V5I.power, { size: 18 })}</button></div>`;
  }

  _vacuumCard(vs) {
    const st = vs.state;
    const running = ['cleaning', 'returning', 'paused', 'error'].includes(st);
    const title =
      {
        cleaning: 'Cleaning',
        returning: 'Returning to dock',
        paused: 'Paused',
        error: 'Needs attention',
        docked: 'Docked',
        idle: 'Idle',
      }[st] || st;
    const bat = vs.attributes.battery_level;
    const last = this._s(this._config.vac.last_end);
    const lastTxt = !running && last && !isNaN(Date.parse(last.state)) ? `cleaned ${v5.whenShort(last.state)}` : '';
    const detail = [
      running && vs.attributes.status && vs.attributes.status.toLowerCase() !== title.toLowerCase()
        ? vs.attributes.status
        : '',
      bat != null && (running || bat < 100) ? `battery ${bat}%` : '',
      running ? `since ${v5.hm(vs.last_changed)}` : '',
      lastTxt,
    ]
      .filter(Boolean)
      .join(' · ');
    const id = vs.entity_id;
    const b = (svc, label, icon, pri) =>
      `<button class="sq${pri ? ' pri' : ''}" data-a="vac" data-v="${id}" data-w="${svc}" aria-label="${label}">${v5.svg(icon, { size: 18, width: pri ? 2.5 : 2 })}</button>`;
    let buttons;
    if (st === 'cleaning')
      buttons = b('pause', 'Pause', V5I.pause, true) + b('return_to_base', 'Send to dock', V5I.home);
    else if (st === 'paused' || st === 'error')
      buttons = b('start', 'Resume', V5I.play, true) + b('return_to_base', 'Send to dock', V5I.home);
    else if (st === 'returning') buttons = b('stop', 'Stop', V5I.pause, false);
    else
      buttons =
        `<button class="sq" data-a="vac" data-v="${id}" data-w="clean_spot" aria-label="Spot clean" style="width:auto;padding:0 12px;font-size:13px;font-weight:800">Spot</button>` +
        b('start', 'Start cleaning', V5I.play, true);
    const err = st === 'error';
    return `<div class="card row" style="gap:10px;padding:10px 6px 10px 12px">
        <button class="ic" data-a="more" data-v="${id}" aria-label="Details" style="background:${err ? V5C.redBg : running ? V5C.tealSoft : V5C.card2};color:${err ? V5C.redSoft : running ? V5C.teal : V5C.mute}">${v5.svg(V5I.vacuum, { size: 22 })}</button>
        <button class="col grow" style="gap:1px;min-width:0" data-a="room" data-v="@vacuum" aria-label="Open ${v5.esc(vs.attributes.friendly_name || 'vacuum')}"><span class="lbl ell">${v5.esc(vs.attributes.friendly_name || 'Vacuum')}</span><span class="s15 b7">${v5.esc(title)}</span>${detail ? `<span class="s12 mute ell">${v5.esc(detail)}</span>` : ''}</button>
        ${buttons}<button data-a="room" data-v="@vacuum" aria-hidden="true" tabindex="-1" style="display:flex;align-items:center;justify-content:center;width:12px;height:44px;flex-shrink:0;color:${V5C.dim}">${v5.svg(V5I.chevR, { size: 12, width: 2.5 })}</button></div>`;
  }

  _activeNow() {
    const media = this._config.media.filter((id) => {
      const s = this._s(id);
      return s && ['playing', 'paused'].includes(s.state);
    });
    const vs = this._s(this._config.vacuum);
    const vacOn = vs && ['cleaning', 'returning', 'paused', 'error'].includes(vs.state);
    const vacIdle = vs && !vacOn && vs.state !== 'unavailable';
    let out = '';
    if (media.length || vacOn)
      out += `<div class="sect"><div class="lbl">Active now</div></div>${media.map((id) => this._mediaCard(id)).join('')}${vacOn ? this._vacuumCard(vs) : ''}`;
    if (vacIdle) out += (out ? '' : '<div class="sect"><div class="lbl">Devices</div></div>') + this._vacuumCard(vs);
    return out;
  }

  _alarmBlock() {
    const s = this._s(this._config.alarm);
    if (!s) return '';
    const state = s.state;
    const armed = [
      'armed_away',
      'armed_home',
      'armed_night',
      'armed_vacation',
      'armed_custom_bypass',
      'arming',
      'pending',
      'triggered',
    ].includes(state);
    const cleaning = this._cleaningPending();
    const label =
      {
        disarmed: 'Disarmed',
        armed_away: 'Armed · away',
        armed_home: 'Armed · home',
        armed_night: 'Armed · night',
        armed_custom_bypass: 'Armed · cleaning',
        arming: 'Arming…',
        pending: 'Entry delay…',
        triggered: 'ALARM TRIGGERED',
      }[state] || state;
    const feat = s.attributes.supported_features || 0;
    const btn = (svc, text, color) =>
      `<button class="hold" data-hold="${svc}"><span class="fill" style="background:${color}"></span><span class="tx"><span class="s15 b7">${text}</span><small class="s12" style="color:${V5C.sub};font-size:11px">Hold to confirm</small></span></button>`;
    const ct = this._config.clean_then_arm;
    const vac = this._s(this._config.vacuum);
    const canClean = state === 'disarmed' && ct && this._s(ct.script) && vac && vac.state !== 'unavailable';
    // while the vacuum is already out, the same script just arms Cleaning mode and waits for her (it won't restart her)
    const vacBusy = vac && ['cleaning', 'returning'].includes(vac.state);
    const buttons = armed
      ? btn('alarm_disarm', 'Disarm', 'rgba(61,214,196,0.55)')
      : [
          feat & 1 ? btn('alarm_arm_home', 'Arm home', 'rgba(255,107,107,0.55)') : '',
          feat & 2 ? btn('alarm_arm_away', feat & 1 ? 'Arm away' : 'Arm', 'rgba(255,107,107,0.55)') : '',
          canClean
            ? btn(
                'script:' + ct.script.split('.')[1],
                vacBusy ? `Arm when ${this._config.vacuum_name} is done` : 'Clean, then arm',
                'rgba(255,159,67,0.55)',
              )
            : '',
        ].join('');
    const note =
      state === 'armed_custom_bypass'
        ? cleaning
          ? `Full alarm once ${this._config.vacuum_name} docks`
          : 'Doors only'
        : '';
    const open = this._openDoors().map((id) => this._hass.states[id].attributes.friendly_name || id);
    const people = this._config.people
      .map((p) => {
        const ps = this._s(p);
        if (!ps) return '';
        const home = ps.state === 'home';
        const initial = (ps.attributes.friendly_name || p.split('.')[1]).charAt(0).toUpperCase();
        const where = home ? 'Home' : ps.state === 'not_home' ? 'Away' : ps.state;
        return `<div class="person"><b style="background:${home ? 'rgba(61,214,196,0.18)' : V5C.card2};color:${home ? V5C.teal : V5C.dim}">${v5.esc(initial)}</b><span style="font-size:10px;font-weight:700;color:${home ? V5C.teal : V5C.dim}">${v5.esc(where)}</span></div>`;
      })
      .join('');
    const hot = armed || state === 'triggered';
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:14px;border-color:${hot ? 'rgba(255,107,107,0.45)' : V5C.line}">
      <div class="row" style="gap:12px">
        <span class="ic" style="background:${hot ? V5C.red : 'rgba(61,214,196,0.18)'};color:${hot ? V5C.bg : V5C.teal}">${v5.svg(V5I.shield)}</span>
        <div class="col grow" style="gap:1px"><div class="lbl">Alarm</div><div style="font-size:16px;font-weight:800">${v5.esc(label)}</div>
          ${!armed && open.length ? `<div class="s12 b7" style="color:${V5C.redSoft}">${v5.esc(open.join(', '))} ${open.length > 1 ? 'are' : 'is'} open</div>` : ''}${note ? `<div class="s12" style="color:${V5C.orange}">${v5.esc(note)}</div>` : ''}</div>
        <div class="row" style="gap:6px;flex-shrink:0">${people}</div></div>
      <div class="row" style="gap:10px">${buttons}</div></div>`;
  }

  /* ROOM */
  _roomView(ar) {
    const h = this._hass,
      name = this._areaName(ar);
    const ids = this._roomLights(ar);
    const { n, t, total } = this._roomSummary(ar);
    const fi = this._config.floors.findIndex((_f, i) => this._floorAreas(i).includes(ar));
    const floor = fi >= 0 ? this._config.floors[fi].name : '';
    const temp = this._roomTemp(ar);
    const sub = [floor, t ? (n ? `${n} of ${t} on` : 'all off') : 'no lights', temp].filter(Boolean).join(' · ');
    const dimOn = ids.filter((id) => h.states[id].state === 'on' && v5.dimmable(h.states[id]));
    const hasDim = ids.some((id) => h.states[id].state !== 'unavailable' && v5.dimmable(h.states[id]));
    const avg = dimOn.length
      ? Math.round(dimOn.reduce((s, id) => s + (v5.pct(h.states[id]) || 0), 0) / dimOn.length)
      : 0;
    // Scenes: shown when the room has a scene helper input_select.<area>_scene (options in order, calmest first).
    // Tapping runs script.room_scene, which also updates the helper. The current scene is highlighted only while lights are on.
    const sh = this._s(`input_select.${ar}_scene`);
    const sceneOpts = sh && Array.isArray(sh.attributes.options) ? sh.attributes.options : [];
    const curScene = sh && n ? sh.state : null;
    const scenes = sceneOpts.length
      ? `<div class="sect"><div class="lbl">Scenes</div></div><div class="scenes">${sceneOpts.map((o) => `<button class="scn${o === curScene ? ' on' : ''}" data-a="scene" data-v="${ar}" data-w="${v5.esc(o)}">${v5.esc(o)}</button>`).join('')}</div>`
      : '';
    const segs = (cur, a, v, cls) =>
      `<div class="segs ${cls}">${Array.from({ length: 10 }, (_, i) => {
        const p = (i + 1) * 10;
        return `<button data-a="${a}" data-v="${v}" data-w="${p}" class="${cur >= p ? 'on' : ''}" aria-label="${p}%"><span></span></button>`;
      }).join('')}</div>`;
    const lights = ids
      .map((id) => {
        const s = h.states[id],
          on = s.state === 'on',
          na = s.state === 'unavailable',
          dim = v5.dimmable(s),
          p = v5.pct(s);
        const nm = v5.shortName(s.attributes.friendly_name || id, name);
        const state = na ? 'Unavailable' : on ? (dim && p ? p + '%' : 'On') : 'Off';
        return `<div class="col" style="gap:6px;padding:12px 14px;border-top:1px solid ${V5C.line};opacity:${na ? 0.45 : 1}">
        <div class="row" style="gap:12px"><span class="ic${on ? ' lit' : ''}" style="width:34px;height:34px;border-radius:10px">${v5.svg(V5I.bulb, { size: 18 })}</span>
          <button class="col grow" style="gap:1px" data-a="more" data-v="${id}"><span class="s15 b7 ell">${v5.esc(nm)}</span><span class="s12" style="color:${na ? V5C.redSoft : V5C.mute}">${state}</span></button>
          <button class="swb" data-a="light" data-v="${id}" aria-label="Toggle ${v5.esc(nm)}"><span class="sw${on ? ' on' : ''}"><i></i></span></button></div>
        ${on && dim && !na ? segs(p || 0, 'bri', id, 'small') : ''}</div>`;
      })
      .join('');
    const others = (this._config.others[ar] || [])
      .filter((id) => v5.safe(h, id))
      .map((id) => {
        const s = this._s(id),
          on = s.state === 'on';
        return `<div class="li"><div class="col grow" style="gap:1px"><span class="s15 b7 ell">${v5.esc(s.attributes.friendly_name || id)}</span><span class="s12 mute">${s.state === 'unavailable' ? 'Unavailable' : on ? 'On' : 'Off'}</span></div><button class="swb" data-a="toggle" data-v="${id}" aria-label="Toggle"><span class="sw${on ? ' on' : ''}"><i></i></span></button></div>`;
      })
      .join('');
    const info = [];
    this._config.media
      .filter((id) => v5.areaOf(h, id) === ar && this._s(id))
      .forEach((id) => {
        const s = h.states[id];
        const st =
          s.state === 'playing'
            ? s.attributes.media_title || 'Playing'
            : s.state === 'unavailable'
              ? 'unavailable'
              : s.state;
        info.push(
          `<button class="chip" style="padding:9px 12px;font-size:13px;color:${V5C.sub}" data-a="more" data-v="${id}">${v5.esc(s.attributes.friendly_name)} · ${v5.esc(st)}</button>`,
        );
      });
    this._config.doors
      .filter((id) => v5.areaOf(h, id) === ar && this._s(id))
      .forEach((id) => {
        const on = this._on(id);
        info.push(
          `<span class="chip${on ? ' warn' : ''}" style="padding:9px 12px;font-size:13px;${on ? '' : `color:${V5C.sub}`}">${v5.esc(h.states[id].attributes.friendly_name)} ${on ? 'open' : 'closed'}</span>`,
        );
      });
    const vs = this._s(this._config.vacuum);
    if (vs && v5.areaOf(h, vs.entity_id) === ar)
      info.push(
        `<button class="chip" style="padding:9px 12px;font-size:13px;color:${V5C.teal}" data-a="room" data-v="@vacuum">${v5.esc(vs.attributes.friendly_name || 'Vacuum')} · ${v5.esc(vs.state)} ›</button>`,
      );
    this._config.cameras
      .filter((c) => h.states[c.entity] && v5.areaOf(h, c.entity) === ar)
      .forEach((c) => {
        info.push(
          `<button class="chip" style="padding:9px 12px;font-size:13px;color:${V5C.teal}" data-a="goto-cam" data-v="${c.entity}">Camera · ${v5.esc(c.name)} ›</button>`,
        );
      });
    return `<div class="page">
      <div class="row" style="justify-content:space-between"><button class="row s15 b7" style="gap:2px;padding:6px 10px 6px 0;color:${V5C.teal}" data-a="back">${v5.svg(V5I.chevL, { width: 2.2 })}Home</button><div class="s15 b7 mute num">${v5.hm(new Date())}</div></div>
      <div class="row" style="justify-content:space-between;align-items:flex-end;gap:12px;padding:0 4px">
        <div class="col" style="gap:2px;min-width:0"><div style="font-size:28px;font-weight:800;letter-spacing:-0.02em" class="ell">${v5.esc(name)}</div><div class="s13 mute">${v5.esc(sub)}</div></div>
        ${t ? `<button data-a="room-toggle" data-v="${ar}" style="flex-shrink:0;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:800;background:${n ? V5C.card2 : V5C.amber};color:${n ? V5C.fg : V5C.litBg}">${n ? 'All off' : 'All on'}</button>` : ''}</div>
      ${scenes}
      ${hasDim ? `<div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px"><div class="row" style="justify-content:space-between"><div class="lbl">Room brightness</div><div class="s14 b8">${dimOn.length ? avg + '%' : 'Off'}</div></div>${segs(dimOn.length ? avg : 0, 'room-bri', ar, 'big')}</div>` : ''}
      ${ids.length ? `<div class="sect"><div class="lbl">Lights · ${t}${total > t ? ` · ${total - t} unavailable` : ''}</div></div><div class="card" style="overflow:hidden">${lights.replace(`border-top:1px solid ${V5C.line}`, 'border-top:0')}</div>` : ''}
      ${others ? `<div class="sect"><div class="lbl">Other devices · not in “All off”</div></div><div class="card list" style="overflow:hidden">${others}</div>` : ''}
      ${info.length ? `<div class="sect"><div class="lbl">In this room</div></div><div class="chips" style="gap:8px">${info.join('')}</div>` : ''}
    </div>`;
  }

  /* VACUUM (the vacuum's own screen) */
  _loadMap(url) {
    if (!url || this._mapUrl === url) return;
    this._mapUrl = url;
    const img = new Image();
    img.alt = 'Map of the last cleaning run';
    img.onload = () => {
      if (this._mapUrl === url) {
        this._imgs.vacmap = img;
        this._placeCams();
      }
    };
    img.src = url;
  }
  _vacuumView() {
    const c = this._config.vac,
      vs = this._s(this._config.vacuum);
    const back = `<div class="row" style="justify-content:space-between"><button class="row s15 b7" style="gap:2px;padding:6px 10px 6px 0;color:${V5C.teal}" data-a="back">${v5.svg(V5I.chevL, { width: 2.2 })}Back</button><div class="s15 b7 mute num">${v5.hm(new Date())}</div></div>`;
    if (!vs)
      return `<div class="page">${back}<div class="card empty">${v5.esc(this._config.vacuum)} is not available.</div></div>`;
    const id = vs.entity_id,
      st = vs.state,
      name = vs.attributes.friendly_name || 'Vacuum';
    const busy = st === 'cleaning' || st === 'returning';
    const running = busy || st === 'paused' || st === 'error';
    const bat = vs.attributes.battery_level;
    const title =
      {
        cleaning: 'Cleaning',
        returning: 'Returning to dock',
        paused: 'Paused',
        error: 'Needs attention',
        docked: 'Docked',
        idle: 'Idle',
        unavailable: 'Unavailable',
      }[st] || st;
    const roomOf = (seg) => c.rooms.find((r) => String(r.segment) === String(seg));
    const curRoomS = this._s(c.room_id);
    const curRoom = st === 'cleaning' && curRoomS ? roomOf(curRoomS.state) : null;
    const curMin = this._n(c.cur_duration),
      curArea = this._n(c.cur_area);
    const sub = [
      title,
      curRoom ? 'in ' + curRoom.name : '',
      st === 'error' && vs.attributes.status ? vs.attributes.status : '',
      bat != null ? `battery ${bat}%` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const err = st === 'error';

    // controls
    const vb = (svc, label, icon, pri) =>
      `<button class="vbtn${pri ? ' pri' : ''}" data-a="vac" data-v="${id}" data-w="${svc}">${icon ? v5.svg(icon, { size: 16, width: 2.5 }) : ''}${label}</button>`;
    let ctrl;
    if (st === 'cleaning') ctrl = vb('pause', 'Pause', V5I.pause, true) + vb('return_to_base', 'Dock', V5I.home);
    else if (st === 'paused' || err)
      ctrl = vb('start', 'Resume', V5I.play, true) + vb('return_to_base', 'Dock', V5I.home);
    else if (st === 'returning') ctrl = vb('stop', 'Stop', V5I.pause, false);
    else ctrl = vb('start', 'Clean all', V5I.play, true) + vb('clean_spot', 'Spot', V5I.target);

    // rooms
    const sel = this._vacSel;
    const roomsHtml = c.rooms
      .map(
        (r) =>
          `<button class="vroom${sel.includes(r.segment) ? ' on' : ''}" data-a="vac-room" data-v="${r.segment}" aria-pressed="${sel.includes(r.segment)}">${curRoom === r ? '<span class="now"></span>' : ''}${v5.esc(r.name)}</button>`,
      )
      .join('');
    const canGo = sel.length && !busy;
    const goLabel = !sel.length
      ? 'Pick rooms to clean'
      : busy
        ? 'Wait until she is back'
        : sel.length === 1
          ? `Clean ${roomOf(sel[0]).name.toLowerCase()}`
          : `Clean ${sel.length} rooms`;

    // map + run summary
    const ms = this._s(c.map);
    if (ms && ms.attributes.entity_picture)
      this._loadMap(ms.attributes.entity_picture + '&v=' + encodeURIComponent(ms.state));
    let run = '';
    if (running) {
      run = [
        `This run · since ${v5.hm(vs.last_changed)}`,
        curMin != null ? v5.mins(curMin) : '',
        curArea != null ? Math.round(curArea) + ' m²' : '',
      ]
        .filter(Boolean)
        .join(' · ');
    } else {
      const ls = this._s(c.last_start),
        ld = this._n(c.last_duration),
        la = this._n(c.last_area);
      if (ls && !isNaN(Date.parse(ls.state)))
        run = [
          `Last run · ${v5.when(ls.state)}`,
          ld != null ? v5.mins(ld) : '',
          la != null ? Math.round(la) + ' m²' : '',
        ]
          .filter(Boolean)
          .join(' · ');
    }
    const mapUpd = ms && !isNaN(Date.parse(ms.state)) ? `updated ${v5.when(ms.state)}` : '';

    // maintenance
    const parts = c.parts
      .filter((p) => this._s(p.sensor))
      .map((p) => {
        const sec = this._n(p.sensor);
        const hrs = sec == null ? null : sec / 3600;
        const pct = hrs == null ? 0 : Math.max(0, Math.min(100, Math.round((hrs / p.hours) * 100)));
        const col = pct <= 10 ? V5C.red : pct <= 25 ? V5C.orangeBar : V5C.teal;
        const left = hrs == null ? '–' : hrs <= 0 ? 'replace now' : `${Math.round(hrs)} h left`;
        const reset = this._s(p.reset)
          ? `<button class="hold" data-hold="press" data-v="${p.reset}" style="flex:0 0 auto;padding:8px 12px;border-radius:10px" aria-label="Hold to reset ${v5.esc(p.name)}"><span class="fill" style="background:rgba(61,214,196,0.55)"></span><span class="tx"><span class="s13 b7">Reset</span><small style="font-size:10px;color:${V5C.mute}">hold</small></span></button>`
          : '';
        return `<div class="li"><div class="col grow" style="gap:6px"><div class="row" style="justify-content:space-between;gap:8px"><span class="s14 b7">${v5.esc(p.name)}</span><span class="s12 num" style="color:${pct <= 25 ? col : V5C.mute}">${left}</span></div><div class="bar"><i style="width:${pct}%;background:${col}"></i></div></div>${reset}</div>`;
      })
      .join('');

    return `<div class="page">
      ${back}
      <div class="row" style="justify-content:space-between;align-items:flex-end;gap:12px;padding:0 4px">
        <div class="col" style="gap:2px;min-width:0"><div style="font-size:28px;font-weight:800;letter-spacing:-0.02em" class="ell">${v5.esc(name)}</div><div class="s13" style="color:${err ? V5C.redSoft : V5C.mute}">${v5.esc(sub)}</div></div>
        <button class="ic" data-a="more" data-v="${id}" aria-label="Fan speed and more" style="background:${err ? V5C.redBg : running ? V5C.tealSoft : V5C.card2};color:${err ? V5C.redSoft : running ? V5C.teal : V5C.mute}">${v5.svg(V5I.vacuum, { size: 22 })}</button></div>
      <div class="row" style="gap:8px">${ctrl}</div>
      <div class="sect"><div class="lbl">Clean rooms</div>${sel.length ? '<button class="link" data-a="vac-clear">Clear</button>' : ''}</div>
      <div class="vrooms">${roomsHtml}</div>
      <button class="vbtn ${canGo ? 'pri' : 'dis'}" data-a="vac-rooms" style="flex:none">${v5.esc(goLabel)}</button>
      <div class="sect"><div class="lbl">Map</div><div class="s12 dimc">${v5.esc(mapUpd)}</div></div>
      <div class="card" style="overflow:hidden">
        ${ms ? `<div class="vmap"><div class="slot" data-slot="vacmap"></div></div>` : `<div class="empty">No map yet (${v5.esc(c.map)}).</div>`}
        ${run ? `<div class="s13 b7" style="padding:10px 16px 14px;border-top:1px solid ${V5C.line};color:${V5C.sub}">${v5.esc(run)}</div>` : ''}</div>
      ${parts ? `<div class="sect"><div class="lbl">Maintenance</div></div><div class="card list" style="overflow:hidden">${parts}</div>` : ''}
    </div>`;
  }

  /* SECURITY */
  _securityView() {
    const h = this._hass;
    const people = this._config.people
      .map((p) => this._s(p))
      .filter(Boolean)
      .map((ps) => `${(ps.attributes.friendly_name || '').split(' ')[0]} ${ps.state === 'home' ? 'home' : 'away'}`)
      .join(' · ');
    const cams = this._config.cameras.filter((c) => h.states[c.entity]);
    if (!this._cam || !cams.find((c) => c.entity === this._cam)) this._cam = cams.length ? cams[0].entity : null;
    const main = cams.find((c) => c.entity === this._cam);
    const lastPerson = (c) => {
      const e = this._log.find((x) => x.entity === c.person);
      return e ? `Person · ${v5.hm(e.t)}` : null;
    };
    let camHtml = '';
    if (main) {
      const ms = this._s(main.entity);
      const rec = cams.filter((c) => ['recording', 'streaming'].includes((h.states[c.entity] || {}).state)).length;
      camHtml = `<div class="sect"><div class="lbl">Cameras</div><div class="s12 b7 mute">${rec} recording</div></div>
        <button class="cam" data-a="cam-open" data-v="${main.entity}" aria-label="Open ${v5.esc(main.name)} live"><span class="slot" data-slot="${main.entity}"></span>
          <span class="over col"><span class="s15 b8">${v5.esc(main.name)}</span><span class="s12" style="color:${V5C.sub}">${v5.esc(lastPerson(main) || ms.state)} · tap for live</span></span></button>
        <div class="thumbs">${cams
          .filter((c) => c !== main)
          .map(
            (c) =>
              `<button class="col" style="gap:4px;min-width:0" data-a="cam" data-v="${c.entity}"><span class="thumb"><span class="slot" data-slot="${c.entity}"></span></span><span class="ell" style="font-size:11px;font-weight:700;color:${V5C.sub}">${v5.esc(c.name)}</span></button>`,
          )
          .join('')}</div>`;
    }
    const doors = this._config.doors
      .filter((id) => this._s(id))
      .map((id) => {
        const s = h.states[id],
          open = s.state === 'on';
        const mins = Math.round((Date.now() - new Date(s.last_changed).getTime()) / 60000);
        const since =
          mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} d`;
        return `<div class="li"><span class="dot" style="background:${open ? V5C.red : V5C.teal}"></span><span class="grow s15 b7 ell">${v5.esc(s.attributes.friendly_name || id)}</span><span class="s13 b7" style="color:${open ? V5C.redSoft : V5C.mute}">${open ? 'Open · ' + since : s.state === 'unavailable' ? 'Unavailable' : 'Closed'}</span></div>`;
      });
    const smoke = this._config.smoke.map((id) => this._s(id)).filter(Boolean);
    if (smoke.length) {
      const fire = smoke.filter((s) => s.state === 'on'),
        bad = smoke.filter((s) => s.state === 'unavailable');
      doors.push(
        `<div class="li"><span class="dot" style="background:${fire.length ? V5C.red : bad.length ? V5C.orangeBar : V5C.teal}"></span><span class="grow s15 b7">Smoke detectors</span><span class="s13 b7" style="color:${fire.length ? V5C.redSoft : V5C.mute}">${fire.length ? 'SMOKE · ' + v5.esc(fire.map((s) => s.attributes.friendly_name).join(', ')) : bad.length ? bad.length + ' unavailable' : 'All OK'}</span></div>`,
      );
    }
    const recent = this._log
      .slice(0, 6)
      .map(
        (e) =>
          `<div class="li"><span class="s13 b7 mute num" style="width:44px">${v5.hm(e.t)}</span><span class="col grow" style="gap:1px"><span class="s14 b7">${v5.esc(e.what)}</span><span class="s12 mute">${v5.esc(e.where)}</span></span></div>`,
      )
      .join('');
    const toggles = (list) =>
      list
        .filter((x) => v5.safe(h, x.entity))
        .map((x) => {
          const s = this._s(x.entity),
            on = s.state === 'on';
          return `<div class="li"><div class="col grow" style="gap:1px"><span class="s15 b7 ell">${v5.esc(x.name || s.attributes.friendly_name)}</span><span class="s12 mute">${on ? v5.esc(x.on || 'On') : 'Off'}</span></div><button class="swb" data-a="toggle" data-v="${x.entity}" aria-label="Toggle"><span class="sw${on ? ' on' : ''}"><i></i></span></button></div>`;
        })
        .join('');
    const tg1 = toggles(this._config.security_toggles),
      tg2 = toggles(this._config.camera_alerts);
    return [
      this._header('Security', people),
      this._alarmBlock(),
      camHtml,
      doors.length
        ? `<div class="sect"><div class="lbl">Doors &amp; smoke</div></div><div class="card list" style="overflow:hidden">${doors.join('')}</div>`
        : '',
      `<div class="sect"><div class="lbl">Last 24 hours</div></div><div class="card list" style="overflow:hidden">${recent || '<div class="empty">Nothing happened.</div>'}</div>`,
      tg1
        ? `<div class="sect"><div class="lbl">Alarm settings</div></div><div class="card list" style="overflow:hidden">${tg1}</div>`
        : '',
      tg2
        ? `<div class="sect"><div class="lbl">Camera notifications</div></div><div class="card list" style="overflow:hidden">${tg2}</div>`
        : '',
    ].join('');
  }

  /* ENERGY */
  _energyView() {
    const pn = this._priceNow(),
      st = this._priceStatus();
    const hours = this._hourly();
    const nowH = new Date();
    nowH.setMinutes(0, 0, 0);
    const win = hours.filter((x) => x.t >= nowH.getTime()).slice(0, 24);
    const max = Math.max(...hours.map((x) => x.p), 0.01);
    const bars = win
      .map(
        (x, i) =>
          `<div style="flex:1 1 0;height:${Math.round(8 + (x.p / max) * 86)}px;border-radius:3px;background:${this._rankColor(x.rank)};opacity:${i ? 0.75 : 1};${i ? '' : `outline:2px solid ${V5C.fg};outline-offset:1px`}"></div>`,
      )
      .join('');
    const labels = win
      .map((x, i) => {
        const hr = new Date(x.t).getHours();
        return `<div class="num" style="flex:1 1 0;height:13px;font-size:10px;font-weight:700;white-space:nowrap;color:${i === 0 ? V5C.fg : hr === 0 ? V5C.sub : V5C.dim}">${i === 0 ? 'now' : i % 4 === 0 ? v5.pad(hr) : ''}</div>`;
      })
      .join('');
    const cheap = win.length ? win.reduce((a, b) => (b.p < a.p ? b : a)) : null;
    const peak = win.length ? win.reduce((a, b) => (b.p > a.p ? b : a)) : null;
    const avgP = (this._s(this._config.price) || { attributes: {} }).attributes.avg_price;
    const rankTxt = avgP != null ? `Today's average ${Math.round(avgP * 100)} öre` : '';
    const e = this._config.energy;
    const pt = this._s(e.peak_time);
    const peakTime =
      pt && !isNaN(new Date(pt.state).getTime())
        ? new Date(pt.state).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
    const pw = this._n(e.power);
    const usage = [
      [
        'Now',
        pw == null ? '–' : pw >= 1000 ? (pw / 1000).toFixed(1) + ' kW' : Math.round(pw) + ' W',
        'live from Pulse',
        V5C.mute,
      ],
      ['Today', v5.fnum(this._n(e.today_kwh)) + ' kWh', v5.fnum(this._n(e.today_cost), 2) + ' kr so far', V5C.mute],
      ['This month', v5.fnum(this._n(e.month_kwh), 0) + ' kWh', v5.fnum(this._n(e.month_cost), 0) + ' kr', V5C.mute],
      ['Peak hour', v5.fnum(this._n(e.peak), 2) + ' kWh', peakTime, V5C.orange],
    ]
      .map(
        ([k, v, sub, c]) =>
          `<div class="card" style="padding:12px 14px;display:flex;flex-direction:column;gap:3px"><div class="lbl">${k}</div><div class="num" style="font-size:22px;font-weight:800;letter-spacing:-0.01em">${v}</div><div class="s12 ell" style="color:${c}">${v5.esc(sub)}</div></div>`,
      )
      .join('');
    const c = this._config.climate;
    const off = this._n(c.offset) || 0,
      eco = this._on(c.hot_water_eco);
    const loads = [
      [
        'HP',
        'Heat pump',
        off > 0 ? `Easing −${off}° while price is high` : 'No price easing right now',
        off > 0 ? 'Easing' : 'Normal',
        off > 0,
      ],
      [
        'HW',
        'Hot water',
        eco ? 'Eco mode while price is high' : 'Eco mode kicks in when price is high',
        eco ? 'Eco' : 'Normal',
        eco,
      ],
    ]
      .map(
        ([b, n, d, s, hot]) =>
          `<div class="li"><span class="ic" style="width:38px;height:38px;border-radius:10px;font-size:13px;font-weight:800;background:${hot ? 'rgba(255,159,67,0.18)' : V5C.card2};color:${hot ? V5C.orange : V5C.mute}">${b}</span><span class="col grow" style="gap:1px"><span class="s15 b7">${n}</span><span class="s12 mute">${d}</span></span><span class="s13 b7" style="color:${hot ? V5C.orange : V5C.mute}">${s}</span></div>`,
      )
      .join('');
    return [
      this._header('Energy', 'Tibber · hourly prices'),
      `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="row" style="justify-content:space-between;align-items:flex-end;gap:8px">
          <div class="col" style="gap:3px"><div class="lbl">Price now</div><div class="row" style="align-items:baseline;gap:6px"><span class="num" style="font-size:40px;font-weight:800;letter-spacing:-0.02em;line-height:1">${pn.ore ?? '–'}</span><span class="s12 mute">öre/kWh</span></div></div>
          <div class="col" style="align-items:flex-end;gap:3px;text-align:right">${st ? `<div class="s13 b7" style="color:${st.color}">${v5.esc(st.text)}</div>` : ''}<div class="s12 mute">${rankTxt}</div></div></div>
        ${win.length ? `<div class="col" style="gap:4px"><div class="bars" style="gap:2px;height:96px">${bars}</div><div class="row" style="gap:2px">${labels}</div></div>` : '<div class="s13 mute">Loading prices…</div>'}
        ${cheap ? `<div class="grid2" style="gap:8px"><div class="stat"><div class="lbl">Cheapest</div><div class="s15 b8 num">${v5.hm(cheap.t)}</div><div style="font-size:11px;color:${V5C.teal}">${Math.round(cheap.p * 100)} öre</div></div><div class="stat"><div class="lbl">Peak</div><div class="s15 b8 num">${v5.hm(peak.t)}</div><div style="font-size:11px;color:${V5C.redSoft}">${Math.round(peak.p * 100)} öre</div></div></div>` : ''}
      </div>`,
      `<div class="sect"><div class="lbl">Usage · Tibber Pulse</div></div><div class="grid2">${usage}</div>`,
      `<div class="sect"><div class="lbl">Smart loads</div></div><div class="card list" style="overflow:hidden">${loads}</div>`,
      this._carCard(),
    ].join('');
  }

  _carCard() {
    const car = this._config.car,
      h = this._hass;
    const soc = this._n(car.soc);
    if (soc == null) return '';
    const target = this._n(car.target),
      range = this._n(car.range);
    const rs = this._s(car.range);
    const km = range == null ? null : rs.attributes.unit_of_measurement === 'm' ? range / 1000 : range;
    const charging = this._on(car.charging),
      plugged = this._on(car.plug);
    const state = charging ? 'Charging' : plugged ? 'Plugged in' : 'Unplugged';
    const updated = this._s(car.soc).last_changed;
    let charger = '';
    if (car.charger_switch && v5.safe(h, car.charger_switch)) {
      const on = this._on(car.charger_switch);
      const status = (this._s(car.charger_status) || {}).state;
      const p = this._n(car.charger_power);
      charger = `<div class="row" style="gap:12px;border-top:1px solid ${V5C.line};padding-top:12px"><div class="col grow" style="gap:1px"><span class="s14 b7">${v5.esc(car.charger_name || 'Charger')}</span><span class="s12 mute">${on ? 'Enabled' : 'Disabled'}${status ? ' · ' + v5.esc(status.toLowerCase()) : ''}${p != null ? ' · ' + Math.round(p) + ' W' : ''}</span></div><button class="swb" data-a="toggle" data-v="${car.charger_switch}" aria-label="Toggle charger"><span class="sw${on ? ' on' : ''}"><i></i></span></button></div>`;
    }
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px">
      <div class="row" style="justify-content:space-between"><div class="lbl">${v5.esc(car.name)} · via Tibber</div><div class="s12 b7" style="color:${charging ? V5C.teal : V5C.mute}">${state}</div></div>
      <div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:30px;font-weight:800;line-height:1">${Math.round(soc)}%</span><span class="s13 mute">${target != null ? `target ${Math.round(target)}%` : ''}${km != null ? ` · ${Math.round(km)} km` : ''}</span></div>
      <div style="position:relative;height:10px;border-radius:5px;background:${V5C.card2};overflow:hidden"><div style="position:absolute;top:0;left:0;bottom:0;width:${Math.min(100, soc)}%;background:${V5C.teal};border-radius:5px"></div>${target != null ? `<div style="position:absolute;top:0;bottom:0;left:${Math.min(99, target)}%;width:2px;background:${V5C.fg}"></div>` : ''}</div>
      <div class="s12 dimc">Updated ${v5.hm(updated)}</div>
      ${charger}</div>`;
  }

  /* CLIMATE */
  _climateView() {
    const c = this._config.climate;
    const series = (id) => (this._stats[id] || []).slice(-24);
    const zones = [
      ['Downstairs', c.down, V5C.teal],
      ['Upstairs', c.up, 'rgb(126,230,218)'],
      ['Outdoors', c.out, V5C.orange],
    ]
      .filter(([, id]) => this._s(id))
      .map(([name, id, col]) => {
        const v = this._n(id),
          ser = series(id)
            .map((r) => r.v)
            .concat(v == null ? [] : [v]);
        const rng = ser.length ? `${Math.min(...ser).toFixed(1)}–${Math.max(...ser).toFixed(1)}°` : '';
        return `<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:3px"><div class="row" style="gap:6px"><span class="dot" style="width:8px;height:8px;border-radius:4px;background:${col}"></span><span style="font-size:11px;font-weight:700;color:${V5C.mute}">${name}</span></div><div class="num" style="font-size:24px;font-weight:800;letter-spacing:-0.02em">${v5.fnum(v)}°</div><div class="num" style="font-size:11px;color:${V5C.dim}">${rng}</div></div>`;
      })
      .join('');
    return [
      this._header('Climate', 'Indoors, outdoors, SMHI'),
      `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">${zones}</div>`,
      this._tempChart(),
      this._weatherCard(),
      this._heatPumpCard(),
    ].join('');
  }

  _tempChart() {
    const c = this._config.climate;
    const down = this._stats[c.down] || [],
      up = this._stats[c.up] || [],
      out = this._stats[c.out] || [];
    const now = Date.now(),
      t0 = now - 24 * 3600000,
      t1 = now + 24 * 3600000;
    const fc = this._fcH
      .map((f) => ({ t: new Date(f.datetime).getTime(), v: f.temperature }))
      .filter((r) => r.t >= now - 3600000 && r.t <= t1 && r.v != null);
    const byT = new Map();
    down.concat(up).forEach((r) => {
      const k = r.t;
      (byT.get(k) || byT.set(k, []).get(k)).push(r.v);
    });
    const inside = [...byT.entries()]
      .map(([t, vs]) => ({ t, v: vs.reduce((a, b) => a + b, 0) / vs.length }))
      .sort((a, b) => a.t - b.t);
    const nowIn = [this._n(c.down), this._n(c.up)].filter((x) => x != null);
    if (nowIn.length) inside.push({ t: now, v: nowIn.reduce((a, b) => a + b, 0) / nowIn.length });
    const outPast = out.slice();
    const nowOut = this._n(c.out);
    if (nowOut != null) outPast.push({ t: now, v: nowOut });
    const all = inside.concat(outPast, fc).map((r) => r.v);
    if (!all.length) return `<div class="card empty">Loading temperatures…</div>`;
    const lo = Math.floor(Math.min(...all) / 5) * 5,
      hi = Math.ceil(Math.max(...all) / 5) * 5 || lo + 5;
    const W = 326,
      H = 126,
      top = 6;
    const X = (t) => ((t - t0) / (t1 - t0)) * W,
      Y = (v) => top + ((hi - v) / (hi - lo || 1)) * H;
    const path = (arr) =>
      arr
        .filter((r) => r.t >= t0 && r.t <= t1)
        .map((r, i) => (i ? 'L' : 'M') + X(r.t).toFixed(1) + ' ' + Y(r.v).toFixed(1))
        .join(' ');
    const fcPath = path(nowOut != null ? [{ t: now, v: nowOut }].concat(fc.filter((r) => r.t > now)) : fc);
    const grid = [];
    for (let v = lo; v <= hi; v += 5) grid.push(v);
    const mids = [];
    const m = new Date(t0);
    m.setHours(24, 0, 0, 0);
    for (let t = m.getTime(); t < t1; t += 86400000) mids.push(t);
    const nx = X(now).toFixed(1);
    const txt = (x, y, s, col, anchor = 'middle') =>
      `<text x="${x}" y="${y}" fill="${col}" font-size="10" font-weight="700" text-anchor="${anchor}" font-family="Manrope, system-ui, sans-serif">${s}</text>`;
    const svg = `<svg viewBox="0 0 ${W} 150" width="100%" style="display:block;overflow:visible">
      <rect x="${nx}" y="${top}" width="${(W - X(now)).toFixed(1)}" height="${H}" fill="rgba(255,255,255,0.025)"></rect>
      ${grid.map((v) => `<line x1="0" x2="${W}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="rgba(255,255,255,0.06)"></line>${txt(0, (Y(v) - 3).toFixed(1), v + '°', V5C.dim, 'start')}`).join('')}
      ${mids.map((t) => `<line x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${top}" y2="${top + H}" stroke="rgba(255,255,255,0.08)"></line>${txt(X(t).toFixed(1), 146, '00', V5C.dim)}`).join('')}
      <line x1="${nx}" x2="${nx}" y1="${top}" y2="${top + H}" stroke="rgba(230,234,242,0.5)" stroke-dasharray="3 3"></line>${txt(nx, 146, 'now', V5C.fg)}
      <path d="${path(inside)}" fill="none" stroke="${V5C.teal}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
      <path d="${path(outPast)}" fill="none" stroke="${V5C.orange}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
      <path d="${fcPath}" fill="none" stroke="${V5C.orange}" stroke-width="2.5" stroke-dasharray="1 5" stroke-linejoin="round" stroke-linecap="round"></path>
      ${nowOut != null ? `<circle cx="${nx}" cy="${Y(nowOut).toFixed(1)}" r="4" fill="${V5C.orange}" stroke="${V5C.card}" stroke-width="2"></circle>` : ''}
      ${nowIn.length ? `<circle cx="${nx}" cy="${Y(inside[inside.length - 1].v).toFixed(1)}" r="4" fill="${V5C.teal}" stroke="${V5C.card}" stroke-width="2"></circle>` : ''}
    </svg>`;
    const key = (col, label, dashed) =>
      `<span class="row" style="gap:5px"><span style="width:14px;height:3px;border-radius:2px;background:${dashed ? `repeating-linear-gradient(90deg, ${col} 0 2px, transparent 2px 5px)` : col}"></span>${label}</span>`;
    return `<div class="card" style="padding:14px 14px 10px;display:flex;flex-direction:column;gap:8px"><div class="lbl">Temperature · 24 h back, 24 h ahead</div>${svg}
      <div class="row" style="gap:14px;font-size:11px;font-weight:700;color:${V5C.mute}">${key(V5C.teal, 'Indoors')}${key(V5C.orange, 'Outdoors')}${key(V5C.orange, 'SMHI forecast', true)}</div></div>`;
  }

  _weatherCard() {
    const w = this._s(this._config.weather);
    if (!w) return '';
    const a = w.attributes;
    const wind = a.wind_speed != null ? (a.wind_speed_unit === 'km/h' ? a.wind_speed / 3.6 : a.wind_speed) : null;
    const gust =
      a.wind_gust_speed != null ? (a.wind_speed_unit === 'km/h' ? a.wind_gust_speed / 3.6 : a.wind_gust_speed) : null;
    const dir =
      a.wind_bearing != null ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(a.wind_bearing / 45) % 8] : '';
    const now = Date.now();
    const hourly = this._fcH
      .filter((f) => new Date(f.datetime).getTime() > now)
      .filter((_f, i) => i % 2 === 0)
      .slice(0, 6)
      .map(
        (f) => `
      <div class="col" style="align-items:center;gap:4px;padding:8px 0;border-radius:12px;background:${V5C.chip}"><div class="num" style="font-size:11px;font-weight:700;color:${V5C.mute}">${v5.pad(new Date(f.datetime).getHours())}</div>${v5.wsvg(f.condition)}<div class="s14 b8">${Math.round(f.temperature)}°</div><div style="height:12px;font-size:10px;font-weight:700;color:${V5C.blue}">${(f.precipitation || 0) >= 0.1 ? f.precipitation + ' mm' : ''}</div></div>`,
      )
      .join('');
    const days = this._fcD.slice(0, 5);
    const lo = Math.min(...days.map((d) => d.templow ?? d.temperature)),
      hi = Math.max(...days.map((d) => d.temperature));
    const t0 = v5.dayStart(now);
    const daily = days
      .map((d) => {
        const t = new Date(d.datetime),
          lowv = d.templow ?? d.temperature;
        const name = v5.dayStart(t) === t0 ? 'Today' : t.toLocaleDateString('en-GB', { weekday: 'short' });
        const l = ((lowv - lo) / (hi - lo || 1)) * 100,
          wd = ((d.temperature - lowv) / (hi - lo || 1)) * 100;
        return `<div class="row" style="gap:10px;padding:9px 0;border-top:1px solid ${V5C.line}"><div class="s14 b7" style="width:44px">${name}</div>${v5.wsvg(d.condition)}<div style="width:46px;font-size:11px;font-weight:700;color:${V5C.blue};text-align:right;white-space:nowrap">${(d.precipitation || 0) >= 1 ? Math.round(d.precipitation) + ' mm' : ''}</div><div class="s13 b7 mute num" style="width:28px;text-align:right">${Math.round(lowv)}°</div><div style="position:relative;flex-grow:1;height:6px;border-radius:3px;background:${V5C.card2}"><div style="position:absolute;top:0;bottom:0;left:${l.toFixed(1)}%;width:${Math.max(4, wd).toFixed(1)}%;border-radius:3px;background:linear-gradient(90deg, ${V5C.blue}, ${V5C.orange})"></div></div><div class="s13 b8 num" style="width:28px">${Math.round(d.temperature)}°</div></div>`;
      })
      .join('');
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:14px">
      <div class="row" style="gap:12px">${v5.wsvg(w.state, 44, 1.6)}<div class="col grow" style="gap:1px"><div class="lbl">Weather · SMHI</div><div style="font-size:16px;font-weight:800">${a.temperature != null ? Math.round(a.temperature) + '° · ' : ''}${v5.esc(V5WTEXT[w.state] || w.state)}</div><div class="s12 mute">${wind != null ? `Wind ${Math.round(wind)} m/s ${dir}` : ''}${gust != null ? ` · gusts ${Math.round(gust)}` : ''}${a.humidity != null ? ` · ${a.humidity}% RH` : ''}</div></div></div>
      ${hourly ? `<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px">${hourly}</div>` : ''}
      ${daily ? `<div class="col">${daily}</div>` : ''}</div>`;
  }

  _heatPumpCard() {
    const c = this._config.climate;
    const comp = this._n(c.compressor),
      off = this._n(c.offset) || 0,
      base = this._n(c.base);
    const pn = this._priceNow();
    const status = comp == null ? '' : comp > 0 ? `Running · compressor ${Math.round(comp)}%` : 'Idle';
    const tiles = [
      ['Supply', c.supply],
      ['Return', c.return],
      ['Hot water', c.hot_water],
      ['Brine in', c.brine],
    ]
      .filter(([, id]) => this._s(id))
      .map(
        ([k, id]) =>
          `<div class="stat" style="padding:9px 8px"><div style="font-size:11px;font-weight:700;color:${V5C.mute}" class="ell">${k}</div><div class="num" style="font-size:16px;font-weight:800">${v5.fnum(this._n(id))}°</div></div>`,
      )
      .join('');
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <div class="row" style="justify-content:space-between"><div class="lbl">Heat pump</div><div class="s12 b7" style="color:${comp ? V5C.teal : V5C.mute}">${status}</div></div>
      ${off > 0 ? `<div style="background:${V5C.orangeSoft};border-radius:12px;padding:10px 12px"><div class="s14 b8" style="color:${V5C.orange}">Easing −${off}° while price is high</div>${pn.rank != null ? `<div class="s12" style="color:${V5C.sub}">Price among the ${Math.max(1, Math.round((1 - pn.rank) * 100))}% most expensive today</div>` : ''}</div>` : ''}
      ${
        base != null
          ? `<div class="row" style="gap:10px"><div class="col grow" style="gap:1px"><span class="s14 b7">Thermostat base</span><span class="s12 mute">${off > 0 ? `now −${off}° for price` : 'no price offset now'}</span></div>
        <button class="sq" style="width:40px;height:40px" data-a="base" data-w="down" aria-label="Lower">${v5.svg(V5I.minus, { size: 16, width: 2.5 })}</button>
        <div class="num" style="width:58px;text-align:center;font-size:20px;font-weight:800">${base.toFixed(1)}°</div>
        <button class="sq" style="width:40px;height:40px" data-a="base" data-w="up" aria-label="Raise">${v5.svg(V5I.plus, { size: 16, width: 2.5 })}</button></div>`
          : ''
      }
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${tiles}</div></div>`;
  }
}

if (!customElements.get('house-v5-card')) customElements.define('house-v5-card', HouseV5Card);
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === 'house-v5-card'))
  window.customCards.push({
    type: 'house-v5-card',
    name: 'House v5',
    description: 'Phone dashboard: rooms by floor, security, energy and climate',
  });
console.info(`house-v5 ${V5_VERSION}`);
