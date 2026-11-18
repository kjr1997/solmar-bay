// Solmar Bay — main loop: state machine, camera, collisions, wiring.
import { WORLD_W, WORLD_H, GARAGE, START_CASH } from './config.js';
import { buildWorld, districtAt, isOnRoad } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, updatePlayerOnFoot, nearestCar } from './player.js';
import { spawnCar, updateCarDriving } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, addWanted, updatePolice } from './police.js';
import { createMissionState, startMission, updateMissions } from './missions.js';
import { drawWorld, drawCar, drawPed, drawPlayer, drawCop } from './render.js';
import { drawHud, drawMinimap, drawTitle, drawPaused, drawHelp } from './hud.js';
import { defaultSave, loadSave, writeSave, clearSave } from './save.js';
import { parseShotParams, applyShotScene, markShotReady } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  state: 'title',
  time: 0,
  world: buildWorld(20261118),
  save: defaultSave(),
  hasSave: false,
  player: createPlayer(GARAGE.x + 60, GARAGE.y + 60),
  cars: [],
  traffic: null,
  police: createPolice(),
  missionState: null,
  camera: { x: 0, y: 0, w: 1280, h: 720 },
  toast: '',
  toastTimer: 0,
  districtToast: '',
  districtTimer: 0,
  lastDistrict: '',
  showHelp: false,
  shotMode: null,
  bustedFlash: 0,
};

const input = createInput();
const audio = createAudio();
// Debug/testing handle: lets automated playtests read live state. Harmless in play.
window.__solmar = game;
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

function init() {
  const saved = loadSave();
  if (saved) {
    game.save = saved;
    game.hasSave = true;
  }
  game.missionState = createMissionState(game.save);
  game.traffic = createTraffic(game.world, 42);
  // Parked cars are enterable; traffic cars are occupied.
  for (const p of game.world.parked) {
    const car = spawnCar(p.kind, p.x, p.y, p.angle, false);
    car.parkedId = p.id;
    game.cars.push(car);
  }
  for (const t of game.traffic.cars) game.cars.push(t);
  startMission(game.missionState, game.save);
  resize();
  window.addEventListener('resize', resize);
  const shot = parseShotParams();
  if (shot) {
    applyShotScene(game, shot);
    game.hasSave = false;
    requestAnimationFrame(() => {
      render();
      markShotReady();
    });
  }
  requestAnimationFrame(loop);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  game.camera.w = canvas.width;
  game.camera.h = canvas.height;
}

function showToast(text, seconds) {
  game.toast = text;
  game.toastTimer = seconds || 3.5;
}

function setDistrictToast() {
  const d = districtAt(game.player.x, game.player.y);
  if (d.name !== game.lastDistrict) {
    game.lastDistrict = d.name;
    game.districtToast = d.name;
    game.districtTimer = 2.2;
  }
}

function bustPlayer() {
  const fine = Math.min(game.save.cash, 150);
  game.save.cash -= fine;
  game.save.bustedCount += 1;
  game.police.wanted = 0;
  game.police.cops = [];
  game.police.cruisers = [];
  if (game.player.inCar) {
    game.player.car.isPlayer = false;
    game.player.car.speed = 0;
    game.player.inCar = null;
    game.player.car = null;
  }
  game.player.x = GARAGE.x + 60;
  game.player.y = GARAGE.y + 60;
  game.player.health = 100;
  game.player.arrested = 0;
  game.bustedFlash = 1;
  audio.busted();
  showToast(`BUSTED! Fine $${fine}. You wake up at the garage.`, 4);
  writeSave(game.save);
}

function enterCar(car) {
  if (car.kind === 'police') {
    showToast('Locked. Police cruisers are off limits.', 2.5);
    return;
  }
  audio.door();
  if (car.occupied) {
    addWanted(game.police, 1);
    showToast('Carjacked! +1 wanted star.', 2.5);
    car.occupied = false;
    // The driver flees on foot.
    game.traffic.peds.push({
      x: car.x + 30, y: car.y + 30, angle: 0, speed: 150,
      skin: '#e8a080', shirt: '#c04040', walkPhase: 0, down: 0, flee: 3, cash: 0, wander: 2,
    });
  }
  car.isPlayer = true;
  game.player.car = car;
  game.player.inCar = car;
  game.player.x = car.x;
  game.player.y = car.y;
  audio.startEngine();
}

function exitCar() {
  const car = game.player.car;
  if (!car) return;
  car.isPlayer = false;
  car.speed = 0;
  game.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  game.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  game.player.inCar = null;
  game.player.car = null;
  audio.setEngine(0, false);
}

function punchHit(player) {
  audio.punch();
  let hit = false;
  for (const ped of game.traffic.peds) {
    if (ped.down > 0) continue;
    const d = Math.hypot(ped.x - player.x, ped.y - player.y);
    const ang = Math.atan2(ped.y - player.y, ped.x - player.x);
    let diff = ang - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (d < 44 && Math.abs(diff) < 1.1) {
      ped.down = 4;
      ped.cash = 15 + Math.floor(Math.random() * 45);
      ped.flee = 0;
      addWanted(game.police, 1);
      hit = true;
    }
  }
  if (!hit) {
    for (const cop of game.police.cops) {
      const d = Math.hypot(cop.x - player.x, cop.y - player.y);
      if (d < 44) {
        addWanted(game.police, 1);
        showToast('You hit a cop! +1 star.', 2);
        hit = true;
      }
    }
  }
}

