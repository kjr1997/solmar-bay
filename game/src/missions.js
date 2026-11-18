// Missions: Rico's 5-job story line, taxi fares, packages, spray shop.
import { MISSIONS, GARAGE, HIDEOUT, VAULT, SPRAY, MARINA_DOCK } from './config.js';

export function createMissionState(save) {
  return {
    index: save.missionIndex || 0,
    stage: 0, // per-mission sub-step
    timer: 0,
    target: null,
    message: '',
    done: (save.missionsDone || []).slice(),
    packages: (save.packages || []).slice(),
    fare: null,
    vaultTimer: 0,
    objective: null,
  };
}

export function currentMission(ms) {
  return MISSIONS[ms.index] || null;
}

function setObjective(ms, x, y, label) {
  ms.objective = { x, y, label };
}

export function startMission(ms, save) {
  const m = currentMission(ms);
  if (!m) return;
  ms.stage = 0;
  ms.timer = m.timeLimit || 0;
  ms.vaultTimer = 0;
  if (m.id === 1) {
    setObjective(ms, GARAGE.x, GARAGE.y, 'Steal a car, bring it to the garage');
    ms.message = 'Rico: I need wheels. Any car. Bring it to the garage.';
  } else if (m.id === 2) {
    ms.drops = dropPoints();
    setObjective(ms, ms.drops[0].x, ms.drops[0].y, 'Deliver package 1 of 3');
    ms.message = 'Rico: Three packages. Three addresses. Go.';
  } else if (m.id === 3) {
    ms.faresDone = 0;
    ms.message = 'Rico: Taxi shift. Find a cab, pick up 3 fares. 4 minutes.';
    setObjective(ms, 1400, 1000, 'Find a cab (yellow) and press E');
  } else if (m.id === 4) {
    setObjective(ms, MARINA_DOCK.x, MARINA_DOCK.y, 'Steal the Comet GT at the Marina');
    ms.message = 'Rico: A Comet GT sits at the Marina. Take it. Expect company.';
  } else if (m.id === 5) {
    setObjective(ms, VAULT.x, VAULT.y, 'Reach the Downtown vault');
    ms.message = 'Rico: The vault. Crack it, grab the cash, run to the hideout.';
  }
}

function dropPoints() {
  return [
    { x: 2200, y: 600, label: 'Drop-off 1' },
    { x: 600, y: 1800, label: 'Drop-off 2' },
    { x: 2800, y: 1400, label: 'Drop-off 3' },
  ];
}

function fareSpots() {
  return [
    { x: 1000, y: 1000 }, { x: 2600, y: 600 }, { x: 600, y: 2200 },
    { x: 1800, y: 1800 }, { x: 3000, y: 1000 }, { x: 1400, y: 2200 },
  ];
}

export function completeMission(ms, save, events) {
  const m = currentMission(ms);
  if (!m) return;
  const reward = m.reward + (m.vaultCash || 0);
  save.cash += reward;
  save.totalEarned += reward;
  save.missionsDone.push(m.id);
  ms.done.push(m.id);
  ms.index += 1;
  save.missionIndex = ms.index;
  ms.message = `Job done: ${m.name}. +$${reward}.`;
  if (events.onComplete) events.onComplete(m, reward);
  if (currentMission(ms)) startMission(ms, save);
  else {
    ms.objective = null;
    ms.message = 'All Rico jobs done. Free roam: fares, packages, chaos.';
  }
}

