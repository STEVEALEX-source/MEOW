# chip8lab

A **CHIP-8 emulator written from scratch** in the browser (JavaScript).  
Not a wrapper around another emulator — the CPU, memory, display, timers and keypad are all implemented here.

## Run

```sh
npm start
```

Open **http://localhost:3000**

- Press **Demo** for a built-in bouncing-ball program  
- Or **Open ROM** and load any public-domain `.ch8` / `.c8` file  

## Controls

CHIP-8 uses a 16-key hex keypad:

```
CHIP-8      Keyboard
1 2 3 C  →  1 2 3 4
4 5 6 D  →  Q W E R
7 8 9 E  →  A S D F
A 0 B F  →  Z X C V
```

On-screen pad works with touch and mouse.

## What’s implemented

| Piece | Status |
|-------|--------|
| All 35 standard CHIP-8 opcodes | Yes |
| 4 KB memory, PC at `0x200` | Yes |
| 64×32 XOR display | Yes |
| Delay + sound timers (60 Hz) | Yes |
| Hex keypad + FX0A wait | Yes |
| Built-in font at `0x50` | Yes |
| Super-CHIP / XO-CHIP | No |

Quirks used (common “modern” behaviour):

- `8XY6` / `8XYE` shift **Vx** (not Vy)
- `8XY1/2/3` reset VF to 0
- `FX55` / `FX65` do **not** increment I

## Accuracy

Unit tests cover CLS, jump, call/ret, skips, arithmetic+carry, draw+collision, BCD, key-wait, and timers:

```sh
npm test
```

For deeper checks, run [Timendus’s chip8-test-suite](https://github.com/Timendus/chip8-test-suite) ROMs via **Open ROM**.

## About ROMs

No commercial games are bundled. Use public-domain CHIP-8 programs only.  
ROMs stay in your browser — nothing is uploaded.

## Why CHIP-8?

It’s a tiny 1970s virtual machine (not real hardware): 35 instructions, 4 KB RAM, 16 registers, 64×32 screen — small enough to implement fully, big enough to run Pong, Tetris clones, and more.
# MEOW
