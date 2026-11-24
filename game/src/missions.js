// Solmar Bay — Rico's five-mission story line, taxi fares and drop points.
// Missions unlock in order; each tracks its own objective and pays on completion.
import { MISSIONS, PLACES, TAXI_FARE_MIN, TAXI_FARE_MAX } from './config.js';

const DROP_POINTS = [
  { x: 300, y: 700, label: 'Drop 1 — Old Town' },
  { x: 2300, y: 1100, label: 'Drop 2 — Palm Heights' },
  { x: 1300, y: 2300, label: 'Drop 3 — Industrial' },
];

const FARE_POINTS = [
  { x: 800, y: 300, label: 'Fare — Downtown' },
  { x: 2800, y: 700, label: 'Fare — Palm Heights' },
  { x: 1800, y: 1900, label: 'Fare — Industrial' },
  { x: 300, y: 1900, label: 'Fare — Old Town' },
];

export function makeMissionState() {
  return {
    index: 0,            // current mission (0..4), 5 = all done
    done: [false, false, false, false, false],
    stage: 'idle',       // per-mission stage string
    timer: 0,            // mission countdown (Taxi Shift)
    dropsDone: 0,
    faresDone: 0,
    target: null,        // current objective marker {x, y, label}
    taxiCar: null,
    vaultTimer: 0,
    vaultOpened: false,
    delivered: false,
  };
}

export function currentMission(m) {
  return m.index < MISSIONS.length ? MISSIONS[m.index] : null;
}

export function missionObjectiveText(game) {
  const m = game.missions;
  const cur = currentMission(m);
  if (!cur) return 'All missions complete — free roam! Fares pay $40–$90.';
  switch (m.index) {
    case 0: return m.stage === 'return'
      ? 'Return the car to Rico\'s Garage'
      : 'Steal any car (E) and drive it to Rico\'s Garage';
    case 1: return 'Deliver packages: ' + m.dropsDone + '/3 to the marked drops';
    case 2: return m.stage === 'drive'
      ? 'Drive the fare to its destination! (' + m.faresDone + '/3)'
      : 'Get in a TAXI and pick up a fare (' + m.faresDone + '/3) — ' + Math.ceil(m.timer) + 's left';
    case 3: return m.stage === 'deliver'
      ? 'Deliver the Comet GT to the marked point — lose the cops after!'
      : 'Steal the Comet GT from the Marina dock';
    case 4: return m.stage === 'escape'
      ? 'ESCAPE! Reach the Hideout in Old Town'
      : (m.vaultOpened ? 'Grab the vault cash and run!' : 'Reach the Downtown vault and hold still 3s to crack it');
    default: return cur.brief;
  }
}

export function startMission(game, index) {
  const m = game.missions;
  m.index = index;
  m.stage = 'idle';
  m.dropsDone = 0;
  m.faresDone = 0;
  m.timer = 0;
  m.vaultTimer = 0;
  m.vaultOpened = false;
  m.delivered = false;
  m.taxiCar = null;
  if (index === 1) m.target = DROP_POINTS[0];
  else if (index === 2) { m.timer = MISSIONS[2].timeLimit; m.target = FARE_POINTS[0]; }
  else if (index === 3) m.target = { x: PLACES.marinaDock.x, y: PLACES.marinaDock.y, label: 'Comet GT — Marina Dock' };
  else if (index === 4) m.target = { x: 1800, y: 700, label: 'Downtown Vault' };
  else m.target = { x: PLACES.garage.x, y: PLACES.garage.y, label: "Rico's Garage" };
  const cur = MISSIONS[index];
  game.toast('Mission ' + (index + 1) + ': ' + cur.name + ' — $' + cur.reward);
  game.audio.missionDone();
}

export function completeMission(game) {
  const m = game.missions;
  const cur = MISSIONS[m.index];
  m.done[m.index] = true;
  game.player.cash += cur.reward;
  game.audio.missionDone();
  game.toast('Mission complete: ' + cur.name + ' +$' + cur.reward);
  game.flashMessage = 'MISSION COMPLETE';
  game.flashTimer = 2.4;
  if (m.index === 4 && cur.vaultBonus) {
    game.player.cash += cur.vaultBonus;
    game.toast('Vault cash banked: +$' + cur.vaultBonus);
  }
  m.index++;
  m.target = null;
  m.stage = 'idle';
  if (m.index < MISSIONS.length) startMission(game, m.index);
  else { game.taxiUnlocked = true; game.toast('All missions done! Taxi fares now pay in free roam.'); }
  game.saveGame();
}

