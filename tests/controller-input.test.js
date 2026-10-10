import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchPlayerKey, dispatchVirtualButton } from '../src/controller-input.js';

function fakeFrame({ withGameManager = false } = {}) {
  const events = [];
  const keyboardEvents = [];
  const simulated = [];
  const button = { dispatchEvent: (event) => events.push(event) };
  const selectors = [];
  const frame = {
    contentWindow: {
      Event: class {
        constructor(type, options) { this.type = type; this.options = options; }
      },
      KeyboardEvent: class {
        constructor(type, options) { this.type = type; Object.assign(this, options); }
      },
      EJS_emulator: withGameManager
        ? { gameManager: { simulateInput: (p, i, v) => simulated.push({ p, i, v }) } }
        : undefined,
    },
    contentDocument: {
      body: { dispatchEvent: (event) => keyboardEvents.push(event) },
      querySelector(selector) { selectors.push(selector); return button; },
    },
  };
  return { frame, events, selectors, keyboardEvents, simulated };
}

test('Space bridge sends A via simulateInput when gameManager is ready', () => {
  const { frame, simulated } = fakeFrame({ withGameManager: true });
  assert.equal(dispatchVirtualButton(frame, 'a', true), true);
  assert.equal(dispatchVirtualButton(frame, 'a', false), true);
  assert.deepEqual(simulated, [
    { p: 0, i: 8, v: 1 },
    { p: 0, i: 8, v: 0 },
  ]);
});

test('Space bridge falls back to touch events without gameManager', () => {
  const { frame, events, selectors } = fakeFrame();
  assert.equal(dispatchVirtualButton(frame, 'a', true), true);
  assert.equal(dispatchVirtualButton(frame, 'a', false), true);
  assert.deepEqual(selectors, [
    '.ejs_virtualGamepad_button.b_a',
    '.ejs_virtualGamepad_button.b_a',
  ]);
  assert.deepEqual(events.map((event) => event.type), ['touchstart', 'touchend']);
});

test('Space bridge safely ignores unavailable frames and invalid button names', () => {
  assert.equal(dispatchVirtualButton(null, 'a', true), false);
  assert.equal(dispatchVirtualButton({ contentWindow: {}, contentDocument: {} }, 'a', true), false);
  assert.equal(dispatchVirtualButton(fakeFrame().frame, 'not-a-button', true), false);
});

test('launcher keys use simulateInput with correct button indices', () => {
  const { frame, simulated } = fakeFrame({ withGameManager: true });
  assert.equal(dispatchPlayerKey(frame, 'keydown', 'ArrowUp'), true);
  assert.equal(dispatchPlayerKey(frame, 'keyup', 'ArrowUp'), true);
  assert.equal(dispatchPlayerKey(frame, 'keydown', 'KeyZ'), true);
  assert.equal(dispatchPlayerKey(frame, 'keydown', 'KeyX'), true);
  assert.equal(dispatchPlayerKey(frame, 'keydown', 'KeyW'), false);
  assert.deepEqual(simulated, [
    { p: 0, i: 4, v: 1 }, // Up
    { p: 0, i: 4, v: 0 },
    { p: 0, i: 8, v: 1 }, // A
    { p: 0, i: 0, v: 1 }, // B
  ]);
});
