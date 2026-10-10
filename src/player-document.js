import { SYSTEMS } from './systems.js';

export const EMULATORJS_DATA_PATH = 'https://cdn.emulatorjs.org/stable/data/';

function safeJson(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => ({
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  })[character]);
}

/**
 * Official-style virtual pad layouts (input indices match EmulatorJS control map:
 * B=0 Y=1 Select=2 Start=3 Up=4 Down=5 Left=6 Right=7 A=8 X=9 L=10 R=11).
 */
function touchControls(systemId) {
  if (systemId === 'gba') {
    return [
      { type: 'button', text: 'Y', id: 'y', location: 'right', left: 40, bold: true, input_value: 1 },
      { type: 'button', text: 'X', id: 'x', location: 'right', top: 40, bold: true, input_value: 9 },
      { type: 'button', text: 'A', id: 'a', location: 'right', left: 81, top: 40, bold: true, input_value: 8 },
      { type: 'button', text: 'B', id: 'b', location: 'right', left: 40, top: 80, bold: true, input_value: 0 },
      { type: 'dpad', id: 'dpad', location: 'left', left: '50%', top: '50%', joystickInput: false, inputValues: [4, 5, 6, 7] },
      { type: 'button', text: 'Start', id: 'start', location: 'center', left: 60, fontSize: 15, block: true, input_value: 3 },
      { type: 'button', text: 'Select', id: 'select', location: 'center', left: -5, fontSize: 15, block: true, input_value: 2 },
      { type: 'button', text: 'L', id: 'l', location: 'left', left: 3, top: -100, bold: true, block: true, input_value: 10 },
      { type: 'button', text: 'R', id: 'r', location: 'right', left: 3, top: -100, bold: true, block: true, input_value: 11 },
    ];
  }
  // NES
  return [
    { type: 'button', text: 'A', id: 'a', location: 'right', left: 81, top: 40, bold: true, input_value: 8 },
    { type: 'button', text: 'B', id: 'b', location: 'right', left: 40, top: 80, bold: true, input_value: 0 },
    { type: 'dpad', id: 'dpad', location: 'left', left: '50%', top: '50%', joystickInput: false, inputValues: [4, 5, 6, 7] },
    { type: 'button', text: 'Start', id: 'start', location: 'center', left: 60, fontSize: 15, block: true, input_value: 3 },
    { type: 'button', text: 'Select', id: 'select', location: 'center', left: -5, fontSize: 15, block: true, input_value: 2 },
  ];
}

/**
 * Keyboard map using EmulatorJS keyMap strings exactly.
 * Z=A, X=B, arrows=D-pad, Enter=Start, V=Select, A/S=X/Y, Q/E=L/R.
 */
function defaultKeyboardControls() {
  const mapping = {
    0: { value: 'x', value2: 'BUTTON_2' },
    1: { value: 's', value2: 'BUTTON_4' },
    2: { value: 'v', value2: 'SELECT' },
    3: { value: 'enter', value2: 'START' },
    4: { value: 'up arrow', value2: 'DPAD_UP' },
    5: { value: 'down arrow', value2: 'DPAD_DOWN' },
    6: { value: 'left arrow', value2: 'DPAD_LEFT' },
    7: { value: 'right arrow', value2: 'DPAD_RIGHT' },
    8: { value: 'z', value2: 'BUTTON_1' },
    9: { value: 'a', value2: 'BUTTON_3' },
    10: { value: 'q', value2: 'LEFT_TOP_SHOULDER' },
    11: { value: 'e', value2: 'RIGHT_TOP_SHOULDER' },
  };
  return { 0: mapping, 1: {}, 2: {}, 3: {} };
}

