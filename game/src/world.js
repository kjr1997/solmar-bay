// The simulation: one state, one step. The world owns the player, every car and
// pedestrian, the wanted level, cash, missions, pickups and the camera, and it
// advances all of them one fixed step at a time. It knows nothing about screens
// or pixels; the renderer and the HUD read its state. Events come back as flags.
import { CAR_ORDER, DISTRICTS, PAYNSPRAY, PLAYER, POLICE, SAVE_KEY, TRAFFIC, WANTED } from './config.js';
import { buildCity } from './city.js';
import { collideCarCar, collideCarWorld, doorPoint, driveCar, makeCar } from './vehicles.js';
import { spawnTrafficCar, stepTrafficCar } from './traffic.js';
import { knockDown, makePed, sidewalkPoint, stepPed } from './peds.js';
import { decayWanted, spawnFootCop, spawnPoliceCar, stepFootCop, stepPoliceCar, wantedCarCount, wantedFootCount } from './police.js';
import { failMission, HIDDEN_PACKAGES, onPlayerCarDestroyed, updateMission } from './missions.js';
import { createPlayer, enterCar, exitCar, nearestEnterableCar, playerPunch, stepPlayerOnFoot } from './player.js';

export const EVENT_WASTED = 1;
export const EVENT_BUSTED = 2;
export const EVENT_CASH = 4;
export const EVENT_CRIME = 8;

