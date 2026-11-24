// Solmar Bay — world constants, vehicle specs, mission definitions.
// Everything every other module needs to agree on lives here and nowhere else.
export const WORLD_W = 3600;
export const WORLD_H = 2600;

// Avenues run north-south, streets east-west. Road width 84, sidewalk 14.
export const AVENUES = [240, 760, 1280, 1800, 2320, 2840];
export const STREETS = [240, 720, 1200, 1680, 2160];
export const ROAD_W = 84;

// The sea and the beach live on the east edge; the marina bay cuts in at the
// south-east corner and joins the sea.
export const BEACH_X = 3050; // sand starts here
export const SEA_X = 3450; // water starts here
export const BAY = { x0: 2880, y0: 2080, x1: SEA_X, y1: WORLD_H };

// Central park (a green block with trees, no buildings).
export const PARK = { x0: 1290, y0: 1210, x1: 1790, y1: 1670 };

// Fixed city landmarks, in world coordinates.
export const GARAGE = { x: 1280, y: 300 }; // Rico's garage, mission 1 drop-off
export const SPRAY = { x: 2320, y: 1680 }; // Pay 'n Spray
export const HIDEOUT = { x: 520, y: 1980 }; // mission 5 escape point
export const VAULT = { x: 2050, y: 950 }; // Downtown bank vault, mission 5
export const DOCKS = { x: 3060, y: 2260 }; // marina docks, Comet GT spawns here
export const HOSPITAL = { x: 760, y: 720 }; // respawn after being busted / down
export const POLICE_HQ = { x: 1800, y: 240 }; // where busted players wake up

export const DISTRICTS = [
  { name: 'Old Town', color: '#c98f4e' },
  { name: 'Downtown', color: '#7fa3c9' },
  { name: 'Palm Heights', color: '#8fc97f' },
  { name: 'Marina', color: '#6fc4c9' },
  { name: 'Industrial', color: '#b08d7a' },
  { name: 'Beachfront', color: '#e8c96a' },
];

// District by position. Beachfront first (east edge), then Marina (south-east),
// Industrial (south-west), Palm Heights (north-east), Downtown (centre),
// Old Town (north-west).
export function districtAt(x, y) {
  if (x >= BEACH_X) return 'Beachfront';
  if (x >= 2100 && y >= 1680) return 'Marina';
  if (x < 900 && y >= 1200) return 'Industrial';
  if (x >= 2100 && y < 1680) return 'Palm Heights';
  if (x >= 900 && x < 2100 && y < 1200) return 'Downtown';
  if (x < 900 && y < 1200) return 'Old Town';
  return 'Downtown';
}

// Vehicle types: top speed (units/s), acceleration, turn rate (rad/s at full
// speed), body length/width, colour. Police cruisers are locked: you cannot
// drive one away.
export const VEHICLES = {
  sedan: { name: 'Sedan', top: 265, accel: 210, turn: 2.5, len: 46, wid: 22, color: '#c94f42', locked: false },
  taxi: { name: 'Taxi', top: 275, accel: 220, turn: 2.6, len: 46, wid: 22, color: '#f2c230', locked: false },
  hatch: { name: 'Hatchback', top: 240, accel: 230, turn: 2.9, len: 40, wid: 20, color: '#4f8fd0', locked: false },
  van: { name: 'Van', top: 200, accel: 150, turn: 2.0, len: 54, wid: 24, color: '#e8e4da', locked: false },
  truck: { name: 'Truck', top: 180, accel: 130, turn: 1.7, len: 62, wid: 26, color: '#7a7f85', locked: false },
  muscle: { name: 'Muscle', top: 305, accel: 260, turn: 2.2, len: 48, wid: 23, color: '#8e2f8f', locked: false },
  sports: { name: 'Comet GT', top: 365, accel: 300, turn: 2.7, len: 46, wid: 22, color: '#e8b400', locked: false },
  police: { name: 'Police Cruiser', top: 325, accel: 280, turn: 2.6, len: 48, wid: 23, color: '#2b3a55', locked: true },
};
export const VEHICLE_TYPES = Object.keys(VEHICLES);

// Rico's five jobs, unlocked in order. reward is the job pay; mission 5 also
// pays vaultCash on top.
export const MISSIONS = [
  { id: 0, name: 'First Wheels', reward: 300, text: 'Steal any car and drive it back to Rico\'s garage.' },
  { id: 1, name: 'Package Run', reward: 500, text: 'Deliver 3 packages around the city.' },
  { id: 2, name: 'Taxi Shift', reward: 600, text: 'Pick up 3 fares before the clock runs out (240s).' },
  { id: 3, name: 'Hot Pursuit', reward: 900, text: 'Steal the Comet GT from the docks and bring it to the drop-off. 3 stars!' },
  { id: 4, name: 'The Bay Heist', reward: 2000, vaultCash: 2000, text: 'Crack the vault (stand by it 3s), then lose the heat and reach the hideout. 4 stars!' },
];

export const PACKAGE_VALUE = 100;
export const PACKAGE_COUNT = 15;
export const SPRAY_COST = 100;
export const TAXI_FARE = 60; // free-roam fare after the mission line is done
export const FARE_TIP = 50; // tip per fare during the Taxi Shift job
export const WANTED_MAX = 5;
export const HIDE_SECONDS = 10; // unseen this long before stars start falling
export const STAR_DROP_SECONDS = 8; // one star per this many hidden seconds
export const SAVE_KEY = 'solmar-bay-save-v1';
