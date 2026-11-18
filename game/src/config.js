// Solmar Bay — configuration: world size, districts, vehicles, missions.
// Every name, place and character here is original to this game.
export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const ROAD_W = 96;
export const BLOCK = 400;

export const DISTRICTS = [
  { name: 'Old Town', x: 0, y: 0, w: 1200, h: 900, tint: '#e8d9b0' },
  { name: 'Downtown', x: 1200, y: 0, w: 1200, h: 900, tint: '#c9d4e8' },
  { name: 'Palm Heights', x: 2400, y: 0, w: 1000, h: 900, tint: '#d8e8c9' },
  { name: 'Marina', x: 2400, y: 1700, w: 1000, h: 900, tint: '#bcd8e8' },
  { name: 'Industrial', x: 0, y: 1700, w: 1200, h: 900, tint: '#d8cbb8' },
  { name: 'Beachfront', x: 1200, y: 1700, w: 1200, h: 900, tint: '#f0e2c0' },
];

export const VEHICLES = {
  sedan:   { name: 'Sedan',      top: 240, accel: 150, grip: 2.6, color: '#4a7ec2', len: 46, wid: 22 },
  taxi:    { name: 'Cab',        top: 230, accel: 145, grip: 2.6, color: '#e8b820', len: 46, wid: 22 },
  hatch:   { name: 'Hatchback',  top: 215, accel: 160, grip: 2.9, color: '#c25a4a', len: 40, wid: 20 },
  van:     { name: 'Van',        top: 195, accel: 120, grip: 2.2, color: '#7a8a9a', len: 52, wid: 24 },
  truck:   { name: 'Hauler',     top: 180, accel: 105, grip: 2.0, color: '#8a6a3a', len: 58, wid: 26 },
  muscle:  { name: 'Muscle',     top: 265, accel: 185, grip: 2.3, color: '#a03a5a', len: 48, wid: 23 },
  sports:  { name: 'Comet GT',   top: 310, accel: 215, grip: 3.1, color: '#e8e840', len: 46, wid: 21 },
  police:  { name: 'Cruiser',    top: 275, accel: 195, grip: 2.9, color: '#2a2a34', len: 48, wid: 23 },
};

export const MISSIONS = [
  { id: 1, name: 'First Wheels', giver: 'Rico', reward: 300,
    brief: 'Rico needs wheels. Steal any car and bring it back to the garage.' },
  { id: 2, name: 'Package Run', giver: 'Rico', reward: 500,
    brief: 'Three packages, three drop-offs across town. Do not dawdle.' },
  { id: 3, name: 'Taxi Shift', giver: 'Rico', reward: 600, timeLimit: 240,
    brief: 'Drive a cab, pick up 3 fares and drop them off. 4 minutes on the clock.' },
  { id: 4, name: 'Hot Pursuit', giver: 'Rico', reward: 900,
    brief: 'A Comet GT is waiting at the Marina. Take it. The cops will notice.' },
  { id: 5, name: 'The Bay Heist', giver: 'Rico', reward: 2000, vaultCash: 2000,
    brief: 'Crack the Downtown vault, grab the cash, and lose the heat at the hideout.' },
];

export const GARAGE = { x: 560, y: 560 };
export const HIDEOUT = { x: 2900, y: 2100 };
export const VAULT = { x: 1560, y: 360 };
export const SPRAY = { x: 900, y: 1960 };
export const MARINA_DOCK = { x: 3150, y: 2250 };
export const PACKAGE_COUNT = 15;
export const SAVE_KEY = 'solmar-bay-save-v1';
export const START_CASH = 50;
export const BEACH_X = 3300;
export const SEA_X = 3520;
export const WANTED_COOL_HIDE = 10;
export const WANTED_COOL_STEP = 8;
