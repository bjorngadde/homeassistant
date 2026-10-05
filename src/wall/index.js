/* house-wall — calm 480x480 screen for the Shelly Wall Display in the hall.
 * Modes: day (clock, weather, AI line, room tiles), weather (tap the weather: today in detail),
 * leave (checklist + all lights off), rooms (the rooms that do not fit on Day), door (doorbell camera, opens by itself) and night (dim clock, tap to wake).
 * Deliberately has NO alarm controls: Alarmo has no PIN, so arming/disarming stays on the phones.
 * Built to be cheap on weak hardware: re-renders only when a watched entity changes,
 * clock ticks once a minute, no shadows, blur or live video streams (the only animation is the alarm screen).
 * Alarm entry delay / triggered: full-screen red view with countdown that overrides every mode, doorbell included.
 * The layout is designed for 480x480 and scaled down to whatever space the browser really gives it
 * (status bars, leftover header space, pixel density), so it never needs to scroll.
 * Day screen: room tiles get small icons and are taller, except while the school lunch card is showing (it needs the space).
 */

import { HouseWallCard } from './card.js';
import { WALL_VERSION } from './constants.js';

if (!customElements.get('house-wall-card')) customElements.define('house-wall-card', HouseWallCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'house-wall-card')) {
  window.customCards.push({
    type: 'house-wall-card',
    name: 'House wall',
    description:
      'Calm 480x480 wall display: clock, weather, AI line, room lights, leaving checklist, doorbell. No alarm controls.',
  });
}
console.info('house-wall ' + WALL_VERSION);
