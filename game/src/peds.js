// Pedestrians: they walk the sidewalks, cross at intersections, and run when a
// crime happens next to them. A driver pulled from a car becomes one of them.
// Peds are circles with a heading, a walk target and a mood: calm, fleeing or down.
import { AVENUES, AVENUE_W, PLAYER, STREETS, STREET_W } from './config.js';

const SHIRTS = ['#e8b23a', '#4f7ec9', '#7ec8a9', '#e88ca0', '#9b7ec2', '#c9c9c9', '#5aa469', '#d97e2e', '#6fb7d9'];

export function makePed(random, x, y) {
  return {
    x, y, angle: random() * Math.PI * 2, speed: 0,
    hp: 50, shirt: random.pick(SHIRTS), skin: random.pick(['#f2c89b', '#c98d5f', '#8a5a3b', '#f7d7b0']),
    mood: 'calm', // calm | flee | down
    tx: x, ty: y, // walk target
    downTimer: 0, fear: 0, driver: false,
  };
}

/** A sidewalk point: just outside a road's edge. */
export function sidewalkPoint(random, city) {
  if (random() < 0.5) {
    const ave = random.pick(AVENUES);
    const side = random() < 0.5 ? -1 : 1;
    return { x: ave + side * (AVENUE_W / 2 + 12), y: 40 + random() * 2520 };
  }
  const st = random.pick(STREETS);
  const side = random() < 0.5 ? -1 : 1;
  return { x: 40 + random() * 3220, y: st + side * (STREET_W / 2 + 12) };
}

export function stepPed(ped, dt, random, city, player, cars) {
  if (ped.mood === 'down') {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) { ped.mood = 'calm'; ped.hp = 50; }
    return;
  }
  const dx = ped.tx - ped.x;
  const dy = ped.ty - ped.y;
  const dist = Math.hypot(dx, dy);
  // A nearby crime or a speeding car scares peds into running away.
  if (ped.fear > 0) {
    ped.fear -= dt;
    ped.mood = 'flee';
  }
  if (ped.mood === 'flee') {
    const fx = ped.x - player.x;
    const fy = ped.y - player.y;
    const fd = Math.hypot(fx, fy) || 1;
    ped.angle = Math.atan2(fy / fd, fx / fd);
    ped.speed = 220;
    if (ped.fear <= 0) ped.mood = 'calm';
  } else if (dist < 12) {
    const p = sidewalkPoint(random, city);
    ped.tx = p.x;
    ped.ty = p.y;
    ped.speed = 55 + random() * 40;
  } else {
    ped.angle = Math.atan2(dy, dx);
    if (ped.speed === 0) ped.speed = 55 + random() * 40;
  }
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  city.resolveCircle(ped, PLAYER.radius - 2);
  // Cars scare peds that are right in front of them.
  for (const car of cars) {
    if (car.parked || Math.abs(car.speed) < 120) continue;
    const ox = ped.x - car.x;
    const oy = ped.y - car.y;
    const ahead = ox * Math.cos(car.angle) + oy * Math.sin(car.angle);
    const side = Math.abs(-ox * Math.sin(car.angle) + oy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 110 && side < 40) {
      ped.fear = 2.5;
      break;
    }
  }
}

/** A ped is knocked down: they drop cash and stay down a while. */
export function knockDown(ped, random) {
  ped.mood = 'down';
  ped.downTimer = 4 + random() * 3;
  ped.speed = 0;
  return 10 + Math.floor(random() * 21); // cash they drop
}
