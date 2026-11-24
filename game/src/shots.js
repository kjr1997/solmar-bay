// Screenshot scenes: ?shot=cover|street|chase|mission&seed=1 puts the game
// into a fully deterministic staged frame. Each scene sets the player, a car,
// the wanted level and the mission, then the main loop renders a few frames
// and sets window.__shotReady = true for the screenshot script to wait on.
import { makeVehicle } from './vehicles.js';

export function isShotMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

export function shotSeed() {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed'));
  return Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : 1;
}

// Stage one of the four scenes. Mutates the game in place.
export function applyShotScene(game, kind) {
  const { player, wanted, missions, save } = game;
  // Clear the street around the staged shot so the frame is clean.
  game.cars.length = 0;
  game.cops.length = 0;
  game.peds.length = 0;
  game.cashDrops.length = 0;
  game.particles.length = 0;
  wanted.stars = 0;
  wanted.hiddenTimer = 0;
  wanted.dropTimer = 0;

  if (kind === 'cover') {
    // Comet GT heading north on Ocean Ave (avenue 2840), 2 stars, First Wheels.
    missions.index = 0;
    missions.stage = 'go';
    missions.progress = 0;
    save.cash = 1250;
    const car = makeVehicle('sports', 2840, 1500, -Math.PI / 2, 'player');
    car.speed = 200;
    game.cars.push(car);
    player.inCar = car;
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    wanted.stars = 2;
    game.zone = 'Beachfront';
    game.zoneToast = 0;
    addTraffic(game, 6);
    addPeds(game, 8);
  } else if (kind === 'street') {
    // On foot on the beachfront promenade, sea on the right (east).
    missions.index = 1;
    missions.stage = 'go';
    missions.progress = 1;
    save.cash = 840;
    player.inCar = null;
    player.x = 3180;
    player.y = 1300;
    player.angle = Math.PI / 2; // facing south down the promenade
    player.health = 100;
    wanted.stars = 0;
    game.zone = 'Beachfront';
    game.zoneToast = 0;
    addTraffic(game, 4);
    addPeds(game, 12);
  } else if (kind === 'chase') {
    // Muscle car east on Main St (street 1200), 4 stars, Hot Pursuit.
    missions.index = 3;
    missions.stage = 'deliver';
    missions.progress = 0;
    save.cash = 2300;
    const car = makeVehicle('muscle', 900, 1200, 0, 'player');
    car.speed = 260;
    game.cars.push(car);
    player.inCar = car;
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    wanted.stars = 4;
    game.zone = 'Downtown';
    game.zoneToast = 0;
    addTraffic(game, 8);
    addPeds(game, 6);
    // Two cruisers in pursuit behind the player.
    const c1 = makeVehicle('police', 700, 1200, 0, 'police');
    c1.speed = 240;
    const c2 = makeVehicle('police', 760, 1240, 0, 'police');
    c2.speed = 230;
    game.cars.push(c1, c2);
  } else if (kind === 'mission') {
    // Sedan south on an avenue, 5 stars, The Bay Heist escape to the hideout.
    missions.index = 4;
    missions.stage = 'escape';
    missions.progress = 0;
    save.cash = 5200;
    const car = makeVehicle('sedan', 1800, 700, Math.PI / 2, 'player');
    car.speed = 230;
    game.cars.push(car);
    player.inCar = car;
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    wanted.stars = 5;
    game.zone = 'Downtown';
    game.zoneToast = 0;
    addTraffic(game, 7);
    addPeds(game, 6);
    const c1 = makeVehicle('police', 1800, 520, Math.PI / 2, 'police');
    c1.speed = 250;
    game.cars.push(c1);
  }
  // Camera snaps straight onto the player; the HUD is fully live.
  game.camera.x = player.x - 640;
  game.camera.y = player.y - 360;
  game.state = 'play';
}

function addTraffic(game, n) {
  const spots = [
    [2840, 900, -Math.PI / 2, 'sedan'], [2840, 1900, Math.PI / 2, 'taxi'],
    [2320, 1200, 0, 'hatch'], [1800, 720, Math.PI / 2, 'van'],
    [1280, 1680, Math.PI, 'sedan'], [760, 1200, 0, 'truck'],
    [2320, 2160, Math.PI, 'taxi'], [1800, 240, Math.PI / 2, 'hatch'],
  ];
  for (let i = 0; i < n; i++) {
    const s = spots[(game.shotIndex + i) % spots.length];
    const v = makeVehicle(s[3], s[0] + game.rng.range(-30, 30), s[1] + game.rng.range(-30, 30), s[2], 'traffic');
    v.speed = v.cruise;
    game.cars.push(v);
  }
  game.shotIndex += n;
}

function addPeds(game, n) {
  const palette = ['#e8b48a', '#c98a6a', '#8a5f4a'];
  const shirts = ['#d0483e', '#3e6fd0', '#3ed08a', '#e8c33e'];
  for (let i = 0; i < n; i++) {
    const x = game.player.x + game.rng.range(-420, 420);
    const y = game.player.y + game.rng.range(-260, 260);
    if (x < 60 || x > 3380 || y < 60 || y > 2540) continue;
    game.peds.push({
      x, y, angle: game.rng.range(0, Math.PI * 2), speed: 40,
      skin: palette[i % palette.length], shirt: shirts[i % shirts.length],
      state: 'walk', downTimer: 0, waitTimer: 3, cash: 20, panic: 0,
    });
  }
}
