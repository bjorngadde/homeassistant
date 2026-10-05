/* Card config: merging with the defaults and checking it against a schema. Shared by both cards. */

/** Deep merge of plain objects; arrays and scalars from `over` replace the default. */
export function mergeConfig(base, over) {
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    const v = over[k];
    out[k] = isMap(v) && isMap(base[k]) ? mergeConfig(base[k], v) : v;
  }
  return out;
}

/*
 * Schema language, kept tiny on purpose:
 *   'string' | 'number' | 'boolean'   a scalar
 *   ['string'] / [{ ... }]            a list of that
 *   { key: schema, ... }              an object with these keys
 *   { '*': schema }                   a map with any keys
 * A wrong shape (a list where an object belongs, null instead of a list, an object instead of text) is an
 * error: the card would break on it. A scalar of the wrong kind or an unknown key is only a warning.
 */

/** Keys Home Assistant itself may put on any card config. */
const HA_KEYS = new Set(['type', 'grid_options', 'layout_options', 'view_layout', 'visibility', 'card_mod']);

/** Checks a raw card config. Returns { errors, warnings } as lists of readable strings. */
export function validateConfig(config, schema) {
  const errors = [],
    warnings = [];
  if (!isMap(config)) {
    errors.push(`the card config must be an object, got ${kind(config)}`);
    return { errors, warnings };
  }
  const top = Object.fromEntries(Object.entries(config).filter(([k]) => !HA_KEYS.has(k)));
  walk(top, schema, '', errors, warnings);
  return { errors, warnings };
}

/** For setConfig: throws on errors (Home Assistant shows them as an error card), logs warnings once. */
export function checkConfig(card, config, schema) {
  const { errors, warnings } = validateConfig(config, schema);
  if (warnings.length) console.warn(`${card}: config warnings:\n  ${warnings.join('\n  ')}`);
  if (errors.length) throw new Error(`${card}: invalid config: ${errors.join('; ')}`);
}

function walk(value, schema, path, errors, warnings) {
  if (value === undefined) return;
  if (typeof schema === 'string') {
    if (value === null) return;
    if (typeof value === 'object') errors.push(`"${path}" must be ${article(schema)}, got ${kind(value)}`);
    else if (typeof value !== schema && !(schema === 'number' && value !== '' && !isNaN(Number(value))))
      warnings.push(`"${path}" should be ${article(schema)}, got ${kind(value)}`);
    return;
  }
  if (Array.isArray(schema)) {
    if (!Array.isArray(value)) {
      errors.push(`"${path}" must be a list, got ${kind(value)}`);
      return;
    }
    value.forEach((v, i) => walk(v, schema[0], `${path}[${i}]`, errors, warnings));
    return;
  }
  if (!isMap(value)) {
    errors.push(`"${path}" must be an object, got ${kind(value)}`);
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    const sub = Object.hasOwn(schema, k) ? schema[k] : schema['*'];
    const p = path ? `${path}.${k}` : k;
    if (sub === undefined) warnings.push(`unknown key "${p}" (ignored)`);
    else walk(v, sub, p, errors, warnings);
  }
}

function isMap(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function kind(v) {
  if (v === null) return 'nothing';
  if (Array.isArray(v)) return 'a list';
  if (typeof v === 'object') return 'an object';
  if (typeof v === 'string') return `text "${v}"`;
  return `${typeof v} ${String(v)}`;
}

function article(t) {
  return t === 'string' ? 'text' : `a ${t}`;
}
