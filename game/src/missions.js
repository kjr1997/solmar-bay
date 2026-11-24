// Rico's mission line: five jobs in order, each with its own objective
// tracking, markers and rewards. Missions drive the HUD line, the minimap
// markers and the off-screen arrow.
import { MISSIONS, GARAGE, DOCKS, HIDEOUT, VAULT, FARE_TIP, TAXI_FARE } from './config.js';
import { makeVehicle } from './vehicles.js';

export function makeMissions(save) {
  return {
    index: save.mission, // 0..4, or 5 when the whole line is done
    done: save.missionDone,
    stage: 'go', // per-mission stage string
    progress: 0, // packages delivered / fares picked up
    timer: 0, // taxi countdown
    fare: null, // active taxi passenger {x, y, destX, destY, inCar}
    comet: null, // the mission Comet GT vehicle
    vaultTimer: 0,
    message: '',
    messageTimer: 0,
  };
}

export function currentMission(m) {
  return m.index < MISSIONS.length ? MISSIONS[m.index] : null;
}

export function missionObjective(m) {
  const mission = currentMission(m);
  if (!mission) return 'All jobs done — Solmar Bay is yours. Free roam!';
  switch (m.index) {
    case 0: return 'First Wheels: steal any car, drive it to Rico\'s garage.';
    case 1: return `Package Run: deliver packages (${m.progress}/3).`;
    case 2: return `Taxi Shift: pick up fares (${m.progress}/3) — ${Math.max(0, Math.ceil(m.timer))}s left.`;
    case 3: return m.stage === 'steal'
      ? 'Hot Pursuit: steal the Comet GT from the docks!'
      : 'Hot Pursuit: deliver the Comet GT to the drop-off — 3 stars!';
    case 4: return m.stage === 'vault'
      ? 'The Bay Heist: stand by the vault to crack it (3s) — 4 stars!'
      : 'The Bay Heist: lose the heat and reach the hideout!';
    default: return mission.text;
  }
}

// The world position the player should head for right now (arrow + marker).
export function missionTarget(game) {
  const m = game.missions;
  switch (m.index) {
    case 0: return { x: GARAGE.x, y: GARAGE.y, label: 'Garage' };
    case 1: {
      const drop = game.packageDrops[m.progress];
      return drop ? { x: drop.x, y: drop.y, label: 'Drop-off' } : null;
    }
    case 2: {
      if (!m.fare) return null;
      if (m.fare.inCar) return { x: m.fare.destX, y: m.fare.destY, label: 'Fare destination' };
      return { x: m.fare.x, y: m.fare.y, label: 'Passenger' };
    }
    case 3: {
      if (m.stage === 'steal') return { x: DOCKS.x, y: DOCKS.y, label: 'Comet GT' };
      return { x: game.heistDrop.x, y: game.heistDrop.y, label: 'Drop-off' };
    }
    case 4: {
      if (m.stage === 'vault') return { x: VAULT.x, y: VAULT.y, label: 'Vault' };
      return { x: HIDEOUT.x, y: HIDEOUT.y, label: 'Hideout' };
    }
    default: return null;
  }
}

function completeMission(game, bonusText) {
  const m = game.missions;
  const mission = currentMission(m);
  if (!mission) return;
  game.save.cash += mission.reward;
  if (mission.vaultCash) game.save.cash += mission.vaultCash;
  game.sound.missionDone();
  m.message = `${mission.name} complete! +$${mission.reward}${mission.vaultCash ? ` + $${mission.vaultCash} vault cash` : ''}${bonusText || ''}`;
  m.messageTimer = 4;
  m.index++;
  m.stage = 'go';
  m.progress = 0;
  m.timer = 0;
  m.fare = null;
  m.vaultTimer = 0;
  if (m.index >= MISSIONS.length) {
    m.done = true;
    game.save.missionDone = true;
    game.save.taxiUnlocked = true;
  }
  if (m.index === 3) game.save.taxiUnlocked = true; // taxi fares open after job 3
  game.save.mission = Math.min(m.index, 4);
  game.persist();
}

function near(x1, y1, x2, y2, r) {
  return Math.hypot(x1 - x2, y1 - y2) < r;
}

// Taxi fare spots: a passenger waiting on a sidewalk, and a destination.
export function spawnFare(game) {
  const spots = game.taxiSpots;
  const from = spots[game.rng.int(0, spots.length - 1)];
  let to = spots[game.rng.int(0, spots.length - 1)];
  if (to === from) to = spots[(spots.indexOf(from) + 3) % spots.length];
  return { x: from.x, y: from.y, destX: to.x, destY: to.y, inCar: false };
}

