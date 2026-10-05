/* house-wall: small pure helpers (config merge, escaping, time windows, SVG icons). */

export const W = {
  merge(a, b) {
    const out = { ...a };
    for (const k of Object.keys(b || {})) {
      const v = b[k];
      out[k] =
        v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])
          ? W.merge(a[k], v)
          : v;
    }
    return out;
  },
  esc(s) {
    return String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
    );
  },
  hhmm(d) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },
  mins(s) {
    const [h, m] = String(s).split(':').map(Number);
    return h * 60 + (m || 0);
  },
  inWindow(d, from, to) {
    const n = d.getHours() * 60 + d.getMinutes(),
      a = W.mins(from),
      b = W.mins(to);
    return a <= b ? n >= a && n < b : n >= a || n < b;
  },
  svg(paths, size, stroke, width) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke || 'currentColor'}" stroke-width="${width || 2}" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
  },
};
