// Solmar Bay — the player on foot: movement, punching, entering cars,
// getting arrested, and picking up cash and hidden packages.
import { PLAYER_WALK, PLAYER_RUN, PLAYER_PUNCH_RANGE, PLAYER_PUNCH_DAMAGE,
  START_POS, HP_REGEN_PER_S } from './config.js';
import { circleHitsBuilding, isInSea, clampToWorld } from './world.js';

export function makePlayer() {
  return {
    x: START_POS.x, y: START_POS.y, angle: -Math.PI / 2,
    hp: 100, cash: 50, inCar: null,
    punchTimer: 0, punchCooldown: 0, arrested: 0,
    walkPhase: 0, moving: false, running: false,
  };
}

// Move on foot. Returns an event string ('punched' etc.) or null.
export function updatePlayerOnFoot(player, input, dt, game) {
  if (player.arrested > 0) { player.arrested -= dt; return null; }
  const mv = input.moveVector();
  player.running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const speed = player.running ? PLAYER_RUN : PLAYER_WALK;
  player.moving = mv.x !== 0 || mv.y !== 0;
  if (player.moving) {
    player.angle = Math.atan2(mv.y, mv.x);
    player.walkPhase += dt * (player.running ? 13 : 8);
    const nx = player.x + mv.x * speed * dt;
    const ny = player.y + mv.y * speed * dt;
    const blocked = circleHitsBuilding(nx, ny, 13, game.city.buildings) || isInSea(nx, ny);
    if (!blocked) {
      const clamped = clampToWorld(nx, ny);
      player.x = clamped.x; player.y = clamped.y;
    } else {
      // Slide along walls: try each axis separately.
      if (!circleHitsBuilding(nx, player.y, 13, game.city.buildings) && !isInSea(nx, player.y)) player.x = clampToWorld(nx, player.y).x;
      else if (!circleHitsBuilding(player.x, ny, 13, game.city.buildings) && !isInSea(player.x, ny)) player.y = clampToWorld(player.x, ny).y;
    }
  }
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.punchTimer > 0) player.punchTimer -= dt;
  // Slow health regen while the heat is off.
  if (game.wanted.stars === 0 && player.hp > 0) {
    player.hp = Math.min(100, player.hp + HP_REGEN_PER_S * dt);
  }
  if (input.wasPressed('Space') && player.punchCooldown <= 0) {
    player.punchTimer = 0.22;
    player.punchCooldown = 0.42;
    game.audio.punch();
    return tryPunch(player, game);
  }
  return null;
}

// Punch the nearest pedestrian or cop in front of the player.
export function tryPunch(player, game) {
  const px = player.x + Math.cos(player.angle) * PLAYER_PUNCH_RANGE;
  const py = player.y + Math.sin(player.angle) * PLAYER_PUNCH_RANGE;
  for (const ped of game.peds) {
    if (ped.down > 0) continue;
    if (Math.hypot(ped.x - px, ped.y - py) < 30) {
      ped.hp -= PLAYER_PUNCH_DAMAGE;
      ped.flee = 1.5;
      if (ped.hp <= 0) {
        ped.down = 6;
        ped.hp = 100;
        const drop = 8 + Math.floor(Math.random() * 30);
        game.cashDrops.push({ x: ped.x, y: ped.y, amount: drop, t: 0 });
        game.addWanted(1, 'assault');
      } else {
        game.addWanted(1, 'assault');
      }
      return 'punched-ped';
    }
  }
  for (const cop of game.cops) {
    if (Math.hypot(cop.x - px, cop.y - py) < 32) {
      cop.hp -= PLAYER_PUNCH_DAMAGE;
      if (cop.hp <= 0) { cop.down = 8; cop.hp = 100; game.addWanted(1, 'assault'); }
      return 'punched-cop';
    }
  }
  return 'punched-air';
}

// Find the nearest car the player can enter (within 70 px).
export function nearestEnterableCar(player, cars) {
  let best = null, bestD = 70;
  for (const car of cars) {
    if (car.isPolice) continue; // police cruisers are locked
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Enter a car. Returns 'stole' when it had a driver, 'entered' when empty.
export function enterCar(player, car, game) {
  player.inCar = car;
  car.occupied = true;
  car.driver = 'player';
  if (car.isTraffic) {
    car.isTraffic = false;
    game.addWanted(1, 'carjack');
    return 'stole';
  }
  return 'entered';
}

// Step out of the car, beside it.
export function exitCar(player) {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  car.occupied = false;
  car.driver = null;
  const side = car.angle + Math.PI / 2;
  player.x = car.x + Math.cos(side) * 34;
  player.y = car.y + Math.sin(side) * 34;
  player.angle = car.angle;
}

// Collect cash drops and hidden packages the player walks or drives over.
export function collectPickups(player, game, dt) {
  const pos = player.inCar || player;
  for (const drop of game.cashDrops) {
    drop.t += dt;
    if (Math.hypot(drop.x - pos.x, drop.y - pos.y) < 34) {
      player.cash += drop.amount;
      drop.gone = true;
      game.audio.cash();
      game.toast('$' + drop.amount + ' picked up');
    }
  }
  game.cashDrops = game.cashDrops.filter((d) => !d.gone && d.t < 30);
  for (const pkg of game.city.packages) {
    if (pkg.taken) continue;
    if (Math.hypot(pkg.x - pos.x, pkg.y - pos.y) < 36) {
      pkg.taken = true;
      player.cash += 100;
      game.packagesFound++;
      game.audio.pickup();
      game.toast('Hidden package found! +$100 (' + game.packagesFound + '/15)');
    }
  }
}
