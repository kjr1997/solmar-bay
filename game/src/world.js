// Solmar Bay — procedural city generation and spatial queries.
// Builds buildings, trees, parked cars, hidden packages and the road graph
// from a fixed seed, and answers "is this point on a road / inside a
// building / in the sea" for physics, traffic and the minimap.
import { AVENUES, STREETS, ROAD_W, WORLD_W, WORLD_H, DISTRICTS, BEACH_X,
  SEA_X, PLACES, HIDDEN_PACKAGES, CAR_TYPES } from './config.js';
import { makeRng } from './random.js';

const BUILDING_COLORS = ['#b59a7a', '#9a8f7a', '#7a8a99', '#a88f6a', '#8f7a8a',
  '#6a7a6a', '#b08a6a', '#7a7a8a', '#c0a080', '#5f7480', '#96705a', '#74806a'];
const ROOF_COLORS = ['#5a4a3a', '#4a5a6a', '#6a5a4a', '#3a4a5a', '#7a6a5a'];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

export function isOnRoad(x, y) {
  const half = ROAD_W / 2;
  for (const ax of AVENUES) if (Math.abs(x - ax) <= half) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) <= half) return true;
  return false;
}

export function isInSea(x, y) { return x >= SEA_X; }
export function isOnBeach(x, y) { return x >= BEACH_X && x < SEA_X; }

function overlapsParkOrLot(x, y, w, h) {
  const zones = [PLACES.park, PLACES.parkingLot];
  for (const z of zones) {
    if (x < z.x + z.w && x + w > z.x && y < z.y + z.h && y + h > z.y) return true;
  }
  return false;
}

export function generateCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const parked = [];
  const packages = [];

  // City blocks sit between neighbouring avenues and streets.
  for (let ai = 0; ai < AVENUES.length - 1; ai++) {
    for (let si = 0; si < STREETS.length - 1; si++) {
      const bx0 = AVENUES[ai] + ROAD_W / 2 + 14;
      const bx1 = AVENUES[ai + 1] - ROAD_W / 2 - 14;
      const by0 = STREETS[si] + ROAD_W / 2 + 14;
      const by1 = STREETS[si + 1] - ROAD_W / 2 - 14;
      const bw = bx1 - bx0, bh = by1 - by0;
      if (bw < 60 || bh < 60) continue;
      if (overlapsParkOrLot(bx0, by0, bw, bh)) {
        // Park block: trees only. Parking lot: marked bays, no buildings.
        if (bx0 >= PLACES.park.x && bx0 < PLACES.park.x + PLACES.park.w) {
          for (let t = 0; t < 14; t++) {
            trees.push({ x: rng.range(bx0 + 20, bx1 - 20), y: rng.range(by0 + 20, by1 - 20), r: rng.range(9, 15) });
          }
        }
        continue;
      }
      const count = rng.int(1, 3);
      for (let b = 0; b < count; b++) {
        const w = rng.range(90, Math.min(220, bw));
        const h = rng.range(70, Math.min(180, bh));
        const x = rng.range(bx0, bx1 - w);
        const y = rng.range(by0, by1 - h);
        const tall = rng.chance(0.22);
        buildings.push({
          x, y, w, h, tall,
          color: rng.pick(BUILDING_COLORS),
          roof: rng.pick(ROOF_COLORS),
          windows: rng.int(2, 5),
        });
      }
      // A few palm trees along block edges.
      for (let t = 0; t < 3; t++) {
        trees.push({ x: rng.range(bx0, bx1), y: rng.range(by0, by1), r: rng.range(7, 11) });
      }
    }
  }

  // Marina: wooden docks and moored boats in the south-east bay.
  const boats = [];
  for (let i = 0; i < 6; i++) {
    boats.push({ x: 2920 + i * 52, y: 2320 + (i % 2) * 90, angle: rng.range(-0.2, 0.2) });
  }

  // Parked cars along the avenues and streets.
  const parkTypes = ['sedan', 'hatch', 'taxi', 'van', 'muscle', 'sedan', 'hatch'];
  for (const ax of AVENUES) {
    for (const sy of STREETS) {
      if (rng.chance(0.55)) {
        parked.push(makeParkedCar(ax + ROAD_W / 2 + 26, sy + rng.range(-140, 140),
          rng.pick(parkTypes), Math.PI / 2, rng));
      }
      if (rng.chance(0.45)) {
        parked.push(makeParkedCar(ax - ROAD_W / 2 - 26, sy + rng.range(-140, 140),
          rng.pick(parkTypes), -Math.PI / 2, rng));
      }
    }
  }
  // The Comet GT prize car waits at the Marina dock.
  parked.push(makeParkedCar(PLACES.marinaDock.x, PLACES.marinaDock.y, 'sports', 0, rng, true));

  // Hidden packages: 15, scattered on sidewalks and quiet corners.
  const placed = new Set();
  let guard = 0;
  while (packages.length < HIDDEN_PACKAGES && guard++ < 400) {
    const x = rng.range(120, 3050);
    const y = rng.range(120, 2480);
    if (isOnRoad(x, y) || pointInBuildings(x, y, buildings)) continue;
    const key = Math.floor(x / 160) + ':' + Math.floor(y / 160);
    if (placed.has(key)) continue;
    placed.add(key);
    packages.push({ x, y, taken: false });
  }

  return { buildings, trees, parked, packages, boats, seed };
}

function makeParkedCar(x, y, type, angle, rng, prize = false) {
  const def = CAR_TYPES[type];
  return {
    x, y, angle, speed: 0, type, prize,
    color: prize ? '#f2c230' : def.color,
    occupied: false, driver: null, hp: 100,
    id: 'parked-' + Math.floor(rng.next() * 1e9).toString(36),
  };
}

export function pointInBuildings(x, y, buildings) {
  for (const b of buildings) {
    if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) return b;
  }
  return null;
}

export function circleHitsBuilding(x, y, r, buildings) {
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

// Nearest point on the road network (used to keep traffic on roads).
export function nearestRoadPoint(x, y) {
  let best = null, bestD = Infinity;
  for (const ax of AVENUES) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; best = { x: ax, y, axis: 'v' }; }
  }
  for (const sy of STREETS) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x, y: sy, axis: 'h' }; }
  }
  return best;
}

// Clamp a point inside the drivable world (sea is a wall, beach is walkable).
export function clampToWorld(x, y) {
  return {
    x: Math.max(24, Math.min(WORLD_W - 24, x)),
    y: Math.max(24, Math.min(WORLD_H - 24, y)),
  };
}

// A random sidewalk point: off the road, outside buildings, inside the city.
export function randomSidewalkPoint(rng, buildings) {
  for (let tries = 0; tries < 40; tries++) {
    const x = rng.range(120, 3050);
    const y = rng.range(120, 2480);
    if (!isOnRoad(x, y) && !pointInBuildings(x, y, buildings)) return { x, y };
  }
  return { x: 800, y: 400 };
}