export function createWorld(random, opts = {}) {
  const city = buildCity(random);
  const state = {
    player: createPlayer(700, 1150),
    cars: [], peds: [], cops: [],
    wanted: 0, cash: 100, hp: PLAYER.hp,
    playerCar: null, mission: null, missionIndex: 0, missionsDone: [],
    nextMissionIn: 0, storyComplete: false,
    runPackages: [], fare: null,
    hidden: HIDDEN_PACKAGES.map((p) => ({ ...p, found: false })),
    cashDrops: [], particles: [], skids: [],
    camera: { x: 700, y: 1150 },
    toast: null, banner: null, district: 'Old Town',
    elapsed: 0, crimeTimer: 0, hiddenTimer: 0, decayTimer: 0,
    spawnTimer: 0, wasted: false, busted: false, noSpawn: false,
  };
  const world = {
    state, city, random,
    sound: () => {}, // main.js plugs the synth in
    busted: false, wasted: false,
    saveEnabled: opts.save !== false,
  };

  // ---- small helpers the other modules call back through -----------------
  world.message = (text, seconds = 3) => { state.toast = { text, timer: seconds }; };
  world.banner = (title, text, seconds = 4) => { state.banner = { title, text, timer: seconds }; };
  world.setWanted = (n) => { state.wanted = Math.max(0, Math.min(WANTED.max, n)); };
  world.commitCrime = (stars, what) => {
    if (state.crimeTimer > 0) return;
    state.crimeTimer = WANTED.crimeCooldown;
    world.setWanted(state.wanted + stars);
    world.message(`Wanted: ${what} — ${state.wanted} star${state.wanted === 1 ? '' : 's'}.`);
    world.sound('crime');
    for (const ped of state.peds) {
      if (Math.hypot(ped.x - state.player.x, ped.y - state.player.y) < 300) ped.fear = 3;
    }
  };
  world.addParticles = (x, y, n, color) => {
    for (let i = 0; i < n; i += 1) {
      const a = random() * Math.PI * 2;
      const sp = 40 + random() * 140;
      state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + random() * 0.4, maxLife: 0.9, color, size: 2 + random() * 3 });
    }
    if (state.particles.length > 300) state.particles.splice(0, state.particles.length - 300);
  };
  world.dropCash = (x, y, amount) => {
    state.cashDrops.push({ x: x + (random() - 0.5) * 20, y: y + (random() - 0.5) * 20, amount, timer: 30 });
  };
  world.makePedAt = (x, y) => {
    const ped = makePed(random, x, y);
    state.peds.push(ped);
    return ped;
  };
  world.crimeNoise = () => { world.sound('crash'); };
  world.save = () => {
    if (!world.saveEnabled) return;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: state.cash, missionIndex: state.missionIndex, missionsDone: state.missionsDone,
        hidden: state.hidden.filter((h) => h.found).length, storyComplete: state.storyComplete,
      }));
    } catch { /* storage off: progress lasts this visit only */ }
  };
  world.loadSave = () => {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      state.cash = data.cash ?? 100;
      state.missionIndex = data.missionIndex ?? 0;
      state.missionsDone = data.missionsDone ?? [];
      state.storyComplete = !!data.storyComplete;
      const found = data.hidden ?? 0;
      state.hidden.forEach((h, i) => { h.found = i < found; });
      return true;
    } catch { return false; }
  };
  world.ensureTaxiAtStand = () => {
    const stand = city.landmarks.taxiStand;
    const near = state.cars.some((c) => c.type === 'taxi' && Math.hypot(c.x - stand.x, c.y - stand.y) < 200);
    if (near) return;
    const taxi = makeCar(random, 'taxi', stand.x, stand.y + 30, Math.PI / 2, { parked: true });
    state.cars.push(taxi);
  };

  // ---- setup --------------------------------------------------------------
  function reset() {
    state.player = createPlayer(700, 1150);
    state.cars = [];
    state.peds = [];
    state.cops = [];
    state.wanted = 0;
    state.cash = 100;
    state.playerCar = null;
    state.mission = null;
    state.missionIndex = 0;
    state.missionsDone = [];
    state.nextMissionIn = 1.5;
    state.storyComplete = false;
    state.runPackages = [];
    state.fare = null;
    state.hidden = HIDDEN_PACKAGES.map((p) => ({ ...p, found: false }));
    state.cashDrops = [];
    state.particles = [];
    state.skids = [];
    state.camera = { x: 700, y: 1150 };
    state.toast = null;
    state.banner = null;
    state.district = 'Old Town';
    state.elapsed = 0;
    state.crimeTimer = 0;
    state.hiddenTimer = 0;
    state.decayTimer = 0;
    state.noSpawn = false;
    world.busted = false;
    world.wasted = false;
    for (const spot of city.parked) {
      const type = spot.type ?? random.pick(CAR_ORDER);
      const car = makeCar(random, type, spot.x, spot.y, spot.angle, { parked: true, color: spot.color });
      if (spot.type === 'sports') car.comet = true;
      state.cars.push(car);
    }
    world.ensureTaxiAtStand();
    for (let i = 0; i < TRAFFIC.count; i += 1) spawnTrafficNear();
    for (let i = 0; i < TRAFFIC.pedCount; i += 1) spawnPedNear();
  }

  function spawnTrafficNear() {
    const p = state.player;
    const node = city.nearestNode(p.x + (random() - 0.5) * 1600, p.y + (random() - 0.5) * 1200);
    const from = node.neighbours[Math.floor(random() * node.neighbours.length)];
    const car = spawnTrafficCar(random, city, node.x, node.y);
    car.from = from;
    car.node = node;
    state.cars.push(car);
  }
  function spawnPedNear() {
    const p = state.player;
    const spot = sidewalkPoint(random, city);
    if (Math.hypot(spot.x - p.x, spot.y - p.y) > TRAFFIC.spawnRadius) return;
    const ped = makePed(random, spot.x, spot.y);
    ped.tx = spot.x;
    ped.ty = spot.y;
    state.peds.push(ped);
  }
  function removeCar(car) {
    const i = state.cars.indexOf(car);
    if (i >= 0) state.cars.splice(i, 1);
  }

  // ---- the step ------------------------------------------------------------
  function step(dt, input) {
    let events = 0;
    state.elapsed += dt;
    if (state.crimeTimer > 0) state.crimeTimer -= dt;
    if (state.toast) { state.toast.timer -= dt; if (state.toast.timer <= 0) state.toast = null; }
    if (state.banner) { state.banner.timer -= dt; if (state.banner.timer <= 0) state.banner = null; }
    const p = state.player;

    // Player: drive or walk.
    if (p.inCar && state.playerCar) {
      const car = state.playerCar;
      const throttle = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      driveCar(car, dt, throttle, steer, input.handbrake);
      if (input.handbrake && Math.abs(car.speed) > 260 && random() < 0.6) {
        state.skids.push({ x: car.x, y: car.y, angle: car.angle });
        if (state.skids.length > 220) state.skids.shift();
      }
      collideCarWorld(car, city, dt);
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      if (input.enter) exitCar(world);
      if (car.hp <= 0 && !car.dead) {
        car.dead = true;
        world.addParticles(car.x, car.y, 26, '#ff7a2e');
        world.addParticles(car.x, car.y, 14, '#3a3a46');
        world.sound('explosion');
        p.inCar = false;
        state.playerCar = null;
        p.hp = Math.max(1, p.hp - 30);
        p.hurtTimer = 1;
        const door = doorPoint(car);
        p.x = door.x;
        p.y = door.y;
        removeCar(car);
        onPlayerCarDestroyed(world);
        world.message('Your car blew up!');
      }
    } else {
      const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      stepPlayerOnFoot(p, dt, mx, my, input.run, city);
      if (input.punch) playerPunch(world);
      if (input.enter) {
        const car = nearestEnterableCar(world);
        if (car) enterCar(world, car);
      }
      // Traffic can run the player down.
      for (const car of state.cars) {
        if (car.parked || Math.abs(car.speed) < 60) continue;
        const d = Math.hypot(car.x - p.x, car.y - p.y);
        if (d < (car.def.len / 2) && p.hurtTimer <= 0) {
          p.hp = Math.max(0, p.hp - 12);
          p.hurtTimer = 1;
          p.lastHurt = 0;
          p.x += Math.sign(p.x - car.x || 1) * 26;
          p.y += Math.sign(p.y - car.y || 1) * 26;
          world.sound('crash');
          break;
        }
      }
    }
    state.hp = p.hp;

    // The player's car running over pedestrians is a crime.
    if (state.playerCar) {
      const car = state.playerCar;
      for (const ped of state.peds) {
        if (ped.mood === 'down') continue;
        if (Math.abs(car.speed) > 140 && Math.hypot(ped.x - car.x, ped.y - car.y) < car.def.len / 2 + 8) {
          const drop = knockDown(ped, random);
          world.dropCash(ped.x, ped.y, drop);
          world.commitCrime(1, 'hit and run');
          world.addParticles(ped.x, ped.y, 8, '#ff5a4e');
          world.sound('crash');
        }
      }
      for (const cop of state.cops) {
        if (Math.abs(car.speed) > 140 && Math.hypot(cop.x - car.x, cop.y - car.y) < car.def.len / 2 + 8) {
          knockDown(cop, random);
          world.commitCrime(2, 'running down a cop');
          world.addParticles(cop.x, cop.y, 8, '#ff5a4e');
          world.sound('crash');
        }
      }
    }

    // Car-car collisions, all pairs. The hurt cooldown ticks once per step
    // per car, here — not inside the pair function, which runs N times a step.
    for (const car of state.cars) if (car.hurtTimer > 0) car.hurtTimer -= dt;
    for (let i = 0; i < state.cars.length; i += 1) {
      for (let j = i + 1; j < state.cars.length; j += 1) {
        collideCarCar(state.cars[i], state.cars[j], dt);
      }
    }
    // Dead traffic cars burn out and leave.
    for (let i = state.cars.length - 1; i >= 0; i -= 1) {
      const car = state.cars[i];
      if (car.hp <= 0 && car.driver !== 'player' && !car.dead) {
        car.dead = true;
        world.addParticles(car.x, car.y, 20, '#ff7a2e');
        world.sound('explosion');
        if (car.driver === 'traffic') removeCar(car);
      }
    }

    // Traffic: keep the count, step each, respawn the ones that leave.
    // Shots freeze the cast (noSpawn) so nothing pops in mid-frame.
    state.spawnTimer -= dt;
    if (!state.noSpawn && state.spawnTimer <= 0) {
      state.spawnTimer = 0.5;
      const traffic = state.cars.filter((c) => c.driver === 'traffic').length;
      if (traffic < TRAFFIC.count) spawnTrafficNear();
      if (state.peds.length < TRAFFIC.pedCount) spawnPedNear();
      // Police numbers follow the wanted level.
      while (state.cops.length < wantedFootCount(state.wanted)) state.cops.push(spawnFootCop(random, city, p));
      while (state.cars.filter((c) => c.driver === 'police').length < wantedCarCount(state.wanted)) {
        state.cars.push(spawnPoliceCar(random, city, p));
      }
    }
    for (let i = state.cars.length - 1; i >= 0; i -= 1) {
      const car = state.cars[i];
      if (car.driver === 'traffic') {
        const d = Math.hypot(car.x - p.x, car.y - p.y);
        if (d > TRAFFIC.despawnRadius || !stepTrafficCar(car, dt, city, state.cars, random)) {
          removeCar(car);
          // Shots freeze the cast: a car that leaves is gone, not replaced.
          if (!state.noSpawn) spawnTrafficNear();
        }
      } else if (car.driver === 'police') {
        if (!stepPoliceCar(car, dt, p, state.playerCar, world)) removeCar(car);
      }
      if (car.driver === 'traffic' || car.driver === 'police') collideCarWorld(car, city, dt);
    }
    for (let i = state.peds.length - 1; i >= 0; i -= 1) {
      const ped = state.peds[i];
      const d = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (d > TRAFFIC.despawnRadius) { state.peds.splice(i, 1); continue; }
      stepPed(ped, dt, random, city, p, state.cars);
    }
    for (let i = state.cops.length - 1; i >= 0; i -= 1) {
      const cop = state.cops[i];
      if (cop.mood === 'down') {
        cop.downTimer -= dt;
        if (cop.downTimer <= 0) { cop.mood = 'chase'; cop.hp = POLICE.footHp; }
        continue;
      }
      if (!stepFootCop(cop, dt, p, world)) state.cops.splice(i, 1);
    }
    decayWanted(world, dt);

    // Missions, fares, pickups, spray shop.
    updateMission(world, dt);
    for (let i = state.cashDrops.length - 1; i >= 0; i -= 1) {
      const drop = state.cashDrops[i];
      drop.timer -= dt;
      if (drop.timer <= 0) { state.cashDrops.splice(i, 1); continue; }
      const d = Math.hypot(drop.x - p.x, drop.y - p.y);
      if (d < 70) { drop.x += (p.x - drop.x) * 6 * dt; drop.y += (p.y - drop.y) * 6 * dt; }
      if (d < 28) {
        state.cash += drop.amount;
        state.cashDrops.splice(i, 1);
        world.sound('cash');
        events |= EVENT_CASH;
      }
    }
    for (const h of state.hidden) {
      if (!h.found && Math.hypot(h.x - p.x, h.y - p.y) < 34) {
        h.found = true;
        state.cash += 100;
        world.message('Hidden package found! +$100.');
        world.sound('pickup');
        world.save();
      }
    }
    const spray = city.landmarks.paynspray;
    if (state.playerCar && Math.hypot(state.playerCar.x - spray.x, state.playerCar.y - spray.y) < 60) {
      const car = state.playerCar;
      if ((state.wanted > 0 || car.hp < 100) && state.cash >= PAYNSPRAY.cost) {
        state.cash -= PAYNSPRAY.cost;
        world.setWanted(0);
        car.hp = 100;
        state.cops.length = 0;
        for (let i = state.cars.length - 1; i >= 0; i -= 1) {
          if (state.cars[i].driver === 'police') removeCar(state.cars[i]);
        }
        world.message("Spray 'n' Go: new paint, clean record. -$100.");
        world.sound('spray');
      }
    }

    // Wasted / busted: respawn, take the cut, clear the heat.
    if (p.hp <= 0 && !world.wasted) {
      world.wasted = true;
      const cut = Math.floor(state.cash * WANTED.hospitalCut);
      state.cash -= cut;
      world.setWanted(0);
      state.cops.length = 0;
      for (let i = state.cars.length - 1; i >= 0; i -= 1) {
        if (state.cars[i].driver === 'police') removeCar(state.cars[i]);
      }
      const h = city.landmarks.hospital;
      p.x = h.x;
      p.y = h.y + 60;
      p.hp = PLAYER.hp;
      p.inCar = false;
      state.playerCar = null;
      if (state.mission) failMission(world, 'You got wasted.');
      world.banner('WASTED', `Solmar General patched you up. -$${cut}.`, 4);
      world.sound('wasted');
      events |= EVENT_WASTED;
      world.wasted = false;
    }
    if (world.busted) {
      world.busted = false;
      const fine = Math.min(state.cash, WANTED.fineBusted);
      state.cash -= fine;
      world.setWanted(0);
      state.cops.length = 0;
      for (let i = state.cars.length - 1; i >= 0; i -= 1) {
        if (state.cars[i].driver === 'police') removeCar(state.cars[i]);
      }
      const hq = city.landmarks.police;
      p.x = hq.x;
      p.y = hq.y + 60;
      p.hp = PLAYER.hp;
      p.inCar = false;
      state.playerCar = null;
      if (state.mission) failMission(world, 'The SBPD caught you.');
      world.banner('BUSTED', `You did the time. -$${fine}.`, 4);
      world.sound('busted');
      events |= EVENT_BUSTED;
    }

    // District toast and camera.
    let district = 'Solmar Bay';
    for (const d of DISTRICTS) {
      if (p.x >= d.x && p.x < d.x + d.w && p.y >= d.y && p.y < d.y + d.h) { district = d.name; break; }
    }
    if (district !== state.district) {
      state.district = district;
      world.message(district);
    }
    const cam = state.camera;
    const lookX = state.playerCar ? Math.cos(p.angle) * 60 : 0;
    const lookY = state.playerCar ? Math.sin(p.angle) * 60 : 0;
    cam.x += ((p.x + lookX) - cam.x) * Math.min(1, 5 * dt);
    cam.y += ((p.y + lookY) - cam.y) * Math.min(1, 5 * dt);
    cam.x = Math.max(640, Math.min(3600 - 640, cam.x));
    cam.y = Math.max(360, Math.min(2600 - 360, cam.y));

    // Particles fade.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    return events;
  }

  reset();
  world.step = step;
  world.reset = reset;
  return world;
}
