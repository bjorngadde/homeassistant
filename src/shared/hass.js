/* Helpers shared by both cards for reading Home Assistant's registries. */

/** The area of an entity: its own area, else its device's area, else null. */
export function areaOf(hass, id) {
  const e = hass.entities && hass.entities[id];
  if (!e) return null;
  if (e.area_id) return e.area_id;
  const d = e.device_id && hass.devices && hass.devices[e.device_id];
  return (d && d.area_id) || null;
}
