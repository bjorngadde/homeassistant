// Tells the type checker that the mode methods in views/ are part of HouseWallCard (card.js mixes them in).
import type { alarmView } from './views/alarm.js';
import type { dayView } from './views/day.js';
import type { doorView } from './views/door.js';
import type { leaveView } from './views/leave.js';
import type { nightView } from './views/night.js';
import type { roomsView } from './views/rooms.js';
import type { weatherView } from './views/weather.js';

type Views = typeof dayView &
  typeof weatherView &
  typeof leaveView &
  typeof roomsView &
  typeof doorView &
  typeof nightView &
  typeof alarmView;

declare module './card.js' {
  interface HouseWallCard extends Views {
    /** whether the Day screen currently shows the school lunch card; set by views/day.js, read by the clock tick */
    _lunchShown?: boolean;
  }
}