export function updateMissions(game, dt) {
  const m = game.missions;
  const { player } = game;
  if (m.messageTimer > 0) m.messageTimer -= dt;
  const mission = currentMission(m);
  if (!mission) {
    // Mission line done: free-roam taxi fares in a taxi, $60 a ride.
    if (game.save.taxiUnlocked && player.inCar && player.inCar.type === 'taxi') {
      if (!m.fare) {
        m.fare = spawnFare(game);
        m.message = 'Fare waiting — pick them up!';
        m.messageTimer = 2.5;
      } else if (!m.fare.inCar && near(player.x, player.y, m.fare.x, m.fare.y, 60)) {
        m.fare.inCar = true;
        game.sound.pickup();
      } else if (m.fare.inCar && near(player.x, player.y, m.fare.destX, m.fare.destY, 70)) {
        game.save.cash += TAXI_FARE;
        game.sound.cash();
        game.persist();
        m.message = `Fare done! +$${TAXI_FARE}`;
        m.messageTimer = 2.5;
        m.fare = null;
      }
    }
    return;
  }

  if (m.index === 0) {
    // Steal any car and bring it to the garage.
    if (player.inCar && near(player.x, player.y, GARAGE.x, GARAGE.y, 110)) {
      completeMission(game);
    }
  } else if (m.index === 1) {
    const drop = game.packageDrops[m.progress];
    if (drop && near(player.x, player.y, drop.x, drop.y, 70)) {
      m.progress++;
      game.sound.pickup();
      if (m.progress >= 3) completeMission(game);
      else { m.message = `Package ${m.progress}/3 delivered.`; m.messageTimer = 2.5; }
    }
  } else if (m.index === 2) {
    if (m.timer <= 0 && m.stage === 'go') {
      m.timer = 240;
      m.stage = 'run';
      m.fare = spawnFare(game);
    }
    if (m.stage === 'run') {
      m.timer -= dt;
      if (m.timer <= 0) {
        m.message = 'Taxi Shift failed — out of time. Try again!';
        m.messageTimer = 3;
        m.stage = 'go';
        m.progress = 0;
        m.fare = null;
        return;
      }
      if (m.fare) {
        if (!m.fare.inCar && player.inCar && near(player.x, player.y, m.fare.x, m.fare.y, 60)) {
          m.fare.inCar = true;
          game.sound.pickup();
          m.message = 'Passenger aboard — drive to the destination!';
          m.messageTimer = 2.5;
        } else if (m.fare.inCar && near(player.x, player.y, m.fare.destX, m.fare.destY, 70)) {
          m.progress++;
          game.save.cash += FARE_TIP; // fare tip on top of the job reward
          game.sound.cash();
          game.persist();
          if (m.progress >= 3) completeMission(game, ' (+$150 in tips)');
          else {
            m.fare = spawnFare(game);
            m.message = `Fare ${m.progress}/3 done. Next passenger!`;
            m.messageTimer = 2.5;
          }
        }
      }
    }
  } else if (m.index === 3) {
    if (m.stage === 'go') {
      // The Comet GT is parked at the docks; getting in it starts the heat.
      m.stage = 'steal';
      if (!m.comet) {
        m.comet = makeVehicle('sports', DOCKS.x, DOCKS.y + 60, -Math.PI / 2, 'none');
        game.cars.push(m.comet);
      }
    }
    if (m.stage === 'steal' && player.inCar === m.comet) {
      m.stage = 'deliver';
      game.addWanted(3);
      m.message = '3 stars! Get the Comet GT to the drop-off!';
      m.messageTimer = 3;
    }
    if (m.stage === 'deliver' && player.inCar === m.comet && near(player.x, player.y, game.heistDrop.x, game.heistDrop.y, 110)) {
      completeMission(game);
    }
  } else if (m.index === 4) {
    if (m.stage === 'go') {
      m.stage = 'vault';
      game.addWanted(4);
      m.message = '4 stars! Crack the vault — stand by it for 3 seconds!';
      m.messageTimer = 3;
    }
    if (m.stage === 'vault') {
      if (!player.inCar && near(player.x, player.y, VAULT.x, VAULT.y, 80)) {
        m.vaultTimer += dt;
        if (m.vaultTimer >= 3) {
          m.stage = 'escape';
          m.message = 'Vault cracked! Lose the heat and reach the hideout!';
          m.messageTimer = 3;
        }
      } else {
        m.vaultTimer = Math.max(0, m.vaultTimer - dt * 2);
      }
    }
    if (m.stage === 'escape' && near(player.x, player.y, HIDEOUT.x, HIDEOUT.y, 110)) {
      completeMission(game);
    }
  }
}
