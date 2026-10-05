/* house-wall: the Weather screen: today in detail and the next days.
 * Methods of HouseWallCard, mixed into its prototype in ../card.js; `this` is the card. */

import { W } from '../helpers.js';
import { ICON, WX_ICON, WX_TEXT } from '../icons.js';

/** @satisfies {ThisType<import('../card.js').HouseWallCard>} */
export const weatherView = {
  _ms(v) {
    const w = this._s(this._config.weather);
    const unit = (w && w.attributes.wind_speed_unit) || 'km/h';
    const n = parseFloat(v) || 0;
    return Math.round(unit === 'km/h' ? n / 3.6 : unit === 'mph' ? n * 0.447 : n);
  },

  _weatherView() {
    const c = this._config,
      now = new Date(),
      nowMs = now.getTime();
    const w = this._s(c.weather),
      a = (w && w.attributes) || {};
    const icon = (cond) => ICON[WX_ICON[cond] || 'cloud'];
    const hours = (this._hourly || []).filter((f) => Date.parse(f.datetime) + 3600000 > nowMs);
    const today = hours.filter((f) => new Date(f.datetime).toDateString() === now.toDateString());
    const temps = today.map((f) => f.temperature).filter((t) => t != null);
    const rain = today.reduce((sum, f) => sum + (f.precipitation || 0), 0);
    const gust = today.reduce((m, f) => Math.max(m, this._ms(f.wind_gust_speed || f.wind_speed)), 0);
    const sum = [
      temps.length ? `${Math.round(Math.min(...temps))}–${Math.round(Math.max(...temps))}°` : '',
      rain >= 0.1 ? `<b>${rain.toFixed(1)} mm rain</b>` : 'dry',
      gust ? `gusts ${gust} m/s` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const cols = hours
      .slice(0, 8)
      .map((f) => {
        const mm = f.precipitation || 0;
        const hgt = Math.min(24, Math.round((mm / 2) * 24));
        return `<div class="hr"><div>${String(new Date(f.datetime).getHours()).padStart(2, '0')}</div>
        ${W.svg(icon(f.condition), 26, 'rgb(154,166,188)', 1.6)}
        <div class="t">${Math.round(f.temperature)}°</div>
        <div class="pb"><i style="height:${mm > 0 && hgt < 2 ? 2 : hgt}px"></i></div>
        <div class="mm">${mm >= 0.1 ? mm.toFixed(1) : ''}</div></div>`;
      })
      .join('');
    const days = (this._daily || [])
      .filter((f) => {
        const d = new Date(f.datetime);
        d.setHours(0, 0, 0, 0);
        const t = new Date(now);
        t.setHours(0, 0, 0, 0);
        return d > t;
      })
      .slice(0, 3)
      .map((f, i) => {
        const d = new Date(f.datetime);
        const name = i === 0 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' });
        const mm = f.precipitation || 0;
        return `<div class="dayr"><div class="dn">${name}</div>${W.svg(icon(f.condition), 24, 'rgb(154,166,188)', 1.6)}
        <div class="dt">${f.templow != null ? Math.round(f.templow) + '° – ' : ''}${Math.round(f.temperature)}°</div>
        <div class="dx">${mm >= 0.1 ? mm.toFixed(1) + ' mm · ' : ''}wind ${this._ms(f.wind_speed)} m/s</div></div>`;
      })
      .join('');
    const nowBits = [`Wind ${this._ms(a.wind_speed)} m/s`];
    if (a.wind_gust_speed) nowBits[0] += ` (gusts ${this._ms(a.wind_gust_speed)})`;
    if (a.humidity != null) nowBits.push(`${Math.round(a.humidity)}% humidity`);
    return `<div class="pane" style="gap:10px">
      <div class="lh"><div class="lt">Weather</div><button class="link" data-a="day">Done</button></div>
      <div class="wnow">${W.svg(icon(w && w.state), 56, 'rgb(154,166,188)', 1.5)}
        <div><div class="wbig">${this._outTemp()}<span>${W.esc(w ? WX_TEXT[w.state] || w.state : '')}</span></div>
        <div class="wsub">${W.esc(nowBits.join(' · '))}</div></div></div>
      ${today.length ? `<div class="wsum">Rest of today · ${sum}</div>` : ''}
      ${cols ? `<div class="hours">${cols}</div>` : '<div class="wsum">Waiting for the SMHI forecast…</div>'}
      <div class="grow"></div>
      ${days ? `<div class="days">${days}</div>` : ''}
    </div>`;
  },
};
