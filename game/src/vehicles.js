// Vehicles: driving physics, collisions, entering/exiting, damage.
import { VEHICLES, WORLD_W, WORLD_H } from './config.js';
import { resolveBuildings } from './world.js';

let nextId = 1000;

export function spawnCar(kind, x, y, angle, occupied) {
  const def = VEHICLES[kind];
  return {
    id: nextId++, kind, def,
    x, y, angle: angle || 0, speed: 0,
    health: 100, occupied: !!occupied,
    color: def.color, isPlayer: false, isPolice: kind === 'police',
    brakeLight: false, smoke: 0,
  };
}

export function updateCarDriving(car, input, world, dt, onCrash) {
  const axis = input.axis();
  const def = car.def;
  const forward = axis.y !== 0 ? -axis.y : 0; // W = forward
  const steer = axis.x;
  car.speed += forward * def.accel * dt;
  if (forward === 0) {
    car.speed -= car.speed * 0.8 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  if (input.down('Space')) {
    car.speed -= car.speed * 2.4 * dt;
    car.brakeLight = true;
  } else {
    car.brakeLight = false;
  }
  const maxF = def.top;
  const maxR = -90;
  if (car.speed > maxF) car.speed = maxF;
  if (car.speed < maxR) car.speed = maxR;
  const steerAmount = steer * def.grip * dt * Math.min(1, Math.abs(car.speed) / 70) * (car.speed < 0 ? -1 : 1);
  car.angle += steerAmount * (Math.abs(car.speed) > 1 ? 1 : 0);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const resolved = resolveBuildings(world, nx, ny, 20);
  const hitWall = Math.abs(resolved.x - nx) > 0.5 || Math.abs(resolved.y - ny) > 0.5;
  if (hitWall && Math.abs(car.speed) > 60) {
    if (onCrash) onCrash(Math.abs(car.speed));
    car.speed *= -0.25;
    car.health -= 4;
  }
  car.x = Math.max(30, Math.min(WORLD_W - 30, resolved.x));
  car.y = Math.max(30, Math.min(WORLD_H - 30, resolved.y));
  if (car.health < 40) car.smoke += dt;
  // A wrecked car slows to a stop on its own.
  if (car.health <= 0) car.speed *= Math.max(0, 1 - 3 * dt);
}

export function updateCarAI(car, world, dt, target) {
  // Traffic cars cruise along roads; police cars chase a target point.
  const def = car.def;
  if (target) {
    const want = Math.atan2(target.y - car.y, target.x - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    car.speed += def.accel * 0.9 * dt;
    if (car.speed > def.top * 0.92) car.speed = def.top * 0.92;
  } else {
    car.speed += (def.top * 0.45 - car.speed) * 0.5 * dt;
    if (car._turnAt !== undefined && car._turnAt < 0) {
      car._turnAt = 1.5 + Math.random() * 3;
      car.angle += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    car._turnAt = (car._turnAt === undefined ? 2 : car._turnAt) - dt;
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const resolved = resolveBuildings(world, nx, ny, 20);
  if (Math.abs(resolved.x - nx) > 0.5 || Math.abs(resolved.y - ny) > 0.5) {
    car.angle += Math.PI / 2;
    car.speed *= 0.4;
  }
  car.x = Math.max(30, Math.min(WORLD_W - 30, resolved.x));
  car.y = Math.max(30, Math.min(WORLD_H - 30, resolved.y));
}

export function carCorners(car) {
  const l = car.def.len / 2;
  const w = car.def.wid / 2;
  const c = Math.cos(car.angle);
  const s = Math.sin(car.angle);
  return [
    { x: car.x + c * l - s * w, y: car.y + s * l + c * w },
    { x: car.x + c * l + s * w, y: car.y + s * l - c * w },
    { x: car.x - c * l - s * w, y: car.y - s * l + c * w },
    { x: car.x - c * l + s * w, y: car.y - s * l - c * w },
  ];
}
