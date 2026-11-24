// Solmar Bay — configuration: world size, districts, vehicles, missions.
// All tuning values for the open-world crime game live here.
export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const SAVE_KEY = 'solmar-bay-save-v1';

// Avenues (vertical roads) and streets (horizontal roads), centre lines.
export const AVENUES = [300, 800, 1300, 1800, 2300, 2800];
export const STREETS = [300, 700, 1100, 1500, 1900, 2300];
export const ROAD_W = 96;

// Six districts of Solmar Bay, by rectangular bounds.
export const DISTRICTS = [
  { name: 'Old Town', x: 0, y: 0, w: 1050, h: 900, ground: '#8a7a5c' },
  { name: 'Downtown', x: 1050, y: 0, w: 1000, h: 900, ground: '#7d7468' },
  { name: 'Palm Heights', x: 2050, y: 0, w: 1050, h: 900, ground: '#9c8f6a' },
  { name: 'Marina', x: 2050, y: 1700, w: 1050, h: 900, ground: '#6f7d72' },
  { name: 'Industrial', x: 0, y: 1700, w: 1050, h: 900, ground: '#6e6a63' },
  { name: 'Beachfront', x: 3100, y: 0, w: 500, h: 2600, ground: '#e8d5a2' },
];

// Beach sand strip and the sea east of it.
export const BEACH_X = 3120;
export const SEA_X = 3360;

// Key places in the city.
export const PLACES = {
  garage: { x: 800, y: 1500, label: 'Rico\'s Garage' },
  hideout: { x: 300, y: 300, label: 'Hideout' },
  spray: { x: 2300, y: 1900, label: "Pay 'n Spray" },
  marinaDock: { x: 2850, y: 2250, label: 'Marina Dock' },
  park: { x: 1300, y: 1100, w: 500, h: 400, label: 'Palm Park' },
  parkingLot: { x: 1800, y: 1500, w: 500, h: 400, label: 'Downtown Lot' },
};

// Eight drivable vehicle types. topSpeed in px/s, accel px/s^2, grip 0..1.
export const CAR_TYPES = {
  sedan:   { name: 'Sedan',    topSpeed: 330, accel: 240, grip: 0.72, color: '#4a7fb5', w: 46, h: 22 },
  taxi:    { name: 'Taxi',     topSpeed: 320, accel: 250, grip: 0.74, color: '#e8b820', w: 46, h: 22 },
  hatch:   { name: 'Hatchback',topSpeed: 300, accel: 270, grip: 0.80, color: '#c65a3c', w: 42, h: 21 },
  van:     { name: 'Van',      topSpeed: 260, accel: 190, grip: 0.60, color: '#8a8f96', w: 54, h: 24 },
  truck:   { name: 'Truck',    topSpeed: 240, accel: 170, grip: 0.55, color: '#5a6e46', w: 60, h: 26 },
  muscle:  { name: 'Muscle',   topSpeed: 380, accel: 300, grip: 0.66, color: '#a83232', w: 48, h: 23 },
  sports:  { name: 'Comet GT', topSpeed: 430, accel: 340, grip: 0.86, color: '#e8e8e8', w: 46, h: 21 },
  police:  { name: 'Cruiser',  topSpeed: 390, accel: 320, grip: 0.82, color: '#20242c', w: 48, h: 23 },
};

export const PLAYER_WALK = 170;
export const PLAYER_RUN = 265;
export const PLAYER_PUNCH_RANGE = 34;
export const PLAYER_PUNCH_DAMAGE = 34;
export const SPRAY_COST = 100;
export const PACKAGE_VALUE = 100;
export const HIDDEN_PACKAGES = 15;
export const WANTED_DECAY_HIDDEN_S = 10;
export const WANTED_DECAY_STEP_S = 8;
export const ARREST_HOLD_S = 1.1;
export const TAXI_FARE_MIN = 40;
export const TAXI_FARE_MAX = 90;
export const HP_REGEN_PER_S = 2;

// The five Rico missions, in unlock order.
export const MISSIONS = [
  { id: 0, name: 'First Wheels', reward: 300,
    brief: 'Steal any car and bring it back to Rico\'s Garage.' },
  { id: 1, name: 'Package Run', reward: 500,
    brief: 'Deliver 3 packages to the marked drop points.' },
  { id: 2, name: 'Taxi Shift', reward: 600, timeLimit: 240,
    brief: 'Pick up 3 fares in your taxi before the clock runs out.' },
  { id: 3, name: 'Hot Pursuit', reward: 900,
    brief: 'Steal the Comet GT from the Marina dock and deliver it — the cops will be all over you.' },
  { id: 4, name: 'The Bay Heist', reward: 2000, vaultBonus: 2000,
    brief: 'Crack the Downtown vault on foot, grab the cash, and lose the cops at the Hideout.' },
];

export const START_CASH = 50;
export const START_POS = { x: 800, y: 1560 };
