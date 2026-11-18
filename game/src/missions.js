// The story: five jobs from Rico, the fixer at the garage, in order. Each mission
// is a small state machine over steps — get in a car, drive to a marker, collect,
// run fares, steal the Comet GT, rob the bank. The world calls updateMission every
// step; missions answer with banners and rewards through the world object.
import { MISSION_REWARDS } from './config.js';

export const MISSION_LIST = [
  { id: 'm1', title: 'First Wheels', reward: MISSION_REWARDS.m1,
    brief: "Rico: New in town? Prove you can drive. Jack any car and bring it to my garage." },
  { id: 'm2', title: 'Package Run', reward: MISSION_REWARDS.m2,
    brief: 'Rico: Three packages stashed around Solmar. Pick them all up, bring them to me.' },
  { id: 'm3', title: 'Taxi Shift', reward: MISSION_REWARDS.m3,
    brief: 'Rico: The Bay Taxi stand needs a driver. Grab a cab, run three fares before the clock runs out.' },
  { id: 'm4', title: 'Hot Pursuit', reward: MISSION_REWARDS.m4,
    brief: 'Rico: A Comet GT is sitting in the Marina lot. Take it — and lose the cops before you bring it home.' },
  { id: 'm5', title: 'The Bay Heist', reward: MISSION_REWARDS.m5,
    brief: 'Rico: The big one. Walk into Solmar Bank, crack the vault, and get the cash to the hideout. No mistakes.' },
];

// The three M2 packages and the fifteen hidden packages (side collectibles, $100 each).
export const RUN_PACKAGES = [
  { x: 400, y: 800 }, { x: 2200, y: 350 }, { x: 2800, y: 2150 },
];
export const HIDDEN_PACKAGES = [
  { x: 170, y: 575 }, { x: 700, y: 575 }, { x: 1300, y: 575 }, { x: 1900, y: 1025 },
  { x: 2500, y: 1025 }, { x: 3100, y: 575 }, { x: 170, y: 1025 }, { x: 700, y: 1475 },
  { x: 1300, y: 1925 }, { x: 1900, y: 1475 }, { x: 2500, y: 1925 }, { x: 3100, y: 1025 },
  { x: 3400, y: 800 }, { x: 3400, y: 1700 }, { x: 170, y: 1925 },
];

function garage(world) { return world.city.landmarks.garage; }

export function startNextMission(world) {
  const s = world.state;
  const next = MISSION_LIST[s.missionIndex];
  if (!next) return;
  s.mission = { id: next.id, step: 0, timer: 0, data: {} };
  if (next.id === 'm2') {
    s.runPackages = RUN_PACKAGES.map((p) => ({ ...p, taken: false }));
  }
  if (next.id === 'm3') {
    s.mission.timer = 240;
    s.mission.data.fares = 0;
    world.ensureTaxiAtStand();
  }
  world.banner(next.title, next.brief, 5);
  world.sound('mission');
}

export function missionDone(world, id) {
  const s = world.state;
  const def = MISSION_LIST.find((m) => m.id === id);
  s.cash += def.reward;
  s.mission = null;
  s.missionIndex += 1;
  s.missionsDone.push(id);
  world.banner('Job done', `${def.title} complete — $${def.reward} in your pocket.`, 4);
  world.sound('complete');
  world.save();
  if (s.missionIndex >= MISSION_LIST.length) {
    s.storyComplete = true;
    world.banner('SOLMAR BAY — STORY COMPLETE', 'You own this city now. Free roam, keep the fares coming.', 6);
  } else {
    // A beat before the next call comes in.
    s.nextMissionIn = 6;
  }
}

export function failMission(world, reason) {
  const s = world.state;
  if (!s.mission) return;
  const def = MISSION_LIST.find((m) => m.id === s.mission.id);
  world.banner('Job failed', `${def.title}: ${reason} Rico will call again.`, 4);
  world.sound('fail');
  s.mission = null;
  s.runPackages = [];
  s.fare = null;
  s.nextMissionIn = 5;
}

