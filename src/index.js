/* house-cards: the one file HACS installs. It registers both cards:
 *   custom:house-v5-card    phone dashboard (src/v5/)
 *   custom:house-wall-card  hall wall display (src/wall/)
 * One file means one dashboard resource, so HACS's ?hacstag= cache busting reaches both cards.
 */
import './v5/index.js';
import './wall/index.js';
