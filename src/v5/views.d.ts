// Tells the type checker that the screen methods in views/ are part of HouseV5Card (card.js mixes them in).
import type { climateView } from './views/climate.js';
import type { energyView } from './views/energy.js';
import type { homeView } from './views/home.js';
import type { roomView } from './views/room.js';
import type { securityView } from './views/security.js';
import type { vacuumView } from './views/vacuum.js';

type Views = typeof homeView &
  typeof roomView &
  typeof vacuumView &
  typeof securityView &
  typeof energyView &
  typeof climateView;

declare module './card.js' {
  interface HouseV5Card extends Views {
    /** map image URL being loaded; set only by views/vacuum.js */
    _mapUrl?: string;
  }
}
