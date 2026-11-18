// On-foot player: movement, running, punching, health, getting in/out of cars.
import { WORLD_W, WORLD_H } from './config.js';
import { resolveBuildings } from './world.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: 0, speed: 0,
    health: 100, radius: 14,
    inCar: null, punchTimer: 0, punchCooldown: 0,
    walkPhase: 0, moving: false, arrested: 0,
  };
}

export function updatePlayerOnFoot(player, input, world, dt, onPunch) {
  const axis = input.axis();
  const running = input.run();
  const target = running ? 265 : 170;
  let vx = 0;
  let vy = 0;
  if (axis.x !== 0 || axis.y !== 0) {
    const len = Math.hypot(axis.x, axis.y);
    vx = (axis.x / len) * target;
    vy = (axis.y / len) * target;
    player.angle = Math.atan2(vy, vx);
    player.moving = true;
    player.walkPhase += dt * (running ? 13 : 9);
  } else {
    player.moving = false;
  }
  player.speed = Math.hypot(vx, vy);
  const next = resolveBuildings(world, player.x + vx * dt, player.y + vy * dt, player.radius);
  player.x = Math.max(20, Math.min(WORLD_W - 20, next.x));
  player.y = Math.max(20, Math.min(WORLD_H - 20, next.y));
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (input.wasPressed('Space') && player.punchCooldown <= 0) {
    player.punchTimer = 0.22;
    player.punchCooldown = 0.42;
    if (onPunch) onPunch(player);
  }
}

export function nearestCar(player, cars, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.isPolice) continue; // cruisers are locked, never enterable
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