// Called every frame; returns nothing, mutates mission state and fires events.
export function updateMissions(ms, save, game, dt, events) {
  const m = currentMission(ms);
  if (!m) return;
  const p = game.player;
  const at = (x, y, r) => Math.hypot(p.x - x, p.y - y) < r;
  if (m.timeLimit) {
    ms.timer -= dt;
    if (ms.timer <= 0) {
      ms.message = 'Taxi shift failed — out of time. Talk to Rico to retry.';
      ms.timer = m.timeLimit;
      ms.stage = 0;
      ms.faresDone = 0;
      startMission(ms, save);
      return;
    }
  }
  if (m.id === 1) {
    if (p.inCar && at(GARAGE.x, GARAGE.y, 90)) completeMission(ms, save, events);
  } else if (m.id === 2) {
    const drop = ms.drops[ms.stage];
    if (drop && at(drop.x, drop.y, 70)) {
      ms.stage += 1;
      if (ms.stage >= 3) completeMission(ms, save, events);
      else {
        const next = ms.drops[ms.stage];
        setObjective(ms, next.x, next.y, `Deliver package ${ms.stage + 1} of 3`);
        if (events.onStep) events.onStep(`Package ${ms.stage} delivered.`);
      }
    }
  } else if (m.id === 3) {
    if (ms.stage === 0) {
      // Waiting for the player to get into a taxi.
      if (p.inCar && p.car && p.car.kind === 'taxi') {
        ms.stage = 1;
        ms.fare = pickFareSpot();
        setObjective(ms, ms.fare.x, ms.fare.y, 'Pick up the fare');
        if (events.onStep) events.onStep('Fare waiting. Drive to the marker.');
      }
    } else if (ms.stage === 1) {
      if (ms.fare && at(ms.fare.x, ms.fare.y, 70)) {
        ms.stage = 2;
        ms.fare = pickFareSpot();
        setObjective(ms, ms.fare.x, ms.fare.y, 'Drop the fare off');
        if (events.onStep) events.onStep('Passenger aboard. Drive to the drop-off.');
      }
    } else if (ms.stage === 2) {
      if (ms.fare && at(ms.fare.x, ms.fare.y, 70)) {
        ms.faresDone = (ms.faresDone || 0) + 1;
        save.cash += 80;
        if (events.onStep) events.onStep(`Fare ${ms.faresDone} of 3 done. +$80 tip.`);
        if (ms.faresDone >= 3) completeMission(ms, save, events);
        else {
          ms.stage = 1;
          ms.fare = pickFareSpot();
          setObjective(ms, ms.fare.x, ms.fare.y, 'Pick up the next fare');
        }
      }
    }
  } else if (m.id === 4) {
    if (ms.stage === 0) {
      if (p.inCar && p.car && p.car.kind === 'sports') {
        ms.stage = 1;
        setObjective(ms, 900, 1400, 'Deliver the Comet GT to the lockup');
        if (events.onStep) events.onStep('Comet GT secured. 3 stars! Lose the cops, deliver it.');
      }
    } else if (ms.stage === 1) {
      if (at(900, 1400, 90)) completeMission(ms, save, events);
    }
  } else if (m.id === 5) {
    if (ms.stage === 0) {
      if (at(VAULT.x, VAULT.y, 80)) {
        ms.stage = 1;
        ms.vaultTimer = 3;
        setObjective(ms, VAULT.x, VAULT.y, 'Cracking the vault… hold still');
      }
    } else if (ms.stage === 1) {
      ms.vaultTimer -= dt;
      if (ms.vaultTimer <= 0) {
        ms.stage = 2;
        setObjective(ms, HIDEOUT.x, HIDEOUT.y, 'Escape to the hideout');
        if (events.onStep) events.onStep('Vault open! $2000 grabbed. Run!');
      }
    } else if (ms.stage === 2) {
      if (at(HIDEOUT.x, HIDEOUT.y, 90)) completeMission(ms, save, events);
    }
  }
  // Pay 'n Spray: drive in with wanted stars and $100 to clear them.
  // No charge when you are already clean — the shop only takes dirty money.
  if (p.inCar && game.police.wanted > 0 && save.cash >= 100 && at(SPRAY.x, SPRAY.y, 80)) {
    save.cash -= 100;
    game.police.wanted = 0;
    game.police.cops = [];
    game.police.cruisers = [];
    p.car.health = 100;
    ms.message = 'Pay \'n Spray: wanted cleared, car repaired. -$100.';
    if (events.onStep) events.onStep('Wanted cleared at Pay \'n Spray.');
  }
}

function pickFareSpot() {
  const spots = fareSpots();
  return spots[Math.floor(Math.random() * spots.length)];
}
