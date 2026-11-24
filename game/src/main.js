// Solmar Bay — main loop and game state. Wires input, world, vehicles,
// pedestrians, police, missions, audio, HUD and the screenshot scenes into
// one frame loop. Nothing here loads over the network.
import {
  WORLD_W, WORLD_H, SPRAY, HOSPITAL, POLICE_HQ,
  PACKAGE_VALUE, SPRAY_COST, districtAt,
} from './config.js';
import { makeRng } from './rng.js';
import { buildWorld } from './world.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { loadSave, storeSave, clearSave, defaultSave } from './save.js';
import { makePlayer, updatePlayer, healPlayer } from './player.js';
import { spawnParked, spawnTraffic, driveVehicle, updateTraffic, separateCars } from './vehicles.js';
import { spawnPeds, updatePeds, knockDown } from './peds.js';
import { makeWanted, addWanted, updateWantedDecay, balanceCops, updateCops, updateCruisers } from './police.js';
import { makeMissions, updateMissions } from './missions.js';
import { drawWorld, drawHUD, drawMinimap, drawTitle, drawHelp, drawPaused, drawBusted, VIEW_W, VIEW_H } from './render.js';
import { isShotMode, shotSeed, applyShotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export class Game {
  constructor(seed) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.world = buildWorld(seed);
    this.input = new Input();
    this.sound = new Sound();
    this.save = loadSave() || defaultSave();
    this.hasSave = loadSave() !== null;
    this.player = makePlayer(760, 300);
    this.wanted = makeWanted();
    this.missions = makeMissions(this.save);
    this.cars = [];
    this.cops = [];
    this.peds = [];
    this.cashDrops = [];
    this.particles = [];
    this.camera = { x: 0, y: 0 };
    this.state = 'title'; // 'title' | 'play' | 'paused' | 'help' | 'busted'
    this.time = 0;
    this.zone = districtAt(this.player.x, this.player.y);
    this.zoneToast = 0;
    this.shotMode = isShotMode();
    this.shotIndex = 0;
    this.shotReady = false;
    this.framesRendered = 0;
    this.inTrouble = false;

    // Restore collected packages from the save.
    for (const id of this.save.packages) {
      const p = this.world.packages[id];
      if (p) p.taken = true;
    }
    // Mission drop-off points (package run) and taxi stands, fixed per seed.
    this.packageDrops = [
      { x: 2320, y: 720 }, { x: 760, y: 1680 }, { x: 2840, y: 2160 },
    ];
    this.taxiSpots = [
      { x: 1280, y: 300 }, { x: 2320, y: 1200 }, { x: 760, y: 720 },
      { x: 2840, y: 1680 }, { x: 1800, y: 2160 }, { x: 240, y: 1200 },
    ];
    this.heistDrop = { x: 520, y: 300 };

    this.cars.push(...spawnParked(this.world, this.rng));
    this.cars.push(...spawnTraffic(this.world, this.rng, 16, { x: this.player.x, y: this.player.y }));
    this.peds.push(...spawnPeds(this.world, this.rng, 46));

    if (this.shotMode) {
      applyShotScene(this, this.shotMode);
    }
  }

  persist() { storeSave(this.save); }

  addWanted(n) {
    const before = this.wanted.stars;
    addWanted(this.wanted, n, this.player.x, this.player.y);
    if (this.wanted.stars > before) this.sound.wantedUp();
    this.save.bestWanted = Math.max(this.save.bestWanted, this.wanted.stars);
    this.persist();
  }

  // --- Per-frame update ----------------------------------------------------
  update(dt) {
    this.time += dt;
    const { player, input, sound } = this;

    if (this.state === 'title') {
      if (input.hit('Space')) {
        sound.unlock();
        this.state = 'play';
      } else if (input.hit('KeyN')) {
        sound.unlock();
        clearSave();
        this.save = defaultSave();
        this.hasSave = false;
        this.missions = makeMissions(this.save);
        for (const p of this.world.packages) p.taken = false;
        player.x = 760;
        player.y = 300;
        player.health = 100;
        this.wanted.stars = 0;
        this.state = 'play';
      }
      return;
    }
    if (this.state === 'busted') {
      if (input.hit('Space')) {
        player.x = POLICE_HQ.x;
        player.y = POLICE_HQ.y + 40;
        player.health = 100;
        player.busted = false;
        this.state = 'play';
      }
      return;
    }
    if (input.hit('KeyP') || input.hit('Escape')) {
      if (this.state === 'play') this.state = 'paused';
      else if (this.state === 'paused') this.state = 'play';
      else if (this.state === 'help') this.state = 'play';
    }
    if (input.hit('KeyH')) {
      if (this.state === 'play') this.state = 'help';
      else if (this.state === 'help') this.state = 'play';
    }
    if (input.hit('KeyM')) sound.setMuted(!sound.muted);
    if (this.state !== 'play') return;

    sound.unlock();
    this.inTrouble = false;

    // --- Player (on foot or driving). ---
    const events = updatePlayer(this, dt);
    for (const hit of events.punched) {
      if (hit.cash > 0) {
        this.cashDrops.push({ x: hit.ped.x, y: hit.ped.y, amount: hit.cash });
      }
      this.addWanted(1);
      this.inTrouble = true;
      this.burst(hit.ped.x, hit.ped.y, '#ffd23e', 6);
    }
    if (events.entered) {
      if (events.entered.carjack) {
        this.addWanted(1);
        this.inTrouble = true;
        // The yanked driver runs off on foot.
        const d = events.entered.car;
        this.peds.push({
          x: d.x + 30, y: d.y + 30, angle: 0, speed: 60,
          skin: '#c98a6a', shirt: '#3e6fd0', state: 'flee', downTimer: 0,
          waitTimer: 0, cash: 0, panic: 3,
        });
      }
      sound.pickup();
    }

    // --- Driving physics for the player's car. ---
    if (player.inCar) {
      const car = player.inCar;
      const mv = input.moveVector();
      const throttle = mv.y < 0 ? 1 : mv.y > 0 ? -1 : 0; // W = forward
      const steer = mv.x;
      const handbrake = input.held('Space');
      const prevHealth = car.health;
      driveVehicle(this.world, car, steer, throttle, handbrake, dt, () => {
        sound.crash();
        this.burst(car.x, car.y, '#888', 8);
      });
      if (car.health < prevHealth && car.health < prevHealth - 1) this.inTrouble = true;
      if (handbrake && Math.abs(car.speed) > 150) {
        this.burst(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, '#aaa', 2);
      }
      if (car.health <= 0) {
        car.dead = true;
        player.inCar = null;
        player.x = car.x + 40;
        player.y = car.y;
        sound.crash();
        this.burst(car.x, car.y, '#f08a2e', 16);
      }
      // Running over a pedestrian: wanted +1, they drop cash.
      for (const ped of this.peds) {
        if (ped.state === 'down') continue;
        const d = Math.hypot(ped.x - player.x, ped.y - player.y);
        if (d < 24 && Math.abs(car.speed) > 40) {
          const cash = knockDown(ped);
          if (cash > 0) this.cashDrops.push({ x: ped.x, y: ped.y, amount: cash });
          this.addWanted(1);
          this.inTrouble = true;
          sound.crash();
        }
      }
      // Ramming a police cruiser adds a star.
      for (const other of this.cars) {
        if (other === car || other.driver !== 'police' || other.dead) continue;
        const d = Math.hypot(other.x - car.x, other.y - car.y);
        if (d < 46 && Math.abs(car.speed) > 120) {
          this.addWanted(1);
          this.inTrouble = true;
          car.speed *= 0.5;
          other.speed *= 0.5;
          sound.crash();
        }
      }
      sound.engine(Math.abs(car.speed) / car.spec.top, true);
    } else {
      sound.engine(0, false);
    }

    // --- Traffic, pedestrians, police. ---
    updateTraffic(this.world, this.cars, dt, this.rng);
    separateCars(this.cars);
    updatePeds(this.world, this.peds, player, this.cars, dt, this.rng);
    balanceCops(this, dt);
    updateCops(this, dt);
    updateCruisers(this, dt);
    if (this.wanted.stars > 0) this.inTrouble = this.inTrouble || this.cops.length > 0;
    updateWantedDecay(this.wanted, dt, this.inTrouble);
    sound.siren(this.wanted.stars);

    // --- Pickups: cash drops and hidden packages. ---
    for (let i = this.cashDrops.length - 1; i >= 0; i--) {
      const c = this.cashDrops[i];
      if (Math.hypot(c.x - player.x, c.y - player.y) < 34) {
        this.save.cash += c.amount;
        this.cashDrops.splice(i, 1);
        sound.cash();
        this.persist();
        this.burst(c.x, c.y, '#2ecc40', 6);
      }
    }
    for (const p of this.world.packages) {
      if (p.taken) continue;
      if (Math.hypot(p.x - player.x, p.y - player.y) < 34) {
        p.taken = true;
        this.save.packages.push(p.id);
        this.save.cash += PACKAGE_VALUE;
        sound.pickup();
        this.missions.message = `Hidden package found! +$${PACKAGE_VALUE} (${this.save.packages.length}/15)`;
        this.missions.messageTimer = 3;
        this.persist();
        this.burst(p.x, p.y, '#2ecc40', 10);
      }
    }

    // --- Pay 'n Spray: $100 clears wanted and repairs the car. ---
    if (Math.hypot(player.x - SPRAY.x, player.y - SPRAY.y) < 90 && this.wanted.stars > 0) {
      if (this.save.cash >= SPRAY_COST) {
        this.save.cash -= SPRAY_COST;
        this.wanted.stars = 0;
        if (player.inCar) player.inCar.health = 100;
        sound.cash();
        this.missions.message = `Pay 'n Spray: wanted cleared, car repaired (-$${SPRAY_COST})`;
        this.missions.messageTimer = 3;
        this.persist();
      }
    }

    // --- Missions (includes free-roam taxi fares once the line is done). ---
    updateMissions(this, dt);

    // --- Busted / down. ---
    if (player.busted) {
      player.busted = false;
      this.save.cash = Math.max(0, this.save.cash - 150);
      this.wanted.stars = 0;
      this.wanted.hiddenTimer = 0;
      player.health = 100;
      if (player.inCar) { player.inCar.driver = 'none'; player.inCar = null; }
      sound.busted();
      this.persist();
      this.state = 'busted';
      return;
    }
    if (player.health <= 0) {
      player.health = 100;
      player.x = HOSPITAL.x;
      player.y = HOSPITAL.y + 40;
      this.save.cash = Math.max(0, this.save.cash - 100);
      this.persist();
      this.missions.message = 'You woke up at the hospital (-$100).';
      this.missions.messageTimer = 3;
    }
    healPlayer(player, dt);

    // --- Zone toast. ---
    const zone = districtAt(player.x, player.y);
    if (zone !== this.zone) {
      this.zone = zone;
      this.zoneToast = 2.2;
    }
    if (this.zoneToast > 0) this.zoneToast -= dt;

    // --- Camera follows the player (clamped to the world). ---
    const tx = player.x - VIEW_W / 2;
    const ty = player.y - VIEW_H / 2;
    this.camera.x += (tx - this.camera.x) * Math.min(1, dt * 5);
    this.camera.y += (ty - this.camera.y) * Math.min(1, dt * 5);
    this.camera.x = Math.max(0, Math.min(WORLD_W - VIEW_W, this.camera.x));
    this.camera.y = Math.max(0, Math.min(WORLD_H - VIEW_H, this.camera.y));

    // --- Particles. ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const s = this.rng.range(30, 120);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: this.rng.range(2, 5), color, life: 0.5, max: 0.5 });
    }
  }

  render() {
    ctx.save();
    if (this.state === 'title') {
      drawTitle(ctx, this);
    } else {
      ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
      drawWorld(ctx, this);
      ctx.restore();
      // Minimap first: the HUD's objective-arrow label may sit over its
      // corner, and the label must win that overlap.
      drawMinimap(ctx, this);
      drawHUD(ctx, this);
      if (this.state === 'help') drawHelp(ctx);
      else if (this.state === 'paused') drawPaused(ctx);
      else if (this.state === 'busted') drawBusted(ctx);
    }
    ctx.restore();
    this.framesRendered++;
    // Screenshot mode: once a few frames are on the canvas, signal ready.
    if (this.shotMode && !this.shotReady && this.framesRendered >= 4) {
      this.shotReady = true;
      window.__shotReady = true;
    }
  }
}

const game = new Game(shotSeed());
window.__game = game;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    game.update(dt);
    game.render();
  } catch (err) {
    // Never let one bad frame kill the loop; log it for debugging.
    console.error('frame error', err);
  }
  game.input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
