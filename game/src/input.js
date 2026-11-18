// Keyboard input: WASD/arrows, Shift, Space, E, P/Esc, H, M, N.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  const listeners = [];
  function onKeyDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  }
  // Clicking the canvas focuses the page so keys land here after a reload.
  function onPointerDown() { window.focus(); }
  window.addEventListener('pointerdown', onPointerDown);
  function onKeyUp(e) { keys.delete(e.code); }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  listeners.push(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerdown', onPointerDown);
  });
  return {
    down(code) { return keys.has(code); },
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    wasPressed(code) { return pressed.has(code); },
    consume(code) { pressed.delete(code); },
    endFrame() { pressed.clear(); },
    destroy() { listeners.forEach((f) => f()); },
  };
}