// Called every frame while a mission is active.
export function updateMissions(game, dt) {
  const m = game.missions;
  const player = game.player;
  if (m.index >= MISSIONS.length) { updateFreeRoamTaxi(game, dt); return; }
  const pos = player.inCar || player;

  if (m.index === 0) {
    if (player.inCar && m.stage !== 'return') { m.stage = 'return'; m.target = { x: PLACES.garage.x, y: PLACES.garage.y, label: "Rico's Garage" }; }
    if (m.stage === 'return' && player.inCar &&
      Math.hypot(pos.x - PLACES.garage.x, pos.y - PLACES.garage.y) < 110) completeMission(game);
  } else if (m.index === 1) {
    if (m.target && Math.hypot(pos.x - m.target.x, pos.y - m.target.y) < 70) {
      m.dropsDone++;
      game.audio.pickup();
      if (m.dropsDone >= 3) completeMission(game);
      else m.target = DROP_POINTS[m.dropsDone];
    }
  } else if (m.index === 2) {
    m.timer -= dt;
    if (m.timer <= 0) {
      game.toast('Taxi Shift failed — the clock ran out. Try again!');
      startMission(game, 2);
      return;
    }
    if (m.stage === 'pickup') {
      const inTaxi = player.inCar && player.inCar.type === 'taxi';
      if (inTaxi && Math.hypot(pos.x - m.target.x, pos.y - m.target.y) < 70) {
        m.stage = 'drive';
        m.target = FARE_POINTS[(m.faresDone + 2) % FARE_POINTS.length];
        game.toast('Fare aboard! Drive to the destination.');
      }
    } else if (m.stage === 'drive') {
      if (Math.hypot(pos.x - m.target.x, pos.y - m.target.y) < 70) {
        m.faresDone++;
        game.audio.cash();
        if (m.faresDone >= 3) completeMission(game);
        else {
          m.stage = 'pickup';
          m.target = FARE_POINTS[m.faresDone % FARE_POINTS.length];
          game.toast('Fare dropped off. Next pickup marked.');
        }
      }
    } else {
      // Waiting for the player to get into a taxi.
      if (player.inCar && player.inCar.type === 'taxi') {
        m.stage = 'pickup';
        m.target = FARE_POINTS[m.faresDone % FARE_POINTS.length];
        game.toast('Taxi Shift started — pick up the fare!');
      }
    }
  } else if (m.index === 3) {
    if (m.stage === 'steal') {
      if (player.inCar && player.inCar.type === 'sports' && player.inCar.prize) {
        m.stage = 'deliver';
        m.target = { x: 1300, y: 1500, label: 'Chop Shop — Downtown' };
        game.toast('You got the Comet GT! Deliver it — 3★ heat is on you.');
      }
    } else if (m.stage === 'deliver') {
      if (player.inCar && Math.hypot(pos.x - m.target.x, pos.y - m.target.y) < 90) {
        completeMission(game);
      }
    } else {
      m.stage = 'steal';
      game.addWanted(3, 'grand theft auto');
    }
  } else if (m.index === 4) {
    if (m.stage === 'crack') {
      if (!player.inCar && Math.hypot(pos.x - 1800, pos.y - 700) < 70) {
        m.vaultTimer += dt;
        if (m.vaultTimer >= 3 && !m.vaultOpened) {
          m.vaultOpened = true;
          m.stage = 'escape';
          m.target = { x: PLACES.hideout.x, y: PLACES.hideout.y, label: 'Hideout' };
          game.addWanted(4, 'bank heist');
          game.audio.missionDone();
          game.toast('Vault cracked! +$2000 inside — RUN to the Hideout!');
        }
      } else m.vaultTimer = Math.max(0, m.vaultTimer - dt);
    } else if (m.stage === 'escape') {
      if (!player.inCar && Math.hypot(pos.x - PLACES.hideout.x, pos.y - PLACES.hideout.y) < 90) {
        completeMission(game);
      }
    } else {
      m.stage = 'crack';
      game.toast('The Bay Heist: crack the vault on foot. Stay quiet…');
    }
  }
}

// After mission 3, free-roam taxi fares pay $40–$90 each.
export function updateFreeRoamTaxi(game, dt) {
  const m = game.missions;
  const player = game.player;
  if (!game.taxiUnlocked) return;
  if (!m.target && player.inCar && player.inCar.type === 'taxi') {
    m.target = FARE_POINTS[Math.floor(Math.random() * FARE_POINTS.length)];
    m.stage = 'fare';
    game.toast('Fare available — pick them up!');
  }
  if (m.stage === 'fare' && m.target) {
    const pos = player.inCar || player;
    if (player.inCar && player.inCar.type === 'taxi' &&
      Math.hypot(pos.x - m.target.x, pos.y - m.target.y) < 70) {
      const pay = TAXI_FARE_MIN + Math.floor(Math.random() * (TAXI_FARE_MAX - TAXI_FARE_MIN + 1));
      player.cash += pay;
      game.audio.cash();
      game.toast('Fare complete +$' + pay);
      m.target = null;
      m.stage = 'idle';
    }
  }
}
