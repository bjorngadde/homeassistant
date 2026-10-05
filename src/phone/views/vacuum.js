/* house-phone: the vacuum's own screen: map, room picker, last run, maintenance.
 * Methods of HousePhoneCard, mixed into its prototype in ../card.js; `this` is the card. */

import { COLOR, ICON } from '../constants.js';
import { P } from '../helpers.js';

/** @satisfies {ThisType<import('../card.js').HousePhoneCard>} */
export const vacuumView = {
  /* VACUUM (the vacuum's own screen) */
  _loadMap(url) {
    if (!url || this._mapUrl === url) return;
    this._mapUrl = url;
    const img = new Image();
    img.alt = 'Map of the last cleaning run';
    img.onload = () => {
      if (this._mapUrl === url) {
        this._imgs.vacmap = img;
        this._placeCams();
      }
    };
    img.src = url;
  },
  _vacuumView() {
    const c = this._config.vac,
      vs = this._s(this._config.vacuum);
    const back = `<div class="row" style="justify-content:space-between"><button class="row s15 b7" style="gap:2px;padding:6px 10px 6px 0;color:${COLOR.teal}" data-a="back">${P.svg(ICON.chevL, { width: 2.2 })}Back</button><div class="s15 b7 mute num">${P.hm(new Date())}</div></div>`;
    if (!vs)
      return `<div class="page">${back}<div class="card empty">${P.esc(this._config.vacuum)} is not available.</div></div>`;
    const id = vs.entity_id,
      st = vs.state,
      name = vs.attributes.friendly_name || 'Vacuum';
    const busy = st === 'cleaning' || st === 'returning';
    const running = busy || st === 'paused' || st === 'error';
    const bat = vs.attributes.battery_level;
    const title =
      {
        cleaning: 'Cleaning',
        returning: 'Returning to dock',
        paused: 'Paused',
        error: 'Needs attention',
        docked: 'Docked',
        idle: 'Idle',
        unavailable: 'Unavailable',
      }[st] || st;
    const roomOf = (seg) => c.rooms.find((r) => String(r.segment) === String(seg));
    const curRoomS = this._s(c.room_id);
    const curRoom = st === 'cleaning' && curRoomS ? roomOf(curRoomS.state) : null;
    const curMin = this._n(c.cur_duration),
      curArea = this._n(c.cur_area);
    const sub = [
      title,
      curRoom ? 'in ' + curRoom.name : '',
      st === 'error' && vs.attributes.status ? vs.attributes.status : '',
      bat != null ? `battery ${bat}%` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const err = st === 'error';

    // controls
    const vb = (svc, label, icon, pri) =>
      `<button class="vbtn${pri ? ' pri' : ''}" data-a="vac" data-v="${id}" data-w="${svc}">${icon ? P.svg(icon, { size: 16, width: 2.5 }) : ''}${label}</button>`;
    let ctrl;
    if (st === 'cleaning') ctrl = vb('pause', 'Pause', ICON.pause, true) + vb('return_to_base', 'Dock', ICON.home);
    else if (st === 'paused' || err)
      ctrl = vb('start', 'Resume', ICON.play, true) + vb('return_to_base', 'Dock', ICON.home);
    else if (st === 'returning') ctrl = vb('stop', 'Stop', ICON.pause, false);
    else ctrl = vb('start', 'Clean all', ICON.play, true) + vb('clean_spot', 'Spot', ICON.target);

    // rooms
    const sel = this._vacSel;
    const roomsHtml = c.rooms
      .map(
        (r) =>
          `<button class="vroom${sel.includes(r.segment) ? ' on' : ''}" data-a="vac-room" data-v="${r.segment}" aria-pressed="${sel.includes(r.segment)}">${curRoom === r ? '<span class="now"></span>' : ''}${P.esc(r.name)}</button>`,
      )
      .join('');
    const canGo = sel.length && !busy;
    const goLabel = !sel.length
      ? 'Pick rooms to clean'
      : busy
        ? 'Wait until she is back'
        : sel.length === 1
          ? `Clean ${roomOf(sel[0]).name.toLowerCase()}`
          : `Clean ${sel.length} rooms`;

    // map + run summary
    const ms = this._s(c.map);
    if (ms && ms.attributes.entity_picture)
      this._loadMap(ms.attributes.entity_picture + '&v=' + encodeURIComponent(ms.state));
    let run = '';
    if (running) {
      run = [
        `This run · since ${P.hm(vs.last_changed)}`,
        curMin != null ? P.mins(curMin) : '',
        curArea != null ? Math.round(curArea) + ' m²' : '',
      ]
        .filter(Boolean)
        .join(' · ');
    } else {
      const ls = this._s(c.last_start),
        ld = this._n(c.last_duration),
        la = this._n(c.last_area);
      if (ls && !isNaN(Date.parse(ls.state)))
        run = [`Last run · ${P.when(ls.state)}`, ld != null ? P.mins(ld) : '', la != null ? Math.round(la) + ' m²' : '']
          .filter(Boolean)
          .join(' · ');
    }
    const mapUpd = ms && !isNaN(Date.parse(ms.state)) ? `updated ${P.when(ms.state)}` : '';

    // maintenance
    const parts = c.parts
      .filter((p) => this._s(p.sensor))
      .map((p) => {
        const sec = this._n(p.sensor);
        const hrs = sec == null ? null : sec / 3600;
        const pct = hrs == null ? 0 : Math.max(0, Math.min(100, Math.round((hrs / p.hours) * 100)));
        const col = pct <= 10 ? COLOR.red : pct <= 25 ? COLOR.orangeBar : COLOR.teal;
        const left = hrs == null ? '–' : hrs <= 0 ? 'replace now' : `${Math.round(hrs)} h left`;
        const reset = this._s(p.reset)
          ? `<button class="hold" data-hold="press" data-v="${p.reset}" style="flex:0 0 auto;padding:8px 12px;border-radius:10px" aria-label="Hold to reset ${P.esc(p.name)}"><span class="fill" style="background:rgba(61,214,196,0.55)"></span><span class="tx"><span class="s13 b7">Reset</span><small style="font-size:10px;color:${COLOR.mute}">hold</small></span></button>`
          : '';
        return `<div class="li"><div class="col grow" style="gap:6px"><div class="row" style="justify-content:space-between;gap:8px"><span class="s14 b7">${P.esc(p.name)}</span><span class="s12 num" style="color:${pct <= 25 ? col : COLOR.mute}">${left}</span></div><div class="bar"><i style="width:${pct}%;background:${col}"></i></div></div>${reset}</div>`;
      })
      .join('');

    return `<div class="page">
      ${back}
      <div class="row" style="justify-content:space-between;align-items:flex-end;gap:12px;padding:0 4px">
        <div class="col" style="gap:2px;min-width:0"><div style="font-size:28px;font-weight:800;letter-spacing:-0.02em" class="ell">${P.esc(name)}</div><div class="s13" style="color:${err ? COLOR.redSoft : COLOR.mute}">${P.esc(sub)}</div></div>
        <button class="ic" data-a="more" data-v="${id}" aria-label="Fan speed and more" style="background:${err ? COLOR.redBg : running ? COLOR.tealSoft : COLOR.card2};color:${err ? COLOR.redSoft : running ? COLOR.teal : COLOR.mute}">${P.svg(ICON.vacuum, { size: 22 })}</button></div>
      <div class="row" style="gap:8px">${ctrl}</div>
      <div class="sect"><div class="lbl">Clean rooms</div>${sel.length ? '<button class="link" data-a="vac-clear">Clear</button>' : ''}</div>
      <div class="vrooms">${roomsHtml}</div>
      <button class="vbtn ${canGo ? 'pri' : 'dis'}" data-a="vac-rooms" style="flex:none">${P.esc(goLabel)}</button>
      <div class="sect"><div class="lbl">Map</div><div class="s12 dimc">${P.esc(mapUpd)}</div></div>
      <div class="card" style="overflow:hidden">
        ${ms ? `<div class="vmap"><div class="slot" data-slot="vacmap"></div></div>` : `<div class="empty">No map yet (${P.esc(c.map)}).</div>`}
        ${run ? `<div class="s13 b7" style="padding:10px 16px 14px;border-top:1px solid ${COLOR.line};color:${COLOR.sub}">${P.esc(run)}</div>` : ''}</div>
      ${parts ? `<div class="sect"><div class="lbl">Maintenance</div></div><div class="card list" style="overflow:hidden">${parts}</div>` : ''}
    </div>`;
  },
};
