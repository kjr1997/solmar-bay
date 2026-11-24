// Solmar Bay — main loop and game state: title, playing, paused, help,
// saving to localStorage, collisions, camera-facing events and the frame tick.
import { WORLD_W, WORLD_H, SAVE_KEY, START_CASH, PLACES, CAR_TYPES } from './config.js';
import { generateCity, districtAt, circleHitsBuilding, pointInBuildings, isInSea } from './world.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { AudioEngine } from './audio.js';
import { makeCar, driveCar, separateCars, isWrecked } from './vehicles.js';
import { spawnTraffic, updateTraffic, spawnPedestrians, updatePedestrians, pedCount, trafficCount } from './traffic.js';
import { makePlayer, updatePlayerOnFoot, nearestEnterableCar, enterCar, exitCar, collectPickups } from './player.js';
import { makeWanted, addWanted, updateWanted, updateCops, trySprayShop, clearWanted } from './police.js';
import { makeMissionState, updateMissions, startMission, currentMission } from './missions.js';
import { applyShot, shotFromUrl } from './shots.js';
import { makeRng } from './random.js';

const CITY_SEED = 20261124;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.audio = new AudioEngine();
    this.city = generateCity(CITY_SEED);
    const rng = makeRng(CITY_SEED + 7);
    this.traffic = spawnTraffic(trafficCount(), rng, this.city.buildings);
    this.peds = spawnPedestrians(pedCount(), rng, this.city.buildings);
    // Parked cars join the enterable fleet.
    this.parked = this.city.parked;
    this.player = makePlayer();
    this.player.cash = START_CASH;
    this.wanted = makeWanted();
    this.missions = makeMissionState();
    this.cops = [];
    this.policeCars = [];
    this.cashDrops = [];
    this.particles = [];
    this.toasts = [];
    this.time = 0;
    this.state = 'title';
    this.hasSave = false;
    this.packagesFound = 0;
    this.taxiUnlocked = false;
    this.zoneToast = '';
    this.zoneToastTimer = 0;
    this.currentDistrict = districtAt(this.player.x, this.player.y).name;
    this.flashMessage = '';
    this.flashTimer = 0;
    this.wantedVisible = false;
    this.heroCar = null;
    this.shotMode = null;
    this.shotReadySignalled = false;
    this.lastTime = 0;
    this.loadSaveMeta();
  }

  // --- helpers used by the other modules ---
  addWanted(amount, reason) { addWanted(this, amount, reason); }
  toast(text) {
    this.toasts.push({ text, life: 4 });
    if (this.toasts.length > 3) this.toasts.shift();
  }
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, maxLife: 0.5, color });
    }
  }

  // --- save / load ---
  saveGame() {
    try {
      const data = {
        cash: this.player.cash,
        hp: this.player.hp,
        x: this.player.x, y: this.player.y,
        missionIndex: this.missions.index,
        missionDone: this.missions.done,
        packages: this.city.packages.map((p) => p.taken),
        packagesFound: this.packagesFound,
        taxiUnlocked: this.taxiUnlocked,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.hasSave = true;
    } catch (err) { /* storage unavailable: play session-only */ }
  }

  loadSaveMeta() {
    try {
      this.hasSave = !!localStorage.getItem(SAVE_KEY);
    } catch (err) { this.hasSave = false; }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.player.cash = data.cash ?? START_CASH;
      this.player.hp = data.hp ?? 100;
      this.player.x = data.x ?? this.player.x;
      this.player.y = data.y ?? this.player.y;
      this.missions.done = data.missionDone ?? this.missions.done;
      this.missions.index = data.missionIndex ?? 0;
      this.packagesFound = data.packagesFound ?? 0;
      this.taxiUnlocked = !!data.taxiUnlocked;
      if (Array.isArray(data.packages)) {
        data.packages.forEach((taken, i) => { if (taken && this.city.packages[i]) this.city.packages[i].taken = true; });
      }
      if (this.missions.index < 5) startMission(this, this.missions.index);
      return true;
    } catch (err) { return false; }
  }

  newGame() {
    try { localStorage.removeItem(SAVE_KEY); } catch (err) {}
    this.player = makePlayer();
    this.player.cash = START_CASH;
    this.city.packages.forEach((p) => { p.taken = false; });
    this.packagesFound = 0;
    this.taxiUnlocked = false;
    this.missions = makeMissionState();
    clearWanted(this);
    this.cashDrops = [];
    startMission(this, 0);
    this.state = 'playing';
    this.saveGame();
  }

  // --- per-frame update ---
  update(dt) {
    this.time += dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.zoneToastTimer > 0) this.zoneToastTimer -= dt;
    this.toasts.forEach((t) => { t.life -= dt; });
    this.toasts = this.toasts.filter((t) => t.life > 0);
    for (const pt of this.particles) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.92; pt.vy *= 0.92;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (this.state !== 'playing') return;

    const input = this.input;
    const player = this.player;

    // Global keys.
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) { this.state = 'paused'; return; }
    if (input.wasPressed('KeyH')) { this.helpReturn = 'playing'; this.state = 'help'; return; }
    if (input.wasPressed('KeyM')) {
      this.audio.setMuted(!this.audio.muted);
      this.toast(this.audio.muted ? 'Sound muted' : 'Sound on');
    }
    this.audio.ensure();

    // Enter / exit car.
    if (input.wasPressed('KeyE')) {
      if (player.inCar) {
        exitCar(player);
        this.audio.door();
      } else {
        const car = nearestEnterableCar(player, this.enterableCars());
        if (car) {
          const result = enterCar(player, car, this);
          if (result === 'stole') this.toast('Carjacked! The cops are coming.');
          else this.toast(CAR_TYPES[car.type].name + ' — drive with WASD');
          this.burst(car.x, car.y, '#ffd23c', 6);
        }
      }
    }

    // Player movement / driving.
    if (player.inCar) {
      const car = player.inCar;
      const mv = input.moveVector();
      const throttle = mv.y < 0 ? 1 : (mv.y > 0 ? -0.7 : 0);
      const steer = mv.x;
      const handbrake = input.isDown('Space');
      const speedBefore = Math.abs(car.speed);
      driveCar(car, steer, throttle, handbrake, dt, this.city.buildings);
      player.x = car.x; player.y = car.y;
      player.angle = car.angle;
      if (Math.abs(car.speed) > 120 && speedBefore < 120) this.audio.blip(90, 0.1, 'sawtooth', 0.03);
      this.checkCarCollisions(car, dt);
      if (isWrecked(car)) {
        this.toast('Your car is wrecked! Get out and find another.');
        this.burst(car.x, car.y, '#888', 18);
        exitCar(player);
        car.speed = 0;
      }
    } else {
      updatePlayerOnFoot(player, input, dt, this);
    }

    collectPickups(player, this, dt);
    updateTraffic(this.traffic, dt, this.city.buildings, player.inCar);
    const danger = player.inCar || (player.punchTimer > 0 ? player : null);
    updatePedestrians(this.peds, dt, this.city.buildings, danger);
    updateCops(this, dt);
    updateWanted(this, dt, this.wantedVisible);
    updateMissions(this, dt);
    trySprayShop(this);

    // District change toast.
    const district = districtAt(player.x, player.y).name;
    if (district !== this.currentDistrict) {
      this.currentDistrict = district;
      this.zoneToast = district;
      this.zoneToastTimer = 2.4;
    }

    // Engine + siren + music follow the game state.
    const speedRatio = player.inCar ? Math.abs(player.inCar.speed) / 430 : 0;
    this.audio.update(dt, speedRatio, this.wanted.stars);

    // Keep the player out of the sea when swimming is not an option.
    if (isInSea(player.x, player.y)) {
      player.x = Math.min(player.x, 3350);
      if (player.inCar) player.inCar.x = player.x;
    }
    if (player.hp <= 0) player.hp = 100; // busted() already handled it
  }

  enterableCars() {
    return [...this.parked, ...this.traffic];
  }

  // The player's car hitting pedestrians, traffic and parked cars.
  checkCarCollisions(car, dt) {
    if (this.shotMode) return; // staged screenshots stay exactly as staged
    for (const ped of this.peds) {
      if (ped.down > 0) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 30 && Math.abs(car.speed) > 60) {
        ped.down = 6;
        ped.hp = 100;
        const drop = 8 + Math.floor(Math.random() * 30);
        this.cashDrops.push({ x: ped.x, y: ped.y, amount: drop, t: 0 });
        this.addWanted(1, 'hit and run');
        this.audio.crash();
        this.burst(ped.x, ped.y, '#c83232', 10);
        car.speed *= 0.7;
      }
    }
    for (const other of this.traffic) {
      if (other === car) continue;
      if (Math.hypot(other.x - car.x, other.y - car.y) < 44) {
        if (Math.abs(car.speed) > 200 || Math.abs(other.speed) > 150) {
          car.hp = Math.max(0, car.hp - 4);
          other.hp = Math.max(0, other.hp - 4);
          this.audio.crash();
          this.burst(car.x, car.y, '#e8b820', 6);
        }
        separateCars(car, other);
      }
    }
    for (const other of this.parked) {
      if (other === car) continue;
      if (Math.hypot(other.x - car.x, other.y - car.y) < 44 && Math.abs(car.speed) > 140) {
        car.hp = Math.max(0, car.hp - 5);
        this.addWanted(1, 'reckless driving');
        this.audio.crash();
        this.burst(car.x, car.y, '#e8b820', 6);
        car.speed *= 0.5;
      }
    }
    // Ramming a police cruiser is a fast way to more stars.
    for (const copCar of this.policeCars) {
      if (Math.hypot(copCar.x - car.x, copCar.y - car.y) < 46 && Math.abs(car.speed) > 160) {
        this.addWanted(1, 'ramming a cop car');
        this.audio.crash();
        this.burst(car.x, car.y, '#3a6ab5', 8);
        car.speed *= 0.5;
      }
    }
  }

  // --- frame tick ---
  frame(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    if (this.state === 'title') {
      if (this.input.wasPressed('Space')) {
        this.audio.ensure();
        if (this.hasSave && this.loadGame()) this.state = 'playing';
        else this.newGame();
      } else if (this.input.wasPressed('KeyN')) {
        this.audio.ensure();
        this.newGame();
      }
      if (this.input.wasPressed('KeyM')) this.audio.setMuted(!this.audio.muted);
    } else if (this.state === 'paused') {
      if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) this.state = 'playing';
      else if (this.input.wasPressed('KeyH')) { this.helpReturn = 'paused'; this.state = 'help'; }
    } else if (this.state === 'help') {
      if (this.input.wasPressed('KeyH') || this.input.wasPressed('Escape') || this.input.wasPressed('Space')) {
        this.state = this.helpReturn || 'playing';
      }
    }
    this.update(dt);
    this.renderer.render(this, dt);
    this.input.endFrame();
    if (this.shotMode && !this.shotReadySignalled) {
      this.shotReadySignalled = true;
      window.__shotReady = true;
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());
    const shot = shotFromUrl();
    if (shot) {
      // Deterministic staged scene for screenshots.
      applyShot(this, shot.shot);
      this.state = 'playing';
    } else {
      startMission(this, 0);
      this.state = 'title';
    }
    requestAnimationFrame((t) => { this.lastTime = t; this.frame(t); });
  }
}

const canvas = document.getElementById('game');
window.__solmarStarted = true;
const game = new Game(canvas);
window.__solmar = game; // read-only debug handle for playtesting
game.start();
