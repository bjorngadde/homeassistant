/* house-phone — phone dashboard card: Home, Security, Energy, Climate, a screen per room and one for the vacuum.
 * Rooms and lights come from floors, areas and the entity registry. An entity is left out
 * when it is hidden (the "Visible" toggle), is a config/diagnostic entity, or carries the
 * do_not_operate label. Bulk actions ("All off", room toggles) only ever touch lights.
 */

import { HousePhoneCard } from './card.js';
import { PHONE_VERSION } from './constants.js';

if (!customElements.get('house-phone-card')) customElements.define('house-phone-card', HousePhoneCard);
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === 'house-phone-card'))
  window.customCards.push({
    type: 'house-phone-card',
    name: 'House phone',
    description: 'Phone dashboard: rooms by floor, security, energy and climate',
  });
console.info(`house-phone ${PHONE_VERSION}`);
