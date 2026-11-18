// Screenshot mode: ?shot=cover|street|chase|mission&seed=1 builds a fixed,
// deterministic scene and sets window.__shotReady when the frame is drawn.
import { GARAGE, HIDEOUT } from './config.js';
import { spawnCar } from './vehicles.js';

const SHOTS = {
  cover: {
    missionIndex: 0, wanted: 2, carKind: 'sports', carAngle: -Math.PI / 2,
    x: 1800, y: 900, label: 'First Wheels',
  },
  street: {
    missionIndex: 0, wanted: 0, onFoot: true,
    x: 3440, y: 1200, label: 'Beachfront stroll',
  },
  chase: {
    missionIndex: 3, wanted: 4, carKind: 'muscle', carAngle: 0,
    x: 1400, y: 1000, label: 'Hot Pursuit',
  },
  mission: {
    missionIndex: 4, wanted: 5, carKind: 'sedan', carAngle: Math.PI / 2,
    x: 1800, y: 1400, label: 'The Bay Heist',
  },
};

export function parseShotParams() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = parseInt(params.get('seed') || '1', 10) || 1;
  if (!shot || !SHOTS[shot]) return null;
  return { shot, seed, ...SHOTS[shot] };
}

export function applyShotScene(game, shotInfo) {
  const { missionIndex, wanted, carKind, carAngle, x, y, onFoot } = shotInfo;
  game.missionState.index = missionIndex;
  game.save.missionIndex = missionIndex;
  game.police.wanted = wanted;
  game.player.x = x;
  game.player.y = y;
  game.player.health = 100;
  if (onFoot) {
    game.player.inCar = null;
    game.player.car = null;
    game.player.angle = -Math.PI / 2;
  } else {
    const car = spawnCar(carKind, x, y, carAngle, false);
    car.isPlayer = true;
    car.speed = carKind === 'muscle' ? 200 : 120;
    game.player.car = car;
    game.player.inCar = car;
    game.player.angle = carAngle;
    game.cars.push(car);
    // A couple of police cruisers in frame for chase scenes.
    if (wanted >= 4) {
      const c1 = spawnCar('police', x - 260, y + 60, carAngle, true);
      c1.isPolice = true;
      const c2 = spawnCar('police', x - 420, y - 40, carAngle, true);
      c2.isPolice = true;
      game.police.cruisers.push(c1, c2);
      game.cars.push(c1, c2);
    }
    if (wanted >= 2) {
      game.police.cops.push({ x: x + 300, y: y + 180, angle: 0, speed: 150, punchTimer: 0, holdTimer: 0 });
    }
  }
  // Mission objective marker for the scene.
  if (missionIndex === 0) game.missionState.objective = { x: GARAGE.x, y: GARAGE.y, label: 'First Wheels' };
  if (missionIndex === 3) game.missionState.objective = { x: 3150, y: 2250, label: 'Steal the Comet GT' };
  if (missionIndex === 4) game.missionState.objective = { x: HIDEOUT.x, y: HIDEOUT.y, label: 'Escape to the hideout' };
  // Give the scene a lived-in feel: a few peds near the camera.
  game.traffic.peds.push(
    { x: x + 120, y: y + 90, angle: 0.6, speed: 45, skin: '#e8a080', shirt: '#4060c0', walkPhase: 1, down: 0, flee: 0, cash: 0, wander: 4 },
    { x: x - 140, y: y - 110, angle: 2.4, speed: 50, skin: '#c08050', shirt: '#40a060', walkPhase: 3, down: 0, flee: 0, cash: 0, wander: 4 },
  );
  game.state = 'play';
  game.shotMode = shotInfo.shot;
}

export function markShotReady() {
  window.__shotReady = true;
}
