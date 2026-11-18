// The screenshot scenes behind ?shot=cover|street|chase|mission. Each one plays
// the real rules forward from a fresh world for a fixed number of seconds, steered
// by a simple autopilot (drive through waypoints, walk toward a point), so the
// frame is what the game really looks like and the same seed always gives the
// same frame. The HUD, minimap and markers are all live in the shot.
import { STEP } from './config.js';
import { SCREEN_PLAY } from './hud.js';
import { enterCar } from './player.js';
import { makeCar } from './vehicles.js';
import { spawnFootCop, spawnPoliceCar } from './police.js';

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Drive input toward a waypoint: full throttle, steer at the target angle. */
function driveToward(world, wx, wy) {
  const car = world.state.playerCar;
  if (!car) return { up: false, down: false, left: false, right: false, run: false, handbrake: false, punch: false, enter: false };
  // Coast when a slower car is right ahead in the same lane, instead of
  // ploughing into it. Crossing traffic does not count: it clears in a moment.
  let blocked = false;
  for (const other of world.state.cars) {
    if (other === car || other.parked) continue;
    if (Math.cos(other.angle - car.angle) < 0.5) continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const ahead = ox * Math.cos(car.angle) + oy * Math.sin(car.angle);
    const side = Math.abs(-ox * Math.sin(car.angle) + oy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 110 && side < 28) { blocked = true; break; }
  }
  const diff = wrapAngle(Math.atan2(wy - car.y, wx - car.x) - car.angle);
  const steer = Math.max(-1, Math.min(1, diff * 2.5));
  return {
    up: Math.abs(diff) < 2.4 && !blocked,
    down: false,
    left: steer < -0.08,
    right: steer > 0.08,
    run: false,
    handbrake: Math.abs(diff) > 2.0 && Math.abs(car.speed) > 300,
    punch: false,
    enter: false,
  };
}

/** Walk input toward a point. */
function walkToward(world, wx, wy) {
  const p = world.state.player;
  const dx = wx - p.x;
  const dy = wy - p.y;
  const d = Math.hypot(dx, dy) || 1;
  return {
    up: dy < -d * 0.3,
    down: dy > d * 0.3,
    left: dx < -d * 0.3,
    right: dx > d * 0.3,
    run: true,
    handbrake: false,
    punch: false,
    enter: false,
  };
}

/** Run the world for `seconds`, steering through `waypoints` in order. */
function runScene(world, seconds, waypoints, onFoot) {
  let wp = 0;
  const steps = Math.floor(seconds / STEP);
  let reverseTime = 0;
  let checkIn = 30;
  let lastX = 0;
  let lastY = 0;
  const trace = [];
  {
    const pc0 = world.state.playerCar ?? world.state.player;
    trace.push({ i: 'pre', x: Math.round(pc0.x), y: Math.round(pc0.y), near: world.state.cars
      .filter((c) => Math.hypot(c.x - pc0.x, c.y - pc0.y) < 400)
      .map((c) => `${c.type}/${c.driver ?? 'parked'}@${Math.round(c.x)},${Math.round(c.y)} v${Math.round(c.speed)} node=${c.node ? `${c.node.x},${c.node.y}` : 'null'}`) });
  }
  for (let i = 0; i < steps; i += 1) {
    // The last waypoint is extended past itself, so the car drives through it
    // instead of braking and circling on the spot.
    let target = waypoints[Math.min(wp, waypoints.length - 1)];
    if (wp === waypoints.length - 1 && waypoints.length > 1) {
      const prev = waypoints[waypoints.length - 2];
      const dx = target.x - prev.x;
      const dy = target.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      target = { x: target.x + (dx / d) * 600, y: target.y + (dy / d) * 600 };
    }
    const focus = world.state.playerCar ?? world.state.player;
    if (Math.hypot(target.x - focus.x, target.y - focus.y) < 70 && wp < waypoints.length - 1) wp += 1;
    let input = onFoot ? walkToward(world, target.x, target.y) : driveToward(world, target.x, target.y);
    // Wedged against a corner and barely moving: back up and turn out of it.
    if (!onFoot && reverseTime > 0) {
      reverseTime -= STEP;
      input = { ...input, up: false, down: true, left: input.right, right: input.left, handbrake: false };
    } else if (!onFoot) {
      checkIn -= 1;
      if (checkIn <= 0) {
        checkIn = 30;
        const moved = Math.hypot(focus.x - lastX, focus.y - lastY);
        if (i > 30 && moved < 15) reverseTime = 0.7;
        lastX = focus.x;
        lastY = focus.y;
      }
    }
    world.step(STEP, input);
    if (i % 6 === 0) {
      const pc = world.state.playerCar;
      const near = world.state.cars
        .filter((c) => c !== pc && Math.hypot(c.x - focus.x, c.y - focus.y) < 90)
        .map((c) => `${c.type}/${c.driver ?? 'parked'}@${Math.round(c.x)},${Math.round(c.y)} v${Math.round(c.speed)}`);
      trace.push({ i, x: Math.round(focus.x), y: Math.round(focus.y), speed: pc ? Math.round(pc.speed) : 0, hp: pc ? Math.round(pc.hp) : 0, up: input.up, down: input.down, cars: world.state.cars.length, near });
    }
    if (world.state.player.hp <= 0) break;
  }
  window.__trace = trace;
}