/** Where the marker, minimap blip and off-screen arrow point right now. */
export function missionTarget(world) {
  const s = world.state;
  if (s.fare && s.fare.stage === 'toPassenger') return { x: s.fare.px, y: s.fare.py, label: 'Pick up the fare' };
  if (s.fare && s.fare.stage === 'toDest') return { x: s.fare.dx, y: s.fare.dy, label: 'Drop off the fare' };
  const m = s.mission;
  if (!m) return null;
  const g = garage(world);
  if (m.id === 'm1') {
    return m.step === 0 ? { x: s.player.x, y: s.player.y, label: 'Get in any car (E)' }
      : { x: g.x, y: g.y, label: "Drive to Rico's Garage" };
  }
  if (m.id === 'm2') {
    if (m.step === 0) {
      const left = s.runPackages.filter((p) => !p.taken);
      if (!left.length) return { x: g.x, y: g.y, label: "Deliver to Rico's Garage" };
      const p = left[0];
      return { x: p.x, y: p.y, label: `Packages left: ${left.length}` };
    }
    return { x: g.x, y: g.y, label: "Deliver to Rico's Garage" };
  }
  if (m.id === 'm3') {
    if (m.step === 0) return { x: world.city.landmarks.taxiStand.x, y: world.city.landmarks.taxiStand.y, label: 'Get in a taxi' };
    return null; // fares set their own target above
  }
  if (m.id === 'm4') {
    return m.step === 0 ? { x: world.city.landmarks.marina.x, y: world.city.landmarks.marina.y, label: 'Steal the Comet GT' }
      : { x: g.x, y: g.y, label: "Lose the cops — get the Comet to Rico's" };
  }
  if (m.id === 'm5') {
    if (m.step === 0) return { x: world.city.landmarks.bank.x, y: world.city.landmarks.bank.y, label: 'Go to Solmar Bank (on foot)' };
    if (m.step === 1) return { x: world.city.landmarks.bank.x, y: world.city.landmarks.bank.y, label: 'Cracking the vault… stay put' };
    return { x: world.city.landmarks.hideout.x, y: world.city.landmarks.hideout.y, label: 'Escape to the Hideout' };
  }
  return null;
}

function near(world, x, y, r) {
  const p = world.state.player;
  return Math.hypot(p.x - x, p.y - y) < r;
}

function newFare(world, random) {
  const s = world.state;
  const lm = world.city.landmarks;
  const spots = [lm.garage, lm.bank, lm.hospital, lm.police, lm.hideout, lm.marina, lm.paynspray];
  const dest = random.pick(spots);
  // Passenger waits on a sidewalk near a random intersection.
  const node = random.pick([...world.city.nodes.values()]);
  const px = node.x + (random() < 0.5 ? -70 : 70);
  const py = node.y + (random() < 0.5 ? -60 : 60);
  s.fare = { stage: 'toPassenger', px, py, dx: dest.x, dy: dest.y, paid: 0 };
}

