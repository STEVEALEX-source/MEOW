/**
 * CHIP-8 virtual machine — written from scratch.
 * Spec: 4 KB RAM, 16×8-bit registers, 64×32 display, 16-key keypad,
 * delay + sound timers, 16-level stack, ~35 opcodes.
 */

export const DISPLAY_W = 64;
export const DISPLAY_H = 32;
export const MEM_SIZE = 4096;
export const PROG_START = 0x200;

// Classic CHIP-8 hex font (0–F), 5 bytes each
const FONT = new Uint8Array([
  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
  0xF0, 0x80, 0xF0, 0x80, 0x80, // F
]);

export class Chip8 {
  constructor() {
    this.memory = new Uint8Array(MEM_SIZE);
    this.V = new Uint8Array(16);
    this.I = 0;
    this.pc = PROG_START;
    this.sp = 0;
    this.stack = new Uint16Array(16);
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.display = new Uint8Array(DISPLAY_W * DISPLAY_H);
    this.keys = new Uint8Array(16);
    this.drawFlag = false;
    this.waitingForKey = -1; // V-register index, or -1
    this.running = false;
    this.memory.set(FONT, 0x50);
  }

  /** Reset machine and optionally load a ROM (Uint8Array). */
  load(rom) {
    this.memory.fill(0);
    this.memory.set(FONT, 0x50);
    this.V.fill(0);
    this.I = 0;
    this.pc = PROG_START;
    this.sp = 0;
    this.stack.fill(0);
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.display.fill(0);
    this.keys.fill(0);
    this.drawFlag = true;
    this.waitingForKey = -1;
    this.running = false;

    if (rom) {
      if (rom.length > MEM_SIZE - PROG_START) {
        throw new Error(`ROM too large (${rom.length} bytes). Max ${MEM_SIZE - PROG_START}.`);
      }
      this.memory.set(rom, PROG_START);
    }
  }

  setKey(key, pressed) {
    if (key < 0 || key > 15) return;
    const wasUp = this.keys[key] === 0;
    this.keys[key] = pressed ? 1 : 0;
    // FX0A: wait for key press
    if (pressed && wasUp && this.waitingForKey >= 0) {
      this.V[this.waitingForKey] = key;
      this.waitingForKey = -1;
    }
  }

  /** Tick delay & sound timers (call at 60 Hz). */
  tickTimers() {
    if (this.delayTimer > 0) this.delayTimer--;
    if (this.soundTimer > 0) this.soundTimer--;
  }

  get beeping() {
    return this.soundTimer > 0;
  }

