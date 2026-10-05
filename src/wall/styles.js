/* house-wall: the stylesheet, written into the shadow root once. */

export const CSS = `
:host{display:block;position:relative;overflow:hidden;--bg:rgb(14,19,32);--card:rgb(24,32,51);--card2:rgb(34,44,68);--line:rgba(255,255,255,0.06);--fg:rgb(230,234,242);--mut:rgb(154,166,188);--dim:rgb(111,124,148);
--teal:rgb(61,214,196);--amber:rgb(246,196,83);--amberbg:rgb(42,36,22);--red:rgb(255,107,107);--redfg:rgb(255,156,156);--orange:rgb(255,178,122);--blue:rgb(143,184,255)}
*{box-sizing:border-box}
button{all:unset;cursor:pointer;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.root{position:absolute;left:0;top:0;width:480px;height:480px;transform-origin:0 0;overflow:hidden;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Roboto,sans-serif;contain:strict;user-select:none;-webkit-user-select:none}
.root.night{background:rgb(5,7,11)}
.pane{position:absolute;inset:0;padding:18px 18px 16px;display:flex;flex-direction:column;gap:10px}
.pane>*{flex-shrink:0}.pane>.grow{flex-shrink:1;min-height:0}
.top{display:flex;justify-content:space-between;align-items:flex-start}
.clock{font-size:64px;font-weight:700;line-height:.95;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.date{font-size:15px;font-weight:600;color:var(--mut);margin-top:6px}
.wx{display:flex;align-items:center;gap:10px;padding-top:4px}
.wxt{display:flex;flex-direction:column;align-items:flex-end}
.temp{font-size:34px;font-weight:700;line-height:1}
.hint{font-size:13px;font-weight:700;color:var(--blue);margin-top:2px;white-space:nowrap}
.head{font-size:17px;font-weight:600;line-height:1.27;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;gap:6px;flex-wrap:nowrap;overflow:hidden;min-height:29px}
.chip{flex:0 1 auto;min-width:0;background:var(--card2);border-radius:8px;padding:6px 9px;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip b{color:var(--mut)}
.chip.soon{background:rgba(61,214,196,0.14)}.chip.soon b{color:var(--teal)}
.chip.cheap{background:rgba(61,214,196,0.14);color:var(--teal)}
.chip.dear{background:rgba(255,159,67,0.14);color:var(--orange)}
.banner{display:flex;align-items:center;gap:10px;background:rgba(255,107,107,0.16);border:1px solid rgba(255,107,107,0.5);color:var(--redfg);border-radius:12px;padding:8px 12px;font-size:15px;font-weight:800}
.grow{flex-grow:1}
.lunch{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px}
.lunch .ib{background:rgba(61,214,196,0.18);color:var(--teal);flex-shrink:0}
.ll{font-size:13px;font-weight:700;color:var(--teal)}
.ld{font-size:20px;font-weight:800;line-height:1.2;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lv{font-size:13px;color:var(--mut);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.grid2 .tile{height:72px;padding:10px 14px}
.tile{height:60px;border-radius:14px;background:var(--card);border:1px solid var(--line);padding:8px 10px;display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0}
.grid.icons .tile{height:74px;justify-content:space-between}
.grid.icons .tile.lv{justify-content:center}
.tile.on{background:var(--amberbg);border-color:rgba(246,196,83,0.35)}
.tile.busy{opacity:.55}
.tile.wide{grid-column:span 2;padding:8px 12px}
.ti{width:22px;height:22px;border-radius:7px;background:var(--card2);color:var(--mut);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tile.on .ti{background:var(--amber);color:var(--amberbg)}
.tx{min-width:0}
.ib{width:34px;height:34px;border-radius:10px;background:var(--card2);display:flex;align-items:center;justify-content:center;color:var(--mut)}
.on .ib{background:var(--amber);color:var(--amberbg)}
.tn{font-size:14px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile.on .tn{color:var(--amber)}
.grid2 .tn{font-size:16px}
.ts{font-size:12px;line-height:1.2;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ts.warn{color:var(--redfg)}
.wt{display:flex;align-items:center;gap:8px;color:var(--teal)}
.badges{display:flex;gap:4px}
.bdg{width:24px;height:24px;border-radius:8px;background:var(--card2);color:var(--dim);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}
.bdg.home{background:rgba(61,214,196,0.18);color:var(--teal)}
.wn{font-size:17px;font-weight:800;color:var(--fg);flex-grow:1}
.ws{font-size:12px;line-height:1.2;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lh{display:flex;justify-content:space-between;align-items:baseline}
.lt{font-size:30px;font-weight:800}
.link{font-size:15px;font-weight:700;color:var(--teal);padding:8px 4px}
.list{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:0 14px;height:52px;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.dot{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(61,214,196,0.18);color:var(--teal)}
.dot.bad{background:rgba(255,107,107,0.18);color:var(--red)}
.dot.info{background:var(--card2);color:var(--mut)}
.rt{display:flex;flex-direction:column;flex-grow:1;min-width:0}
.rn{font-size:16px;font-weight:700}
.rs{font-size:13px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bad+.rt .rs{color:var(--redfg)}
.act{flex-shrink:0;background:var(--card2);border-radius:10px;padding:10px 14px;font-size:14px;font-weight:800}
.big{height:80px;border-radius:18px;background:var(--card);color:var(--teal);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center}
.big.lit{background:var(--amber);color:var(--amberbg)}
.big .l1{font-size:22px;font-weight:800}.big .l2{font-size:13px;opacity:.8}
.alarmv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:28px;text-align:center;color:rgb(255,255,255);background:rgb(150,24,30);animation:apulse 1s ease-in-out infinite alternate}
.alarmv.hot{background:rgb(200,28,36);animation-duration:.5s}
@keyframes apulse{from{background-color:rgb(110,16,22)}to{background-color:rgb(205,30,38)}}
.alarmv .al{font-size:18px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;display:flex;align-items:center;gap:10px}
.alarmv .an{font-size:150px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.04em}
.alarmv .at{font-size:30px;font-weight:800;line-height:1.15}
.alarmv .as{font-size:17px;font-weight:600;opacity:.85}
.alarmv .ao{margin-top:10px;font-size:16px;font-weight:700;background:rgba(0,0,0,0.25);border-radius:10px;padding:8px 14px}
.door{position:absolute;inset:0;display:flex;flex-direction:column;background:rgb(0,0,0)}
.cam{position:relative;flex:0 0 74%;background:rgb(30,36,50);overflow:hidden}
.cam img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.live{position:absolute;top:14px;left:14px;display:flex;align-items:center;gap:6px;background:rgba(14,19,32,0.75);border-radius:8px;padding:6px 10px;font-size:13px;font-weight:800;letter-spacing:.06em}
.live i{width:8px;height:8px;border-radius:4px;background:var(--red)}
.cap{position:absolute;left:0;right:0;bottom:0;padding:30px 16px 12px;background:linear-gradient(0deg,rgba(0,0,0,0.7),rgba(0,0,0,0))}
.cap .t{font-size:24px;font-weight:800}.cap .s{font-size:14px;color:rgb(200,208,222)}
.dbtn{flex-grow:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;background:var(--bg)}
.dbtn button{border-radius:16px;background:var(--card2);display:flex;align-items:center;justify-content:center;gap:10px;font-size:17px;font-weight:800}
.dbtn button.lit{background:var(--amber);color:var(--amberbg)}
.nightp{position:absolute;inset:0;padding:26px;display:flex;flex-direction:column;justify-content:space-between;color:rgb(92,102,122)}
.nclock{font-size:104px;font-weight:600;line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.nsub{font-size:16px;font-weight:600;color:rgb(62,70,88);margin-top:4px}
.nst{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700}
.nst.bad{color:rgb(170,90,90)}
.nwake{font-size:13px;color:rgb(62,70,88);margin-top:8px}
.wnow{display:flex;align-items:center;gap:14px;color:var(--mut)}
.wbig{font-size:44px;font-weight:700;line-height:1;color:var(--fg)}.wbig span{font-size:18px;font-weight:600;color:var(--mut);margin-left:8px}
.wsub{font-size:13px;color:var(--mut);margin-top:5px}
.wsum{font-size:14px;font-weight:600;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:9px 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wsum b{color:var(--blue)}
.hours{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px 6px}
.hr{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--mut)}
.hr .t{font-size:16px;font-weight:700;color:var(--fg)}
.pb{width:14px;height:24px;display:flex;align-items:flex-end;background:rgba(143,184,255,0.08);border-radius:3px;overflow:hidden}
.pb i{display:block;width:100%;background:var(--blue)}
.hr .mm{font-size:11px;color:var(--blue);min-height:13px}
.days{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.dayr{display:flex;align-items:center;gap:12px;height:46px;padding:0 14px;border-top:1px solid var(--line);color:var(--mut)}.dayr:first-child{border-top:0}
.dayr .dn{width:86px;font-size:15px;font-weight:700;color:var(--fg)}
.dayr .dt{font-size:15px;font-weight:700;color:var(--fg);min-width:70px}
.dayr .dx{font-size:13px;margin-left:auto;white-space:nowrap}
`;
