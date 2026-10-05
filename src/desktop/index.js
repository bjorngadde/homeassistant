/* house-desktop — the phone dashboard laid out for big screens: tabs on top, an overview of the whole house
 * on Home, and the other screens in columns. Takes the same config as house-phone-card. */

import { HouseDesktopCard } from './card.js';

if (!customElements.get('house-desktop-card')) customElements.define('house-desktop-card', HouseDesktopCard);
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === 'house-desktop-card'))
  window.customCards.push({
    type: 'house-desktop-card',
    name: 'House desktop',
    description: 'The phone dashboard for big screens: overview of the whole house, tabs on top, columns',
  });