  /**
   * Execute one instruction.
   * Returns false if halted (waiting for key or invalid).
   */
  step() {
    if (this.waitingForKey >= 0) return false;

    const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    this.pc = (this.pc + 2) & 0xfff;

    const x = (opcode & 0x0f00) >> 8;
    const y = (opcode & 0x00f0) >> 4;
    const n = opcode & 0x000f;
    const nn = opcode & 0x00ff;
    const nnn = opcode & 0x0fff;

    switch (opcode & 0xf000) {
      case 0x0000:
        if (opcode === 0x00e0) {
          // CLS
          this.display.fill(0);
          this.drawFlag = true;
        } else if (opcode === 0x00ee) {
          // RET
          if (this.sp === 0) return false;
          this.sp--;
          this.pc = this.stack[this.sp];
        }
        // 0NNN (SYS) ignored on modern interpreters
        break;

      case 0x1000: // JP addr
        this.pc = nnn;
        break;

      case 0x2000: // CALL addr
        this.stack[this.sp] = this.pc;
        this.sp = (this.sp + 1) & 0xf;
        this.pc = nnn;
        break;

      case 0x3000: // SE Vx, byte
        if (this.V[x] === nn) this.pc = (this.pc + 2) & 0xfff;
        break;

      case 0x4000: // SNE Vx, byte
        if (this.V[x] !== nn) this.pc = (this.pc + 2) & 0xfff;
        break;

      case 0x5000: // SE Vx, Vy
        if (n === 0 && this.V[x] === this.V[y]) this.pc = (this.pc + 2) & 0xfff;
        break;

      case 0x6000: // LD Vx, byte
        this.V[x] = nn;
        break;

      case 0x7000: // ADD Vx, byte
        this.V[x] = (this.V[x] + nn) & 0xff;
        break;

      case 0x8000:
        switch (n) {
          case 0x0: this.V[x] = this.V[y]; break;                         // LD
          case 0x1: this.V[x] |= this.V[y]; this.V[0xf] = 0; break;      // OR  (quirks: reset VF)
          case 0x2: this.V[x] &= this.V[y]; this.V[0xf] = 0; break;      // AND
          case 0x3: this.V[x] ^= this.V[y]; this.V[0xf] = 0; break;      // XOR
          case 0x4: { // ADD Vx, Vy
            const sum = this.V[x] + this.V[y];
            this.V[x] = sum & 0xff;
            this.V[0xf] = sum > 0xff ? 1 : 0;
            break;
          }
          case 0x5: { // SUB Vx, Vy
            const vf = this.V[x] >= this.V[y] ? 1 : 0;
            this.V[x] = (this.V[x] - this.V[y]) & 0xff;
            this.V[0xf] = vf;
            break;
          }
          case 0x6: { // SHR Vx {, Vy} — modern: shift Vx, quirk: use Vy
            const src = this.V[x]; // COSMAC would use Vy; modern shifts Vx
            this.V[x] = src >> 1;
            this.V[0xf] = src & 1;
            break;
          }
          case 0x7: { // SUBN Vx, Vy
            const vf = this.V[y] >= this.V[x] ? 1 : 0;
            this.V[x] = (this.V[y] - this.V[x]) & 0xff;
            this.V[0xf] = vf;
            break;
          }
          case 0xe: { // SHL Vx {, Vy}
            const src = this.V[x];
            this.V[x] = (src << 1) & 0xff;
            this.V[0xf] = (src & 0x80) >> 7;
            break;
          }
          default:
            break;
        }
        break;

      case 0x9000: // SNE Vx, Vy
        if (n === 0 && this.V[x] !== this.V[y]) this.pc = (this.pc + 2) & 0xfff;
        break;

      case 0xa000: // LD I, addr
        this.I = nnn;
        break;

      case 0xb000: // JP V0, addr
        this.pc = (nnn + this.V[0]) & 0xfff;
        break;

      case 0xc000: // RND Vx, byte
        this.V[x] = (Math.floor(Math.random() * 256) & nn);
        break;

      case 0xd000: { // DRW Vx, Vy, nibble
        const xPos = this.V[x] % DISPLAY_W;
        const yPos = this.V[y] % DISPLAY_H;
        this.V[0xf] = 0;
        for (let row = 0; row < n; row++) {
          const sprite = this.memory[(this.I + row) & 0xfff];
          const py = yPos + row;
          if (py >= DISPLAY_H) break; // clip vertically
          for (let col = 0; col < 8; col++) {
            if (!(sprite & (0x80 >> col))) continue;
            const px = xPos + col;
            if (px >= DISPLAY_W) break; // clip horizontally
            const idx = py * DISPLAY_W + px;
            if (this.display[idx]) this.V[0xf] = 1;
            this.display[idx] ^= 1;
          }
        }
        this.drawFlag = true;
        break;
      }

      case 0xe000:
        if (nn === 0x9e) {
          // SKP Vx
          if (this.keys[this.V[x] & 0xf]) this.pc = (this.pc + 2) & 0xfff;
        } else if (nn === 0xa1) {
          // SKNP Vx
          if (!this.keys[this.V[x] & 0xf]) this.pc = (this.pc + 2) & 0xfff;
        }
        break;

      case 0xf000:
        switch (nn) {
          case 0x07: this.V[x] = this.delayTimer; break;
          case 0x0a: // LD Vx, K — wait for key
            this.waitingForKey = x;
            break;
          case 0x15: this.delayTimer = this.V[x]; break;
          case 0x18: this.soundTimer = this.V[x]; break;
          case 0x1e: { // ADD I, Vx
            this.I = (this.I + this.V[x]) & 0xffff;
            // Amiga quirk: VF set on overflow past 0xFFF
            this.V[0xf] = this.I > 0xfff ? 1 : 0;
            this.I &= 0xfff;
            break;
          }
          case 0x29: // LD F, Vx — font sprite address
            this.I = 0x50 + (this.V[x] & 0xf) * 5;
            break;
          case 0x33: { // LD B, Vx — BCD
            const val = this.V[x];
            this.memory[this.I & 0xfff] = Math.floor(val / 100);
            this.memory[(this.I + 1) & 0xfff] = Math.floor((val % 100) / 10);
            this.memory[(this.I + 2) & 0xfff] = val % 10;
            break;
          }
          case 0x55: // LD [I], Vx
            for (let i = 0; i <= x; i++) {
              this.memory[(this.I + i) & 0xfff] = this.V[i];
            }
            // Original COSMAC increments I; modern leaves it
            break;
          case 0x65: // LD Vx, [I]
            for (let i = 0; i <= x; i++) {
              this.V[i] = this.memory[(this.I + i) & 0xfff];
            }
            break;
          default:
            break;
        }
        break;

      default:
        break;
    }
    return true;
  }
}
