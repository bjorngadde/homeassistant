/* house-phone: the Climate tab: temperatures, 48 h chart, weather, heat pump.
 * Methods of HousePhoneCard, mixed into its prototype in ../card.js; `this` is the card. */

import { COLOR, ICON, WX_TEXT } from '../constants.js';
import { P } from '../helpers.js';

/** @satisfies {ThisType<import('../card.js').HousePhoneCard>} */
export const climateView = {
  /* CLIMATE */
  _climateView() {
    const c = this._config.climate;
    const series = (id) => (this._stats[id] || []).slice(-24);
    const zones = [
      ['Downstairs', c.down, COLOR.teal],
      ['Upstairs', c.up, 'rgb(126,230,218)'],
      ['Outdoors', c.out, COLOR.orange],
    ]
      .filter(([, id]) => this._s(id))
      .map(([name, id, col]) => {
        const v = this._n(id),
          ser = series(id)
            .map((r) => r.v)
            .concat(v == null ? [] : [v]);
        const rng = ser.length ? `${Math.min(...ser).toFixed(1)}–${Math.max(...ser).toFixed(1)}°` : '';
        return `<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:3px"><div class="row" style="gap:6px"><span class="dot" style="width:8px;height:8px;border-radius:4px;background:${col}"></span><span style="font-size:11px;font-weight:700;color:${COLOR.mute}">${name}</span></div><div class="num" style="font-size:24px;font-weight:800;letter-spacing:-0.02em">${P.fnum(v)}°</div><div class="num" style="font-size:11px;color:${COLOR.dim}">${rng}</div></div>`;
      })
      .join('');
    return [
      this._header('Climate', 'Indoors, outdoors, SMHI'),
      `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">${zones}</div>`,
      this._tempChart(),
      this._weatherCard(),
      this._heatPumpCard(),
    ].join('');
  },

  _tempChart() {
    const c = this._config.climate;
    const down = this._stats[c.down] || [],
      up = this._stats[c.up] || [],
      out = this._stats[c.out] || [];
    const now = Date.now(),
      t0 = now - 24 * 3600000,
      t1 = now + 24 * 3600000;
    const fc = this._fcH
      .map((f) => ({ t: new Date(f.datetime).getTime(), v: f.temperature }))
      .filter((r) => r.t >= now - 3600000 && r.t <= t1 && r.v != null);
    const byT = new Map();
    down.concat(up).forEach((r) => {
      const k = r.t;
      (byT.get(k) || byT.set(k, []).get(k)).push(r.v);
    });
    const inside = [...byT.entries()]
      .map(([t, vs]) => ({ t, v: vs.reduce((a, b) => a + b, 0) / vs.length }))
      .sort((a, b) => a.t - b.t);
    const nowIn = [this._n(c.down), this._n(c.up)].filter((x) => x != null);
    if (nowIn.length) inside.push({ t: now, v: nowIn.reduce((a, b) => a + b, 0) / nowIn.length });
    const outPast = out.slice();
    const nowOut = this._n(c.out);
    if (nowOut != null) outPast.push({ t: now, v: nowOut });
    const all = inside.concat(outPast, fc).map((r) => r.v);
    if (!all.length) return `<div class="card empty">Loading temperatures…</div>`;
    const lo = Math.floor(Math.min(...all) / 5) * 5,
      hi = Math.ceil(Math.max(...all) / 5) * 5 || lo + 5;
    const W = 326,
      H = 126,
      top = 6;
    const X = (t) => ((t - t0) / (t1 - t0)) * W,
      Y = (v) => top + ((hi - v) / (hi - lo || 1)) * H;
    const path = (arr) =>
      arr
        .filter((r) => r.t >= t0 && r.t <= t1)
        .map((r, i) => (i ? 'L' : 'M') + X(r.t).toFixed(1) + ' ' + Y(r.v).toFixed(1))
        .join(' ');
    const fcPath = path(nowOut != null ? [{ t: now, v: nowOut }].concat(fc.filter((r) => r.t > now)) : fc);
    const grid = [];
    for (let v = lo; v <= hi; v += 5) grid.push(v);
    const mids = [];
    const m = new Date(t0);
    m.setHours(24, 0, 0, 0);
    for (let t = m.getTime(); t < t1; t += 86400000) mids.push(t);
    const nx = X(now).toFixed(1);
    const txt = (x, y, s, col, anchor = 'middle') =>
      `<text x="${x}" y="${y}" fill="${col}" font-size="10" font-weight="700" text-anchor="${anchor}" font-family="Manrope, system-ui, sans-serif">${s}</text>`;
    const svg = `<svg viewBox="0 0 ${W} 150" width="100%" style="display:block;overflow:visible">
      <rect x="${nx}" y="${top}" width="${(W - X(now)).toFixed(1)}" height="${H}" fill="rgba(255,255,255,0.025)"></rect>
      ${grid.map((v) => `<line x1="0" x2="${W}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="rgba(255,255,255,0.06)"></line>${txt(0, (Y(v) - 3).toFixed(1), v + '°', COLOR.dim, 'start')}`).join('')}
      ${mids.map((t) => `<line x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${top}" y2="${top + H}" stroke="rgba(255,255,255,0.08)"></line>${txt(X(t).toFixed(1), 146, '00', COLOR.dim)}`).join('')}
      <line x1="${nx}" x2="${nx}" y1="${top}" y2="${top + H}" stroke="rgba(230,234,242,0.5)" stroke-dasharray="3 3"></line>${txt(nx, 146, 'now', COLOR.fg)}
      <path d="${path(inside)}" fill="none" stroke="${COLOR.teal}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
      <path d="${path(outPast)}" fill="none" stroke="${COLOR.orange}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
      <path d="${fcPath}" fill="none" stroke="${COLOR.orange}" stroke-width="2.5" stroke-dasharray="1 5" stroke-linejoin="round" stroke-linecap="round"></path>
      ${nowOut != null ? `<circle cx="${nx}" cy="${Y(nowOut).toFixed(1)}" r="4" fill="${COLOR.orange}" stroke="${COLOR.card}" stroke-width="2"></circle>` : ''}
      ${nowIn.length ? `<circle cx="${nx}" cy="${Y(inside[inside.length - 1].v).toFixed(1)}" r="4" fill="${COLOR.teal}" stroke="${COLOR.card}" stroke-width="2"></circle>` : ''}
    </svg>`;
    const key = (col, label, dashed) =>
      `<span class="row" style="gap:5px"><span style="width:14px;height:3px;border-radius:2px;background:${dashed ? `repeating-linear-gradient(90deg, ${col} 0 2px, transparent 2px 5px)` : col}"></span>${label}</span>`;
    return `<div class="card" style="padding:14px 14px 10px;display:flex;flex-direction:column;gap:8px"><div class="lbl">Temperature · 24 h back, 24 h ahead</div>${svg}
      <div class="row" style="gap:14px;font-size:11px;font-weight:700;color:${COLOR.mute}">${key(COLOR.teal, 'Indoors')}${key(COLOR.orange, 'Outdoors')}${key(COLOR.orange, 'SMHI forecast', true)}</div></div>`;
  },

  _weatherCard() {
    const w = this._s(this._config.weather);
    if (!w) return '';
    const a = w.attributes;
    const wind = a.wind_speed != null ? (a.wind_speed_unit === 'km/h' ? a.wind_speed / 3.6 : a.wind_speed) : null;
    const gust =
      a.wind_gust_speed != null ? (a.wind_speed_unit === 'km/h' ? a.wind_gust_speed / 3.6 : a.wind_gust_speed) : null;
    const dir =
      a.wind_bearing != null ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(a.wind_bearing / 45) % 8] : '';
    const now = Date.now();
    const hourly = this._fcH
      .filter((f) => new Date(f.datetime).getTime() > now)
      .filter((_f, i) => i % 2 === 0)
      .slice(0, 6)
      .map(
        (f) => `
      <div class="col" style="align-items:center;gap:4px;padding:8px 0;border-radius:12px;background:${COLOR.chip}"><div class="num" style="font-size:11px;font-weight:700;color:${COLOR.mute}">${P.pad(new Date(f.datetime).getHours())}</div>${P.wsvg(f.condition)}<div class="s14 b8">${Math.round(f.temperature)}°</div><div style="height:12px;font-size:10px;font-weight:700;color:${COLOR.blue}">${(f.precipitation || 0) >= 0.1 ? f.precipitation + ' mm' : ''}</div></div>`,
      )
      .join('');
    const days = this._fcD.slice(0, 5);
    const lo = Math.min(...days.map((d) => d.templow ?? d.temperature)),
      hi = Math.max(...days.map((d) => d.temperature));
    const t0 = P.dayStart(now);
    const daily = days
      .map((d) => {
        const t = new Date(d.datetime),
          lowv = d.templow ?? d.temperature;
        const name = P.dayStart(t) === t0 ? 'Today' : t.toLocaleDateString('en-GB', { weekday: 'short' });
        const l = ((lowv - lo) / (hi - lo || 1)) * 100,
          wd = ((d.temperature - lowv) / (hi - lo || 1)) * 100;
        return `<div class="row" style="gap:10px;padding:9px 0;border-top:1px solid ${COLOR.line}"><div class="s14 b7" style="width:44px">${name}</div>${P.wsvg(d.condition)}<div style="width:46px;font-size:11px;font-weight:700;color:${COLOR.blue};text-align:right;white-space:nowrap">${(d.precipitation || 0) >= 1 ? Math.round(d.precipitation) + ' mm' : ''}</div><div class="s13 b7 mute num" style="width:28px;text-align:right">${Math.round(lowv)}°</div><div style="position:relative;flex-grow:1;height:6px;border-radius:3px;background:${COLOR.card2}"><div style="position:absolute;top:0;bottom:0;left:${l.toFixed(1)}%;width:${Math.max(4, wd).toFixed(1)}%;border-radius:3px;background:linear-gradient(90deg, ${COLOR.blue}, ${COLOR.orange})"></div></div><div class="s13 b8 num" style="width:28px">${Math.round(d.temperature)}°</div></div>`;
      })
      .join('');
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:14px">
      <div class="row" style="gap:12px">${P.wsvg(w.state, 44, 1.6)}<div class="col grow" style="gap:1px"><div class="lbl">Weather · SMHI</div><div style="font-size:16px;font-weight:800">${a.temperature != null ? Math.round(a.temperature) + '° · ' : ''}${P.esc(WX_TEXT[w.state] || w.state)}</div><div class="s12 mute">${wind != null ? `Wind ${Math.round(wind)} m/s ${dir}` : ''}${gust != null ? ` · gusts ${Math.round(gust)}` : ''}${a.humidity != null ? ` · ${a.humidity}% RH` : ''}</div></div></div>
      ${hourly ? `<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px">${hourly}</div>` : ''}
      ${daily ? `<div class="col">${daily}</div>` : ''}</div>`;
  },

  _heatPumpCard() {
    const c = this._config.climate;
    const comp = this._n(c.compressor),
      off = this._n(c.offset) || 0,
      base = this._n(c.base);
    const pn = this._priceNow();
    const status = comp == null ? '' : comp > 0 ? `Running · compressor ${Math.round(comp)}%` : 'Idle';
    const tiles = [
      ['Supply', c.supply],
      ['Return', c.return],
      ['Hot water', c.hot_water],
      ['Brine in', c.brine],
    ]
      .filter(([, id]) => this._s(id))
      .map(
        ([k, id]) =>
          `<div class="stat" style="padding:9px 8px"><div style="font-size:11px;font-weight:700;color:${COLOR.mute}" class="ell">${k}</div><div class="num" style="font-size:16px;font-weight:800">${P.fnum(this._n(id))}°</div></div>`,
      )
      .join('');
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <div class="row" style="justify-content:space-between"><div class="lbl">Heat pump</div><div class="s12 b7" style="color:${comp ? COLOR.teal : COLOR.mute}">${status}</div></div>
      ${off > 0 ? `<div style="background:${COLOR.orangeSoft};border-radius:12px;padding:10px 12px"><div class="s14 b8" style="color:${COLOR.orange}">Easing −${off}° while price is high</div>${pn.rank != null ? `<div class="s12" style="color:${COLOR.sub}">Price among the ${Math.max(1, Math.round((1 - pn.rank) * 100))}% most expensive today</div>` : ''}</div>` : ''}
      ${
        base != null
          ? `<div class="row" style="gap:10px"><div class="col grow" style="gap:1px"><span class="s14 b7">Thermostat base</span><span class="s12 mute">${off > 0 ? `now −${off}° for price` : 'no price offset now'}</span></div>
        <button class="sq" style="width:40px;height:40px" data-a="base" data-w="down" aria-label="Lower">${P.svg(ICON.minus, { size: 16, width: 2.5 })}</button>
        <div class="num" style="width:58px;text-align:center;font-size:20px;font-weight:800">${base.toFixed(1)}°</div>
        <button class="sq" style="width:40px;height:40px" data-a="base" data-w="up" aria-label="Raise">${P.svg(ICON.plus, { size: 16, width: 2.5 })}</button></div>`
          : ''
      }
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${tiles}</div></div>`;
  },
};
