// Traffic and pedestrians: ambient city life, knock-downs, cash drops.
import { mulberry32, pick, range } from './random.js';
import { WORLD_W, WORLD_H } from './config.js';
import { spawnCar } from './vehicles.js';
import { resolveBuildings, isOnRoad } from './world.js';

const PED_COLORS = ['#e8a080', '#c08050', '#f0c090', '#a06040', '#d09070', '#b07060'];
const SHIRTS = ['#c04040', '#4060c0', '#40a060', '#c0a040', '#8040c0', '#e0e0e0', '#303030'];

export function createTraffic(world, seed) {
  const rng = mulberry32(seed + 77);
  const cars = [];
  const kinds = ['sedan', 'taxi', 'hatch', 'van', 'truck', 'muscle'];
  for (let i = 0; i < 14; i++) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, [200, 600, 1000, 1400, 1800, 2200, 2600, 3000]) : pick(rng, [200, 600, 1000, 1400, 1800, 2200]);
    const along = range(rng, 200, 2300);
    const car = spawnCar(pick(rng, kinds), vertical ? road : along, vertical ? along : road,
      vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI), true);
    cars.push(car);
  }
  const peds = [];
  for (let i = 0; i < 34; i++) {
    peds.push(spawnPed(rng));
  }
  return { cars, peds };
}

function spawnPed(rng) {
  return {
    x: range(rng, 120, 3200), y: range(rng, 120, 2400),
    angle: range(rng, 0, Math.PI * 2),
    speed: range(rng, 30, 65),
    skin: pick(rng, PED_COLORS), shirt: pick(rng, SHIRTS),
    walkPhase: range(rng, 0, 6), down: 0, flee: 0, cash: 0,
    wander: range(rng, 2, 6),
  };
}

export function updateTraffic(state, world, dt, playerPos, onPedHit) {
  for (const car of state.cars) {
    if (car.isPlayer) continue;
    // Simple road following: keep angle snapped toward nearest road direction.
    const d = Math.hypot(car.x - playerPos.x, car.y - playerPos.y);
    if (d > 1400) {
      // Recycle far-away traffic near the player to keep streets busy.
      const rng = Math.random;
      const vertical = rng() < 0.5;
      const road = vertical ? pick(Math.random, [600, 1000, 1400, 1800, 2200]) : pick(Math.random, [600, 1000, 1400, 1800]);
      car.x = vertical ? road : playerPos.x + (rng() - 0.5) * 900;
      car.y = vertical ? playerPos.y + (rng() - 0.5) * 900 : road;
      car.speed = 60;
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const resolved = resolveBuildings(world, nx, ny, 20);
    if (Math.abs(resolved.x - nx) > 0.5 || Math.abs(resolved.y - ny) > 0.5) {
      car.angle += Math.PI / 2;
      car.speed *= 0.5;
    }
    car.x = Math.max(30, Math.min(WORLD_W - 30, resolved.x));
    car.y = Math.max(30, Math.min(WORLD_H - 30, resolved.y));
    if (car.speed < 80) car.speed += 40 * dt;
  }
  for (const ped of state.peds) {
    if (ped.down > 0) {
      ped.down -= dt;
      continue;
    }
    ped.wander -= dt;
    if (ped.wander <= 0) {
      ped.wander = 2 + Math.random() * 5;
      ped.angle = Math.random() * Math.PI * 2;
    }
    let sp = ped.speed;
    if (ped.flee > 0) {
      ped.flee -= dt;
      sp = 150;
      ped.angle = Math.atan2(ped.y - playerPos.y, ped.x - playerPos.x);
    }
    ped.walkPhase += dt * sp * 0.08;
    const nx = ped.x + Math.cos(ped.angle) * sp * dt;
    const ny = ped.y + Math.sin(ped.angle) * sp * dt;
    const resolved = resolveBuildings(world, nx, ny, 10);
    if (Math.abs(resolved.x - nx) < 0.5 && Math.abs(resolved.y - ny) < 0.5) {
      ped.x = resolved.x;
      ped.y = resolved.y;
    } else {
      ped.angle += Math.PI / 2;
    }
    // Hit by the player's car: knocked down, drops cash.
    if (playerPos.inCar && playerPos.car) {
      const car = playerPos.car;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 30 && Math.abs(car.speed) > 40) {
        ped.down = 4;
        ped.cash = 10 + Math.floor(Math.random() * 40);
        if (onPedHit) onPedHit(ped);
      }
    }
    // Nearby peds flee from a fast-moving player car.
    if (playerPos.inCar && playerPos.car && Math.abs(playerPos.car.speed) > 120) {
      const d = Math.hypot(ped.x - playerPos.x, ped.y - playerPos.y);
      if (d < 90 && ped.flee <= 0) ped.flee = 1.5;
    }
  }
}