function update(dt) {
  game.time += dt;
  if (game.toastTimer > 0) game.toastTimer -= dt;
  if (game.districtTimer > 0) game.districtTimer -= dt;
  if (game.bustedFlash > 0) game.bustedFlash -= dt * 0.5;
  const p = game.player;

  if (input.wasPressed('KeyM')) {
    const muted = audio.toggleMute();
    showToast(muted ? 'Sound muted' : 'Sound on', 1.5);
  }
  if (input.wasPressed('KeyH')) game.showHelp = !game.showHelp;
  if (game.showHelp) return;

  if (p.inCar && p.car) {
    updateCarDriving(p.car, input, game.world, dt, (speed) => {
      audio.crash();
      addWanted(game.police, 0);
      p.car.health -= 2;
    });
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    audio.setEngine(Math.abs(p.car.speed) / p.car.def.top, true);
    if (input.wasPressed('KeyE')) exitCar();
  } else {
    updatePlayerOnFoot(p, input, game.world, dt, punchHit);
    audio.setEngine(0, false);
    if (input.wasPressed('KeyE')) {
      const car = nearestCar(p, game.cars, 64);
      if (car) enterCar(car);
    }
  }

  // Pick up dropped cash and hidden packages.
  for (const ped of game.traffic.peds) {
    if (ped.down > 0 && ped.cash > 0) {
      const d = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (d < 30) {
        game.save.cash += ped.cash;
        audio.cash();
        showToast(`+$${ped.cash} picked up.`, 1.5);
        ped.cash = 0;
      }
    }
  }
  for (let i = 0; i < game.world.packageSpots.length; i++) {
    if (game.missionState.packages.includes(i)) continue;
    const s = game.world.packageSpots[i];
    if (Math.hypot(s.x - p.x, s.y - p.y) < 34) {
      game.missionState.packages.push(i);
      game.save.packages = game.missionState.packages.slice();
      game.save.cash += 100;
      audio.pickup();
      showToast(`Hidden package ${game.missionState.packages.length}/15 found! +$100.`, 3);
      writeSave(game.save);
    }
  }

  updateTraffic(game.traffic, game.world, dt, { x: p.x, y: p.y, inCar: !!p.inCar, car: p.car }, (ped) => {
    addWanted(game.police, 1);
    audio.crash();
    showToast('You hit a pedestrian! +1 star.', 2);
  });
  updatePolice(game.police, p, game.world, dt, {
    onCopHit: () => { audio.punch(); },
    onArrested: () => bustPlayer(),
    onRam: () => { if (Math.random() < 0.02) audio.crash(); },
  });
  updateMissions(game.missionState, game.save, game, dt, {
    onComplete: (m, reward) => {
      audio.mission();
      showToast(`Job complete: ${m.name}! +$${reward}.`, 4);
      writeSave(game.save);
    },
    onStep: (text) => { audio.pickup(); showToast(text, 3); },
  });

  // Health regen on foot, car wrecked = forced exit.
  if (!p.inCar && p.health < 100) p.health = Math.min(100, p.health + 4 * dt);
  if (p.inCar && p.car && p.car.health <= 0) {
    showToast('Your car is wrecked!', 2.5);
    exitCar();
  }
  if (p.health <= 0) bustPlayer();

  setDistrictToast();
  audio.setSiren(game.police.wanted > 0);
  // Camera follows the player, clamped to the world.
  const cam = game.camera;
  cam.x = Math.max(0, Math.min(WORLD_W - cam.w, p.x - cam.w / 2));
  cam.y = Math.max(0, Math.min(WORLD_H - cam.h, p.y - cam.h / 2));
}

function render() {
  const w = canvas.width;
  const h = canvas.height;
  const cam = game.camera;
  if (game.state === 'title') {
    drawTitle(ctx, game, w, h);
    return;
  }
  drawWorld(ctx, game, cam);
  // Parked + traffic cars.
  for (const car of game.cars) {
    if (car.x < cam.x - 80 || car.x > cam.x + cam.w + 80) continue;
    if (car.y < cam.y - 80 || car.y > cam.y + cam.h + 80) continue;
    drawCar(ctx, car, cam);
  }
  for (const cop of game.police.cops) drawCop(ctx, cop, cam);
  for (const ped of game.traffic.peds) {
    if (ped.x < cam.x - 40 || ped.x > cam.x + cam.w + 40) continue;
    if (ped.y < cam.y - 40 || ped.y > cam.y + cam.h + 40) continue;
    drawPed(ctx, ped, cam);
  }
  if (!game.player.inCar) drawPlayer(ctx, game.player, cam);
  drawHud(ctx, game, w, h);
  drawMinimap(ctx, game, w, h);
  if (game.bustedFlash > 0) {
    ctx.fillStyle = `rgba(200,0,0,${game.bustedFlash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (game.state === 'paused') drawPaused(ctx, w, h);
  if (game.showHelp) drawHelp(ctx, w, h);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'title') {
    if (input.wasPressed('Space')) {
      audio.unlock();
      audio.startMusic();
      audio.startSiren();
      game.state = 'play';
      if (!game.hasSave) {
        game.save = defaultSave();
        writeSave(game.save);
      }
      showToast('Welcome to Solmar Bay. Rico is waiting — check the mission line.', 4);
    } else if (input.wasPressed('KeyN')) {
      clearSave();
      game.save = defaultSave();
      game.hasSave = false;
      game.missionState = createMissionState(game.save);
      startMission(game.missionState, game.save);
      audio.unlock();
      audio.startMusic();
      audio.startSiren();
      game.state = 'play';
      showToast('New game. Rico needs wheels — steal a car!', 4);
    }
  } else if (game.state === 'play') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      game.state = 'paused';
    } else {
      update(dt);
    }
  } else if (game.state === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) game.state = 'play';
  }
  render();
  input.endFrame();
  requestAnimationFrame(loop);
}

init();
