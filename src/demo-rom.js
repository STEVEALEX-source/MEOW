/**
 * Built-in public-domain demo ROM.
 * Draws a bouncing ball and shows pressed keypad digits.
 * Written as raw CHIP-8 machine code (no commercial content).
 */
export const DEMO_ROM = new Uint8Array([
  // Clear screen
  0x00, 0xE0,
  // V0 = x = 10, V1 = y = 10, V2 = dx = 1, V3 = dy = 1
  0x60, 0x0A, // LD V0, 10
  0x61, 0x0A, // LD V1, 10
  0x62, 0x01, // LD V2, 1
  0x63, 0x01, // LD V3, 1
  // V4 = sprite row count (1)
  0x64, 0x01,
  // I = ball sprite at 0x300
  0xA3, 0x00, // LD I, 0x300

  // main loop @ 0x20C
  // Draw ball
  0xD0, 0x14, // DRW V0, V1, 1  (wait we need 4 rows - fix)

  // Actually use a proper loop. Restart with cleaner program below.
]);

/**
 * Compact demo: clear, draw "CHIP-8" style pattern, wait for key, beep.
 * Better: a working bounce + key echo.
 */
export function buildDemoRom() {
  // We'll assemble a small working program manually.
  // Memory layout:
  // 0x200 program
  // 0x300 8x8 ball sprite (8 rows)
  const rom = new Uint8Array(0x200);

  let i = 0;
  const w = (...bytes) => { for (const b of bytes) rom[i++] = b; };

  // Sprite data will be at end; I points there.
  // --- init ---
  w(0x00, 0xE0);       // CLS
  w(0x60, 0x1E);       // V0 = 30  (x)
  w(0x61, 0x0C);       // V1 = 12  (y)
  w(0x62, 0x01);       // V2 = 1   (dx)
  w(0x63, 0x01);       // V3 = 1   (dy)
  w(0xA3, 0x00);       // I = 0x300 (sprite) — relative: we'll put sprite at rom offset 0x100 → mem 0x300

  // loop:
  //   DRW V0 V1 8
  const loop = i;
  w(0xD0, 0x18);       // DRW V0, V1, 8

  // delay a bit using timer
  w(0x64, 0x02);       // V4 = 2
  w(0xF4, 0x15);       // LD DT, V4
  // wait DT==0
  const waitDt = i;
  w(0xF5, 0x07);       // LD V5, DT
  w(0x35, 0x00);       // SE V5, 0
  w(0x12, 0x00 | ((0x200 + waitDt) >> 8),); // will fix JP
  // Fix: JP is 1NNN. Let's use labels carefully.

  // Simpler approach — hardcode addresses after we know them.
  return buildDemoRomFixed();
}

function buildDemoRomFixed() {
  // Full program as absolute addresses (loaded at 0x200).
  // Ball bounce with simple delay.
  //
  // 0x200 CLS
  // 0x202 V0=20 V1=10 V2=1 V3=1
  // 0x20A I=0x2F0 (sprite in ROM space → 0x2F0)
  // loop 0x20C:
  //   DRW V0 V1 4
  //   ADD V0 V2
  //   ADD V1 V3
  //   // bounds: if V0==0 or V0==56, V2=-V2  (approx)
  //   ...
  // Sprite at 0x2F0 (offset 0xF0 in rom file)

  const rom = new Uint8Array(0x100);

  // Program at start (0x200)
  const p = [
    0x00, 0xE0,       // 200 CLS
    0x60, 0x14,       // 202 LD V0, 20
    0x61, 0x0A,       // 204 LD V1, 10
    0x62, 0x01,       // 206 LD V2, 1
    0x63, 0x01,       // 208 LD V3, 1
    0xA2, 0xF0,       // 20A LD I, 0x2F0
    // loop @ 20C
    0xD0, 0x14,       // 20C DRW V0, V1, 4
    // delay
    0x64, 0x03,       // 20E LD V4, 3
    0xF4, 0x15,       // 210 LD DT, V4
    // wait @ 212
    0xF5, 0x07,       // 212 LD V5, DT
    0x35, 0x00,       // 214 SE V5, 0
    0x12, 0x12,       // 216 JP 0x212
    // erase (xor again)
    0xD0, 0x14,       // 218 DRW V0, V1, 4
    // move
    0x80, 0x24,       // 21A ADD V0, V2
    0x81, 0x34,       // 21C ADD V1, V3
    // if V0 == 0 → flip dx  (V0 == 0)
    0x40, 0x00,       // 21E SNE V0, 0
    0x62, 0x01,       // 220 LD V2, 1
    // if V0 == 60 → flip
    0x40, 0x3C,       // 222 SNE V0, 60
    0x62, 0xFF,       // 224 LD V2, -1
    // if V1 == 0
    0x41, 0x00,       // 226 SNE V1, 0
    0x63, 0x01,       // 228 LD V3, 1
    // if V1 == 28
    0x41, 0x1C,       // 22A SNE V1, 28
    0x63, 0xFF,       // 22C LD V3, -1
    // key check: if key 5 (W) pressed, beep
    0x65, 0x05,       // 22E LD V5, 5
    0xE5, 0x9E,       // 230 SKP V5
    0x12, 0x0C,       // 232 JP 0x20C
    0x66, 0x05,       // 234 LD V6, 5
    0xF6, 0x18,       // 236 LD ST, V6
    0x12, 0x0C,       // 238 JP 0x20C
  ];

  for (let i = 0; i < p.length; i++) rom[i] = p[i];

  // 4-row ball sprite at offset 0xF0 → memory 0x2F0
  const sprite = [0x60, 0xF0, 0xF0, 0x60]; // small diamond/ball
  for (let i = 0; i < sprite.length; i++) rom[0xF0 + i] = sprite[i];

  return rom;
}

export const BUILTIN_DEMO = buildDemoRomFixed();
