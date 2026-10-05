/* house-desktop: the phone card laid out for big screens (a browser, a tablet, the Overview dashboard).
 * It is the phone card with a different layout: same config, same data, same screens and actions. What differs:
 * the stylesheet (styles.js: side navigation, columns), a wrapper class per screen, and the Home screen, which
 * becomes an overview of the whole house. On a narrow card everything falls back to the phone layout. */

import { HousePhoneCard } from '../phone/card.js';
import { CSS } from '../phone/styles.js';
import { DESKTOP_CSS } from './styles.js';

export class HouseDesktopCard extends HousePhoneCard {
  _styles() {
    return CSS + DESKTOP_CSS;
  }

  _view() {
    const kind = this._tab === 'home' && !this._room ? 'home' : 'flow';
    return `<div class="dk dk-${kind}">${super._view()}</div>`;
  }

  /** Home as an overview: today and what is on (left), rooms by floor (middle), energy, weather and alarm (right). */
  _homeView() {
    const [greet, date] = this._greeting();
    return `<div class="ov">
      <div class="ov-head">${this._header(greet, date)}</div>
      <div class="ov-a">${this._alarmBanner()}${this._todayCard()}${this._activeNow()}</div>
      <div class="ov-b">${this._floorsHtml()}</div>
      <div class="ov-c">${this._energyGlance()}${this._weatherCard()}${this._alarmBlock()}</div>
    </div>`;
  }
}
