// Keyboard input: held keys plus edge-triggered "just pressed" keys, so the
// game can tell a tap (E, Space on the title screen) from a hold (WASD).
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.anyKey = false;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      this.anyKey = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  held(code) { return this.down.has(code); }

  // True if any of the given codes was just pressed this frame.
  hitAny(codes) { return codes.some((c) => this.pressed.has(c)); }

  // True once, on the frame the key went down. Consumed by endFrame().
  hit(code) { return this.pressed.has(code); }

  axis(neg, pos) {
    return (this.down.has(pos) ? 1 : 0) - (this.down.has(neg) ? 1 : 0);
  }

  // WASD plus arrow keys, normalised.
  moveVector() {
    const x = this.axis('KeyA', 'KeyD') + this.axis('ArrowLeft', 'ArrowRight');
    const y = this.axis('KeyW', 'KeyS') + this.axis('ArrowUp', 'ArrowDown');
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len, active: x !== 0 || y !== 0 };
  }

  endFrame() {
    this.pressed.clear();
    this.anyKey = false;
  }
}
