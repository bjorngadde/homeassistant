/* house-desktop: layout for big screens, added after the phone card's stylesheet. Everything here sits inside
 * container queries on the card's own width, so a narrow card (a phone opening this dashboard) keeps the phone
 * layout. Breakpoints: 900px (tab row on top, two-column overview, tabs in columns), 1300px (three columns). */

import { COLOR } from '../phone/constants.js';

export const DESKTOP_CSS = `
:host { container-type: inline-size; }

@container (min-width: 900px) {
  /* the bottom tab bar becomes a row of tabs on top (Home Assistant's own sidebar is already on the left) */
  .root { display: flex; flex-direction: column; }
  .tabs { order: -1; position: static; border-top: 0; border-bottom: 1px solid ${COLOR.line}; padding: 10px 0; }
  .tabs .in { max-width: 1680px; padding: 0 28px; display: flex; gap: 6px; }
  .tabs button { flex-direction: row; gap: 8px; padding: 8px 14px 8px 10px; border-radius: 10px; }
  .tabs button.sel { background: ${COLOR.tealSoft}; }
  .tabs button .pill, .tabs button.sel .pill { width: auto; height: auto; background: none; }
  .tabs .badge { top: -3px; right: -5px; }
  .tabs .t { font-size: 14px; }

  .page { max-width: 1680px; padding: 24px 28px 40px; }
  .grid2 { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  .thumbs { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .vmap img { max-height: 70vh; }

  /* Home: an overview of the whole house */
  .dk-home .page { display: block; }
  .ov { display: grid; grid-template-columns: minmax(300px, 1fr) minmax(0, 1.6fr); gap: 20px; align-items: start; }
  .ov > div { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .ov .ov-head { grid-column: 1 / -1; }
  .ov .ov-a { grid-column: 1; }
  .ov .ov-c { grid-column: 1; }
  .ov .ov-b { grid-column: 2; grid-row: 2 / span 2; }
  /* the price box was laid out for a phone: let the bars move under the price in a narrow column */
  .ov button[data-v="energy"] > .row { flex-wrap: wrap; }

  /* the other screens (Security, Energy, Climate, a room, the vacuum): cards flow into columns */
  .dk-flow .page { display: block; column-width: 400px; column-gap: 20px; }
  .dk-flow .page > * { break-inside: avoid; margin-bottom: 12px; }
  /* buttons reset with all: unset are inline and, even as blocks, only as wide as their content; the main camera's
     content is all absolutely positioned, so it collapsed to nothing. The phone's flex page stretched them. */
  .dk-flow .page > button:not(.row) { display: block; width: 100%; }
  .dk-flow .page > .head { column-span: all; margin-bottom: 16px; }
  .dk-flow .page > .row { column-span: all; } /* a room's back link and title */
  .dk-flow .page > .sect { break-after: avoid; }
}

@container (min-width: 1300px) {
  .ov { grid-template-columns: minmax(300px, 1fr) minmax(0, 2fr) minmax(300px, 1fr); }
  .ov .ov-a { grid-column: 1; grid-row: 2; }
  .ov .ov-b { grid-column: 2; grid-row: 2; }
  .ov .ov-c { grid-column: 3; grid-row: 2; }
}
`;
