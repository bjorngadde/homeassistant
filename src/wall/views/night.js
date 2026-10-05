/* house-wall: the dim night clock (tap to wake).
 * Methods of HouseWallCard, mixed into its prototype in ../card.js; `this` is the card. */

import { W } from '../helpers.js';
import { ICON, WX_TEXT } from '../icons.js';

/** @satisfies {ThisType<import('../card.js').HouseWallCard>} */
export const nightView = {
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
  },
};
