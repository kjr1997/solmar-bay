// Keyboard and pointer input. Held keys give the loop a direction every frame;
// one-shot presses (punch, enter, pause, help, mute) are queued as flags and
// taken once, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_HELP = 4;
export const ACTION_MUTE = 8;

const KEYS = {
  up: new Set(['ArrowUp', 'KeyW']),
  down: new Set(['ArrowDown', 'KeyS']),
  left: new Set(['ArrowLeft', 'KeyA']),
  right: new Set(['ArrowRight', 'KeyD']),
  run: new Set(['ShiftLeft', 'ShiftRight']),
  handbrake: new Set(['Space']),
};
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const HELP = new Set(['KeyH']);
const MUTE = new Set(['KeyM']);
const ENTER = new Set(['KeyE']);

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false, run: false, handbrake: false };
  let actions = 0;
  let punch = false;
  let enter = false;

  function match(code, set) { return set.has(code); }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    for (const key of Object.keys(KEYS)) {
      if (match(event.code, KEYS[key])) {
        held[key] = true;
        event.preventDefault();
      }
    }
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    if (HELP.has(event.code)) actions |= ACTION_HELP;
    if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    if (ENTER.has(event.code)) enter = true;
    // Space is both handbrake and punch: the world decides by mode.
    if (event.code === 'Space') punch = true;
  });
  window.addEventListener('keyup', (event) => {
    for (const key of Object.keys(KEYS)) {
      if (match(event.code, KEYS[key])) held[key] = false;
    }
  });
  window.addEventListener('blur', () => {
    for (const key of Object.keys(held)) held[key] = false;
  });
  canvas.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    held,
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Punch and enter are consumed once per step by the world. */
    takePresses() {
      const taken = { punch, enter };
      punch = false;
      enter = false;
      return taken;
    },
  };
}
