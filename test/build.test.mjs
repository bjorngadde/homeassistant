// Checks on the built bundle (npm test builds it first).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFile, registeredTags } from './lib/render.mjs';

const dist = new URL('../dist/', import.meta.url).pathname;

test('house-cards.js registers both cards, and the phone card also under its old name', () => {
  // house-v5-card: the name dashboards used up to 0.3.0; drop it (and this line) once no dashboard uses it
  assert.deepEqual(registeredTags(buildFile(dist, 'phone')), ['house-phone-card', 'house-v5-card', 'house-wall-card']);
});
