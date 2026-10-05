/* house-wall: the full-screen alarm warning (entry delay countdown / triggered), informational only.
 * Methods of HouseWallCard, mixed into its prototype in ../card.js; `this` is the card. */

import { W } from '../helpers.js';
import { ICON } from '../icons.js';

/** @satisfies {ThisType<import('../card.js').HouseWallCard>} */
export const alarmView = {
  /* ---------- alarm (entry delay / triggered) ---------- */
  _alarmLeft(al) {
    const a = al.attributes || {};
    const exp = a.expiration ? Date.parse(a.expiration) : NaN;
    const delay = Number(a.delay) > 0 ? Number(a.delay) : this._config.entry_delay || 30;
    const end = !isNaN(exp) ? exp : Date.parse(al.last_changed) + delay * 1000;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  },

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
      if (el) el.textContent = String(this._alarmLeft(al));
    }, 250);
  },

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
  },
};