export function buildPlayerDocument(systemId, romUrl, romName) {
  const system = SYSTEMS[systemId];
  if (!system) throw new Error('Unsupported emulator system.');
  if (typeof romUrl !== 'string' || !romUrl.startsWith('blob:')) throw new Error('ROM must be opened from this browser.');
  if (typeof romName !== 'string' || romName.length > 200) throw new Error('Invalid ROM filename.');

  const controls = safeJson(touchControls(systemId));
  const keyboard = safeJson(defaultKeyboardControls());
  const core = safeJson(system.core);
  const scheme = safeJson(system.controlScheme);
  const url = safeJson(romUrl);
  const gameName = safeJson(romName);
  const targetOrigin = 'window.parent.location.origin';
  const buttons = safeJson({
    playPause: true,
    restart: true,
    settings: true,
    fullscreen: true,
    saveState: true,
    loadState: true,
    quickSave: true,
    quickLoad: true,
    volume: true,
    mute: true,
    screenshot: true,
    saveSavFiles: true,
    loadSavFiles: true,
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="referrer" content="no-referrer">
<style>
html,body,#game{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:#080a0b}
body{font-family:system-ui,sans-serif}
#game{position:relative;touch-action:none}
.ejs_virtualGamepad_button{
  color:#f1e8cb!important;background:rgba(190,58,45,.96)!important;
  border-color:#f1e8cb!important;border-radius:0!important;box-shadow:0 3px 0 #54211b!important;
  pointer-events:auto!important;cursor:pointer!important;
}
.ejs_dpad_main{opacity:1!important;pointer-events:auto!important}
.ejs_dpad_bar{background:rgba(216,185,94,.96)!important;box-shadow:0 3px 0 #594820!important}
@media(pointer:coarse){
  .ejs_virtualGamepad_button{width:62px!important;min-width:62px!important;height:60px!important;line-height:58px!important;font-size:18px!important}
  .ejs_virtualGamepad_button.b_select,.ejs_virtualGamepad_button.b_start{width:80px!important;min-width:80px!important;height:44px!important;line-height:42px!important;font-size:13px!important}
  .ejs_virtualGamepad_button.b_l,.ejs_virtualGamepad_button.b_r{width:70px!important;min-width:70px!important;height:40px!important;line-height:38px!important;font-size:16px!important}
}
</style>
</head>
<body>
<div id="game" aria-label="${system.shortLabel} emulator player">Loading emulator…</div>
<script>
window.EJS_player = "#game";
window.EJS_core = ${core};
window.EJS_controlScheme = ${scheme};
window.EJS_gameUrl = ${url};
window.EJS_gameName = ${gameName};
window.EJS_pathtodata = ${safeJson(EMULATORJS_DATA_PATH)};
window.EJS_Buttons = ${buttons};
window.EJS_defaultControls = ${keyboard};
window.EJS_VirtualGamepadSettings = ${controls};
// Prevent stale localStorage mappings from overriding our controls.
window.EJS_disableLocalStorage = true;

window.EJS_onGameStart = function() {
  var emulator = window.EJS_emulator;
  var controlsVisible = true;
  if (emulator && typeof emulator.toggleVirtualGamepad === 'function') {
    emulator.toggleVirtualGamepad(controlsVisible);
  }
  // Wire mouse/pen support onto virtual pad buttons (EmulatorJS only binds touch by default).
  meowBindMouseToPad();
  parent.postMessage({ source: "meow-emulator", type: "game-started", system: ${safeJson(systemId)}, touchControlsVisible: controlsVisible }, ${targetOrigin});
};

// ── Mouse / pen → virtual pad (and direct simulateInput) ──
var meowPointerButtons = new Map();
var meowSpacePressed = false;
var meowMouseBound = false;

var MEOW_BUTTON_INDEX = { a:8, b:0, x:9, y:1, l:10, r:11, start:3, select:2 };

function meowSimulate(buttonName, pressed) {
  var idx = MEOW_BUTTON_INDEX[buttonName];
  if (idx === undefined) return false;
  try {
    var gm = window.EJS_emulator && window.EJS_emulator.gameManager;
    if (gm && typeof gm.simulateInput === 'function') {
      gm.simulateInput(0, idx, pressed ? 1 : 0);
      return true;
    }
  } catch (_) {}
  return false;
}

function meowTouchButton(button, type) {
  if (!button) return;
  button.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
}

function meowPadButton(target) {
  if (!(target instanceof Element)) return null;
  var button = target.closest('.ejs_virtualGamepad_button');
  if (!button) return null;
  var names = ['a','b','x','y','l','r','start','select'];
  for (var i = 0; i < names.length; i++) {
    if (button.classList.contains('b_' + names[i])) return { el: button, name: names[i] };
  }
  return null;
}

function meowBindMouseToPad() {
  if (meowMouseBound) return;
  meowMouseBound = true;

  // Capture phase so we get events even if EmulatorJS stops them.
  window.addEventListener('pointerdown', function(event) {
    if (event.pointerType === 'touch') return; // native touch already handled
    var pad = meowPadButton(event.target);
    if (!pad || meowPointerButtons.has(event.pointerId)) return;
    event.preventDefault();
    meowPointerButtons.set(event.pointerId, pad);
    if (typeof pad.el.setPointerCapture === 'function') {
      try { pad.el.setPointerCapture(event.pointerId); } catch (_) {}
    }
    if (!meowSimulate(pad.name, true)) meowTouchButton(pad.el, 'touchstart');
  }, true);

  function release(event) {
    var pad = meowPointerButtons.get(event.pointerId);
    if (!pad) return;
    meowPointerButtons.delete(event.pointerId);
    if (!meowSimulate(pad.name, false)) meowTouchButton(pad.el, 'touchend');
  }
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
  window.addEventListener('lostpointercapture', release, true);

  // Also bind mousedown/mouseup as a fallback for older browsers.
  window.addEventListener('mousedown', function(event) {
    if (event.button !== 0) return;
    var pad = meowPadButton(event.target);
    if (!pad) return;
    event.preventDefault();
    meowPointerButtons.set('mouse', pad);
    if (!meowSimulate(pad.name, true)) meowTouchButton(pad.el, 'touchstart');
  }, true);
  window.addEventListener('mouseup', function(event) {
    var pad = meowPointerButtons.get('mouse');
    if (!pad) return;
    meowPointerButtons.delete('mouse');
    if (!meowSimulate(pad.name, false)) meowTouchButton(pad.el, 'touchend');
  }, true);
}

// Space → A (works even without focus on a pad button)
window.addEventListener('keydown', function(event) {
  if (event.code !== 'Space' || event.repeat || meowSpacePressed) return;
  if (event.target && event.target.closest && event.target.closest('input,textarea,select,button,[contenteditable="true"]')) return;
  event.preventDefault();
  meowSpacePressed = true;
  if (!meowSimulate('a', true)) {
    meowTouchButton(document.querySelector('.ejs_virtualGamepad_button.b_a'), 'touchstart');
  }
}, true);
window.addEventListener('keyup', function(event) {
  if (event.code !== 'Space' || !meowSpacePressed) return;
  event.preventDefault();
  meowSpacePressed = false;
  if (!meowSimulate('a', false)) {
    meowTouchButton(document.querySelector('.ejs_virtualGamepad_button.b_a'), 'touchend');
  }
}, true);
window.addEventListener('blur', function() {
  if (meowSpacePressed) {
    meowSpacePressed = false;
    meowSimulate('a', false);
  }
  meowPointerButtons.forEach(function(pad) { meowSimulate(pad.name, false); });
  meowPointerButtons.clear();
});

window.addEventListener("error", function(event) {
  parent.postMessage({ source: "meow-emulator", type: "runtime-error", system: ${safeJson(systemId)}, message: String(event.message || "Emulator runtime error").slice(0, 180) }, ${targetOrigin});
});
var loader = document.createElement("script");
loader.src = ${safeJson(`${EMULATORJS_DATA_PATH}loader.js`)};
loader.onerror = function() {
  parent.postMessage({ source: "meow-emulator", type: "cdn-error", system: ${safeJson(systemId)} }, ${targetOrigin});
};
document.body.appendChild(loader);
</script>
</body>
</html>`;
}
