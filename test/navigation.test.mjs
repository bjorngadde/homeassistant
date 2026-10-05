// Navigation in the phone card (and so the desktop card): every move is a click on the built card, and the browser
// history is a small fake that keeps an entry stack and fires popstate on back(), as a browser does.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { buildHass } from './lib/fake-hass.mjs';
import { buildFile, makeContext } from './lib/render.mjs';

const dist = new URL('../dist/', import.meta.url).pathname;
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/phone.json', import.meta.url), 'utf8'));

function setup(tag = 'house-phone-card') {
  const { ctx, registry } = makeContext([]);
  const listeners = new Set();
  const entries = [{ state: null }];
  let index = 0;
  ctx.history = {
    get state() {
      return entries[index].state;
    },
    get length() {
      return entries.length;
    },
    pushState(state) {
      entries.splice(index + 1, Infinity, { state: structuredClone(state) });
      index++;
    },
    replaceState(state) {
      entries[index] = { state: structuredClone(state) };
    },
    back() {
      if (index === 0) return;
      index--;
      for (const fn of listeners) fn({ state: entries[index].state });
    },
  };
  ctx.addEventListener = (type, fn) => type === 'popstate' && listeners.add(fn);
  ctx.removeEventListener = (type, fn) => type === 'popstate' && listeners.delete(fn);
  ctx.navigator = {};
  ctx.CustomEvent = class {};
  const file = buildFile(dist, 'phone');
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  const card = new (registry.get(tag))();
  card.setConfig(fixture);
  card.hass = buildHass(fixture);
  /** Clicks an element with these data attributes, as the card's own click listener would see it. */
  const click = (a, v) => {
    const el = { getAttribute: (n) => ({ 'data-a': a, 'data-v': v })[n] ?? null, dispatchEvent() {} };
    card._onClick({ target: { closest: () => el } });
  };
  const where = () => [card._tab, card._room];
  return { card, click, where, history: ctx.history, listeners, depth: () => index };
}

test('a tab opened from Home (the electricity box, the tab bar) goes back to Home', () => {
  const { click, where, history } = setup();
  click('tab', 'energy');
  assert.deepEqual(where(), ['energy', null]);
  history.back();
  assert.deepEqual(where(), ['home', null]);
});

test('moving between tabs does not pile up history: back from any tab is one step to Home', () => {
  const { click, where, history, depth } = setup();
  click('tab', 'energy');
  click('tab', 'climate');
  click('tab', 'security');
  assert.equal(depth(), 1);
  history.back();
  assert.deepEqual(where(), ['home', null]);
});

test('a room goes back to Home, also when left through the tab bar', () => {
  const { click, where, history } = setup();
  click('room', 'example_kitchen');
  assert.deepEqual(where(), ['home', 'example_kitchen']);
  history.back();
  assert.deepEqual(where(), ['home', null]);

  click('room', 'example_kitchen');
  click('tab', 'energy');
  assert.deepEqual(where(), ['energy', null]);
  history.back();
  assert.deepEqual(where(), ['home', null]);
});

test("the room's back link and the Home tab step back through history instead of adding to it", () => {
  const { click, where, depth } = setup();
  click('room', 'example_kitchen');
  click('back');
  assert.deepEqual(where(), ['home', null]);
  assert.equal(depth(), 0);

  click('tab', 'climate');
  click('tab', 'home');
  assert.deepEqual(where(), ['home', null]);
  assert.equal(depth(), 0);

  click('tab', 'home'); // already home: nothing to record
  assert.equal(depth(), 0);
});

test('forward after back shows the tab again', () => {
  const { click, where, history, listeners } = setup();
  click('tab', 'energy');
  history.back();
  // forward: the browser moves to the next entry and fires popstate with its state
  history.pushState({ housePhoneTab: 'energy', housePhoneRoom: null });
  for (const fn of listeners) fn({});
  assert.deepEqual(where(), ['energy', null]);
});

test('detaching and re-attaching the card keeps exactly one history listener and one click listener', () => {
  const { card, listeners } = setup();
  let clicks = 0;
  const add = card.shadowRoot.addEventListener;
  card.shadowRoot.addEventListener = (type, ...rest) => {
    if (type === 'click') clicks++;
    return add.call(card.shadowRoot, type, ...rest);
  };
  card.disconnectedCallback();
  assert.equal(listeners.size, 0);
  card.connectedCallback();
  assert.equal(listeners.size, 1);
  assert.equal(clicks, 0, 'no second click listener after re-attaching');
});

test('the desktop card navigates the same way', () => {
  const { click, where, history } = setup('house-desktop-card');
  click('tab', 'energy');
  click('tab', 'climate');
  history.back();
  assert.deepEqual(where(), ['home', null]);
});
