/* house-phone: version, default config, palette, icons and weather maps. */

export const PHONE_VERSION = __VERSION__; // injected by scripts/build.mjs from package.json
export const DNO = 'do_not_operate';

// Everything specific to one house (entity ids, area ids, names, vacuum segment ids) comes from the card config;
// see config.example.yaml. The empty values below only keep the code from tripping over missing keys.
export const PHONE_DEFAULTS = {
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
export const COLOR = {
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

export const ICON = {
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
export const WX_PATHS = {
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
export const WX_KIND = {
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
export const WX_TEXT = {
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
