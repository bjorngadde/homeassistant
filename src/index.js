/* house-cards: the one file HACS installs. It registers all three cards:
 *   custom:house-phone-card   phone dashboard (src/phone/)
 *   custom:house-desktop-card the phone dashboard for big screens (src/desktop/)
 *   custom:house-wall-card    hall wall display (src/wall/)
 * One file means one dashboard resource, so HACS's ?hacstag= cache busting reaches every card.
 */
import './phone/index.js';
import './desktop/index.js';
import './wall/index.js';
