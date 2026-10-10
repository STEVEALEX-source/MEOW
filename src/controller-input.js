const VIRTUAL_BUTTONS = new Set(['a', 'b', 'x', 'y', 'l', 'r', 'start', 'select']);

/** Button name → EmulatorJS input index (control mapping). */
const BUTTON_INDEX = {
  b: 0, y: 1, select: 2, start: 3,
  up: 4, down: 5, left: 6, right: 7,
  a: 8, x: 9, l: 10, r: 11,
};

/** KeyboardEvent.code → EmulatorJS input index. */
const CODE_TO_INDEX = new Map([
  ['ArrowUp', 4], ['ArrowDown', 5], ['ArrowLeft', 6], ['ArrowRight', 7],
  ['KeyZ', 8],  // A
  ['KeyX', 0],  // B
  ['KeyA', 9],  // X
  ['KeyS', 1],  // Y
  ['KeyQ', 10], // L
  ['KeyE', 11], // R
  ['KeyV', 2],  // Select
  ['Enter', 3], // Start
]);

function getGameManager(frame) {
  try {
    return frame?.contentWindow?.EJS_emulator?.gameManager || null;
  } catch {
    return null;
  }
}

/** Press/release via simulateInput (most reliable) or virtual-pad touch events. */
export function dispatchVirtualButton(frame, buttonName, pressed) {
  if (!VIRTUAL_BUTTONS.has(buttonName) || typeof pressed !== 'boolean') return false;

  const index = BUTTON_INDEX[buttonName];
  if (index === undefined) return false;

  // Prefer direct core input — works whether or not the pad is visible.
  const gm = getGameManager(frame);
  if (gm && typeof gm.simulateInput === 'function') {
    try {
      gm.simulateInput(0, index, pressed ? 1 : 0);
      return true;
    } catch {
      // fall through to touch path
    }
  }

  try {
    const playerWindow = frame?.contentWindow;
    const playerDocument = frame?.contentDocument;
    if (!playerWindow || !playerDocument || typeof playerWindow.Event !== 'function') return false;

    const button = playerDocument.querySelector(`.ejs_virtualGamepad_button.b_${buttonName}`);
    if (!button || typeof button.dispatchEvent !== 'function') return false;

    const eventName = pressed ? 'touchstart' : 'touchend';
    button.dispatchEvent(new playerWindow.Event(eventName, { bubbles: true, cancelable: true }));
    return true;
  } catch {
    return false;
  }
}

/** Forward a launcher key into the player (prefer simulateInput). */
export function dispatchPlayerKey(frame, eventType, code) {
  if (!['keydown', 'keyup'].includes(eventType) || !CODE_TO_INDEX.has(code)) return false;

  const index = CODE_TO_INDEX.get(code);
  const pressed = eventType === 'keydown';
  const gm = getGameManager(frame);

  if (gm && typeof gm.simulateInput === 'function') {
    try {
      gm.simulateInput(0, index, pressed ? 1 : 0);
      return true;
    } catch {
      // fall through
    }
  }

  // Fallback: synthetic key event with forced keyCode
  const keyCodeByIndex = {
    4: 38, 5: 40, 6: 37, 7: 39,
    8: 90, 0: 88, 9: 65, 1: 83, 10: 81, 11: 69, 2: 86, 3: 13,
  };
  const keyNameByIndex = {
    4: 'up arrow', 5: 'down arrow', 6: 'left arrow', 7: 'right arrow',
    8: 'z', 0: 'x', 9: 'a', 1: 's', 10: 'q', 11: 'e', 2: 'v', 3: 'enter',
  };

  try {
    const playerWindow = frame?.contentWindow;
    const playerBody = frame?.contentDocument?.body;
    if (!playerWindow || typeof playerWindow.KeyboardEvent !== 'function' || !playerBody) return false;

    const event = new playerWindow.KeyboardEvent(eventType, {
      key: keyNameByIndex[index],
      code,
      bubbles: true,
      cancelable: true,
    });
    const keyCode = keyCodeByIndex[index];
    Object.defineProperty(event, 'keyCode', { get: () => keyCode });
    Object.defineProperty(event, 'which', { get: () => keyCode });
    playerBody.dispatchEvent(event);
    return true;
  } catch {
    return false;
  }
}
