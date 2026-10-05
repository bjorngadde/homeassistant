/* house-phone: the Home tab: greeting, alarm banner, today, energy glance, floors with room tiles, active now.
 * Methods of HousePhoneCard, mixed into its prototype in ../card.js; `this` is the card. */

import { COLOR, ICON, WX_TEXT } from '../constants.js';
import { P } from '../helpers.js';

/** @satisfies {ThisType<import('../card.js').HousePhoneCard>} */
export const homeView = {
  /* HOME */
  _homeView() {
    const [greet, date] = this._greeting();
    // the alarm card lives on the Security tab; Home only shows a banner while the alarm is not disarmed
    return [
      this._header(greet, date),
      this._alarmBanner(),
      this._todayCard(),
      this._energyGlance(),
      this._floorsHtml(),
      this._activeNow(),
    ].join('');
  },

  /** [greeting for the time of day, long date], the Home header. */
  _greeting() {
    const hr = new Date().getHours();
    const greet =
      hr < 5
        ? 'Good night'
        : hr < 10
          ? 'Good morning'
          : hr < 17
            ? 'Good afternoon'
            : hr < 22
              ? 'Good evening'
              : 'Good night';
    const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return [greet, date];
  },

  _alarmBanner() {
    const s = this._s(this._config.alarm);
    if (!s || s.state === 'disarmed' || s.state === 'unavailable' || s.state === 'unknown') return '';
    const st = s.state;
    const warn = st === 'arming' || st === 'pending';
    const cleaning = this._cleaningPending();
    const label =
      {
        armed_away: 'Armed away',
        armed_home: 'Armed home',
        armed_night: 'Armed night',
        armed_vacation: 'Armed vacation',
        armed_custom_bypass: 'Armed · cleaning',
        arming: 'Arming…',
        pending: 'Entry delay…',
        triggered: 'Alarm triggered',
      }[st] || st;
    const away = this._config.people.every((p) => {
      const ps = this._s(p);
      return !ps || ps.state !== 'home';
    });
    const hot = st === 'triggered';
    const sub = hot
      ? 'Tap to see what happened'
      : st === 'armed_custom_bypass'
        ? cleaning
          ? `Full alarm once ${this._config.vacuum_name} docks`
          : 'Doors only'
        : st === 'arming' && cleaning
          ? 'Cleaning mode, doors only'
          : `since ${P.hm(Date.parse(s.last_changed))}${away ? ' · everyone away' : ''}`;
    const fg = hot ? COLOR.bg : warn ? COLOR.orange : COLOR.redSoft;
    return `<button class="card row" data-a="tab" data-v="security" style="gap:12px;padding:14px 16px;background:${hot ? COLOR.red : warn ? COLOR.orangeSoft : COLOR.redBg};border-color:${warn ? 'rgba(255,159,67,0.4)' : 'rgba(255,107,107,0.5)'}${hot ? `;color:${COLOR.bg}` : ''}">
      <span class="ic" style="background:${hot ? COLOR.bg : warn ? COLOR.orangeBar : COLOR.red};color:${hot ? COLOR.red : COLOR.bg}">${P.svg(ICON.shield)}</span>
      <span class="col grow" style="gap:1px;text-align:left"><span style="font-size:17px;font-weight:800">${P.esc(label)}</span><span class="s12" style="color:${hot ? COLOR.bg : COLOR.sub}">${P.esc(sub)}</span></span>
      <span class="s12 b7" style="color:${fg}">Manage</span><span style="color:${fg};display:flex">${P.svg(ICON.chevR, { size: 14, width: 2.5 })}</span></button>`;
  },

  _cleaningPending() {
    const c = this._config.clean_then_arm;
    return !!c && this._on(c.pending);
  },

  _todayCard() {
    const me = this._me();
    const hid = me && this._config.headlines[me];
    const hs = this._s(hid);
    const headline = hs && !['unknown', 'unavailable', ''].includes(hs.state) ? hs.state : null;
    const tags = [];
    const w = this._s(this._config.weather);
    if (w) {
      const temp = w.attributes.temperature;
      const soon = this._fcH.slice(0, 8).find((f) => (f.precipitation || 0) >= 0.2);
      const note = soon
        ? `<span style="color:${COLOR.blue}">rain from ${P.pad(new Date(soon.datetime).getHours())}</span>`
        : `<span class="mute">${P.esc(WX_TEXT[w.state] || w.state)}</span>`;
      tags.push(
        `<span class="chip">${P.wsvg(soon ? 'rainy' : w.state, 16, 2)}<span>${temp != null ? Math.round(temp) + '°' : ''}</span>${note}</span>`,
      );
    }
    const now = Date.now(),
      t0 = P.dayStart(now),
      t1 = t0 + 86400000,
      t2 = t1 + 86400000;
    const today = this._events.filter((e) => e.end > now && e.start < t1);
    const tomorrow = this._events.filter((e) => e.start >= t1 && e.start < t2);
    let first = true;
    for (const e of today.slice(0, 4)) {
      const label = e.allDay ? 'Today' : P.hm(e.start);
      tags.push(
        `<span class="chip${first && !e.allDay ? ' next' : ''}"><span class="num" style="color:${first && !e.allDay ? COLOR.teal : COLOR.mute}">${label}</span><span class="ell">${P.esc(e.summary)}</span></span>`,
      );
      if (!e.allDay) first = false;
    }
    for (const e of tomorrow.slice(0, Math.max(1, 4 - today.length))) {
      tags.push(
        `<span class="chip"><span class="mute">Tomorrow${e.allDay ? '' : ' ' + P.hm(e.start)}</span><span class="ell">${P.esc(e.summary)}</span></span>`,
      );
    }
    if (!headline && !tags.length) return '';
    return `<div class="card" style="padding:14px 14px 12px;display:flex;flex-direction:column;gap:10px">
      ${headline ? `<div class="row" style="gap:10px;align-items:flex-start"><span style="color:${COLOR.violet};flex-shrink:0;margin-top:2px">${P.svg(ICON.sparkle, { size: 16 })}</span><div class="s15 b7" style="line-height:1.35">${P.esc(headline)}</div></div>` : ''}
      <div class="chips">${tags.join('')}</div></div>`;
  },

  _energyGlance() {
    const pn = this._priceNow(),
      st = this._priceStatus();
    const hours = this._hourly();
    const nowH = new Date();
    nowH.setMinutes(0, 0, 0);
    const next = hours.filter((x) => x.t >= nowH.getTime()).slice(0, 8);
    const max = Math.max(...hours.map((x) => x.p), 0.01);
    const bars = next
      .map((x, i) => {
        const lbl = i === 0 ? 'now' : i % 2 === 0 ? P.pad(new Date(x.t).getHours()) : '';
        return `<div class="col" style="align-items:center;gap:4px"><div style="width:14px;height:${Math.round(10 + (x.p / max) * 50)}px;border-radius:4px;background:${this._rankColor(x.rank)};opacity:${i ? 0.8 : 1}"></div><div class="num" style="height:12px;font-size:10px;font-weight:700;color:${i ? COLOR.dim : COLOR.fg}">${lbl}</div></div>`;
      })
      .join('');
    const chips = [];
    const car = this._config.car;
    const soc = this._n(car.soc);
    if (soc != null) {
      const state = this._on(car.charging) ? 'charging' : this._on(car.plug) ? 'plugged in' : 'unplugged';
      chips.push(
        `<span class="chip"><span style="color:${COLOR.teal}">${P.esc(car.name)}</span> ${Math.round(soc)}% · ${state}</span>`,
      );
    }
    const tin = this._n(this._config.climate.down),
      tout = this._n(this._config.climate.out);
    if (tin != null || tout != null)
      chips.push(`<span class="chip">${P.fnum(tin)}° in · ${P.fnum(tout, 0)}° out</span>`);
    this._openDoors().forEach((id) =>
      chips.push(`<span class="chip warn">${P.esc(this._hass.states[id].attributes.friendly_name || id)} open</span>`),
    );
    return `<button class="card" data-a="tab" data-v="energy" style="display:flex;flex-direction:column;gap:10px;padding:14px 16px">
      <div class="row" style="justify-content:space-between;align-items:flex-end;gap:10px">
        <div class="col" style="gap:3px;min-width:0"><div class="lbl">Electricity</div>
          <div class="row" style="align-items:baseline;gap:6px"><span class="num" style="font-size:34px;font-weight:800;letter-spacing:-0.02em;line-height:1">${pn.ore ?? '–'}</span><span class="s12 mute">öre/kWh</span></div>
          ${st ? `<div class="s13 b7" style="color:${st.color}">${P.esc(st.text)}</div>` : ''}</div>
        <div class="bars" style="gap:5px">${bars}</div></div>
      ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}</button>`;
  },

  _roomSummary(a) {
    const h = this._hass,
      ids = this._roomLights(a);
    const avail = ids.filter((id) => h.states[id].state !== 'unavailable');
    const n = avail.filter((id) => h.states[id].state === 'on').length,
      t = avail.length;
    return { n, t, total: ids.length, avail };
  },

  _floorsHtml() {
    const h = this._hass;
    return this._config.floors
      .map((f, i) => {
        const areas = this._floorAreas(i);
        if (!areas.length) return '';
        const lit = areas.reduce((a, ar) => a + this._roomSummary(ar).n, 0);
        const tiles = areas
          .map((ar) => {
            const { n, t } = this._roomSummary(ar);
            const oth = (this._config.others[ar] || []).filter((id) => this._s(id));
            let sub =
              t === 0
                ? oth.length
                  ? oth
                      .map(
                        (id) =>
                          `${P.shortName(h.states[id].attributes.friendly_name || id, this._areaName(ar))} ${h.states[id].state === 'on' ? 'on' : 'off'}`,
                      )
                      .join(' · ')
                  : 'No lights'
                : t === 1
                  ? n
                    ? 'On'
                    : 'Off'
                  : n
                    ? n === t
                      ? 'All on'
                      : `${n} of ${t} on`
                    : 'Off';
            if (!n && t) {
              const doors = this._config.doors.filter((id) => P.areaOf(h, id) === ar && this._on(id));
              const others = (this._config.others[ar] || []).filter((id) => this._on(id));
              const temp = this._roomTemp(ar);
              if (doors.length) sub += ' · door open';
              else if (others.length)
                sub += ` · ${(h.states[others[0]].attributes.friendly_name || '').toLowerCase()} on`;
              else if (temp) sub += ' · ' + temp;
            }
            return `<div class="tile${n ? ' lit' : ''}">
          ${t ? `<button class="tg" data-a="room-toggle" data-v="${ar}" aria-label="Toggle ${P.esc(this._areaName(ar))}"><span class="ic">${P.svg(ICON.bulb)}</span></button>` : `<button class="tg" data-a="room" data-v="${ar}" aria-label="Open ${P.esc(this._areaName(ar))}"><span class="ic">${P.svg(ICON.bulb)}</span></button>`}
          <button class="op" data-a="room" data-v="${ar}" aria-label="Open ${P.esc(this._areaName(ar))}"><span class="col grow" style="gap:2px"><span class="nm ell">${P.esc(this._areaName(ar))}</span><span class="sb ell">${P.esc(sub)}</span></span><span style="color:${COLOR.dim};flex-shrink:0">${P.svg(ICON.chevR, { size: 12, width: 2.5 })}</span></button></div>`;
          })
          .join('');
        return `<div class="sect"><div class="lbl">${P.esc(f.name)}${lit ? ` · ${lit} on` : ''}</div><button class="link${lit ? '' : ' off'}" data-a="floor-off" data-v="${i}">All off</button></div><div class="grid2">${tiles}</div>`;
      })
      .join('');
  },

  _mediaCard(id) {
    const s = this._s(id);
    if (!s) return '';
    const a = s.attributes;
    const title = a.media_title
      ? a.media_artist
        ? `${a.media_title} · ${a.media_artist}`
        : a.media_title
      : a.app_name || (s.state === 'paused' ? 'Paused' : 'Playing');
    const where = [this._areaName(P.areaOf(this._hass, id)), a.friendly_name].filter(Boolean).join(' · ');
    const playing = s.state === 'playing';
    return `<div class="card row" style="gap:8px;padding:10px 10px 10px 14px">
      <div class="col grow" style="gap:1px"><div class="lbl ell">${P.esc(where)}</div><div class="s15 b7 ell">${P.esc(title)}${playing ? '' : ' · paused'}</div></div>
      <button class="sq" data-a="media" data-v="${id}" data-w="vd" aria-label="Volume down">${P.svg(ICON.minus, { size: 18 })}</button>
      <button class="sq pri" data-a="media" data-v="${id}" data-w="pp" aria-label="Play or pause">${P.svg(playing ? ICON.pause : ICON.play, { size: 18, width: 2.5 })}</button>
      <button class="sq" data-a="media" data-v="${id}" data-w="vu" aria-label="Volume up">${P.svg(ICON.plus, { size: 18 })}</button>
      <button class="sq" data-a="media" data-v="${id}" data-w="off" aria-label="Turn off" style="color:${COLOR.redSoft}">${P.svg(ICON.power, { size: 18 })}</button></div>`;
  },

  _vacuumCard(vs) {
    const st = vs.state;
    const running = ['cleaning', 'returning', 'paused', 'error'].includes(st);
    const title =
      {
        cleaning: 'Cleaning',
        returning: 'Returning to dock',
        paused: 'Paused',
        error: 'Needs attention',
        docked: 'Docked',
        idle: 'Idle',
      }[st] || st;
    const bat = vs.attributes.battery_level;
    const last = this._s(this._config.vac.last_end);
    const lastTxt = !running && last && !isNaN(Date.parse(last.state)) ? `cleaned ${P.whenShort(last.state)}` : '';
    const detail = [
      running && vs.attributes.status && vs.attributes.status.toLowerCase() !== title.toLowerCase()
        ? vs.attributes.status
        : '',
      bat != null && (running || bat < 100) ? `battery ${bat}%` : '',
      running ? `since ${P.hm(vs.last_changed)}` : '',
      lastTxt,
    ]
      .filter(Boolean)
      .join(' · ');
    const id = vs.entity_id;
    const b = (svc, label, icon, pri) =>
      `<button class="sq${pri ? ' pri' : ''}" data-a="vac" data-v="${id}" data-w="${svc}" aria-label="${label}">${P.svg(icon, { size: 18, width: pri ? 2.5 : 2 })}</button>`;
    let buttons;
    if (st === 'cleaning')
      buttons = b('pause', 'Pause', ICON.pause, true) + b('return_to_base', 'Send to dock', ICON.home);
    else if (st === 'paused' || st === 'error')
      buttons = b('start', 'Resume', ICON.play, true) + b('return_to_base', 'Send to dock', ICON.home);
    else if (st === 'returning') buttons = b('stop', 'Stop', ICON.pause, false);
    else
      buttons =
        `<button class="sq" data-a="vac" data-v="${id}" data-w="clean_spot" aria-label="Spot clean" style="width:auto;padding:0 12px;font-size:13px;font-weight:800">Spot</button>` +
        b('start', 'Start cleaning', ICON.play, true);
    const err = st === 'error';
    return `<div class="card row" style="gap:10px;padding:10px 6px 10px 12px">
        <button class="ic" data-a="more" data-v="${id}" aria-label="Details" style="background:${err ? COLOR.redBg : running ? COLOR.tealSoft : COLOR.card2};color:${err ? COLOR.redSoft : running ? COLOR.teal : COLOR.mute}">${P.svg(ICON.vacuum, { size: 22 })}</button>
        <button class="col grow" style="gap:1px;min-width:0" data-a="room" data-v="@vacuum" aria-label="Open ${P.esc(vs.attributes.friendly_name || 'vacuum')}"><span class="lbl ell">${P.esc(vs.attributes.friendly_name || 'Vacuum')}</span><span class="s15 b7">${P.esc(title)}</span>${detail ? `<span class="s12 mute ell">${P.esc(detail)}</span>` : ''}</button>
        ${buttons}<button data-a="room" data-v="@vacuum" aria-hidden="true" tabindex="-1" style="display:flex;align-items:center;justify-content:center;width:12px;height:44px;flex-shrink:0;color:${COLOR.dim}">${P.svg(ICON.chevR, { size: 12, width: 2.5 })}</button></div>`;
  },

  _activeNow() {
    const media = this._config.media.filter((id) => {
      const s = this._s(id);
      return s && ['playing', 'paused'].includes(s.state);
    });
    const vs = this._s(this._config.vacuum);
    const vacOn = vs && ['cleaning', 'returning', 'paused', 'error'].includes(vs.state);
    const vacIdle = vs && !vacOn && vs.state !== 'unavailable';
    let out = '';
    if (media.length || vacOn)
      out += `<div class="sect"><div class="lbl">Active now</div></div>${media.map((id) => this._mediaCard(id)).join('')}${vacOn ? this._vacuumCard(vs) : ''}`;
    if (vacIdle) out += (out ? '' : '<div class="sect"><div class="lbl">Devices</div></div>') + this._vacuumCard(vs);
    return out;
  },
};
