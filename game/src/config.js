// Solmar Bay — every tuning number, colour and car type in one place.
// The camera shows a fixed 1280x720 logical view; the world is 3600x2600 and the
// renderer scales the view to the window, so no rule below depends on the screen.
export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3600, height: 2600 };
export const STEP = 1 / 60;

// Vertical avenues and horizontal streets (centre lines, px). Roads are wide
// enough for two lanes each way plus parking at the kerb.
export const AVENUES = [400, 1000, 1600, 2200, 2800, 3200];
export const STREETS = [350, 800, 1250, 1700, 2150];
export const AVENUE_W = 120;
export const STREET_W = 100;
export const LANE = 20; // offset from a road centre line to a traffic lane

// Water: the east beach strip and the south-east marina bay.
export const WATER = [
  { x: 3480, y: 0, w: 120, h: 2600 }, // open sea, east edge
  { x: 2800, y: 2350, w: 800, h: 250 }, // marina bay, south-east
];
export const SAND = { x: 3300, y: 0, w: 180, h: 2350 }; // beach strip

export const PLAYER = {
  radius: 14, walk: 175, run: 290, hp: 100,
  punchRange: 46, punchDamage: 34, punchCooldown: 0.38, punchArc: 1.1,
  regenDelay: 5, regenRate: 3,
};

export const CAR_TYPES = {
  sedan:  { name: 'Solmar Sedan',  len: 64, wid: 30, accel: 340, top: 520, reverse: 200, turn: 2.9,  colors: ['#c94f42', '#4f7ec9', '#c9c9c9', '#e8b23a', '#5aa469'] },
  taxi:   { name: 'Bay Taxi',      len: 64, wid: 30, accel: 330, top: 500, reverse: 200, turn: 2.9,  colors: ['#f2c230'] },
  hatch:  { name: 'Palm Hatch',    len: 54, wid: 28, accel: 360, top: 480, reverse: 210, turn: 3.2,  colors: ['#7ec8a9', '#e88ca0', '#8fa8d8', '#f2f2f2'] },
  van:    { name: 'Cargo Van',     len: 76, wid: 32, accel: 260, top: 420, reverse: 170, turn: 2.4,  colors: ['#e8e4da', '#7a8a99', '#c96f2e'] },
  truck:  { name: 'Flatbed Truck', len: 92, wid: 34, accel: 230, top: 400, reverse: 160, turn: 2.1,  colors: ['#b8542e', '#4a6b8a'] },
  muscle: { name: 'V8 Bruto',      len: 68, wid: 32, accel: 420, top: 580, reverse: 220, turn: 2.7,  colors: ['#8a2f2f', '#2f2f3a', '#c97e1e'] },
  sports: { name: 'Comet GT',      len: 66, wid: 30, accel: 520, top: 740, reverse: 240, turn: 3.4,  colors: ['#e83a5e', '#f2d13a'] },
  police: { name: 'SBPD Cruiser',  len: 66, wid: 30, accel: 460, top: 640, reverse: 230, turn: 3.1,  colors: ['#20242e'] },
};
export const CAR_ORDER = ['sedan', 'hatch', 'taxi', 'van', 'muscle', 'truck'];

export const WANTED = {
  max: 5, decayHiddenSeconds: 8, unseenRadius: 620, unseenSeconds: 10,
  fineBusted: 150, hospitalCut: 0.1,
  crimeCooldown: 1.2, // one crash cannot stack several stars at once
};

export const POLICE = {
  footSpeed: 235, footHp: 100, punchDamage: 12, bustSeconds: 1.1,
  carRamDamage: 5, ramCooldownSeconds: 2, ramMinSpeed: 200, maxCars: 6, spawnDistance: 700, despawnDistance: 1500,
};

export const TRAFFIC = { count: 26, pedCount: 42, spawnRadius: 900, despawnRadius: 1300 };
export const PICKUP = { packageValue: 100, cashDropMin: 10, cashDropMax: 30 };
export const PAYNSPRAY = { cost: 100 };
export const MISSION_REWARDS = { m1: 300, m2: 500, m3: 600, m4: 900, m5: 2000 };

export const PALETTE = {
  grass: '#7cc46a', grassDry: '#a8cf7e', sand: '#f0d193', water: '#2fa8c9',
  waterDeep: '#1f86ad', road: '#3a3a46', roadEdge: '#2c2c36', sidewalk: '#c9c2b2',
  lane: '#f7d774', kerb: '#8f887a', park: '#5da24e', tree: '#2f7d3a',
  plaza: '#b9b2a2', roofA: '#e07856', roofB: '#f2b04e', roofC: '#6fb7d9',
  roofD: '#e88ca0', roofE: '#9b7ec2', roofF: '#7ec8a9', glass: '#5a7ba6',
  glassHi: '#8fb4d9', warehouse: '#a89a80', wall: '#6b6258',
  player: '#ff6b5e', playerDark: '#2b2b33', cop: '#20242e', copBlue: '#2f6fd0',
  marker: '#ffd23a', blipMission: '#ffd23a', blipPolice: '#ff3b30',
  blipPackage: '#34e07a', blipSpray: '#4fc3f7', blipPlayer: '#ffffff',
  hudPanel: 'rgba(12,14,20,0.72)', hudText: '#f4f6f8', hudMuted: '#aab2bd',
  star: '#ffd23a', starEmpty: 'rgba(255,255,255,0.25)',
  cash: '#7de07a', damage: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const SAVE_KEY = 'solmar-bay.save.v1';
export const BEST_KEY = 'solmar-bay.best.v1';

// District names shown on the HUD when the player crosses into one.
export const DISTRICTS = [
  { name: 'Old Town', x: 0, y: 0, w: 1000, h: 1250 },
  { name: 'Downtown', x: 1000, y: 350, w: 1800, h: 1350 },
  { name: 'Palm Heights', x: 2200, y: 0, w: 1400, h: 800 },
  { name: 'Marina', x: 2200, y: 1700, w: 1400, h: 900 },
  { name: 'Industrial', x: 0, y: 1700, w: 1000, h: 900 },
  { name: 'Beachfront', x: 3200, y: 0, w: 400, h: 2600 },
];
