// Unit tests for the config merge and validator (src/shared/config.js) and the two card schemas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { mergeConfig, validateConfig } from '../src/shared/config.js';
import { V5_SCHEMA } from '../src/v5/schema.js';
import { WALL_SCHEMA } from '../src/wall/schema.js';

globalThis.__VERSION__ = 'test'; // constants.js reads the build-time version
const { V5_DEFAULTS } = await import('../src/v5/constants.js');
const { WALL_DEFAULTS } = await import('../src/wall/constants.js');

const fixture = (card) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${card}.json`, import.meta.url), 'utf8'));

test('the placeholder fixtures are valid without warnings', () => {
  assert.deepEqual(validateConfig(fixture('v5'), V5_SCHEMA), { errors: [], warnings: [] });
  assert.deepEqual(validateConfig(fixture('wall'), WALL_SCHEMA), { errors: [], warnings: [] });
});

test('every default key is in the schema (else users of that key get an unknown-key warning)', () => {
  assert.deepEqual(validateConfig(V5_DEFAULTS, V5_SCHEMA).warnings, []);
  assert.deepEqual(validateConfig(WALL_DEFAULTS, WALL_SCHEMA).warnings, []);
});

test('keys Home Assistant adds are accepted', () => {
  const r = validateConfig({ type: 'custom:house-v5-card', grid_options: { columns: 12 }, view_layout: {} }, V5_SCHEMA);
  assert.deepEqual(r, { errors: [], warnings: [] });
});

test('an unknown key is a warning, with its path', () => {
  const r = validateConfig({ vac: { romos: [] }, wether: 'weather.example' }, V5_SCHEMA);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, ['unknown key "vac.romos" (ignored)', 'unknown key "wether" (ignored)']);
});

test('a wrong shape is an error', () => {
  const r = validateConfig(
    { people: 'person.example', vac: [], energy: null, cameras: [{ entity: ['x'] }] },
    V5_SCHEMA,
  );
  assert.deepEqual(r.errors, [
    '"people" must be a list, got text "person.example"',
    '"vac" must be an object, got a list',
    '"energy" must be an object, got nothing',
    '"cameras[0].entity" must be text, got a list',
  ]);
});

test('a scalar of the wrong kind is only a warning; numeric text is fine for numbers', () => {
  const r = validateConfig(
    { vac: { rooms: [{ segment: '16', name: 7 }] }, entry_delay: 'soon' },
    { ...V5_SCHEMA, entry_delay: 'number' },
  );
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, [
    '"vac.rooms[0].name" should be text, got number 7',
    '"entry_delay" should be a number, got text "soon"',
  ]);
});

test('maps accept any key and check the values', () => {
  const r = validateConfig(
    { calendars: { default: ['calendar.example'], 'person.example': 'calendar.example' } },
    V5_SCHEMA,
  );
  assert.deepEqual(r.errors, ['"calendars.person.example" must be a list, got text "calendar.example"']);
});

test('a config that is not an object is an error', () => {
  assert.deepEqual(validateConfig([], V5_SCHEMA).errors, ['the card config must be an object, got a list']);
});

test('mergeConfig merges objects deeply and replaces lists and scalars', () => {
  const base = { a: { b: 1, c: { d: 2, e: 3 } }, list: [1, 2], s: 'x' };
  assert.deepEqual(mergeConfig(base, { a: { c: { d: 9 } }, list: [3], s: 'y' }), {
    a: { b: 1, c: { d: 9, e: 3 } },
    list: [3],
    s: 'y',
  });
  assert.deepEqual(mergeConfig(base, undefined), base);
  assert.equal(base.a.c.d, 2, 'the defaults are not modified');
});

test('the built cards reject a broken config in setConfig (Home Assistant then shows an error card)', async () => {
  const { buildFile, renderAll } = await import('./lib/render.mjs');
  const dist = new URL('../dist/', import.meta.url).pathname;
  await assert.rejects(renderAll('v5', buildFile(dist, 'v5'), { people: 'person.example' }, fixture('v5'), {}), {
    message: 'house-v5: invalid config: "people" must be a list, got text "person.example"',
  });
  await assert.rejects(renderAll('wall', buildFile(dist, 'wall'), { tiles: {} }, fixture('wall'), {}), {
    message: 'house-wall: invalid config: "tiles" must be a list, got an object',
  });
});
