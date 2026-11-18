// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), the renderer paints
// the city and the HUD paints the rest. The game moves between four screens:
// title, play, paused and help. Behind the title the city already lives —
// traffic drives and pedestrians walk while you decide.
//
// ?seed=N fixes the city's seed. ?shot=cover|street|chase|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_HELP, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createHud, SCREEN_HELP, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { missionTarget } from './missions.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

function readSaveSummary() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { cash: data.cash ?? 100, missionsDone: data.missionsDone ?? [] };
  } catch {
    return null;
  }
}

function runShot(name) {
  const world = createWorld(createRandom(seed), { save: false });
  const renderer = createRenderer(canvas);
  const hud = createHud(canvas);
  const scene = stageShot(name, world);
  window.__world = world; // debug aid: lets a screenshot script inspect the staged state
  const save = readSaveSummary();
  let painted = 0;
  function paint() {
    renderer.drawWorld(world.state, world.city, missionTarget(world));
    hud.draw(world.state, world, scene.screen, save);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const world = createWorld(createRandom(seed));
  const renderer = createRenderer(canvas);
  const hud = createHud(canvas);
  const audio = createAudio();
  const input = createInput(canvas);
  const save = readSaveSummary();
  if (save) world.loadSave();
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    if (fresh) {
      try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      world.reset();
    }
    audio.unlock();
    screen = SCREEN_PLAY;
    announce('Playing Solmar Bay. Follow the yellow marker.');
  }

  // N on the title screen starts over from scratch.
  window.addEventListener('keydown', (event) => {
    if (screen === SCREEN_TITLE && event.code === 'KeyN' && !event.repeat) startGame(true);
  });

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      world.message(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(false);
      return;
    }
    if (actions & ACTION_HELP) {
      screen = screen === SCREEN_HELP ? SCREEN_PLAY : SCREEN_HELP;
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      else if (screen === SCREEN_PAUSED || screen === SCREEN_HELP) screen = SCREEN_PLAY;
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    const presses = input.takePresses();
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
        const stepInput = screen === SCREEN_TITLE
          ? { up: false, down: false, left: false, right: false, run: false, handbrake: false, punch: false, enter: false }
          : {
              up: input.held.up, down: input.held.down, left: input.held.left,
              right: input.held.right, run: input.held.run, handbrake: input.held.handbrake,
              punch: presses.punch, enter: presses.enter,
            };
        world.step(STEP, stepInput);
        presses.punch = false;
        presses.enter = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const policeNear = world.state.cops.some((c) => Math.hypot(c.x - world.state.player.x, c.y - world.state.player.y) < 520)
      || world.state.cars.some((c) => c.driver === 'police' && Math.hypot(c.x - world.state.player.x, c.y - world.state.player.y) < 520);
    const speed = world.state.playerCar ? world.state.playerCar.speed : 0;
    audio.update(STEP, speed, policeNear);
    // The title screen is an attract mode: no mission marker behind the panel.
    renderer.drawWorld(world.state, world.city, screen === SCREEN_TITLE ? null : missionTarget(world));
    hud.draw(world.state, world, screen, save);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  });

  announce('Solmar Bay. Press Space or click to play. Press H for how to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
