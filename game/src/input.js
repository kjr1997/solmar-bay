// Solmar Bay — keyboard input. Tracks held keys and edge-triggered presses.
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.anyKey = false;
    this.onKeyDown = (e) => {
      const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE',
        'KeyP', 'KeyH', 'KeyM', 'KeyN', 'Escape', 'ShiftLeft', 'ShiftRight',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (gameKeys.includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      this.anyKey = true;
    };
    this.onKeyUp = (e) => { this.down.delete(e.code); };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  isDown(code) { return this.down.has(code); }

  // True once, on the frame the key went down. Consumed by endFrame().
  wasPressed(code) { return this.pressed.has(code); }

  // WASD / arrow movement vector, normalised.
  moveVector() {
    let x = 0, y = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) x -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) x += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) y -= 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  endFrame() { this.pressed.clear(); this.anyKey = false; }

  // Drop all held state (used when the window loses focus mid-drive).
  clear() { this.down.clear(); this.pressed.clear(); }
}