/** Put the player behind the wheel of `car` at (x, y), facing `angle`. */
function putInCar(world, car, x, y, angle, speed = 0) {
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = speed;
  car.parked = false;
  world.state.player.x = x;
  world.state.player.y = y;
  enterCar(world, car);
  car.speed = speed; // enterCar leaves the speed alone; a rolling start keeps it
  world.state.camera.x = x;
  world.state.camera.y = y;
}

/** Scatter a few traffic cars and pedestrians around a point, for a busy frame.
 * Cars are placed mid-segment on other roads than the player's own, already
 * flowing in the right-hand lane — never clustered on an intersection. */
function dressScene(world, cx, cy, carCount = 6, avoid = null) {
  const s = world.state;
  const focus = s.playerCar ?? s.player;
  // The road the player is on: its line is a no-go corridor for staged cars,
  // so a car placed on a cross street can never sit on the player's path.
  const avenuesAll = [400, 1000, 1600, 2200, 2800, 3200];
  const streetsAll = [350, 800, 1250, 1700, 2150];
  const nearAve = avenuesAll.reduce((best, a) => (Math.abs(a - focus.x) < Math.abs(best - focus.x) ? a : best), avenuesAll[0]);
  const nearSt = streetsAll.reduce((best, st) => (Math.abs(st - focus.y) < Math.abs(best - focus.y) ? st : best), streetsAll[0]);
  const corridor = Math.abs(nearAve - focus.x) < 40 ? { type: 'avenue', at: nearAve }
    : Math.abs(nearSt - focus.y) < 40 ? { type: 'street', at: nearSt } : null;
  const avenues = avenuesAll.filter((a) => !(avoid && avoid.type === 'avenue' && avoid.at === a));
  const streets = streetsAll.filter((y) => !(avoid && avoid.type === 'street' && avoid.at === y));
  let placed = 0;
  for (const car of s.cars) {
    if (car.driver !== 'traffic' || placed >= carCount) continue;
    let x;
    let y;
    let angle;
    if (world.random() < 0.5) {
      const ave = avenues[Math.floor(world.random() * avenues.length)];
      const dir = world.random() < 0.5 ? 1 : -1;
      x = ave + (dir > 0 ? -20 : 20);
      y = Math.max(120, Math.min(2480, cy + (world.random() - 0.5) * 900));
      angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const st = streets[Math.floor(world.random() * streets.length)];
      const dir = world.random() < 0.5 ? 1 : -1;
      x = Math.max(120, Math.min(3480, cx + (world.random() - 0.5) * 900));
      y = st + (dir > 0 ? -20 : 20);
      angle = dir > 0 ? 0 : Math.PI;
    }
    // Keep staged cars off the player's road corridor and clear of the player.
    if (corridor && corridor.type === 'avenue' && Math.abs(x - corridor.at) < 160) continue;
    if (corridor && corridor.type === 'street' && Math.abs(y - corridor.at) < 160) continue;
    if (Math.hypot(x - focus.x, y - focus.y) < 260) continue;
    const node = world.city.nearestNode(x + Math.cos(angle) * 160, y + Math.sin(angle) * 160);
    const from = world.city.nearestNode(x - Math.cos(angle) * 160, y - Math.sin(angle) * 160);
    car.x = x;
    car.y = y;
    car.angle = angle;
    car.speed = 150 + world.random() * 90;
    car.from = from;
    car.node = node;
    placed += 1;
  }
  placed = 0;
  for (const ped of s.peds) {
    if (placed >= 8) break;
    ped.x = cx + (world.random() - 0.5) * 600;
    ped.y = cy + (world.random() - 0.5) * 420;
    ped.tx = ped.x + (world.random() - 0.5) * 300;
    ped.ty = ped.y + (world.random() - 0.5) * 300;
    placed += 1;
  }
}

function addPolice(world, cars, cops) {
  const s = world.state;
  for (let i = 0; i < cars; i += 1) s.cars.push(spawnPoliceCar(world.random, world.city, s.player));
  for (let i = 0; i < cops; i += 1) s.cops.push(spawnFootCop(world.random, world.city, s.player));
}

