/* house-wall: the Day screen (clock, weather chip, AI line or school lunch, room tiles) and the helpers it shares with other modes.
 * Methods of HouseWallCard, mixed into its prototype in ../card.js; `this` is the card. */

import { W } from '../helpers.js';
import { ICON, WX_ICON, WX_TEXT } from '../icons.js';

/** @satisfies {ThisType<import('../card.js').HouseWallCard>} */
export const dayView = {
  _dateText(d) {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  },

  _outTemp() {
    const o = this._s(this._config.outdoor),
      w = this._s(this._config.weather);
    const v = o && !isNaN(parseFloat(o.state)) ? parseFloat(o.state) : w && w.attributes.temperature;
    return v == null || isNaN(v) ? '–' : Math.round(v) + '°';
  },

  _rainHint() {
    const w = this._s(this._config.weather);
    const now = Date.now();
    const next = (this._hourly || []).filter((f) => Date.parse(f.datetime) + 3600000 > now).slice(0, 12);
    const wet = (f) =>
      (f.precipitation || 0) >= 0.2 ||
      ['rainy', 'pouring', 'snowy', 'snowy-rainy', 'lightning-rainy', 'hail'].includes(f.condition);
    const hr = (f) => String(new Date(f.datetime).getHours()).padStart(2, '0') + ':00';
    if (next.length) {
      if (wet(next[0])) {
        const dry = next.find((f) => !wet(f));
        return dry ? 'rain until ' + hr(dry) : 'rain all evening';
      }
      const r = next.find(wet);
      if (r) return 'rain from ' + hr(r);
    }
    return w ? WX_TEXT[w.state] || w.state : '';
  },

  _chips() {
    const now = new Date(),
      nowMs = now.getTime();
    const chips = [];
    const timed = [],
      allDay = [];
    for (const e of this._events) {
      const sd = e.start && (e.start.dateTime || e.start.date),
        ed = e.end && (e.end.dateTime || e.end.date);
      if (!sd) continue;
      if (e.start.date && !e.start.dateTime) {
        allDay.push(e);
        continue;
      }
      if (Date.parse(ed || sd) > nowMs) timed.push({ e, t: Date.parse(sd) });
    }
    timed.sort((a, b) => a.t - b.t);
    timed.slice(0, 2).forEach(({ e, t }, i) => {
      const soon = t - nowMs < 2 * 3600000;
      chips.push(
        `<div class="chip${soon && i === 0 ? ' soon' : ''}"><b>${t <= nowMs ? 'Now' : W.hhmm(new Date(t))}</b> ${W.esc(e.summary)}</div>`,
      );
    });
    if (chips.length < 2 && allDay.length)
      chips.push(`<div class="chip"><b>Today</b> ${W.esc(allDay[0].summary)}</div>`);
    const p = this._s(this._config.price);
    if (p && !isNaN(parseFloat(p.state))) {
      const ore = Math.round(parseFloat(p.state) * 100);
      const rank = p.attributes.intraday_price_ranking;
      const cls = rank == null ? '' : rank <= 0.33 ? ' cheap' : rank >= 0.67 ? ' dear' : '';
      const word = rank == null ? '' : rank <= 0.33 ? ' · cheap' : rank >= 0.67 ? ' · pricey' : '';
      chips.push(`<div class="chip${cls}" style="flex-shrink:0">${ore} öre${word}</div>`);
    }
    return chips.join('');
  },

  _lunchDishes() {
    const now = new Date(),
      c = this._config;
    const sc = this._s(c.school);
    if (!sc || !sc.attributes.message || !c.lunch || !W.inWindow(now, c.lunch.from, c.lunch.to)) return null;
    const st = sc.attributes.start_time && new Date(String(sc.attributes.start_time).replace(' ', 'T'));
    if (!st || st.toDateString() !== now.toDateString()) return null;
    return String(sc.attributes.message)
      .split('|')
      .map((d) => d.replace(/\s+serveras\s+/i, ' ').trim())
      .filter(Boolean);
  },

  _lunch(dishes) {
    return `<div class="lunch"><div class="ib">${W.svg(ICON.food, 18)}</div><div style="min-width:0">
      <div class="ll">Today's school lunch</div><div class="ld">${W.esc(dishes[0])}</div>
      ${dishes[1] ? `<div class="lv">Veg: ${W.esc(dishes[1])}</div>` : ''}</div></div>`;
  },

  _headline() {
    for (const id of this._config.headline) {
      const s = this._s(id);
      if (s && s.state && !['unknown', 'unavailable', ''].includes(s.state)) return s.state;
    }
    return '';
  },

  _tileState(t) {
    const s = this._s(t.entity);
    const leaves = this._tileLeaves(t);
    const on = leaves.filter((l) => this._on(l)).length;
    const any = on > 0 || (s && s.state === 'on');
    let sub =
      !s || s.state === 'unavailable'
        ? 'Unavailable'
        : any
          ? leaves.length > 1
            ? on === leaves.length
              ? 'All on'
              : `${on} of ${leaves.length} on`
            : 'On'
          : 'Off';
    let warn = false;
    if (t.door && this._on(t.door)) {
      sub = any ? 'On · door open' : 'Door open';
      warn = true;
    }
    return { any, sub, warn };
  },

  _people() {
    return this._config.people.map((p) => {
      const s = this._s(p.entity);
      return { ...p, home: !!s && s.state === 'home' };
    });
  },

  _openDoors() {
    return this._config.doors.filter((d) => this._on(d.entity));
  },

  _litRooms() {
    const ids = this._lightsOn();
    const rooms = [...new Set(ids.map((id) => this._areaName(id)))];
    return { ids, rooms };
  },

  _dayView() {
    const c = this._config,
      now = new Date();
    const w = this._s(c.weather);
    const icon = ICON[WX_ICON[w && w.state] || 'cloud'];
    const alarm = this._s(c.alarm);
    const triggered = alarm && alarm.state === 'triggered';
    const lunch = this._lunchDishes();
    this._lunchShown = !!lunch;
    // room tiles get icons and more height, except while the school lunch card needs the space
    const icons = !lunch;
    const people = this._people();
    const doors = this._openDoors();
    const lit = this._litRooms();
    const leaveSub =
      [
        doors.length ? (doors.length === 1 ? doors[0].name + ' open' : doors.length + ' doors open') : '',
        lit.rooms.length ? lit.rooms.length + (lit.rooms.length === 1 ? ' room lit' : ' rooms lit') : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'All good to go';
    const ti = (name) => (icons ? `<div class="ti">${W.svg(ICON[name] || ICON.bulb, 14)}</div>` : '');
    const tiles = c.tiles
      .map((t, i) => {
        const st = this._tileState(t);
        return `<button class="tile${st.any ? ' on' : ''}${this._busy[i] ? ' busy' : ''}" data-a="tile" data-v="${i}">
        ${ti(t.icon)}<div class="tx"><div class="tn">${W.esc(t.name)}</div><div class="ts${st.warn ? ' warn' : ''}">${W.esc(st.sub)}</div></div></button>`;
      })
      .join('');
    const more = this._moreAreas();
    const moreLit = more.filter((a) => a.leaves.some((l) => this._on(l)));
    const moreSub = moreLit.length
      ? moreLit.length === 1
        ? moreLit[0].name + ' on'
        : moreLit.length + ' rooms on'
      : more.map((a) => a.name).join(', ');
    const moreTile = more.length
      ? `<button class="tile wide${moreLit.length ? ' on' : ''}" data-a="rooms">
        ${ti('grid')}<div class="tx"><div class="tn">More rooms ›</div><div class="ts">${W.esc(moreSub)}</div></div></button>`
      : '';
    const mid = triggered
      ? `<div class="banner">${W.svg(ICON.alert, 22)}Alarm triggered · disarm from your phone</div>`
      : (lunch ? this._lunch(lunch) : `<div class="head">${W.esc(this._headline())}</div>`) +
        `<div class="chips">${this._chips()}</div>`;
    return `<div class="pane">
      <div class="top">
        <div><div class="clock" data-clock>${W.hhmm(now)}</div><div class="date">${W.esc(this._dateText(now))}</div></div>
        <button class="wx" data-a="wx">${W.svg(icon, 44, 'rgb(154,166,188)', 1.6)}<div class="wxt"><div class="temp">${this._outTemp()}</div><div class="hint">${W.esc(this._rainHint())}</div></div></button>
      </div>
      ${mid}
      <div class="grow"></div>
      <div class="grid${icons ? ' icons' : ''}">
        <button class="tile wide" data-a="leave" style="justify-content:center">
          <div class="wt">${W.svg(ICON.leave, 22)}<div class="wn">Leaving?</div><div class="badges">${people.map((p) => `<div class="bdg${p.home ? ' home' : ''}">${W.esc(p.short)}</div>`).join('')}</div></div>
          <div class="ws">${W.esc(leaveSub)}</div>
        </button>
        ${tiles}
        ${moreTile}
      </div>
    </div>`;
  },
};
