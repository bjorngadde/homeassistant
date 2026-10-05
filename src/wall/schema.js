/* house-wall: the shape of the card config, checked in setConfig (see ../shared/config.js for the notation).
 * Every key the card reads is listed here; config.example.yaml documents them. */

const S = 'string';
const N = 'number';
const WINDOW = { from: S, to: S };

export const WALL_SCHEMA = {
  headline: [S],
  weather: S,
  outdoor: S,
  price: S,
  calendars: [S],
  school: S,
  lunch: WINDOW,
  alarm: S,
  entry_delay: N,
  vacuum: S,
  people: [{ entity: S, short: S, name: S }],
  doors: [{ entity: S, name: S }],
  tiles: [{ name: S, entity: S, area: S, icon: S, door: S }],
  more_exclude: [S],
  more_order: [S],
  doorbell: { camera: S, ring: S, person: S, light: S, close_after: N },
  night: { ...WINDOW, idle: N },
  leave_idle: N,
  exclude: [S],
  all_off_exclude: [S],
};