/** Line the cruisers up behind the player, in frame and on the chase. */
function policeBehind(world) {
  const s = world.state;
  const car = s.playerCar;
  if (!car) return;
  let i = 0;
  for (const cruiser of s.cars) {
    if (cruiser.driver !== 'police') continue;
    const back = 480 + i * 110;
    const side = i % 2 === 0 ? -34 : 34;
    cruiser.x = car.x - Math.cos(car.angle) * back - Math.sin(car.angle) * side;
    cruiser.y = car.y - Math.sin(car.angle) * back + Math.cos(car.angle) * side;
    cruiser.angle = car.angle;
    cruiser.speed = 380;
    // Rejoin the road graph here, heading at the player.
    cruiser.from = world.city.nearestNode(cruiser.x - Math.cos(car.angle) * 160, cruiser.y - Math.sin(car.angle) * 160);
    cruiser.node = world.city.nearestNode(cruiser.x + Math.cos(car.angle) * 160, cruiser.y + Math.sin(car.angle) * 160);
    i += 1;
  }
}

/** Clear the player's lane ahead, so the shot is a drive, not a queue: remove
 * traffic cars in the corridor in front of the player car. Kerb-parked cars
 * (44 px out) stay where they are. */
function clearLane(world) {
  const s = world.state;
  const car = s.playerCar;
  if (!car) return;
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  for (let i = s.cars.length - 1; i >= 0; i -= 1) {
    const other = s.cars[i];
    if (other.driver !== 'traffic') continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const ahead = ox * cos + oy * sin;
    const side = Math.abs(-ox * sin + oy * cos);
    if (ahead > 0 && ahead < 700 && side < 40) s.cars.splice(i, 1);
  }
}

/**
 * Stage the named scene on a fresh world and return the screen to draw.
 * Any other name stages the cover.
 */
export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  s.noSpawn = true; // freeze the cast: nothing spawns mid-shot
  s.banner = null;
  s.toast = null;

  if (name === 'street') {
    // On foot on the beachfront promenade, pedestrians strolling, sea to the east.
    s.player.x = 3270;
    s.player.y = 1600;
    s.camera.x = 3270;
    s.camera.y = 1500;
    s.mission = { id: 'm1', step: 0, timer: 0, data: {} };
    dressScene(world, 3270, 1400);
    runScene(world, 3.5, [{ x: 3270, y: 1050 }], true);
  } else if (name === 'chase') {
    // Four stars on Main St: a muscle car flat out east, three cruisers behind.
    const muscle = makeCar(world.random, 'muscle', 1200, 1250, 0, { parked: true, color: '#8a2f2f' });
    s.cars.push(muscle);
    putInCar(world, muscle, 1200, 1250, 0, 400);
    world.setWanted(4);
    s.mission = { id: 'm4', step: 1, timer: 0, data: {} };
    addPolice(world, 3, 0);
    policeBehind(world);
    clearLane(world);
    dressScene(world, 1900, 1250, 6, { type: 'street', at: 1250 });
    runScene(world, 0.7, [{ x: 3400, y: 1250 }], false);
  } else if (name === 'mission') {
    // The Bay Heist escape, mid-flight: south down the old avenue toward the
    // Hideout, four stars, cruisers on the tail — photographed mid-block.
    const sedan = makeCar(world.random, 'sedan', 400, 1650, Math.PI / 2, { parked: true, color: '#4f7ec9' });
    s.cars.push(sedan);
    putInCar(world, sedan, 400, 1650, Math.PI / 2, 400);
    world.setWanted(4);
    s.cash += 2000;
    s.mission = { id: 'm5', step: 2, timer: 0, data: { vault: 3 } };
    s.missionsDone = ['m1', 'm2', 'm3', 'm4'];
    s.missionIndex = 4;
    addPolice(world, 3, 1);
    policeBehind(world);
    clearLane(world);
    dressScene(world, 400, 1900, 4, { type: 'avenue', at: 400 });
    runScene(world, 0.8, [{ x: 400, y: 2150 }], false);
  } else {
    // Cover: the Comet GT flying north up Ocean Ave, beach on the right,
    // traffic ahead, two cruisers on its tail, two stars on the HUD.
    const comet = s.cars.find((c) => c.comet);
    putInCar(world, comet, 3200, 1000, -Math.PI / 2, 420);
    world.setWanted(2);
    s.mission = { id: 'm1', step: 1, timer: 0, data: {} };
    addPolice(world, 2, 0);
    policeBehind(world);
    clearLane(world);
    dressScene(world, 3200, 900, 3, { type: 'avenue', at: 3200 });
    runScene(world, 0.6, [{ x: 3200, y: 500 }], false);
  }
  s.banner = null;
  s.toast = null;
  return { screen: SCREEN_PLAY };
}
