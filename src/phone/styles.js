/* house-phone: the stylesheet, written into the shadow root on every render. */

import { COLOR } from './constants.js';

export const CSS = `
:host { display: block; }
* { box-sizing: border-box; }
.root { min-height: 100vh; background: ${COLOR.bg}; color: ${COLOR.fg}; font-family: Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
.page { max-width: 560px; margin: 0 auto; padding: 18px 16px calc(96px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; }
button { all: unset; cursor: pointer; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
button:focus-visible { outline: 2px solid ${COLOR.teal}; outline-offset: 2px; border-radius: 10px; }
.row { display: flex; align-items: center; }
.col { display: flex; flex-direction: column; }
.grow { flex-grow: 1; min-width: 0; }
.ell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.num { font-variant-numeric: tabular-nums; }
.card { background: ${COLOR.card}; border: 1px solid ${COLOR.line}; border-radius: 18px; }
.pad { padding: 14px 16px; }
.lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: ${COLOR.mute}; text-transform: uppercase; }
.sect { display: flex; justify-content: space-between; align-items: center; padding: 6px 4px 0; min-height: 30px; }
.sect .lbl { font-size: 11px; }
.link { font-size: 13px; font-weight: 700; color: ${COLOR.teal}; padding: 8px 4px; }
.link.off { color: rgb(74,86,112); }
.head { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px; }
.h1 { font-size: 22px; font-weight: 800; }
.clock { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
.s12 { font-size: 12px; } .s13 { font-size: 13px; } .s14 { font-size: 14px; } .s15 { font-size: 15px; }
.b7 { font-weight: 700; } .b8 { font-weight: 800; }
.mute { color: ${COLOR.mute}; } .dimc { color: ${COLOR.dim}; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 5px; background: ${COLOR.card2}; border-radius: 8px; padding: 5px 8px; font-size: 12px; font-weight: 700; max-width: 100%; }
.chip.warn { background: ${COLOR.redBg}; color: ${COLOR.redSoft}; }
.chip.next { background: rgba(61,214,196,0.12); }
.grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.tile { display: flex; align-items: stretch; background: ${COLOR.card}; border: 1px solid ${COLOR.line}; border-radius: 18px; overflow: hidden; min-height: 76px; }
.tile.lit { background: ${COLOR.litBg}; border-color: ${COLOR.litLine}; }
.tile .tg { width: 54px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.tile .ic { width: 40px; height: 40px; }
.ic { width: 42px; height: 42px; border-radius: 12px; background: ${COLOR.card2}; color: ${COLOR.mute}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lit .ic, .ic.lit { background: ${COLOR.amber}; color: ${COLOR.litBg}; }
.tile .op { flex-grow: 1; min-width: 0; display: flex; align-items: center; gap: 2px; padding: 12px 6px 12px 0; }
.tile .nm { font-size: 14px; font-weight: 700; }
.tile .sb { font-size: 13px; color: ${COLOR.mute}; }
.sq { width: 44px; height: 44px; border-radius: 10px; background: ${COLOR.card2}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sq.pri { background: ${COLOR.teal}; color: ${COLOR.bg}; }
.list > .li { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-top: 1px solid ${COLOR.line}; }
.list > .li:first-child { border-top: 0; }
.dot { width: 10px; height: 10px; border-radius: 5px; flex-shrink: 0; }
.sw { display: block; position: relative; width: 44px; height: 26px; border-radius: 8px; background: ${COLOR.off}; flex-shrink: 0; transition: background 150ms; }
.sw i { display: block; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 6px; background: ${COLOR.mute}; transition: left 150ms; }
.sw.on { background: ${COLOR.teal}; } .sw.on i { left: 21px; background: ${COLOR.bg}; }
.swb { padding: 6px 0 6px 6px; flex-shrink: 0; }
.segs { display: flex; gap: 3px; }
.scenes { display: flex; flex-wrap: wrap; gap: 8px; }
.scn { flex: 1 1 auto; min-width: 72px; text-align: center; border-radius: 12px; padding: 12px 14px; font-size: 14px; font-weight: 800; background: ${COLOR.card}; border: 1px solid ${COLOR.line}; color: ${COLOR.fg}; }
.scn.on { background: ${COLOR.amber}; border-color: ${COLOR.amber}; color: ${COLOR.litBg}; }
.segs button { flex: 1 1 0; display: flex; align-items: center; }
.segs button span { display: block; width: 100%; border-radius: 3px; background: ${COLOR.off}; }
.segs button.on span { background: ${COLOR.amber}; }
.segs.big { height: 44px; } .segs.big button span { height: 40px; border-radius: 6px; }
.segs.small { height: 28px; padding-left: 46px; gap: 2px; } .segs.small button span { height: 8px; }
.hold { position: relative; overflow: hidden; flex: 1 1 0; border-radius: 14px; background: ${COLOR.card2}; padding: 16px 8px; text-align: center; user-select: none; -webkit-user-select: none; touch-action: none; }
.hold .fill { position: absolute; top: 0; left: 0; bottom: 0; width: 0; }
.hold .tx { position: relative; display: flex; flex-direction: column; gap: 1px; }
.person { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.person b { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; }
.bars { display: flex; align-items: flex-end; }
.cam { position: relative; border-radius: 18px; overflow: hidden; aspect-ratio: 16 / 9; background: ${COLOR.card2}; }
.cam .slot, .thumb .slot { position: absolute; inset: 0; }
.cam img, .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cam .over { position: absolute; left: 0; right: 0; bottom: 0; padding: 24px 12px 10px; background: linear-gradient(0deg, rgba(0,0,0,0.65), rgba(0,0,0,0)); }
.thumbs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.thumb { position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 4 / 3; background: ${COLOR.card2}; }
.tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 5; background: ${COLOR.tab}; border-top: 1px solid rgba(255,255,255,0.07); padding: 8px 10px calc(10px + env(safe-area-inset-bottom)); }
.tabs .in { max-width: 560px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.tabs button { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 0; color: rgb(135,147,170); }
.tabs button .pill { position: relative; width: 56px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.tabs button.sel { color: ${COLOR.teal}; } .tabs button.sel .pill { background: ${COLOR.tealSoft}; }
.tabs .badge { position: absolute; top: 4px; right: 12px; width: 8px; height: 8px; border-radius: 4px; background: ${COLOR.red}; border: 2px solid ${COLOR.tab}; }
.tabs .t { font-size: 11px; font-weight: 700; }
.stat { background: ${COLOR.card2}; border-radius: 12px; padding: 9px 10px; display: flex; flex-direction: column; gap: 2px; }
.vrooms { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.vroom { position: relative; text-align: center; border-radius: 12px; padding: 13px 6px; font-size: 14px; font-weight: 800; background: ${COLOR.card}; border: 1px solid ${COLOR.line}; color: ${COLOR.fg}; }
.vroom.on { background: ${COLOR.teal}; border-color: ${COLOR.teal}; color: ${COLOR.bg}; }
.vroom .now { position: absolute; top: 6px; right: 7px; width: 7px; height: 7px; border-radius: 4px; background: ${COLOR.amber}; }
.vbtn { flex: 1 1 0; display: flex; align-items: center; justify-content: center; gap: 7px; border-radius: 12px; padding: 13px 10px; font-size: 14px; font-weight: 800; background: ${COLOR.card2}; color: ${COLOR.fg}; }
.vbtn.pri { background: ${COLOR.teal}; color: ${COLOR.bg}; }
.vbtn.dis { background: ${COLOR.card}; border: 1px solid ${COLOR.line}; color: ${COLOR.dim}; pointer-events: none; }
.vmap { position: relative; display: flex; justify-content: center; padding: 12px; }
.vmap .slot { width: 100%; display: flex; justify-content: center; min-height: 160px; }
.vmap img { display: block; max-width: 100%; max-height: 62vh; object-fit: contain; }
.bar { height: 6px; border-radius: 3px; background: ${COLOR.off}; overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 3px; }
.empty { padding: 14px 16px; color: ${COLOR.mute}; font-size: 13px; }
`;