export function updateMission(world, dt) {
  const s = world.state;
  if (!s.mission) {
    if (s.nextMissionIn > 0) {
      s.nextMissionIn -= dt;
      if (s.nextMissionIn <= 0) startNextMission(world);
    }
    // Free-roam fares: hop in a cab after the story's taxi job and fares appear.
    if (s.missionsDone.includes('m3') && !s.fare && s.playerCar && s.playerCar.type === 'taxi') {
      newFare(world, world.random);
      world.banner('Fare', 'A passenger is waiting — follow the yellow marker.', 3);
    }
    return;
  }
  const m = s.mission;
  const g = garage(world);

  if (m.id === 'm1') {
    if (m.step === 0 && s.playerCar) { m.step = 1; world.message("Nice wheels. Now bring it to Rico's Garage."); }
    else if (m.step === 1 && s.playerCar && near(world, g.x, g.y, 80)) missionDone(world, 'm1');
  } else if (m.id === 'm2') {
    if (m.step === 0) {
      for (const p of s.runPackages) {
        if (!p.taken && near(world, p.x, p.y, 44)) {
          p.taken = true;
          world.sound('pickup');
          world.message(`Package secured (${s.runPackages.filter((q) => q.taken).length}/3).`);
        }
      }
      if (s.runPackages.every((p) => p.taken)) { m.step = 1; world.message("All three. Now deliver them to Rico's."); }
    } else if (near(world, g.x, g.y, 80)) missionDone(world, 'm2');
  } else if (m.id === 'm3') {
    m.timer -= dt;
    if (m.timer <= 0) { failMission(world, 'The shift ran out of time.'); return; }
    if (m.step === 0) {
      if (s.playerCar && s.playerCar.type === 'taxi') {
        m.step = 1;
        newFare(world, world.random);
        world.message('First fare is waiting — follow the yellow marker.');
      }
    } else if (s.fare) {
      const f = s.fare;
      if (f.stage === 'toPassenger' && s.playerCar && Math.hypot(s.playerCar.x - f.px, s.playerCar.y - f.py) < 60) {
        f.stage = 'toDest';
        world.message('Passenger aboard. Drive them to the destination.');
        world.sound('pickup');
      } else if (f.stage === 'toDest' && s.playerCar && Math.hypot(s.playerCar.x - f.dx, s.playerCar.y - f.dy) < 70) {
        const pay = 50 + Math.floor(world.random() * 101);
        s.cash += pay;
        f.paid = pay;
        m.data.fares += 1;
        world.sound('cash');
        world.message(`Fare paid: $${pay} (${m.data.fares}/3).`);
        s.fare = null;
        if (m.data.fares >= 3) missionDone(world, 'm3');
        else newFare(world, world.random);
      }
    }
    if (m.step === 1 && !s.playerCar) {
      // Left the cab mid-shift: the fare waits, the clock does not.
      world.message('You left the cab — get back in a taxi!');
    }
  } else if (m.id === 'm4') {
    if (m.step === 0 && s.playerCar && s.playerCar.type === 'sports' && s.playerCar.comet) {
      m.step = 1;
      world.setWanted(3);
      world.banner('STOLEN', 'The Comet GT is hot — the whole SBPD is coming. Lose them, then bring it to Rico.', 4);
      world.sound('siren');
    } else if (m.step === 1 && s.playerCar && near(world, g.x, g.y, 80)) {
      world.setWanted(0);
      missionDone(world, 'm4');
    }
  } else if (m.id === 'm5') {
    if (m.step === 0) {
      if (s.playerCar) world.message('Park the car — the bank job is on foot.');
      else if (near(world, world.city.landmarks.bank.x, world.city.landmarks.bank.y, 70)) {
        m.step = 1;
        m.data.vault = 0;
        world.message('Inside. Hold still while the vault cracks…');
      }
    } else if (m.step === 1) {
      if (s.playerCar) { m.step = 0; world.message('You left the bank — the vault locked again.'); }
      else {
        m.data.vault += dt;
        if (m.data.vault >= 3) {
          m.step = 2;
          s.cash += 2000;
          world.setWanted(4);
          world.banner('VAULT OPEN', '$2,000 grabbed. Four stars — run for the Hideout!', 4);
          world.sound('siren');
        }
      }
    } else if (near(world, world.city.landmarks.hideout.x, world.city.landmarks.hideout.y, 80)) {
      world.setWanted(0);
      missionDone(world, 'm5');
    }
  }
}

/** Called when the player's car is destroyed: delivery jobs fail. */
export function onPlayerCarDestroyed(world) {
  const s = world.state;
  if (!s.mission) return;
  const id = s.mission.id;
  const step = s.mission.step;
  if (id === 'm1' && step === 1) failMission(world, 'The car was wrecked.');
  if (id === 'm4' && step === 1) failMission(world, 'The Comet was wrecked.');
  if (id === 'm3') failMission(world, 'The cab was wrecked.');
}
