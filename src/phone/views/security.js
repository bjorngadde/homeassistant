/* house-phone: the Security tab and the alarm block (arm, disarm, clean then arm).
 * Methods of HousePhoneCard, mixed into its prototype in ../card.js; `this` is the card. */

import { COLOR, ICON } from '../constants.js';
import { P } from '../helpers.js';

/** @satisfies {ThisType<import('../card.js').HousePhoneCard>} */
export const securityView = {
  _alarmBlock() {
    const s = this._s(this._config.alarm);
    if (!s) return '';
    const state = s.state;
    const armed = [
      'armed_away',
      'armed_home',
      'armed_night',
      'armed_vacation',
      'armed_custom_bypass',
      'arming',
      'pending',
      'triggered',
    ].includes(state);
    const cleaning = this._cleaningPending();
    const label =
      {
        disarmed: 'Disarmed',
        armed_away: 'Armed · away',
        armed_home: 'Armed · home',
        armed_night: 'Armed · night',
        armed_custom_bypass: 'Armed · cleaning',
        arming: 'Arming…',
        pending: 'Entry delay…',
        triggered: 'ALARM TRIGGERED',
      }[state] || state;
    const feat = s.attributes.supported_features || 0;
    const btn = (svc, text, color) =>
      `<button class="hold" data-hold="${svc}"><span class="fill" style="background:${color}"></span><span class="tx"><span class="s15 b7">${text}</span><small class="s12" style="color:${COLOR.sub};font-size:11px">Hold to confirm</small></span></button>`;
    const ct = this._config.clean_then_arm;
    const vac = this._s(this._config.vacuum);
    const canClean = state === 'disarmed' && ct && this._s(ct.script) && vac && vac.state !== 'unavailable';
    // while the vacuum is already out, the same script just arms Cleaning mode and waits for her (it won't restart her)
    const vacBusy = vac && ['cleaning', 'returning'].includes(vac.state);
    const buttons = armed
      ? btn('alarm_disarm', 'Disarm', 'rgba(61,214,196,0.55)')
      : [
          feat & 1 ? btn('alarm_arm_home', 'Arm home', 'rgba(255,107,107,0.55)') : '',
          feat & 2 ? btn('alarm_arm_away', feat & 1 ? 'Arm away' : 'Arm', 'rgba(255,107,107,0.55)') : '',
          canClean
            ? btn(
                'script:' + ct.script.split('.')[1],
                vacBusy ? `Arm when ${this._config.vacuum_name} is done` : 'Clean, then arm',
                'rgba(255,159,67,0.55)',
              )
            : '',
        ].join('');
    const note =
      state === 'armed_custom_bypass'
        ? cleaning
          ? `Full alarm once ${this._config.vacuum_name} docks`
          : 'Doors only'
        : '';
    const open = this._openDoors().map((id) => this._hass.states[id].attributes.friendly_name || id);
    const people = this._config.people
      .map((p) => {
        const ps = this._s(p);
        if (!ps) return '';
        const home = ps.state === 'home';
        const initial = (ps.attributes.friendly_name || p.split('.')[1]).charAt(0).toUpperCase();
        const where = home ? 'Home' : ps.state === 'not_home' ? 'Away' : ps.state;
        return `<div class="person"><b style="background:${home ? 'rgba(61,214,196,0.18)' : COLOR.card2};color:${home ? COLOR.teal : COLOR.dim}">${P.esc(initial)}</b><span style="font-size:10px;font-weight:700;color:${home ? COLOR.teal : COLOR.dim}">${P.esc(where)}</span></div>`;
      })
      .join('');
    const hot = armed || state === 'triggered';
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:14px;border-color:${hot ? 'rgba(255,107,107,0.45)' : COLOR.line}">
      <div class="row" style="gap:12px">
        <span class="ic" style="background:${hot ? COLOR.red : 'rgba(61,214,196,0.18)'};color:${hot ? COLOR.bg : COLOR.teal}">${P.svg(ICON.shield)}</span>
        <div class="col grow" style="gap:1px"><div class="lbl">Alarm</div><div style="font-size:16px;font-weight:800">${P.esc(label)}</div>
          ${!armed && open.length ? `<div class="s12 b7" style="color:${COLOR.redSoft}">${P.esc(open.join(', '))} ${open.length > 1 ? 'are' : 'is'} open</div>` : ''}${note ? `<div class="s12" style="color:${COLOR.orange}">${P.esc(note)}</div>` : ''}</div>
        <div class="row" style="gap:6px;flex-shrink:0">${people}</div></div>
      <div class="row" style="gap:10px">${buttons}</div></div>`;
  },

  /* SECURITY */
  _securityView() {
    const h = this._hass;
    const people = this._config.people
      .map((p) => this._s(p))
      .filter(Boolean)
      .map((ps) => `${(ps.attributes.friendly_name || '').split(' ')[0]} ${ps.state === 'home' ? 'home' : 'away'}`)
      .join(' · ');
    const cams = this._config.cameras.filter((c) => h.states[c.entity]);
    if (!this._cam || !cams.find((c) => c.entity === this._cam)) this._cam = cams.length ? cams[0].entity : null;
    const main = cams.find((c) => c.entity === this._cam);
    const lastPerson = (c) => {
      const e = this._log.find((x) => x.entity === c.person);
      return e ? `Person · ${P.hm(e.t)}` : null;
    };
    let camHtml = '';
    if (main) {
      const ms = this._s(main.entity);
      const rec = cams.filter((c) => ['recording', 'streaming'].includes((h.states[c.entity] || {}).state)).length;
      camHtml = `<div class="sect"><div class="lbl">Cameras</div><div class="s12 b7 mute">${rec} recording</div></div>
        <button class="cam" data-a="cam-open" data-v="${main.entity}" aria-label="Open ${P.esc(main.name)} live"><span class="slot" data-slot="${main.entity}"></span>
          <span class="over col"><span class="s15 b8">${P.esc(main.name)}</span><span class="s12" style="color:${COLOR.sub}">${P.esc(lastPerson(main) || ms.state)} · tap for live</span></span></button>
        <div class="thumbs">${cams
          .filter((c) => c !== main)
          .map(
            (c) =>
              `<button class="col" style="gap:4px;min-width:0" data-a="cam" data-v="${c.entity}"><span class="thumb"><span class="slot" data-slot="${c.entity}"></span></span><span class="ell" style="font-size:11px;font-weight:700;color:${COLOR.sub}">${P.esc(c.name)}</span></button>`,
          )
          .join('')}</div>`;
    }
    const doors = this._config.doors
      .filter((id) => this._s(id))
      .map((id) => {
        const s = h.states[id],
          open = s.state === 'on';
        const mins = Math.round((Date.now() - new Date(s.last_changed).getTime()) / 60000);
        const since =
          mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} d`;
        return `<div class="li"><span class="dot" style="background:${open ? COLOR.red : COLOR.teal}"></span><span class="grow s15 b7 ell">${P.esc(s.attributes.friendly_name || id)}</span><span class="s13 b7" style="color:${open ? COLOR.redSoft : COLOR.mute}">${open ? 'Open · ' + since : s.state === 'unavailable' ? 'Unavailable' : 'Closed'}</span></div>`;
      });
    const smoke = this._config.smoke.map((id) => this._s(id)).filter(Boolean);
    if (smoke.length) {
      const fire = smoke.filter((s) => s.state === 'on'),
        bad = smoke.filter((s) => s.state === 'unavailable');
      doors.push(
        `<div class="li"><span class="dot" style="background:${fire.length ? COLOR.red : bad.length ? COLOR.orangeBar : COLOR.teal}"></span><span class="grow s15 b7">Smoke detectors</span><span class="s13 b7" style="color:${fire.length ? COLOR.redSoft : COLOR.mute}">${fire.length ? 'SMOKE · ' + P.esc(fire.map((s) => s.attributes.friendly_name).join(', ')) : bad.length ? bad.length + ' unavailable' : 'All OK'}</span></div>`,
      );
    }
    const recent = this._log
      .slice(0, 6)
      .map(
        (e) =>
          `<div class="li"><span class="s13 b7 mute num" style="width:44px">${P.hm(e.t)}</span><span class="col grow" style="gap:1px"><span class="s14 b7">${P.esc(e.what)}</span><span class="s12 mute">${P.esc(e.where)}</span></span></div>`,
      )
      .join('');
    const toggles = (list) =>
      list
        .filter((x) => P.safe(h, x.entity))
        .map((x) => {
          const s = this._s(x.entity),
            on = s.state === 'on';
          return `<div class="li"><div class="col grow" style="gap:1px"><span class="s15 b7 ell">${P.esc(x.name || s.attributes.friendly_name)}</span><span class="s12 mute">${on ? P.esc(x.on || 'On') : 'Off'}</span></div><button class="swb" data-a="toggle" data-v="${x.entity}" aria-label="Toggle"><span class="sw${on ? ' on' : ''}"><i></i></span></button></div>`;
        })
        .join('');
    const tg1 = toggles(this._config.security_toggles),
      tg2 = toggles(this._config.camera_alerts);
    return [
      this._header('Security', people),
      this._alarmBlock(),
      camHtml,
      doors.length
        ? `<div class="sect"><div class="lbl">Doors &amp; smoke</div></div><div class="card list" style="overflow:hidden">${doors.join('')}</div>`
        : '',
      `<div class="sect"><div class="lbl">Last 24 hours</div></div><div class="card list" style="overflow:hidden">${recent || '<div class="empty">Nothing happened.</div>'}</div>`,
      tg1
        ? `<div class="sect"><div class="lbl">Alarm settings</div></div><div class="card list" style="overflow:hidden">${tg1}</div>`
        : '',
      tg2
        ? `<div class="sect"><div class="lbl">Camera notifications</div></div><div class="card list" style="overflow:hidden">${tg2}</div>`
        : '',
    ].join('');
  },
};
