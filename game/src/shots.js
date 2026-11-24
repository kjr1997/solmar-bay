// Solmar Bay — screenshot staging. ?shot=<cover|street|chase|mission>&seed=1
// builds a fully deterministic scene and raises window.__shotReady when the
// first frame has rendered, so the screenshot script can capture it.
import { PLACES } from './config.js';
import { makeCar } from './vehicles.js';
import { addWanted } from './police.js';
import { startMission } from './missions.js';

const SHOT_SEED = 1;

export function applyShot(game, shot) {
  const player = game.player;
  // Clear the ambient crowds so each shot is exactly reproducible.
  game.cops = [];
  game.policeCars = [];
  game.wanted.stars = 0;
  game.state = 'playing';
  game.shotMode = shot;

  if (shot === 'cover') {
    // Comet GT heading north up the eastern avenue, 2 stars, First Wheels.
    startMission(game, 0);
    const car = makeCar('sports', 2800, 1650, -Math.PI / 2, { occupied: true, color: '#f2c230' });
    car.speed = 320;
    player.inCar = car;
    player.x = car.x; player.y = car.y;
    game.heroCar = car;
    addWanted(game, 2, 'speeding');
    positionChaseExtras(game, 2);
  } else if (shot === 'street') {
    // On foot on the beachfront promenade, the sea on the right.
    startMission(game, 0);
    player.inCar = null;
    player.x = 3180; player.y = 1220;
    player.angle = -Math.PI / 2;
    game.heroCar = null;
    // A few strollers on the promenade so the beach reads as lived-in.
    game.peds.slice(0, 5).forEach((ped, i) => {
      ped.x = 3150 + (i % 2) * 80;
      ped.y = 1100 + i * 55;
      ped.angle = -Math.PI / 2;
      ped.down = 0;
      ped.flee = 0;
    });
  } else if (shot === 'chase') {
    // Muscle car east along Main Street at speed, 4 stars, Hot Pursuit.
    startMission(game, 3);
    game.missions.stage = 'deliver';
    game.missions.target = { x: 1300, y: 1500, label: 'Chop Shop — Downtown' };
    const car = makeCar('muscle', 900, 1100, 0, { occupied: true });
    car.speed = 370;
    player.inCar = car;
    player.x = car.x; player.y = car.y;
    game.heroCar = car;
    addWanted(game, 4, 'grand theft auto');
    positionChaseExtras(game, 4);
  } else if (shot === 'mission') {
    // Sedan south down the avenue, 5 stars, The Bay Heist escape.
    startMission(game, 4);
    game.missions.stage = 'escape';
    game.missions.vaultOpened = true;
    game.missions.target = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: 'Hideout' };
    const car = makeCar('sedan', 1800, 700, Math.PI / 2, { occupied: true });
    car.speed = 330;
    player.inCar = car;
    player.x = car.x; player.y = car.y;
    game.heroCar = car;
    addWanted(game, 5, 'bank heist');
    positionChaseExtras(game, 5);
  }
  // Frame the hero: camera snaps to the player on the first render.
  game.renderer.cam.x = (player.inCar || player).x - game.renderer.viewW / 2;
  game.renderer.cam.y = (player.inCar || player).y - game.renderer.viewH / 2;
  game.zoneToast = '';
  game.zoneToastTimer = 0;
  game.toasts = [];
  game.time = 0; // fixed clock so bobbing markers sit identically every shot
  game.flashMessage = '';
  game.flashTimer = 0;
  window.__shotReady = false;
}

function positionChaseExtras(game, stars) {
  const hero = game.player.inCar;
  const p = hero || game.player;
  const forward = hero ? hero.angle : -Math.PI / 2;
  const behind = forward + Math.PI;
  const bx = Math.cos(behind), by = Math.sin(behind);
  const lx = Math.cos(forward + Math.PI / 2), ly = Math.sin(forward + Math.PI / 2);
  // Pursuing cruisers trail behind the hero, offset sideways so they do not
  // overlap it in the frame.
  game.policeCars = game.policeCars.slice(0, Math.min(3, stars - 1));
  game.policeCars.forEach((car, i) => {
    const back = 260 + i * 90;
    const side = (i - 1) * 70;
    car.x = p.x + bx * back + lx * side;
    car.y = p.y + by * back + ly * side;
    car.angle = forward;
    car.speed = 300;
  });
  // A few traffic cars ahead and to the sides, clear of the hero's path.
  game.traffic.slice(0, 6).forEach((car, i) => {
    const ahead = 320 + (i % 3) * 160;
    const side = (i % 2 === 0 ? 150 : -150) + (i % 3) * 30;
    car.x = p.x + Math.cos(forward) * ahead + lx * side;
    car.y = p.y + Math.sin(forward) * ahead + ly * side;
    car.angle = forward;
    car.speed = 120;
  });
}

export function shotFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = params.get('seed');
  if (!shot) return null;
  if (!['cover', 'street', 'chase', 'mission'].includes(shot)) return null;
  return { shot, seed: seed === null ? null : Number(seed) };
}

export { SHOT_SEED };
