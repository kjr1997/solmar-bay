// Vehicles: parked cars, traffic, police cruisers and the player's ride.
// Driving is arcade physics: acceleration, braking/reverse, steering that
// scales with speed, handbrake drift, building and car collisions.
import { VEHICLES, WORLD_W, WORLD_H, AVENUES, STREETS } from './config.js';
import { makeRng } from './rng.js';
import { isWater, hitBuilding, onRoadPoint } from './world.js';

export function makeVehicle(type, x, y, angle, driver) {
  const spec = VEHICLES[type];
  return {
    type, spec, x, y, angle, speed: 0,
    health: 100, driver: driver || 'none', // 'none' | 'traffic' | 'police' | 'player'
    color: spec.color, dead: false, smoke: 0,
    // Traffic AI state: which road axis it follows and its lane offset.
    axis: Math.abs(Math.cos(angle)) > 0.7 ? 'x' : 'y',
    lane: 0, cruise: spec.top * 0.55,
    turnCooldown: 0,
  };
}

// Parked cars along road edges + a few in the beach car park.
export function spawnParked(world, rng) {
  const cars = [];
  const types = ['sedan', 'taxi', 'hatch', 'van', 'truck', 'muscle', 'sedan', 'hatch'];
  for (let i = 0; i < 26; i++) {
    const p = onRoadPoint(rng);
    const along = rng.chance(0.5);
    const off = (rng.chance(0.5) ? 1 : -1) * 34;
    const x = along ? p.x + off : p.x;
    const y = along ? p.y : p.y + off;
    const angle = along ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    if (isWater(x, y) || hitBuilding(world, x, y, 26)) continue;
    cars.push(makeVehicle(rng.pick(types), x, y, angle, 'none'));
  }
  // The Comet GT waits at the docks for mission 4 (spawned by missions.js
  // too, but one is always parked here for free-roam joyrides).
  cars.push(makeVehicle('sports', 3060, 2320, -Math.PI / 2, 'none'));
  return cars;
}

export function spawnTraffic(world, rng, count, keepAway) {
  const cars = [];
  const types = ['sedan', 'taxi', 'hatch', 'van', 'truck', 'sedan', 'taxi'];
  for (let i = 0; i < count; i++) {
    const p = onRoadPoint(rng);
    // Keep traffic from spawning on top of the player at load time.
    if (keepAway && Math.hypot(p.x - keepAway.x, p.y - keepAway.y) < 260) continue;
    const angle = rng.chance(0.5) ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const v = makeVehicle(rng.pick(types), p.x, p.y, angle, 'traffic');
    v.speed = v.cruise * rng.range(0.7, 1);
    v.lane = (rng.chance(0.5) ? 1 : -1) * 16;
    cars.push(v);
  }
  return cars;
}

function carRadius(v) {
  return Math.max(v.spec.len, v.spec.wid) / 2;
}

// One driving step for any car. steer in [-1, 1], throttle in [-1, 1]
// (negative = brake/reverse), handbrake true while Space is held.
export function driveVehicle(world, v, steer, throttle, handbrake, dt, onCrash) {
  const spec = v.spec;
  const speedRatio = Math.abs(v.speed) / spec.top;
  if (throttle > 0) v.speed += spec.accel * throttle * dt;
  else if (throttle < 0) {
    // Brake hard while moving forward, reverse slowly when stopped.
    v.speed += (v.speed > 8 ? -spec.accel * 1.6 : -spec.accel * 0.45) * dt;
  } else {
    v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 60 * dt);
  }
  if (handbrake) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 320 * dt);
  v.speed = Math.max(-spec.top * 0.35, Math.min(spec.top, v.speed));

  const grip = handbrake ? 0.45 : 1;
  const turn = steer * spec.turn * grip * (0.35 + 0.65 * Math.min(1, Math.abs(v.speed) / 120));
  v.angle += turn * dt * Math.sign(v.speed || 1);

  const nx = v.x + Math.cos(v.angle) * v.speed * dt;
  const ny = v.y + Math.sin(v.angle) * v.speed * dt;
  const r = carRadius(v) * 0.8;
  const blocked = hitBuilding(world, nx, ny, r) || isWater(nx, ny);
  if (blocked) {
    // Only a real impact costs health. Creeping into a wall at parking
    // speed just stops the car — otherwise traffic grinds itself to death
    // leaning on a building, and a carjacked car would die under the player.
    const impact = Math.abs(v.speed);
    if (impact > 50) {
      if (impact > 120 && onCrash) onCrash(impact);
      v.health = Math.max(0, v.health - (impact - 50) * 0.06);
    }
    v.speed *= -0.25; // bounce off, lose most speed
  } else {
    v.x = nx;
    v.y = ny;
  }
  v.x = Math.max(30, Math.min(WORLD_W - 30, v.x));
  v.y = Math.max(30, Math.min(WORLD_H - 30, v.y));
  if (v.health < 35) v.smoke = Math.min(1, v.smoke + dt);
  else v.smoke = Math.max(0, v.smoke - dt);
  return speedRatio;
}

// Traffic AI: cruise along its road; at an intersection, sometimes turn.
// Keeps cars on roads and roughly in their lane.
export function updateTraffic(world, cars, dt, rng) {
  for (const v of cars) {
    if (v.driver !== 'traffic' || v.dead) continue;
    v.turnCooldown -= dt;
    const nearX = AVENUES.find((ax) => Math.abs(v.x - ax) < 60);
    const nearY = STREETS.find((sy) => Math.abs(v.y - sy) < 60);
    if (nearX !== undefined && nearY !== undefined && v.turnCooldown <= 0 && rng.chance(0.35)) {
      // Turn onto the crossing road.
      const horizontal = v.axis === 'y';
      v.axis = horizontal ? 'x' : 'y';
      v.angle = horizontal ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
      v.turnCooldown = 2.5;
    }
    // If the road ahead is blocked (building / water), turn around instead
    // of leaning on the obstacle: pick the opposite heading on the same road.
    const ahead = 34;
    const ax = v.x + Math.cos(v.angle) * ahead;
    const ay = v.y + Math.sin(v.angle) * ahead;
    if (v.turnCooldown <= 0 && (hitBuilding(world, ax, ay, 20) || isWater(ax, ay))) {
      v.angle += Math.PI; // same road, opposite direction — axis unchanged
      v.turnCooldown = 2.5;
      v.speed *= 0.5;
    }
    // Steer gently back towards the road centre line + lane offset.
    const target = v.axis === 'x'
      ? (STREETS.find((sy) => Math.abs(v.y - sy) < 70) ?? v.y) + v.lane
      : (AVENUES.find((ax) => Math.abs(v.x - ax) < 70) ?? v.x) + v.lane;
    const cross = v.axis === 'x' ? target - v.y : target - v.x;
    const steer = Math.max(-1, Math.min(1, cross * 0.02)) * (v.axis === 'x' ? Math.sign(Math.cos(v.angle)) : Math.sign(Math.sin(v.angle)));
    driveVehicle(world, v, steer * 0.4, 0.7, false, dt, null);
    // Keep traffic slow enough to feel like city traffic.
    if (v.speed > v.cruise) v.speed = v.cruise;
  }
}

// Simple pairwise car separation so traffic does not pile through itself.
export function separateCars(cars) {
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = (carRadius(a) + carRadius(b)) * 0.75;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        a.speed *= 0.6;
        b.speed *= 0.6;
      }
    }
  }
}
