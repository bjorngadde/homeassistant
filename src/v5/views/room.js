/* house-v5: one screen per room: lights, brightness, scenes, other devices, media.
 * Methods of HouseV5Card, mixed into its prototype in ../card.js; `this` is the card. */

import { V5C, V5I } from '../constants.js';
import { v5 } from '../helpers.js';

/** @satisfies {ThisType<import('../card.js').HouseV5Card>} */
export const roomView = {
  /* ROOM */
  _roomView(ar) {
    const h = this._hass,
      name = this._areaName(ar);
    const ids = this._roomLights(ar);
    const { n, t, total } = this._roomSummary(ar);
    const fi = this._config.floors.findIndex((_f, i) => this._floorAreas(i).includes(ar));
    const floor = fi >= 0 ? this._config.floors[fi].name : '';
    const temp = this._roomTemp(ar);
    const sub = [floor, t ? (n ? `${n} of ${t} on` : 'all off') : 'no lights', temp].filter(Boolean).join(' · ');
    const dimOn = ids.filter((id) => h.states[id].state === 'on' && v5.dimmable(h.states[id]));
    const hasDim = ids.some((id) => h.states[id].state !== 'unavailable' && v5.dimmable(h.states[id]));
    const avg = dimOn.length
      ? Math.round(dimOn.reduce((s, id) => s + (v5.pct(h.states[id]) || 0), 0) / dimOn.length)
      : 0;
    // Scenes: shown when the room has a scene helper input_select.<area>_scene (options in order, calmest first).
    // Tapping runs script.room_scene, which also updates the helper. The current scene is highlighted only while lights are on.
    const sh = this._s(`input_select.${ar}_scene`);
    const sceneOpts = sh && Array.isArray(sh.attributes.options) ? sh.attributes.options : [];
    const curScene = sh && n ? sh.state : null;
    const scenes = sceneOpts.length
      ? `<div class="sect"><div class="lbl">Scenes</div></div><div class="scenes">${sceneOpts.map((o) => `<button class="scn${o === curScene ? ' on' : ''}" data-a="scene" data-v="${ar}" data-w="${v5.esc(o)}">${v5.esc(o)}</button>`).join('')}</div>`
      : '';
    const segs = (cur, a, v, cls) =>
      `<div class="segs ${cls}">${Array.from({ length: 10 }, (_, i) => {
        const p = (i + 1) * 10;
        return `<button data-a="${a}" data-v="${v}" data-w="${p}" class="${cur >= p ? 'on' : ''}" aria-label="${p}%"><span></span></button>`;
      }).join('')}</div>`;
    const lights = ids
      .map((id) => {
        const s = h.states[id],
          on = s.state === 'on',
          na = s.state === 'unavailable',
          dim = v5.dimmable(s),
          p = v5.pct(s);
        const nm = v5.shortName(s.attributes.friendly_name || id, name);
        const state = na ? 'Unavailable' : on ? (dim && p ? p + '%' : 'On') : 'Off';
        return `<div class="col" style="gap:6px;padding:12px 14px;border-top:1px solid ${V5C.line};opacity:${na ? 0.45 : 1}">
        <div class="row" style="gap:12px"><span class="ic${on ? ' lit' : ''}" style="width:34px;height:34px;border-radius:10px">${v5.svg(V5I.bulb, { size: 18 })}</span>
          <button class="col grow" style="gap:1px" data-a="more" data-v="${id}"><span class="s15 b7 ell">${v5.esc(nm)}</span><span class="s12" style="color:${na ? V5C.redSoft : V5C.mute}">${state}</span></button>
          <button class="swb" data-a="light" data-v="${id}" aria-label="Toggle ${v5.esc(nm)}"><span class="sw${on ? ' on' : ''}"><i></i></span></button></div>
        ${on && dim && !na ? segs(p || 0, 'bri', id, 'small') : ''}</div>`;
      })
      .join('');
    const others = (this._config.others[ar] || [])
      .filter((id) => v5.safe(h, id))
      .map((id) => {
        const s = this._s(id),
          on = s.state === 'on';
        return `<div class="li"><div class="col grow" style="gap:1px"><span class="s15 b7 ell">${v5.esc(s.attributes.friendly_name || id)}</span><span class="s12 mute">${s.state === 'unavailable' ? 'Unavailable' : on ? 'On' : 'Off'}</span></div><button class="swb" data-a="toggle" data-v="${id}" aria-label="Toggle"><span class="sw${on ? ' on' : ''}"><i></i></span></button></div>`;
      })
      .join('');
    const info = [];
    this._config.media
      .filter((id) => v5.areaOf(h, id) === ar && this._s(id))
      .forEach((id) => {
        const s = h.states[id];
        const st =
          s.state === 'playing'
            ? s.attributes.media_title || 'Playing'
            : s.state === 'unavailable'
              ? 'unavailable'
              : s.state;
        info.push(
          `<button class="chip" style="padding:9px 12px;font-size:13px;color:${V5C.sub}" data-a="more" data-v="${id}">${v5.esc(s.attributes.friendly_name)} · ${v5.esc(st)}</button>`,
        );
      });
    this._config.doors
      .filter((id) => v5.areaOf(h, id) === ar && this._s(id))
      .forEach((id) => {
        const on = this._on(id);
        info.push(
          `<span class="chip${on ? ' warn' : ''}" style="padding:9px 12px;font-size:13px;${on ? '' : `color:${V5C.sub}`}">${v5.esc(h.states[id].attributes.friendly_name)} ${on ? 'open' : 'closed'}</span>`,
        );
      });
    const vs = this._s(this._config.vacuum);
    if (vs && v5.areaOf(h, vs.entity_id) === ar)
      info.push(
        `<button class="chip" style="padding:9px 12px;font-size:13px;color:${V5C.teal}" data-a="room" data-v="@vacuum">${v5.esc(vs.attributes.friendly_name || 'Vacuum')} · ${v5.esc(vs.state)} ›</button>`,
      );
    this._config.cameras
      .filter((c) => h.states[c.entity] && v5.areaOf(h, c.entity) === ar)
      .forEach((c) => {
        info.push(
          `<button class="chip" style="padding:9px 12px;font-size:13px;color:${V5C.teal}" data-a="goto-cam" data-v="${c.entity}">Camera · ${v5.esc(c.name)} ›</button>`,
        );
      });
    return `<div class="page">
      <div class="row" style="justify-content:space-between"><button class="row s15 b7" style="gap:2px;padding:6px 10px 6px 0;color:${V5C.teal}" data-a="back">${v5.svg(V5I.chevL, { width: 2.2 })}Home</button><div class="s15 b7 mute num">${v5.hm(new Date())}</div></div>
      <div class="row" style="justify-content:space-between;align-items:flex-end;gap:12px;padding:0 4px">
        <div class="col" style="gap:2px;min-width:0"><div style="font-size:28px;font-weight:800;letter-spacing:-0.02em" class="ell">${v5.esc(name)}</div><div class="s13 mute">${v5.esc(sub)}</div></div>
        ${t ? `<button data-a="room-toggle" data-v="${ar}" style="flex-shrink:0;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:800;background:${n ? V5C.card2 : V5C.amber};color:${n ? V5C.fg : V5C.litBg}">${n ? 'All off' : 'All on'}</button>` : ''}</div>
      ${scenes}
      ${hasDim ? `<div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px"><div class="row" style="justify-content:space-between"><div class="lbl">Room brightness</div><div class="s14 b8">${dimOn.length ? avg + '%' : 'Off'}</div></div>${segs(dimOn.length ? avg : 0, 'room-bri', ar, 'big')}</div>` : ''}
      ${ids.length ? `<div class="sect"><div class="lbl">Lights · ${t}${total > t ? ` · ${total - t} unavailable` : ''}</div></div><div class="card" style="overflow:hidden">${lights.replace(`border-top:1px solid ${V5C.line}`, 'border-top:0')}</div>` : ''}
      ${others ? `<div class="sect"><div class="lbl">Other devices · not in “All off”</div></div><div class="card list" style="overflow:hidden">${others}</div>` : ''}
      ${info.length ? `<div class="sect"><div class="lbl">In this room</div></div><div class="chips" style="gap:8px">${info.join('')}</div>` : ''}
    </div>`;
  },
};
