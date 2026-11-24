// The player on foot: WASD movement, Shift sprint, Space punch, E to enter
// or leave a car. Health, arrest handling and the punch arc live here.
import { WORLD_W, WORLD_H } from './config.js';
import { collideWorld } from './world.js';
import { knockDown } from './peds.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: 100, inCar: null, // the vehicle object when driving
    punching: false, punchTimer: 0, punchCooldown: 0,
    arrested: 0, // seconds left held by a cop (arrest in progress)
    busted: false,
    moving: false, running: false,
  };
}

// Returns events the main loop turns into sound / wanted / cash changes:
// { punched: [peds hit], carHit: bool }
export function updatePlayer(game, dt) {
  const { player, input, world, peds, cars, sound } = game;
  const events = { punched: [], carHit: false, entered: null, exited: false };
  if (player.arrested > 0) {
    player.arrested -= dt;
    if (player.arrested <= 0) {
      player.busted = true;
    }
    return events;
  }

  // --- In a car: driving is handled by vehicles.js; E gets out. ---
  if (player.inCar) {
    const car = player.inCar;
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    if (input.hit('KeyE')) {
      // Step out to the side of the car, clear of buildings.
      const side = Math.PI / 2;
      const ox = car.x + Math.cos(car.angle + side) * 34;
      const oy = car.y + Math.sin(car.angle + side) * 34;
      player.x = ox;
      player.y = oy;
      collideWorld(world, player, 12);
      car.driver = 'none';
      player.inCar = null;
      events.exited = true;
    }
    return events;
  }

  // --- On foot. ---
  const mv = input.moveVector();
  const running = input.held('ShiftLeft') || input.held('ShiftRight');
  const speed = running ? 235 : 140;
  player.moving = mv.active;
  player.running = running && mv.active;
  if (mv.active) {
    player.angle = Math.atan2(mv.y, mv.x);
    const nx = player.x + mv.x * speed * dt;
    const ny = player.y + mv.y * speed * dt;
    const before = { x: player.x, y: player.y };
    player.x = nx;
    player.y = ny;
    const hitWall = collideWorld(world, player, 12);
    if (hitWall) {
      // Slide along the wall instead of sticking: retry each axis alone.
      player.x = before.x;
      player.y = ny;
      collideWorld(world, player, 12);
      if (Math.abs(player.y - ny) > 1) { player.y = before.y; player.x = nx; collideWorld(world, player, 12); }
    }
  }

  // Punch: a 0.28 s swing, hits peds (and cops) in a 46-unit arc in front.
  player.punchCooldown -= dt;
  if (input.hit('Space') && player.punchCooldown <= 0) {
    player.punching = true;
    player.punchTimer = 0.28;
    player.punchCooldown = 0.45;
    sound.punch();
    for (const ped of peds) {
      if (ped.state === 'down') continue;
      const d = Math.hypot(ped.x - player.x, ped.y - player.y);
      if (d > 52) continue;
      const ang = Math.atan2(ped.y - player.y, ped.x - player.x);
      let diff = Math.abs(ang - player.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 1.1) {
        const cash = knockDown(ped);
        events.punched.push({ ped, cash });
      }
    }
    // A punch also floors a cop who gets too close — but that adds heat.
    for (const cop of game.cops) {
      if (cop.state === 'down') continue;
      const d = Math.hypot(cop.x - player.x, cop.y - player.y);
      if (d > 52) continue;
      const ang = Math.atan2(cop.y - player.y, cop.x - player.x);
      let diff = Math.abs(ang - player.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 1.1) {
        cop.state = 'down';
        cop.downTimer = 3;
        events.punched.push({ ped: cop, cash: 0 });
      }
    }
  }
  if (player.punching) {
    player.punchTimer -= dt;
    if (player.punchTimer <= 0) player.punching = false;
  }

  // E: get into the nearest unlocked car within 64 units.
  if (input.hit('KeyE')) {
    let best = null;
    let bestD = 64;
    for (const car of cars) {
      if (car.dead || car.driver === 'police') continue;
      if (car.spec.locked) continue;
      const d = Math.hypot(car.x - player.x, car.y - player.y);
      if (d < bestD) { best = car; bestD = d; }
    }
    if (best) {
      const occupied = best.driver === 'traffic';
      player.inCar = best;
      best.driver = 'player';
      best.speed = 0;
      events.entered = { car: best, carjack: occupied };
      if (occupied) {
        // The driver is yanked out and legs it (handled by the caller via
        // the carjack flag: a pedestrian appears at the car).
      }
    }
  }
  return events;
}

// A cop has grabbed the player: held 1.1 s, then busted.
export function startArrest(player) {
  if (player.arrested > 0 || player.inCar) return;
  player.arrested = 1.1;
}

export function healPlayer(player, dt) {
  if (!player.inCar && player.health < 100) {
    player.health = Math.min(100, player.health + 1.5 * dt);
  }
}
