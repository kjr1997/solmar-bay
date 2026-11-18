// The law: wanted stars, foot cops who chase and bust, cruisers who chase and
// ram. Stars rise when the player commits a crime in sight and fall when the
// player stays out of every cop's sight. Cops spawn off-screen and give up far away.
import { POLICE, WANTED } from './config.js';
import { driveCar, makeCar } from './vehicles.js';
import { laneOffset } from './traffic.js';
import { makePed } from './peds.js';

export function wantedCarCount(wanted) {
  if (wanted <= 0) return 0;
  return Math.min(POLICE.maxCars, wanted + (wanted >= 3 ? 1 : 0));
}
export function wantedFootCount(wanted) {
  return wanted <= 0 ? 0 : Math.min(4, 1 + wanted);
}

/** Where a cop spawns: on the road nearest the player, just off-screen. */
function spawnPoint(random, city, px, py) {
  const node = city.nearestNode(px, py);
  const angle = random() * Math.PI * 2;
  const x = px + Math.cos(angle) * POLICE.spawnDistance;
  const y = py + Math.sin(angle) * POLICE.spawnDistance;
  const near = city.nearestNode(x, y);
  return { x: near.x, y: near.y };
}

export function spawnFootCop(random, city, player) {
  const p = spawnPoint(random, city, player.x, player.y);
  const cop = makePed(random, p.x, p.y);
  cop.shirt = '#20242e';
  cop.skin = '#f2c89b';
  cop.mood = 'chase';
  cop.hp = POLICE.footHp;
  cop.cop = true;
  return cop;
}

export function spawnPoliceCar(random, city, player) {
  const p = spawnPoint(random, city, player.x, player.y);
  const car = makeCar(random, 'police', p.x, p.y, Math.atan2(player.y - p.y, player.x - p.x), { driver: 'police' });
  car.siren = true;
  // Road pursuit starts here: the cruiser drives the intersection graph.
  car.from = city.nearestNode(p.x, p.y);
  car.node = car.from.neighbours[0];
  return car;
}

/** A foot cop runs at the player, punches in range, and busts after holding on. */
export function stepFootCop(cop, dt, player, world) {
  const dx = player.x - cop.x;
  const dy = player.y - cop.y;
  const dist = Math.hypot(dx, dy);
  if (dist > POLICE.despawnDistance) return false;
  cop.angle = Math.atan2(dy, dx);
  if (dist > 34) {
    cop.x += Math.cos(cop.angle) * POLICE.footSpeed * dt;
    cop.y += Math.sin(cop.angle) * POLICE.footSpeed * dt;
    cop.bustTimer = 0;
  } else {
    cop.bustTimer = (cop.bustTimer ?? 0) + dt;
    if (cop.bustTimer > POLICE.bustSeconds) {
      world.busted = true;
      return false;
    }
    // Cops punch while they hold you: chip damage, no knockdown.
    if (player.hp > 0) {
      player.hp = Math.max(0, player.hp - POLICE.punchDamage * dt);
      player.hurtTimer = 1;
    }
  }
  return true;
}

/** A cruiser pursues: on the roads it drives the intersection graph toward the
 * player's nearest intersection (greedy, one node at a time); close in, it
 * steers straight at the target to ram. Stays on the roads, so it does not
 * cut across blocks and pile traffic up at intersections. */
export function stepPoliceCar(car, dt, player, playerCar, world) {
  const tx = playerCar ? playerCar.x : player.x;
  const ty = playerCar ? playerCar.y : player.y;
  const dx = tx - car.x;
  const dy = ty - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist > POLICE.despawnDistance) return false;
  if (car.ramCooldown > 0) car.ramCooldown -= dt;
  let throttle = 1;
  let steer = 0;
  if (dist < 240 || !car.node) {
    // Close in: straight at the target.
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    steer = Math.max(-1, Math.min(1, diff * 2.5));
    if (car.reverseTimer > 0) {
      car.reverseTimer -= dt;
      throttle = -1;
      steer = -steer;
    } else if (Math.abs(diff) > 2.2 && Math.abs(car.speed) < 60) {
      // Facing the wrong way and barely moving: back up and turn around.
      car.reverseTimer = 0.7;
    }
  } else {
    // Road pursuit: drive to the next intersection, then pick the neighbour
    // closest to the player's intersection.
    const off = laneOffset(car.from, car.node);
    const nx = car.node.x + off.x;
    const ny = car.node.y + off.y;
    const ndx = nx - car.x;
    const ndy = ny - car.y;
    if (Math.hypot(ndx, ndy) < 30) {
      const target = world.city.nearestNode(tx, ty);
      let best = null;
      let bestD = Infinity;
      for (const n of car.node.neighbours) {
        if (n === car.from) continue;
        const d = (n.x - target.x) ** 2 + (n.y - target.y) ** 2;
        if (d < bestD) { bestD = d; best = n; }
      }
      car.from = car.node;
      car.node = best ?? car.node.neighbours[0];
    } else {
      const wantAngle = Math.atan2(ndy, ndx);
      let diff = wantAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      steer = Math.max(-1, Math.min(1, diff * 2.5));
    }
  }
  driveCar(car, dt, throttle, steer, false);
  // Ramming the player's car hurts it and slows it; ramming the player hurts them.
  // Only a fast closing hit counts: a cruiser grinding alongside does no damage.
  if (playerCar && dist < (car.def.len + playerCar.def.len) / 2 - 6 && car.ramCooldown <= 0
    && Math.abs(car.speed) > POLICE.ramMinSpeed) {
    playerCar.hp = Math.max(0, playerCar.hp - POLICE.carRamDamage);
    playerCar.speed *= 0.5;
    car.ramCooldown = POLICE.ramCooldownSeconds;
    world.addParticles(playerCar.x, playerCar.y, 8, '#f7d774');
    world.crimeNoise();
  } else if (!playerCar && dist < 40 && car.ramCooldown <= 0) {
    player.hp = Math.max(0, player.hp - POLICE.carRamDamage);
    player.hurtTimer = 1;
    car.ramCooldown = POLICE.ramCooldownSeconds;
  }
  return true;
}

/** Wanted decay: no cop in sight for a while, lose a star. */
export function decayWanted(world, dt) {
  const s = world.state;
  if (s.wanted <= 0) return;
  const near = s.cops.some((c) => Math.hypot(c.x - s.player.x, c.y - s.player.y) < WANTED.unseenRadius)
    || s.cars.some((c) => c.driver === 'police' && Math.hypot(c.x - s.player.x, c.y - s.player.y) < WANTED.unseenRadius);
  if (near) {
    s.hiddenTimer = 0;
    return;
  }
  s.hiddenTimer += dt;
  if (s.hiddenTimer > WANTED.unseenSeconds) {
    s.decayTimer += dt;
    if (s.decayTimer > WANTED.decayHiddenSeconds) {
      s.wanted = Math.max(0, s.wanted - 1);
      s.decayTimer = 0;
      s.hiddenTimer = 0;
      world.message(`Heat dying down — ${s.wanted} star${s.wanted === 1 ? '' : 's'} left.`);
    }
  }
}
