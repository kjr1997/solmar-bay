// Wanted system and police: stars, foot cops, cruisers, arrest, cooldown.
import { spawnCar } from './vehicles.js';
import { resolveBuildings } from './world.js';

export function createPolice() {
  return { wanted: 0, hiddenTimer: 0, coolTimer: 0, cops: [], cruisers: [], arrestTimer: 0 };
}

export function addWanted(police, stars) {
  police.wanted = Math.max(0, Math.min(5, police.wanted + stars));
  police.hiddenTimer = 0;
  police.coolTimer = 0;
}

// Call when the player breaks line of sight for a while: starts the 10s hide clock.
export function startHiding(police) {
  if (police.wanted > 0) police.hiddenTimer = 10;
}

export function updatePolice(police, player, world, dt, events) {
  // Decay: hide 10s, then lose a star every 8s.
  if (police.wanted > 0) {
    if (police.hiddenTimer > 0) {
      police.hiddenTimer -= dt;
    } else {
      police.coolTimer += dt;
      if (police.coolTimer >= 8) {
        police.coolTimer = 0;
        police.wanted -= 1;
      }
    }
  }
  const wantCops = police.wanted > 0 ? Math.min(2 + police.wanted, 6) : 0;
  const wantCruisers = police.wanted >= 2 ? Math.min(police.wanted - 1, 3) : 0;
  // Spawn foot cops near the player.
  while (police.cops.length < wantCops) {
    const a = Math.random() * Math.PI * 2;
    police.cops.push({
      x: player.x + Math.cos(a) * 420, y: player.y + Math.sin(a) * 420,
      angle: 0, speed: 150 + police.wanted * 12, punchTimer: 0, holdTimer: 0,
    });
  }
  while (police.cruisers.length < wantCruisers) {
    const a = Math.random() * Math.PI * 2;
    const car = spawnCar('police',
      player.x + Math.cos(a) * 500, player.y + Math.sin(a) * 500, 0, true);
    car.isPolice = true;
    police.cruisers.push(car);
  }
  if (police.wanted === 0) {
    police.cops = [];
    police.cruisers = [];
    police.arrestTimer = 0;
    return;
  }
  // Foot cops chase and grab the player on foot.
  for (const cop of police.cops) {
    const d = Math.hypot(player.x - cop.x, player.y - cop.y);
    if (player.inCar) {
      cop.angle = Math.atan2(player.y - cop.y, player.x - cop.x);
      const nx = cop.x + Math.cos(cop.angle) * cop.speed * 0.5 * dt;
      const ny = cop.y + Math.sin(cop.angle) * cop.speed * 0.5 * dt;
      const r = resolveBuildings(world, nx, ny, 12);
      cop.x = r.x; cop.y = r.y;
      continue;
    }
    cop.angle = Math.atan2(player.y - cop.y, player.x - cop.x);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    const r = resolveBuildings(world, nx, ny, 12);
    cop.x = r.x; cop.y = r.y;
    if (d < 26) {
      cop.holdTimer += dt;
      if (cop.holdTimer > 0.4 && cop.punchTimer <= 0) {
        cop.punchTimer = 0.5;
        player.health -= 6;
        if (events.onCopHit) events.onCopHit();
      }
      if (cop.holdTimer >= 1.1) {
        if (events.onArrested) events.onArrested();
        cop.holdTimer = 0;
      }
    } else {
      cop.holdTimer = 0;
    }
    if (cop.punchTimer > 0) cop.punchTimer -= dt;
  }
  // Cruisers chase and ram the player's car.
  for (const cruiser of police.cruisers) {
    const target = player.inCar ? { x: player.x, y: player.y } : { x: player.x, y: player.y };
    const want = Math.atan2(target.y - cruiser.y, target.x - cruiser.x);
    let diff = want - cruiser.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cruiser.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    cruiser.speed += cruiser.def.accel * dt;
    if (cruiser.speed > cruiser.def.top) cruiser.speed = cruiser.def.top;
    const nx = cruiser.x + Math.cos(cruiser.angle) * cruiser.speed * dt;
    const ny = cruiser.y + Math.sin(cruiser.angle) * cruiser.speed * dt;
    const r = resolveBuildings(world, nx, ny, 20);
    if (Math.abs(r.x - nx) > 0.5 || Math.abs(r.y - ny) > 0.5) {
      cruiser.angle += Math.PI / 2;
      cruiser.speed *= 0.4;
    }
    cruiser.x = r.x;
    cruiser.y = r.y;
    if (player.inCar && player.car) {
      const d = Math.hypot(cruiser.x - player.car.x, cruiser.y - player.car.y);
      if (d < 42) {
        player.car.health -= 0.35;
        player.car.speed *= 0.985;
        if (events.onRam) events.onRam();
      }
    }
  }
}
