// Checks on the built bundle (npm test builds it first).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFile, registeredTags } from './lib/render.mjs';

const dist = new URL('../dist/', import.meta.url).pathname;

test('house-cards.js registers all three cards', () => {
  assert.deepEqual(registeredTags(buildFile(dist, 'phone')), [
    'house-desktop-card',
    'house-phone-card',
    'house-wall-card',
  ]);
});
