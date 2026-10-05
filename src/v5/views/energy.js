/* house-v5: the Energy tab: prices, usage, smart loads, car.
 * Methods of HouseV5Card, mixed into its prototype in ../card.js; `this` is the card. */

import { V5C } from '../constants.js';
import { v5 } from '../helpers.js';

/** @satisfies {ThisType<import('../card.js').HouseV5Card>} */
export const energyView = {
  /* ENERGY */
  _energyView() {
    const pn = this._priceNow(),
      st = this._priceStatus();
    const hours = this._hourly();
    const nowH = new Date();
    nowH.setMinutes(0, 0, 0);
    const win = hours.filter((x) => x.t >= nowH.getTime()).slice(0, 24);
    const max = Math.max(...hours.map((x) => x.p), 0.01);
    const bars = win
      .map(
        (x, i) =>
          `<div style="flex:1 1 0;height:${Math.round(8 + (x.p / max) * 86)}px;border-radius:3px;background:${this._rankColor(x.rank)};opacity:${i ? 0.75 : 1};${i ? '' : `outline:2px solid ${V5C.fg};outline-offset:1px`}"></div>`,
      )
      .join('');
    const labels = win
      .map((x, i) => {
        const hr = new Date(x.t).getHours();
        return `<div class="num" style="flex:1 1 0;height:13px;font-size:10px;font-weight:700;white-space:nowrap;color:${i === 0 ? V5C.fg : hr === 0 ? V5C.sub : V5C.dim}">${i === 0 ? 'now' : i % 4 === 0 ? v5.pad(hr) : ''}</div>`;
      })
      .join('');
    const cheap = win.length ? win.reduce((a, b) => (b.p < a.p ? b : a)) : null;
    const peak = win.length ? win.reduce((a, b) => (b.p > a.p ? b : a)) : null;
    const avgP = (this._s(this._config.price) || { attributes: {} }).attributes.avg_price;
    const rankTxt = avgP != null ? `Today's average ${Math.round(avgP * 100)} öre` : '';
    const e = this._config.energy;
    const pt = this._s(e.peak_time);
    const peakTime =
      pt && !isNaN(new Date(pt.state).getTime())
        ? new Date(pt.state).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
    const pw = this._n(e.power);
    const usage = [
      [
        'Now',
        pw == null ? '–' : pw >= 1000 ? (pw / 1000).toFixed(1) + ' kW' : Math.round(pw) + ' W',
        'live from Pulse',
        V5C.mute,
      ],
      ['Today', v5.fnum(this._n(e.today_kwh)) + ' kWh', v5.fnum(this._n(e.today_cost), 2) + ' kr so far', V5C.mute],
      ['This month', v5.fnum(this._n(e.month_kwh), 0) + ' kWh', v5.fnum(this._n(e.month_cost), 0) + ' kr', V5C.mute],
      ['Peak hour', v5.fnum(this._n(e.peak), 2) + ' kWh', peakTime, V5C.orange],
    ]
      .map(
        ([k, v, sub, c]) =>
          `<div class="card" style="padding:12px 14px;display:flex;flex-direction:column;gap:3px"><div class="lbl">${k}</div><div class="num" style="font-size:22px;font-weight:800;letter-spacing:-0.01em">${v}</div><div class="s12 ell" style="color:${c}">${v5.esc(sub)}</div></div>`,
      )
      .join('');
    const c = this._config.climate;
    const off = this._n(c.offset) || 0,
      eco = this._on(c.hot_water_eco);
    const loads = [
      [
        'HP',
        'Heat pump',
        off > 0 ? `Easing −${off}° while price is high` : 'No price easing right now',
        off > 0 ? 'Easing' : 'Normal',
        off > 0,
      ],
      [
        'HW',
        'Hot water',
        eco ? 'Eco mode while price is high' : 'Eco mode kicks in when price is high',
        eco ? 'Eco' : 'Normal',
        eco,
      ],
    ]
      .map(
        ([b, n, d, s, hot]) =>
          `<div class="li"><span class="ic" style="width:38px;height:38px;border-radius:10px;font-size:13px;font-weight:800;background:${hot ? 'rgba(255,159,67,0.18)' : V5C.card2};color:${hot ? V5C.orange : V5C.mute}">${b}</span><span class="col grow" style="gap:1px"><span class="s15 b7">${n}</span><span class="s12 mute">${d}</span></span><span class="s13 b7" style="color:${hot ? V5C.orange : V5C.mute}">${s}</span></div>`,
      )
      .join('');
    return [
      this._header('Energy', 'Tibber · hourly prices'),
      `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="row" style="justify-content:space-between;align-items:flex-end;gap:8px">
          <div class="col" style="gap:3px"><div class="lbl">Price now</div><div class="row" style="align-items:baseline;gap:6px"><span class="num" style="font-size:40px;font-weight:800;letter-spacing:-0.02em;line-height:1">${pn.ore ?? '–'}</span><span class="s12 mute">öre/kWh</span></div></div>
          <div class="col" style="align-items:flex-end;gap:3px;text-align:right">${st ? `<div class="s13 b7" style="color:${st.color}">${v5.esc(st.text)}</div>` : ''}<div class="s12 mute">${rankTxt}</div></div></div>
        ${win.length ? `<div class="col" style="gap:4px"><div class="bars" style="gap:2px;height:96px">${bars}</div><div class="row" style="gap:2px">${labels}</div></div>` : '<div class="s13 mute">Loading prices…</div>'}
        ${cheap ? `<div class="grid2" style="gap:8px"><div class="stat"><div class="lbl">Cheapest</div><div class="s15 b8 num">${v5.hm(cheap.t)}</div><div style="font-size:11px;color:${V5C.teal}">${Math.round(cheap.p * 100)} öre</div></div><div class="stat"><div class="lbl">Peak</div><div class="s15 b8 num">${v5.hm(peak.t)}</div><div style="font-size:11px;color:${V5C.redSoft}">${Math.round(peak.p * 100)} öre</div></div></div>` : ''}
      </div>`,
      `<div class="sect"><div class="lbl">Usage · Tibber Pulse</div></div><div class="grid2">${usage}</div>`,
      `<div class="sect"><div class="lbl">Smart loads</div></div><div class="card list" style="overflow:hidden">${loads}</div>`,
      this._carCard(),
    ].join('');
  },

  _carCard() {
    const car = this._config.car,
      h = this._hass;
    const soc = this._n(car.soc);
    if (soc == null) return '';
    const target = this._n(car.target),
      range = this._n(car.range);
    const rs = this._s(car.range);
    const km = range == null ? null : rs.attributes.unit_of_measurement === 'm' ? range / 1000 : range;
    const charging = this._on(car.charging),
      plugged = this._on(car.plug);
    const state = charging ? 'Charging' : plugged ? 'Plugged in' : 'Unplugged';
    const updated = this._s(car.soc).last_changed;
    let charger = '';
    if (car.charger_switch && v5.safe(h, car.charger_switch)) {
      const on = this._on(car.charger_switch);
      const status = (this._s(car.charger_status) || {}).state;
      const p = this._n(car.charger_power);
      charger = `<div class="row" style="gap:12px;border-top:1px solid ${V5C.line};padding-top:12px"><div class="col grow" style="gap:1px"><span class="s14 b7">${v5.esc(car.charger_name || 'Charger')}</span><span class="s12 mute">${on ? 'Enabled' : 'Disabled'}${status ? ' · ' + v5.esc(status.toLowerCase()) : ''}${p != null ? ' · ' + Math.round(p) + ' W' : ''}</span></div><button class="swb" data-a="toggle" data-v="${car.charger_switch}" aria-label="Toggle charger"><span class="sw${on ? ' on' : ''}"><i></i></span></button></div>`;
    }
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px">
      <div class="row" style="justify-content:space-between"><div class="lbl">${v5.esc(car.name)} · via Tibber</div><div class="s12 b7" style="color:${charging ? V5C.teal : V5C.mute}">${state}</div></div>
      <div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:30px;font-weight:800;line-height:1">${Math.round(soc)}%</span><span class="s13 mute">${target != null ? `target ${Math.round(target)}%` : ''}${km != null ? ` · ${Math.round(km)} km` : ''}</span></div>
      <div style="position:relative;height:10px;border-radius:5px;background:${V5C.card2};overflow:hidden"><div style="position:absolute;top:0;left:0;bottom:0;width:${Math.min(100, soc)}%;background:${V5C.teal};border-radius:5px"></div>${target != null ? `<div style="position:absolute;top:0;bottom:0;left:${Math.min(99, target)}%;width:2px;background:${V5C.fg}"></div>` : ''}</div>
      <div class="s12 dimc">Updated ${v5.hm(updated)}</div>
      ${charger}</div>`;
  },
};
