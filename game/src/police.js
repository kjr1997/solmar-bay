// Solmar Bay — the wanted system and the police response.
// Stars 0–5. Foot cops chase, punch and arrest; cruisers chase and ram.
// After 10 s hidden, one star fades every 8 s. Pay 'n Spray clears all.
import { WANTED_DECAY_HIDDEN_S, WANTED_DECAY_STEP_S, PLACES, ARREST_HOLD_S } from './config.js';
import { makeCar, driveCar } from './vehicles.js';
import { circleHitsBuilding } from './world.js';

export function makeWanted() {
  return { stars: 0, hiddenTimer: 0, decayTimer: 0, lastSeen: 0 };
}

export function addWanted(game, amount, reason) {
  const w = game.wanted;
  const before = w.stars;
  w.stars = Math.min(5, w.stars + amount);
  w.hiddenTimer = 0;
  w.decayTimer = 0;
  if (w.stars > before) game.toast('Wanted level ' + w.stars + '★ — ' + reason);
  spawnPoliceFor(game);
}

export function clearWanted(game) {
  game.wanted.stars = 0;
  game.wanted.hiddenTimer = 0;
  game.wanted.decayTimer = 0;
  game.cops = [];
  game.policeCars = [];
}

// Wanted decay: only while no cop can see the player.
export function updateWanted(game, dt, playerVisible) {
  const w = game.wanted;
  if (w.stars === 0) return;
  if (playerVisible) { w.hiddenTimer = 0; w.decayTimer = 0; return; }
  w.hiddenTimer += dt;
  if (w.hiddenTimer >= WANTED_DECAY_HIDDEN_S) {
    w.decayTimer += dt;
    if (w.decayTimer >= WANTED_DECAY_STEP_S) {
      w.decayTimer = 0;
      w.stars = Math.max(0, w.stars - 1);
      if (w.stars === 0) { game.cops = []; game.policeCars = []; game.toast('You lost the cops.'); }
      else game.toast('Heat cooling down — ' + w.stars + '★');
    }
  }
}

function spawnPoliceFor(game) {
  const w = game.wanted.stars;
  const wantCops = Math.min(2 + w, 7);
  const wantCars = w >= 2 ? Math.min(w - 1, 4) : 0;
  const p = game.player.inCar || game.player;
  while (game.cops.length < wantCops) {
    const a = Math.random() * Math.PI * 2;
    game.cops.push({
      x: p.x + Math.cos(a) * 420, y: p.y + Math.sin(a) * 420,
      angle: 0, speed: 150 + w * 12, hp: 100, down: 0,
      punchTimer: 0, punchCooldown: 0, arrestTimer: 0,
    });
  }
  while (game.policeCars.length < wantCars) {
    const a = Math.random() * Math.PI * 2;
    const car = makeCar('police', p.x + Math.cos(a) * 520, p.y + Math.sin(a) * 520, a, { occupied: true });
    car.cruise = 300 + w * 18;
    game.policeCars.push(car);
  }
}

export function updateCops(game, dt) {
  const player = game.player;
  const pos = player.inCar || player;
  let anySees = false;
  for (const cop of game.cops) {
    if (cop.down > 0) { cop.down -= dt; continue; }
    const dx = pos.x - cop.x, dy = pos.y - cop.y;
    const d = Math.hypot(dx, dy);
    if (d < 700) anySees = true;
    if (player.arrested > 0) continue;
    cop.angle = Math.atan2(dy, dx);
    if (d > 26) {
      const sp = cop.speed * (player.inCar ? 1.15 : 1);
      const step = sp * dt;
      // Try straight at the player; if a building blocks, sidestep around it.
      const tries = [cop.angle, cop.angle + 0.7, cop.angle - 0.7, cop.angle + 1.4, cop.angle - 1.4];
      for (const a of tries) {
        const nx = cop.x + Math.cos(a) * step;
        const ny = cop.y + Math.sin(a) * step;
        if (!circleHitsBuilding(nx, ny, 12, game.city.buildings)) { cop.x = nx; cop.y = ny; break; }
      }
    }
    if (cop.punchCooldown > 0) cop.punchCooldown -= dt;
    if (cop.punchTimer > 0) cop.punchTimer -= dt;
    // On foot and in reach: punch, then hold to arrest for 1.1 s.
    if (!player.inCar && d < 30) {
      if (cop.punchCooldown <= 0) {
        cop.punchTimer = 0.25;
        cop.punchCooldown = 0.9;
        player.hp = Math.max(0, player.hp - 8);
        game.audio.punch();
      }
      cop.arrestTimer += dt;
      if (cop.arrestTimer >= ARREST_HOLD_S) {
        cop.arrestTimer = 0;
        bustPlayer(game);
      }
    } else {
      cop.arrestTimer = Math.max(0, cop.arrestTimer - dt * 2);
    }
  }
  for (const car of game.policeCars) {
    const dx = pos.x - car.x, dy = pos.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < 700) anySees = true;
    let diff = Math.atan2(dy, dx) - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    driveCar(car, steer, d > 60 ? 1 : 0.3, false, dt, game.city.buildings);
    if (d < 52 && player.inCar && !game.shotMode) {
      // Ram: damage the player's car and slow it.
      player.inCar.hp = Math.max(0, player.inCar.hp - 14 * dt);
      player.inCar.speed *= Math.pow(0.4, dt);
      if (Math.random() < dt * 2) game.audio.crash();
    }
    if (d < 40 && !player.inCar && player.arrested <= 0) {
      player.hp = Math.max(0, player.hp - 20 * dt);
    }
  }
  game.wantedVisible = anySees;
  if (player.hp <= 0) bustPlayer(game);
}

export function bustPlayer(game) {
  const player = game.player;
  if (player.inCar) { player.inCar.occupied = false; player.inCar.driver = null; player.inCar = null; }
  player.x = 800; player.y = 1560;
  player.hp = 100;
  player.arrested = 1.2;
  const fine = Math.min(player.cash, 150);
  player.cash -= fine;
  clearWanted(game);
  game.audio.busted();
  game.toast('BUSTED! You paid a $' + fine + ' fine and lost the cops.');
  game.flashMessage = 'BUSTED';
  game.flashTimer = 2.2;
}

// Pay 'n Spray: $100 clears wanted and repairs the car.
export function trySprayShop(game) {
  const player = game.player;
  const pos = player.inCar || player;
  const d = Math.hypot(pos.x - PLACES.spray.x, pos.y - PLACES.spray.y);
  if (d > 90) return false;
  if (player.cash < 100) { game.toast("Pay 'n Spray costs $100 — not enough cash."); return false; }
  player.cash -= 100;
  if (player.inCar) player.inCar.hp = 100;
  clearWanted(game);
  game.audio.cash();
  game.toast("Pay 'n Spray: wanted cleared, car repaired. -$100");
  return true;
}
