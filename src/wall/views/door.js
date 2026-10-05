/* house-wall: the doorbell screen (camera snapshots, opens by itself).
 * Methods of HouseWallCard, mixed into its prototype in ../card.js; `this` is the card. */

import { W } from '../helpers.js';
import { ICON } from '../icons.js';

/** @satisfies {ThisType<import('../card.js').HouseWallCard>} */
export const doorView = {
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
  },
};
