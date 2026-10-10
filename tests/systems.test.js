import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSystem, MAX_ROM_BYTES, SYSTEMS, validateRomFile } from '../src/systems.js';

test('defines the NES and GBA system cores', () => {
  assert.equal(SYSTEMS.nes.core, 'nes');
  assert.equal(SYSTEMS.gba.core, 'gba');
  assert.equal(SYSTEMS.gba.controlScheme, 'gba');
});

test('detects unambiguous ROM extensions and leaves ZIP selection to the user', () => {
  assert.equal(detectSystem('game.nes'), 'nes');
  assert.equal(detectSystem('game.GBA'), 'gba');
  assert.equal(detectSystem('game.agb'), 'gba');
  assert.equal(detectSystem('game.bin'), 'gba');
  assert.equal(detectSystem('collection.zip'), null);
});

test('validates system-specific ROM extensions and file sizes', () => {
  assert.equal(validateRomFile('game.nes', 16, 'nes').systemId, 'nes');
  assert.equal(validateRomFile('game.zip', 100, 'gba').systemId, 'gba');
  assert.throws(() => validateRomFile('game.gba', 32, 'nes'), /NES accepts/);
  assert.throws(() => validateRomFile('game.nes', 15, 'nes'), /at least 16 bytes/);
  assert.throws(() => validateRomFile('game.gba', MAX_ROM_BYTES + 1, 'gba'), /64 MiB/);
});
