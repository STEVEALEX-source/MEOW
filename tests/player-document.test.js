import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { buildPlayerDocument, EMULATORJS_DATA_PATH } from '../src/player-document.js';

function keyboardMapping(system) {
  const page = buildPlayerDocument(system, 'blob:https://example.test/rom-id', 'game.rom');
  const config = page.match(/window\.EJS_defaultControls = (.+);/);
  assert.ok(config, 'player document contains the default keyboard map');
  return JSON.parse(config[1])['0'];
}

test('configures NES with local ROM, keyboard, virtual pad, and disables localStorage', () => {
  const page = buildPlayerDocument('nes', 'blob:https://example.test/rom-id', 'game.nes');
  assert.match(page, /window\.EJS_core = "nes"/);
  assert.match(page, /window\.EJS_gameUrl = "blob:https:\/\/example\.test\/rom-id"/);
  assert.match(page, /window\.EJS_VirtualGamepadSettings/);
  assert.match(page, /window\.EJS_defaultControls/);
  assert.match(page, /window\.EJS_disableLocalStorage = true/);
  assert.match(page, /"value":"z","value2":"BUTTON_1"/);
  assert.match(page, /"id":"a"[^}]*"input_value":8/);
  assert.match(page, /"id":"b"[^}]*"input_value":0/);
  assert.match(page, /meowSimulate/);
  assert.match(page, /simulateInput/);
  assert.match(page, /toggleVirtualGamepad\(controlsVisible\)/);
  assert.match(page, /cdn\.emulatorjs\.org\/stable\/data\/loader\.js/);
});

test('configures the GBA core with shoulder controls', () => {
  const page = buildPlayerDocument('gba', 'blob:https://example.test/gba-id', 'player.gba');
  assert.match(page, /window\.EJS_core = "gba"/);
  assert.match(page, /"id":"l"/);
  assert.match(page, /"id":"r"/);
  assert.match(page, /"id":"x"[^}]*"input_value":9/);
  assert.match(page, /"id":"y"[^}]*"input_value":1/);
  assert.match(page, /LEFT_TOP_SHOULDER/);
  assert.match(page, new RegExp(EMULATORJS_DATA_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('maps arrows and action keys with official EmulatorJS key names', () => {
  const keyboard = keyboardMapping('gba');
  assert.deepEqual(
    [keyboard[4].value, keyboard[5].value, keyboard[6].value, keyboard[7].value],
    ['up arrow', 'down arrow', 'left arrow', 'right arrow'],
  );
  assert.equal(keyboard[8].value, 'z');
  assert.equal(keyboard[0].value, 'x');
  assert.equal(keyboard[9].value, 'a');
  assert.equal(keyboard[1].value, 's');
  assert.equal(keyboard[10].value, 'q');
  assert.equal(keyboard[11].value, 'e');
  assert.equal(keyboard[2].value, 'v');
  assert.equal(keyboard[3].value, 'enter');
});

test('rejects unsupported systems, non-local ROM URLs, and unsafe long names', () => {
  assert.throws(() => buildPlayerDocument('chip8', 'blob:test', 'x'), /Unsupported/);
  assert.throws(() => buildPlayerDocument('nes', 'https://example.test/game.nes', 'game.nes'), /opened from this browser/);
  assert.throws(() => buildPlayerDocument('nes', 'blob:test', 'n'.repeat(201)), /Invalid ROM filename/);
});

test('generated inline player scripts parse for NES and GBA', () => {
  for (const system of ['nes', 'gba']) {
    const page = buildPlayerDocument(system, 'blob:https://example.test/rom-id', 'game.rom');
    const script = page.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script, `${system} player has its setup script`);
    assert.doesNotThrow(() => new Script(script), `${system} player setup must be valid JavaScript`);
  }
});
