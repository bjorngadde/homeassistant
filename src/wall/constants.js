/* house-wall: version and default config (timings stay here, everything house-specific comes from the card config). */

export const WALL_VERSION = __VERSION__; // injected by scripts/build.mjs from package.json
// Everything specific to one house (entity ids, area ids, names) comes from the card config; see config.example.yaml.
// Timings stay here as defaults and can be overridden in the card config.
export const WALL_DEFAULTS = {
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
