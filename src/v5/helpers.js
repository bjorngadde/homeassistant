/* house-v5: small pure helpers (escaping, time formats, SVG icons, entity registry checks). */

import { V5_DNO, V5C, V5W, V5WMAP } from './constants.js';

export const v5 = {
  esc(s) {
    return String(s == null ? '' : s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  },
  pad(n) {
    return String(n).padStart(2, '0');
  },
  hm(d) {
    d = new Date(d);
    return v5.pad(d.getHours()) + ':' + v5.pad(d.getMinutes());
  },
  localStamp(d) {
    return `${d.getFullYear()}-${v5.pad(d.getMonth() + 1)}-${v5.pad(d.getDate())} ${v5.pad(d.getHours())}:${v5.pad(d.getMinutes())}:00`;
  },
  dayStart(t) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  },
  svg(paths, o = {}) {
    const size = o.size || 20,
      stroke = o.stroke || 'currentColor',
      w = o.width || 2,
      fill = o.fill || 'none';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths.map((d) => `<path d="${d}"></path>`).join('')}</svg>`;
  },
  wsvg(condition, size = 22, width = 1.8) {
    const set = V5W[V5WMAP[condition] || 'cloudy'];
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${set.map(([d, c]) => `<path d="${d}" stroke="${V5C[c]}"></path>`).join('')}</svg>`;
  },
  areaOf(hass, id) {
    const e = hass.entities && hass.entities[id];
    if (!e) return null;
    if (e.area_id) return e.area_id;
    const d = e.device_id && hass.devices && hass.devices[e.device_id];
    return (d && d.area_id) || null;
  },
  usable(hass, id) {
    const e = hass.entities && hass.entities[id];
    if (!e || e.hidden || e.entity_category) return false;
    if ((e.labels || []).includes(V5_DNO)) return false;
    return !!hass.states[id];
  },
  safe(hass, id) {
    /* explicit config entity: only the do_not_operate label disqualifies it */
    const e = hass.entities && hass.entities[id];
    return !!hass.states[id] && !(e && (e.labels || []).includes(V5_DNO));
  },
  isGroup(s) {
    return !!s && Array.isArray(s.attributes.entity_id);
  },
  dimmable(s) {
    const m = s && s.attributes.supported_color_modes;
    if (Array.isArray(m)) return m.some((x) => x !== 'onoff');
    return !!s && 'brightness' in s.attributes;
  },
  pct(s) {
    const b = s && s.attributes.brightness;
    return b == null ? null : Math.max(1, Math.round((b / 255) * 100));
  },
  fnum(v, dec = 1) {
    return v == null || isNaN(v) ? '–' : Number(v).toFixed(dec);
  },
  haptic(el, type) {
    el.dispatchEvent(new CustomEvent('haptic', { detail: type, bubbles: true, composed: true }));
    if (navigator.vibrate) {
      try {
        navigator.vibrate(type === 'medium' ? 25 : 10);
      } catch (_e) {
        /* ignore */
      }
    }
  },
  /* "today 16:32" / "yesterday 16:32" / "Mon 16:32" */
  when(t) {
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const days = Math.round((v5.dayStart(Date.now()) - v5.dayStart(d)) / 86400000);
    const day =
      days === 0
        ? 'today'
        : days === 1
          ? 'yesterday'
          : days < 7
            ? d.toLocaleDateString('en-GB', { weekday: 'short' })
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return day + ' ' + v5.hm(d);
  },
  /* compact form for tight rows: "16:32" today, else "yesterday" / "Mon" / "3 Oct" */
  whenShort(t) {
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const days = Math.round((v5.dayStart(Date.now()) - v5.dayStart(d)) / 86400000);
    return days === 0
      ? v5.hm(d)
      : days === 1
        ? 'yesterday'
        : days < 7
          ? d.toLocaleDateString('en-GB', { weekday: 'short' })
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },
  mins(sec) {
    const m = Math.round(sec / 60);
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + v5.pad(m % 60) + ' min';
  },
  median(arr) {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  },
  shortName(name, areaName) {
    if (!name) return '';
    const a = (areaName || '').toLowerCase();
    let n = name;
    if (a && n.toLowerCase().startsWith(a + ' ')) n = n.slice(a.length + 1);
    return n.charAt(0).toUpperCase() + n.slice(1);
  },
  merge(base, over) {
    const out = { ...base };
    for (const [k, v] of Object.entries(over || {})) {
      if (
        v &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        base[k] &&
        typeof base[k] === 'object' &&
        !Array.isArray(base[k])
      )
        out[k] = { ...base[k], ...v };
      else out[k] = v;
    }
    return out;
  },
};
