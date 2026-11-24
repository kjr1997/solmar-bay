// Police: foot cops who chase, punch and arrest, and cruisers that chase and
// ram the player's car. Spawn pressure scales with the wanted level; when the
// player hides, the heat decays (handled in main.js via wanted.js logic here).
import { WANTED_MAX, HIDE_SECONDS, STAR_DROP_SECONDS } from './config.js';
import { makeVehicle, driveVehicle } from './vehicles.js';
import { collideWorld, isWater } from './world.js';
import { startArrest } from './player.js';

export function makeWanted() {
  return {
    stars: 0,
    hiddenTimer: 0, // seconds since last seen committing a crime / spotted
    dropTimer: 0,
    lastSeenX: 0, lastSeenY: 0,
  };
}

export function addWanted(wanted, n, x, y) {
  wanted.stars = Math.min(WANTED_MAX, wanted.stars + n);
  wanted.hiddenTimer = 0;
  wanted.dropTimer = 0;
  wanted.lastSeenX = x;
  wanted.lastSeenY = y;
}

// Called every frame: if the player has been out of trouble for a while,
// stars fall one at a time.
export function updateWantedDecay(wanted, dt, inTrouble) {
  if (wanted.stars === 0) return;
  if (inTrouble) {
    wanted.hiddenTimer = 0;
    wanted.dropTimer = 0;
    return;
  }
  wanted.hiddenTimer += dt;
  if (wanted.hiddenTimer >= HIDE_SECONDS) {
    wanted.dropTimer += dt;
    if (wanted.dropTimer >= STAR_DROP_SECONDS) {
      wanted.dropTimer = 0;
      wanted.stars = Math.max(0, wanted.stars - 1);
    }
  }
}

export function makeCop(x, y) {
  return {
    x, y, angle: 0, speed: 0, health: 100,
    state: 'chase', // 'chase' | 'punch' | 'down'
    punchTimer: 0, punchCooldown: 0, downTimer: 0,
  };
}

// Keep the right number of cops on the street for the current heat.
export function balanceCops(game, dt) {
  const { wanted, cops, rng } = game;
  const want = wanted.stars >= 1 ? Math.min(2 + wanted.stars, 7) : 0;
  if (cops.length < want) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(420, 700);
    const x = game.player.x + Math.cos(a) * d;
    const y = game.player.y + Math.sin(a) * d;
    if (!isWater(x, y)) cops.push(makeCop(x, y));
  } else if (cops.length > want && wanted.stars === 0) {
    cops.pop();
  }
  // Cruisers: one per 2 stars, up to 3, chasing the player's car.
  const wantCars = wanted.stars >= 2 ? Math.min(3, Math.floor(wanted.stars / 2)) : 0;
  const cruisers = game.cars.filter((c) => c.driver === 'police');
  if (cruisers.length < wantCars) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(500, 800);
    const v = makeVehicle('police', game.player.x + Math.cos(a) * d, game.player.y + Math.sin(a) * d, 0, 'police');
    game.cars.push(v);
  }
}

export function updateCops(game, dt) {
  const { player, cops, wanted, sound } = game;
  for (const cop of cops) {
    if (cop.state === 'down') {
      cop.downTimer -= dt;
      if (cop.downTimer <= 0) cop.state = 'chase';
      continue;
    }
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const d = Math.hypot(dx, dy);
    cop.angle = Math.atan2(dy, dx);
    if (player.inCar) {
      // On foot a cop cannot catch a car: run towards it anyway, and if the
      // car is slow and close, try to yank the player out (rare, dramatic).
      if (d < 60 && Math.abs(player.inCar.speed) < 40) {
        startArrest(player);
      }
    } else if (d < 26) {
      // Close enough to punch / grab.
      cop.punchCooldown -= dt;
      if (cop.punchCooldown <= 0) {
        cop.punchCooldown = 0.9;
        cop.punchTimer = 0.25;
        sound.punch();
        player.health = Math.max(0, player.health - 8);
        if (player.health <= 0) player.busted = true;
      }
      // Standing on the player for a beat starts the arrest.
      if (d < 20 && player.health > 0) startArrest(player);
    }
    const speed = player.inCar ? 200 : 165;
    cop.x += Math.cos(cop.angle) * speed * dt;
    cop.y += Math.sin(cop.angle) * speed * dt;
    collideWorld(game.world, cop, 12);
    if (cop.punchTimer > 0) cop.punchTimer -= dt;
  }
}

// Cruiser AI: steer towards the player's car and ram it. Cruisers use the
// same driving physics as every other car, so they bounce off buildings
// instead of ghosting through them.
export function updateCruisers(game, dt) {
  const { player, cars, sound, world } = game;
  const target = player.inCar;
  for (const v of cars) {
    if (v.driver !== 'police' || v.dead) continue;
    const tx = target ? target.x : player.x;
    const ty = target ? target.y : player.y;
    const dx = tx - v.x;
    const dy = ty - v.y;
    const d = Math.hypot(dx, dy);
    const want = Math.atan2(dy, dx);
    let diff = want - v.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.4));
    const throttle = d > 60 ? 1 : 0.5;
    const prevSpeed = v.speed;
    driveVehicle(world, v, steer, throttle, false, dt, () => sound.crash());
    // Ram: a fast hit shoves the player's car and damages it.
    if (target && d < 52 && prevSpeed > 80) {
      target.health = Math.max(0, target.health - 4);
      target.speed *= 0.7;
      target.x += Math.cos(v.angle) * 26;
      target.y += Math.sin(v.angle) * 26;
      if (Math.abs(target.speed) > 60) sound.crash();
      if (target.health <= 0) {
        target.dead = true;
        player.inCar = null;
      }
    }
  }
}
