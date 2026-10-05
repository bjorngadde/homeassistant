/* house-v5 — phone dashboard card: Home, Security, Energy, Climate, a screen per room and one for the vacuum.
 * Rooms and lights come from floors, areas and the entity registry. An entity is left out
 * when it is hidden (the "Visible" toggle), is a config/diagnostic entity, or carries the
 * do_not_operate label. Bulk actions ("All off", room toggles) only ever touch lights.
 */

import { HouseV5Card } from './card.js';
import { V5_VERSION } from './constants.js';

if (!customElements.get('house-v5-card')) customElements.define('house-v5-card', HouseV5Card);
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === 'house-v5-card'))
  window.customCards.push({
    type: 'house-v5-card',
    name: 'House v5',
    description: 'Phone dashboard: rooms by floor, security, energy and climate',
  });
console.info(`house-v5 ${V5_VERSION}`);
