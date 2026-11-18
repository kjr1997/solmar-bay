// Cars: one entity, four jobs — hold a car's state, drive it with arcade physics,
// keep it out of buildings and water, and bump it off other cars. A car is a
// rotated rectangle; collisions use its centre circle plus a nose/tail check so
// long vehicles do not clip through walls sideways.
import { CAR_TYPES, LANE, WORLD } from './config.js';

export function makeCar(random, type, x, y, angle, opts = {}) {
  const def = CAR_TYPES[type];
  const color = opts.color ?? random.pick(def.colors);
  return {
    type, def, color, x, y, angle, speed: 0,
    hp: 100, driver: opts.driver ?? null, // 'player' | 'traffic' | 'police' | 'ped' | null (parked)
    parked: opts.parked ?? false, police: type === 'police',
    brakeLight: false, dead: false, siren: false, hurtTimer: 0,
    // traffic AI fields, filled in by traffic.js
    node: null, from: null, stuck: 0,
    // police AI fields, filled in by police.js
    ramCooldown: 0, reverseTimer: 0,
  };
}

/** Arcade driving: throttle, brake/reverse, steering that bites harder at speed. */
export function driveCar(car, dt, throttle, steer, handbrake) {
  const def = car.def;
  const forward = throttle > 0;
  const accel = forward ? def.accel * throttle : def.accel * 0.55 * -throttle;
  car.speed += accel * dt;
  if (throttle === 0) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 160 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 620 * dt);
  const top = forward || car.speed > 0 ? def.top : def.reverse;
  car.speed = Math.max(-def.reverse, Math.min(def.top, car.speed));
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  const grip = handbrake ? 1.9 : 1;
  const turnRate = def.turn * grip * Math.min(1, Math.abs(car.speed) / 140 + 0.25);
  car.angle += steer * turnRate * dt * Math.sign(car.speed || 1) * (car.speed < 0 ? -1 : 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.brakeLight = throttle < 0 || handbrake;
}

/** Circle-vs-building push-out for a car, using its nose, centre and tail. */
export function collideCarWorld(car, city, dt = 1 / 60) {
  const def = car.def;
  const half = def.len / 2;
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  let hit = false;
  for (const t of [-half + 8, 0, half - 8]) {
    const px = car.x + cos * t;
    const py = car.y + sin * t;
    const b = city.buildingAt(px, py, def.wid / 2 - 2);
    if (b) {
      const cx = Math.max(b.x, Math.min(px, b.x + b.w));
      const cy = Math.max(b.y, Math.min(py, b.y + b.h));
      const dx = px - cx;
      const dy = py - cy;
      const d = Math.hypot(dx, dy) || 0.001;
      const r = def.wid / 2 - 2;
      if (d < r) {
        if (d < 0.5) {
          // The point is inside the building: push out along the nearest edge.
          const dl = px - b.x;
          const dr = b.x + b.w - px;
          const dt = py - b.y;
          const db = b.y + b.h - py;
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) car.x -= dl + r;
          else if (m === dr) car.x += dr + r;
          else if (m === dt) car.y -= dt + r;
          else car.y += db + r;
        } else {
          const push = r - d;
          car.x += (dx / d) * push;
          car.y += (dy / d) * push;
        }
        car.speed *= 0.55;
        if (car.hurtTimer <= 0) {
          car.hp = Math.max(0, car.hp - 2);
          car.hurtTimer = 0.5;
        }
        hit = true;
      }
    }
  }
  if (city.inWater(car.x, car.y)) {
    // Water is a wall for cars: back out along the direction of travel.
    car.x -= Math.cos(car.angle) * 12;
    car.y -= Math.sin(car.angle) * 12;
    car.speed *= 0.4;
    hit = true;
  }
  car.x = Math.max(24, Math.min(WORLD.width - 24, car.x));
  car.y = Math.max(24, Math.min(WORLD.height - 24, car.y));
  return hit;
}

/** Two cars bumping: push apart along the centre line, trade a little speed. */
export function collideCarCar(a, b, dt = 1 / 60) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const min = (a.def.len + b.def.len) / 2 - 14;
  if (d === 0 || d >= min) return false;
  const nx = dx / d;
  const ny = dy / d;
  const overlap = (min - d) / 2;
  // The player's car is the heavy one: it takes a quarter of the shove, the
  // other car takes the rest, so a ram does not throw the player sideways.
  const aShare = a.driver === 'player' ? 0.25 : b.driver === 'player' ? 0.75 : 0.5;
  const bShare = 1 - aShare;
  a.x -= nx * overlap * 2 * aShare;
  a.y -= ny * overlap * 2 * aShare;
  b.x += nx * overlap * 2 * bShare;
  b.y += ny * overlap * 2 * bShare;
  const closing = (a.speed - b.speed) * 0.5;
  a.speed -= closing * 0.4;
  b.speed += closing * 0.4;
  if (a.hurtTimer <= 0) { a.hp = Math.max(0, a.hp - 1); a.hurtTimer = 0.5; }
  if (b.hurtTimer <= 0) { b.hp = Math.max(0, b.hp - 1); b.hurtTimer = 0.5; }
  return true;
}

/** A point on the car's door: where a pedestrian stands to get in. */
export function doorPoint(car) {
  return {
    x: car.x + Math.cos(car.angle + Math.PI / 2) * (car.def.wid / 2 + 12),
    y: car.y + Math.sin(car.angle + Math.PI / 2) * (car.def.wid / 2 + 12),
  };
}
