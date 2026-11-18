// The player: one body, two modes. On foot they walk, run, punch and hop into
// cars; behind the wheel they drive. Entering a car with a driver pulls the
// driver out onto the sidewalk — that is a crime, and the law notices.
import { PLAYER } from './config.js';
import { doorPoint } from './vehicles.js';
import { knockDown } from './peds.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, hp: PLAYER.hp,
    inCar: false, punchTimer: 0, punchAnim: 0, hurtTimer: 0, lastHurt: 99,
    facing: { x: 0, y: -1 },
  };
}

/** Move on foot: mx,my is the -1..1 wish direction, run is Shift. */
export function stepPlayerOnFoot(player, dt, mx, my, run, city) {
  const len = Math.hypot(mx, my);
  if (len > 0.01) {
    const speed = run ? PLAYER.run : PLAYER.walk;
    player.x += (mx / len) * speed * dt;
    player.y += (my / len) * speed * dt;
    player.angle = Math.atan2(my, mx);
    player.facing = { x: mx / len, y: my / len };
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  city.resolveCircle(player, PLAYER.radius);
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (player.punchAnim > 0) player.punchAnim -= dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
  player.lastHurt += dt;
  if (player.lastHurt > PLAYER.regenDelay && player.hp > 0 && player.hp < PLAYER.hp) {
    player.hp = Math.min(PLAYER.hp, player.hp + PLAYER.regenRate * dt);
  }
}

/** Punch: hits the nearest ped or cop inside range and arc in front of the player. */
export function playerPunch(world) {
  const s = world.state;
  const p = s.player;
  if (p.punchTimer > 0 || p.inCar) return false;
  p.punchTimer = PLAYER.punchCooldown;
  p.punchAnim = 0.22;
  world.sound('punch');
  let hit = false;
  const victims = [...s.peds, ...s.cops];
  for (const v of victims) {
    if (v.mood === 'down') continue;
    const dx = v.x - p.x;
    const dy = v.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > PLAYER.punchRange + 14) continue;
    const dot = (dx * p.facing.x + dy * p.facing.y) / (d || 1);
    if (dot < Math.cos(PLAYER.punchArc)) continue;
    v.hp -= PLAYER.punchDamage;
    v.fear = 3;
    world.addParticles(v.x, v.y, 6, '#ffd23a');
    hit = true;
    if (v.hp <= 0) {
      const drop = knockDown(v, world.random);
      world.dropCash(v.x, v.y, drop);
      world.commitCrime(1, 'assault');
    } else if (v.cop) {
      world.commitCrime(1, 'assaulting an officer');
    }
    break; // one punch, one victim
  }
  return hit;
}

/** The nearest car the player could get into, within reach of its door. */
export function nearestEnterableCar(world) {
  const s = world.state;
  const p = s.player;
  let best = null;
  let bestD = 74;
  for (const car of s.cars) {
    if (car.dead) continue;
    if (car.driver === 'police') continue; // cruisers are locked
    const d = doorPoint(car);
    const dist = Math.hypot(d.x - p.x, d.y - p.y);
    if (dist < bestD) { bestD = dist; best = car; }
  }
  return best;
}

/** Get in: parked cars are free, occupied ones cost a star and a driver on the kerb. */
export function enterCar(world, car) {
  const s = world.state;
  const p = s.player;
  if (car.driver === 'traffic' || car.driver === 'ped') {
    // Carjack: the driver stumbles out and runs.
    const driver = world.makePedAt(car.x, car.y - 30);
    driver.fear = 4;
    world.commitCrime(1, 'carjacking');
    world.message('Carjacked! The driver ran for it.');
  }
  // A parked car is free to take; a moving one with a driver is the crime.
  car.parked = false;
  car.driver = 'player';
  p.inCar = true;
  s.playerCar = car;
  world.sound('door');
}

/** Step out next to the driver's door; the car keeps rolling a little, then stops. */
export function exitCar(world) {
  const s = world.state;
  const p = s.player;
  const car = s.playerCar;
  if (!car) return;
  const door = doorPoint(car);
  p.x = door.x;
  p.y = door.y;
  p.inCar = false;
  s.playerCar = null;
  car.driver = null;
  car.parked = true;
  car.speed *= 0.3;
  cityResolveAfterExit(world, p);
  world.sound('door');
}

function cityResolveAfterExit(world, p) {
  world.city.resolveCircle(p, PLAYER.radius);
}
