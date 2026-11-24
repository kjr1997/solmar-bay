// Pedestrians: they stroll the sidewalks, scatter when a car or a fist comes
// near, and drop cash when knocked down. A few carry phones and stand still.
import { BEACH_X } from './config.js';
import { makeRng } from './rng.js';
import { isWater, collideWorld, onRoadPoint } from './world.js';

export function spawnPeds(world, rng, count) {
  const peds = [];
  const palette = ['#e8b48a', '#c98a6a', '#8a5f4a', '#f0d0b0', '#6a4a3a'];
  for (let i = 0; i < count; i++) {
    const p = onRoadPoint(rng);
    // Step off the road onto the sidewalk.
    const x = p.x + rng.range(-70, 70);
    const y = p.y + rng.range(-70, 70);
    if (isWater(x, y) || x > BEACH_X) continue;
    peds.push({
      x, y, angle: rng.range(0, Math.PI * 2), speed: rng.range(28, 52),
      skin: rng.pick(palette), shirt: rng.pick(['#d0483e', '#3e6fd0', '#3ed08a', '#e8c33e', '#8a3ed0', '#e8e8e8']),
      state: 'walk', // 'walk' | 'flee' | 'down'
      downTimer: 0, waitTimer: rng.range(0, 6), cash: rng.int(5, 40),
      panic: 0,
    });
  }
  return peds;
}

export function updatePeds(world, peds, player, cars, dt, rng) {
  for (const p of peds) {
    if (p.state === 'down') {
      p.downTimer -= dt;
      if (p.downTimer <= 0) {
        p.state = 'walk';
        p.panic = 0;
        // Get back up a little away from where they fell.
        p.x += rng.range(-40, 40);
        p.y += rng.range(-40, 40);
        collideWorld(world, p, 10);
      }
      continue;
    }
    // Flee from the player when they punch or drive close, or from any fast car.
    let threatX = 0;
    let threatY = 0;
    let threat = false;
    const pd = Math.hypot(player.x - p.x, player.y - p.y);
    if (pd < 90 && (player.punching || player.inCar)) { threat = true; threatX = player.x; threatY = player.y; }
    for (const c of cars) {
      if (c.dead) continue;
      const cd = Math.hypot(c.x - p.x, c.y - p.y);
      if (cd < 70 && Math.abs(c.speed) > 60) { threat = true; threatX = c.x; threatY = c.y; break; }
    }
    if (threat) {
      p.state = 'flee';
      p.panic = 1.5;
      p.angle = Math.atan2(p.y - threatY, p.x - threatX);
    } else if (p.panic > 0) {
      p.panic -= dt;
      if (p.panic <= 0) p.state = 'walk';
    }
    if (p.state === 'flee') {
      // Panicked peds sprint; they slow down as the panic fades.
      const fleeSpeed = 110 + 50 * Math.max(0, p.panic / 1.5);
      p.x += Math.cos(p.angle) * fleeSpeed * dt;
      p.y += Math.sin(p.angle) * fleeSpeed * dt;
      collideWorld(world, p, 10);
      continue;
    }
    // Strolling: walk a while, pause, pick a new heading along the sidewalk.
    p.waitTimer -= dt;
    if (p.waitTimer <= 0) {
      p.waitTimer = rng.range(2, 7);
      // Prefer headings that keep them near a road.
      p.angle = rng.range(0, Math.PI * 2);
    }
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    if (isWater(p.x, p.y) || p.x > BEACH_X + 30) {
      p.angle += Math.PI;
      p.x += Math.cos(p.angle) * p.speed * dt * 2;
      p.y += Math.sin(p.angle) * p.speed * dt * 2;
    }
    collideWorld(world, p, 10);
  }
}

// Knock a pedestrian down (punch or car hit). Returns the cash they drop.
export function knockDown(ped) {
  if (ped.state === 'down') return 0;
  ped.state = 'down';
  ped.downTimer = 6;
  const cash = ped.cash;
  ped.cash = 0;
  return cash;
}
