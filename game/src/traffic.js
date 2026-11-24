// Solmar Bay — ambient traffic cars and pedestrians.
// Traffic follows the road grid (avenues and streets) and stops briefly at
// intersections; pedestrians stroll the sidewalks and flee from danger.
import { AVENUES, STREETS, ROAD_W, CAR_TYPES } from './config.js';
import { makeCar, driveCar, carDef } from './vehicles.js';
import { makeRng } from './random.js';
import { isOnRoad, nearestRoadPoint } from './world.js';

const PED_COLORS = ['#d8a060', '#c08050', '#e8c090', '#a87050', '#e0b080', '#b07850'];
const PED_SHIRTS = ['#3a6ab5', '#b53a3a', '#3ab56a', '#b5a03a', '#7a3ab5', '#3ab5a8', '#e8e8e8', '#333a44'];

export function spawnTraffic(count, rng, buildings) {
  const cars = [];
  const types = ['sedan', 'taxi', 'hatch', 'van', 'truck', 'muscle', 'sedan'];
  for (let i = 0; i < count; i++) {
    const vertical = rng.chance(0.5);
    const type = rng.pick(types);
    let x, y, angle;
    if (vertical) {
      x = rng.pick(AVENUES) + (rng.chance(0.5) ? 20 : -20);
      y = rng.range(150, 2450);
      angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = rng.range(150, 2950);
      y = rng.pick(STREETS) + (rng.chance(0.5) ? 20 : -20);
      angle = rng.chance(0.5) ? 0 : Math.PI;
    }
    const car = makeCar(type, x, y, angle, { isTraffic: true, occupied: true });
    car.cruise = rng.range(120, 210);
    car.wait = 0;
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, buildings, playerCar) {
  for (const car of cars) {
    if (car.wait > 0) { car.wait -= dt; car.speed = 0; continue; }
    // Steer back onto the road centre if drifting off.
    const rp = nearestRoadPoint(car.x, car.y);
    const wantAngle = rp.axis === 'v' ? (Math.sin(car.angle) >= 0 ? Math.PI / 2 : -Math.PI / 2)
      : (Math.cos(car.angle) >= 0 ? 0 : Math.PI);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2));
    const target = car.cruise;
    car.speed += Math.max(-140 * dt, Math.min(140 * dt, target - car.speed));
    if (rp.axis === 'v') car.x += (rp.x + (Math.sin(car.angle) >= 0 ? 20 : -20) - car.x) * 0.4 * dt;
    else car.y += (rp.y + (Math.cos(car.angle) >= 0 ? 20 : -20) - car.y) * 0.4 * dt;
    driveCar(car, steer, 1, false, dt, buildings);
    // Random brief pauses at intersections keep traffic feeling alive.
    const nearCross = AVENUES.some((ax) => Math.abs(car.x - ax) < 60) &&
      STREETS.some((sy) => Math.abs(car.y - sy) < 60);
    if (nearCross && Math.random() < 0.004) car.wait = 1 + Math.random() * 2;
    // Keep traffic inside the city; respawn far away cars on a random road.
    if (car.x < 60 || car.x > 3080 || car.y < 60 || car.y > 2540) {
      const fresh = spawnTraffic(1, makeRng((Math.random() * 1e9) | 0), buildings)[0];
      Object.assign(car, fresh);
    }
  }
  // Car-to-car bumps.
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy < 44 * 44) {
        a.speed *= 0.6; b.speed *= 0.6;
        a.x -= dx * 0.02; a.y -= dy * 0.02;
        b.x += dx * 0.02; b.y += dy * 0.02;
      }
    }
  }
}

export function spawnPedestrians(count, rng, buildings) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    let x, y, tries = 0;
    do {
      x = rng.range(120, 3050);
      y = rng.range(120, 2480);
      tries++;
    } while (isOnRoad(x, y) && tries < 20);
    peds.push({
      x, y, angle: rng.range(0, Math.PI * 2),
      speed: rng.range(28, 55),
      skin: rng.pick(PED_COLORS), shirt: rng.pick(PED_SHIRTS),
      hp: 100, down: 0, flee: 0, walkPhase: rng.range(0, 6),
      changeDir: rng.range(2, 6),
    });
  }
  return peds;
}

export function updatePedestrians(peds, dt, buildings, danger) {
  for (const p of peds) {
    if (p.down > 0) { p.down -= dt; continue; }
    p.changeDir -= dt;
    // Flee from a nearby fast car or a punching player.
    const d = danger ? Math.hypot(p.x - danger.x, p.y - danger.y) : 9999;
    if (d < 160) {
      p.flee = 1.2;
      p.angle = Math.atan2(p.y - danger.y, p.x - danger.x);
    }
    if (p.flee > 0) p.flee -= dt;
    if (p.changeDir <= 0) {
      p.changeDir = rngWalk();
      p.angle = Math.random() * Math.PI * 2;
    }
    const sp = p.flee > 0 ? p.speed * 2.4 : p.speed;
    const nx = p.x + Math.cos(p.angle) * sp * dt;
    const ny = p.y + Math.sin(p.angle) * sp * dt;
    const blocked = buildings.some((b) => nx > b.x - 6 && nx < b.x + b.w + 6 && ny > b.y - 6 && ny < b.y + b.h + 6);
    if (!blocked && nx > 30 && nx < 3100 && ny > 30 && ny < 2570) {
      p.x = nx; p.y = ny;
    } else {
      p.angle += Math.PI / 2;
    }
    p.walkPhase += dt * (p.flee > 0 ? 12 : 6);
  }
}

function rngWalk() { return 2 + Math.random() * 5; }

export function pedCount() { return 46; }
export function trafficCount() { return 26; }
export { CAR_TYPES };
export { carDef };
