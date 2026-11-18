// Traffic: the city's background cars. Each one drives the intersection graph —
// pick a neighbouring intersection, drive to it in the right-hand lane, pick the
// next — and slows for the car ahead. They never leave the roads.
import { LANE } from './config.js';
import { driveCar, makeCar } from './vehicles.js';

export function laneOffset(from, to) {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  // Right-hand traffic: the lane sits to the right of the direction of travel.
  return { x: -dy * LANE, y: dx * LANE };
}

export function spawnTrafficCar(random, city, x, y) {
  const type = random.pick(['sedan', 'sedan', 'hatch', 'taxi', 'van', 'muscle', 'truck']);
  const node = city.nearestNode(x, y);
  const from = node.neighbours[Math.floor(random() * node.neighbours.length)];
  const car = makeCar(random, type, x, y, Math.atan2(node.y - from.y, node.x - from.x), { driver: 'traffic' });
  car.from = from;
  car.node = node;
  car.cruise = 150 + random() * 90;
  return car;
}

/** Steer one traffic car for a step; returns false when it needs a new spawn. */
export function stepTrafficCar(car, dt, city, cars, random) {
  if (!car.node) return false;
  const off = laneOffset(car.from, car.node);
  const tx = car.node.x + off.x;
  const ty = car.node.y + off.y;
  const dx = tx - car.x;
  const dy = ty - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 26) {
    const next = car.node.neighbours.filter((n) => n !== car.from);
    const pick = next.length ? next[Math.floor(random() * next.length)] : car.node.neighbours[0];
    car.from = car.node;
    car.node = pick;
    car.stuck = 0;
    return true;
  }
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  // Slow for a car ahead in the same lane.
  let throttle = 1;
  for (const other of cars) {
    if (other === car || other.parked) continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const ahead = ox * Math.cos(car.angle) + oy * Math.sin(car.angle);
    const side = Math.abs(-ox * Math.sin(car.angle) + oy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 90 && side < 26) { throttle = 0; break; }
  }
  const speedBefore = car.speed;
  driveCar(car, dt, throttle, steer, false);
  if (car.speed > car.cruise) car.speed = car.cruise;
  if (Math.abs(car.speed) < 6 && throttle > 0) {
    car.stuck += dt;
    if (car.stuck > 4) return false; // wedged somewhere: respawn elsewhere
  } else {
    car.stuck = 0;
  }
  return true;
}
