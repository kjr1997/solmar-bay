// Solmar Bay — vehicle physics and spawning.
// Cars are simple arcade bodies: forward speed, steering that scales with
// speed, handbrake drift, building collisions and car-to-car bumps.
import { CAR_TYPES, WORLD_W, WORLD_H } from './config.js';
import { pointInBuildings, isInSea } from './world.js';

let nextCarId = 1;

export function makeCar(type, x, y, angle, opts = {}) {
  const def = CAR_TYPES[type];
  return {
    id: opts.id || ('car-' + (nextCarId++)),
    type, x, y, angle, speed: 0,
    color: opts.color || def.color,
    hp: 100, occupied: !!opts.occupied, driver: opts.driver || null,
    prize: !!opts.prize, isTraffic: !!opts.isTraffic, isPolice: type === 'police',
    brakeLight: false, smoke: 0,
  };
}

export function carDef(car) { return CAR_TYPES[car.type]; }

// Drive one car for dt seconds from steering (-1..1) and throttle (-1..1).
export function driveCar(car, steer, throttle, handbrake, dt, buildings) {
  const def = carDef(car);
  const target = throttle * def.topSpeed;
  const accelRate = handbrake ? def.accel * 0.55 : def.accel;
  if (car.speed < target) car.speed = Math.min(target, car.speed + accelRate * dt);
  else if (car.speed > target) car.speed = Math.max(target, car.speed - def.accel * 1.6 * dt);
  if (handbrake) car.speed *= Math.pow(0.35, dt);

  const speedRatio = Math.abs(car.speed) / def.topSpeed;
  const turnRate = steer * (0.9 + speedRatio * 1.9) * def.grip * (handbrake ? 1.7 : 1);
  if (Math.abs(car.speed) > 8) car.angle += turnRate * Math.sign(car.speed) * dt;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = pointInBuildings(nx, ny, buildings);
  if (hit || isInSea(nx, ny) || nx < 20 || nx > WORLD_W - 20 || ny < 20 || ny > WORLD_H - 20) {
    if (Math.abs(car.speed) > 120) car.hp = Math.max(0, car.hp - 6);
    car.speed *= -0.25;
  } else {
    car.x = nx; car.y = ny;
  }
  car.brakeLight = throttle < 0 || handbrake;
  if (car.hp < 35) car.smoke = Math.min(1, car.smoke + dt);
  else car.smoke = Math.max(0, car.smoke - dt);
  return car;
}

// Push two overlapping cars apart and trade a little speed.
export function separateCars(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const minD = 44;
  if (d >= minD) return false;
  const push = (minD - d) / 2;
  const ux = dx / d, uy = dy / d;
  a.x -= ux * push; a.y -= uy * push;
  b.x += ux * push; b.y += uy * push;
  const exchanged = a.speed;
  a.speed = b.speed * 0.5;
  b.speed = exchanged * 0.5;
  return true;
}

export function carBounds(car) {
  const def = carDef(car);
  return { hw: def.w / 2, hh: def.h / 2 };
}

export function isWrecked(car) { return car.hp <= 0; }
