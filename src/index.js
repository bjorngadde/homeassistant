/* house-cards: the one file HACS installs. It registers both cards:
 *   custom:house-phone-card phone dashboard (src/phone/)
 *   custom:house-wall-card  hall wall display (src/wall/)
 * One file means one dashboard resource, so HACS's ?hacstag= cache busting reaches both cards.
 */
import './phone/index.js';
import './wall/index.js';
