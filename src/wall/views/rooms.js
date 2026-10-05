/* house-wall: the "More rooms" screen: areas with lights that have no tile on Day.
 * Methods of HouseWallCard, mixed into its prototype in ../card.js; `this` is the card. */

import { W } from '../helpers.js';

/** @satisfies {ThisType<import('../card.js').HouseWallCard>} */
export const roomsView = {
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
  },
};
