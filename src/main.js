import { Chip8, DISPLAY_W, DISPLAY_H } from './chip8.js';
import { BUILTIN_DEMO } from './demo-rom.js';

const CPU_HZ = 500;
const TIMER_HZ = 60;
const SCALE = 10;

const chip = new Chip8();
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const romName = document.getElementById('rom-name');
const fileInput = document.getElementById('rom-file');
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');
const btnDemo = document.getElementById('btn-demo');
const keypadEl = document.getElementById('keypad');

canvas.width = DISPLAY_W * SCALE;
canvas.height = DISPLAY_H * SCALE;
ctx.imageSmoothingEnabled = false;

let animId = null;
let lastTs = 0;
let accCpu = 0;
let accTimer = 0;
let audioCtx = null;
let osc = null;
let gain = null;
let audioOn = false;

// CHIP-8 keypad layout → keyboard
// 1 2 3 C     1 2 3 4
// 4 5 6 D     Q W E R
// 7 8 9 E     A S D F
// A 0 B F     Z X C V
const KEY_MAP = {
  Digit1: 0x1, Digit2: 0x2, Digit3: 0x3, Digit4: 0xc,
  KeyQ: 0x4, KeyW: 0x5, KeyE: 0x6, KeyR: 0xd,
  KeyA: 0x7, KeyS: 0x8, KeyD: 0x9, KeyF: 0xe,
  KeyZ: 0xa, KeyX: 0x0, KeyC: 0xb, KeyV: 0xf,
};

const KEY_LABELS = [
  ['1', '2', '3', 'C'],
  ['4', '5', '6', 'D'],
  ['7', '8', '9', 'E'],
  ['A', '0', 'B', 'F'],
];
const KEY_IDS = [
  [0x1, 0x2, 0x3, 0xc],
  [0x4, 0x5, 0x6, 0xd],
  [0x7, 0x8, 0x9, 0xe],
  [0xa, 0x0, 0xb, 0xf],
];

function setStatus(msg, kind = '') {
  status.textContent = msg;
  status.dataset.kind = kind;
}

function draw() {
  if (!chip.drawFlag) return;
  chip.drawFlag = false;
  const img = ctx.createImageData(DISPLAY_W * SCALE, DISPLAY_H * SCALE);
  const d = img.data;
  for (let y = 0; y < DISPLAY_H; y++) {
    for (let x = 0; x < DISPLAY_W; x++) {
      const on = chip.display[y * DISPLAY_W + x];
      const r = on ? 0xc8 : 0x10;
      const g = on ? 0xf0 : 0x14;
      const b = on ? 0x90 : 0x18;
      for (let sy = 0; sy < SCALE; sy++) {
        for (let sx = 0; sx < SCALE; sx++) {
          const i = ((y * SCALE + sy) * DISPLAY_W * SCALE + (x * SCALE + sx)) * 4;
          d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  osc = audioCtx.createOscillator();
  gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 440;
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
}

function updateAudio() {
  if (!gain) return;
  const target = chip.beeping ? 0.08 : 0;
  gain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.01);
}

function frame(ts) {
  if (!chip.running) {
    animId = null;
    return;
  }
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;

  accCpu += dt * CPU_HZ;
  while (accCpu >= 1) {
    chip.step();
    accCpu -= 1;
  }

  accTimer += dt * TIMER_HZ;
  while (accTimer >= 1) {
    chip.tickTimers();
    accTimer -= 1;
  }

  draw();
  updateAudio();
  animId = requestAnimationFrame(frame);
}

function start() {
  if (chip.running) return;
  ensureAudio();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  chip.running = true;
  lastTs = 0;
  accCpu = 0;
  accTimer = 0;
  btnPlay.disabled = true;
  btnPause.disabled = false;
  setStatus('Running', 'ready');
  animId = requestAnimationFrame(frame);
}

function pause() {
  chip.running = false;
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  btnPlay.disabled = false;
  btnPause.disabled = true;
  setStatus('Paused');
  if (gain) gain.gain.value = 0;
}

function reset() {
  pause();
  const hadRom = romName.dataset.loaded === '1';
  if (hadRom && chip._lastRom) {
    chip.load(chip._lastRom);
    draw();
    setStatus('Reset — press Play');
  } else {
    loadDemo();
  }
}

function loadRom(bytes, name) {
  pause();
  try {
    chip.load(bytes);
    chip._lastRom = bytes;
    romName.textContent = name;
    romName.dataset.loaded = '1';
    draw();
    setStatus('ROM loaded — press Play', 'ready');
    btnPlay.disabled = false;
    btnReset.disabled = false;
  } catch (e) {
    setStatus(e.message, 'error');
  }
}

function loadDemo() {
  loadRom(BUILTIN_DEMO, 'Bouncing Ball (demo)');
}

// Build on-screen keypad
function buildKeypad() {
  keypadEl.innerHTML = '';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const id = KEY_IDS[row][col];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pad-key';
      btn.textContent = KEY_LABELS[row][col];
      btn.dataset.key = String(id);
      btn.setAttribute('aria-label', `Key ${KEY_LABELS[row][col]}`);
      const press = (e) => {
        e.preventDefault();
        chip.setKey(id, true);
        btn.classList.add('down');
        ensureAudio();
      };
      const release = (e) => {
        e.preventDefault();
        chip.setKey(id, false);
        btn.classList.remove('down');
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
      keypadEl.appendChild(btn);
    }
  }
}

window.addEventListener('keydown', (e) => {
  const k = KEY_MAP[e.code];
  if (k === undefined) return;
  if (e.repeat) { e.preventDefault(); return; }
  e.preventDefault();
  chip.setKey(k, true);
  const btn = keypadEl.querySelector(`[data-key="${k}"]`);
  if (btn) btn.classList.add('down');
  ensureAudio();
});
window.addEventListener('keyup', (e) => {
  const k = KEY_MAP[e.code];
  if (k === undefined) return;
  e.preventDefault();
  chip.setKey(k, false);
  const btn = keypadEl.querySelector(`[data-key="${k}"]`);
  if (btn) btn.classList.remove('down');
});
window.addEventListener('blur', () => {
  for (let i = 0; i < 16; i++) chip.setKey(i, false);
  keypadEl.querySelectorAll('.down').forEach((b) => b.classList.remove('down'));
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    loadRom(buf, file.name);
  } catch (e) {
    setStatus(e.message || 'Could not read file', 'error');
  } finally {
    fileInput.value = '';
  }
});

btnPlay.addEventListener('click', start);
btnPause.addEventListener('click', pause);
btnReset.addEventListener('click', reset);
btnDemo.addEventListener('click', () => { loadDemo(); start(); });

buildKeypad();
loadDemo();
setStatus('Demo loaded — press Play (or open a .ch8 ROM)');
