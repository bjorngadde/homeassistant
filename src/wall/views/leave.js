/* house-wall: the "Leaving?" checklist with "Turn off all lights".
 * Methods of HouseWallCard, mixed into its prototype in ../card.js; `this` is the card. */

import { W } from '../helpers.js';
import { ICON } from '../icons.js';

/** @satisfies {ThisType<import('../card.js').HouseWallCard>} */
export const leaveView = {
  _row(good, name, sub, act, info) {
    return `<div class="row"><div class="dot${info ? ' info' : good ? '' : ' bad'}">${W.svg(info ? ICON.shield : good ? ICON.check : ICON.warn, 16, null, info ? 2 : 3)}</div>
      <div class="rt"><div class="rn">${W.esc(name)}</div><div class="rs">${W.esc(sub)}</div></div>${act || ''}</div>`;
  },

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
  },
};
