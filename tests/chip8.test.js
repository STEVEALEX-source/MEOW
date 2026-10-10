import test from 'node:test';
import assert from 'node:assert/strict';
import { Chip8, DISPLAY_W, DISPLAY_H, PROG_START } from '../src/chip8.js';
import { BUILTIN_DEMO } from '../src/demo-rom.js';

function cpu(romBytes) {
  const c = new Chip8();
  c.load(romBytes instanceof Uint8Array ? romBytes : new Uint8Array(romBytes));
  return c;
}

test('loads font and starts PC at 0x200', () => {
  const c = new Chip8();
  c.load(new Uint8Array([0x00, 0xE0]));
  assert.equal(c.pc, PROG_START);
  assert.equal(c.memory[0x50], 0xF0); // font '0' first byte
});

test('00E0 clears the display', () => {
  const c = cpu([0x00, 0xE0]);
  c.display[0] = 1;
  c.step();
  assert.ok(c.display.every((p) => p === 0));
  assert.equal(c.drawFlag, true);
});

test('1NNN jumps', () => {
  const c = cpu([0x12, 0x34]);
  c.step();
  assert.equal(c.pc, 0x234);
});

test('6XNN / 7XNN load and add', () => {
  const c = cpu([0x60, 0x0A, 0x70, 0x05]);
  c.step();
  assert.equal(c.V[0], 10);
  c.step();
  assert.equal(c.V[0], 15);
});

test('8XY4 add sets carry', () => {
  const c = cpu([0x60, 0xFF, 0x61, 0x02, 0x80, 0x14]);
  c.step(); c.step(); c.step();
  assert.equal(c.V[0], 1);
  assert.equal(c.V[0xf], 1);
});

test('2NNN / 00EE call and return', () => {
  // at 200: CALL 0x204
  // at 204: RET
  const c = cpu([0x22, 0x04, 0x00, 0x00, 0x00, 0xEE]);
  c.step(); // CALL
  assert.equal(c.pc, 0x204);
  assert.equal(c.sp, 1);
  c.step(); // RET
  assert.equal(c.pc, 0x202);
  assert.equal(c.sp, 0);
});

test('3XNN / 4XNN skip', () => {
  const c = cpu([0x60, 0x05, 0x30, 0x05, 0x60, 0x00, 0x60, 0xFF]);
  c.step(); // V0=5
  c.step(); // SE V0,5 → skip
  assert.equal(c.pc, 0x206);
  c.step(); // V0=FF
  assert.equal(c.V[0], 0xff);
});

test('ANNN sets I', () => {
  const c = cpu([0xA2, 0xBC]);
  c.step();
  assert.equal(c.I, 0x2bc);
});

test('DXYN draws and sets VF on collision', () => {
  // I=0x50 (font 0), draw at 0,0 height 5
  const c = cpu([0xA0, 0x50, 0xD0, 0x05, 0xD0, 0x05]);
  c.step(); // I
  c.step(); // draw
  assert.equal(c.V[0xf], 0);
  assert.equal(c.display[0], 1); // top-left of '0' glyph is on
  c.step(); // draw again → collision
  assert.equal(c.V[0xf], 1);
  assert.equal(c.display[0], 0); // xor erased
});

test('FX33 stores BCD', () => {
  const c = cpu([0x60, 0x9C, 0xA3, 0x00, 0xF0, 0x33]); // 156
  c.step(); c.step(); c.step();
  assert.equal(c.memory[0x300], 1);
  assert.equal(c.memory[0x301], 5);
  assert.equal(c.memory[0x302], 6);
});

test('FX0A waits for key', () => {
  const c = cpu([0xF0, 0x0A, 0x60, 0x01]);
  c.step();
  assert.equal(c.waitingForKey, 0);
  assert.equal(c.pc, 0x202);
  // further steps do nothing while waiting
  c.step();
  assert.equal(c.pc, 0x202);
  c.setKey(0xA, true);
  assert.equal(c.V[0], 0xA);
  assert.equal(c.waitingForKey, -1);
});

test('timers tick down', () => {
  const c = cpu([0x60, 0x05, 0xF0, 0x15, 0xF0, 0x18]);
  c.step(); c.step(); c.step();
  assert.equal(c.delayTimer, 5);
  assert.equal(c.soundTimer, 5);
  c.tickTimers();
  assert.equal(c.delayTimer, 4);
  assert.equal(c.soundTimer, 4);
  assert.equal(c.beeping, true);
});

test('demo ROM is valid and runs without throwing', () => {
  const c = cpu(BUILTIN_DEMO);
  for (let i = 0; i < 200; i++) c.step();
  assert.ok(c.pc >= PROG_START);
});

test('display size is 64x32', () => {
  assert.equal(DISPLAY_W, 64);
  assert.equal(DISPLAY_H, 32);
});
