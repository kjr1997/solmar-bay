// World generation: roads, buildings, park, beach, marina bay, trees,
// hidden packages and the fixed landmarks. Everything is built from one seed,
// so the city is identical on every load with the same seed.
import {
  WORLD_W, WORLD_H, AVENUES, STREETS, ROAD_W, BEACH_X, SEA_X, BAY, PARK,
  GARAGE, SPRAY, HIDEOUT, VAULT, DOCKS, HOSPITAL, POLICE_HQ, PACKAGE_COUNT,
} from './config.js';
import { makeRng } from './rng.js';

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const palette = ['#b98a5e', '#9a7b6d', '#7f8ea3', '#a39a7f', '#8a6f5c', '#6f8a7f', '#c2a878'];

  // Buildings fill every block between roads (never in the park, beach, bay
  // or on a road). Each block gets 1-3 buildings with a margin for sidewalk.
  for (let ai = 0; ai <= AVENUES.length; ai++) {
    const x0 = (ai === 0 ? 40 : AVENUES[ai - 1] + ROAD_W / 2 + 16);
    const x1 = (ai === AVENUES.length ? BEACH_X - 40 : AVENUES[ai] - ROAD_W / 2 - 16);
    for (let si = 0; si <= STREETS.length; si++) {
      const y0 = (si === 0 ? 40 : STREETS[si - 1] + ROAD_W / 2 + 16);
      const y1 = (si === STREETS.length ? WORLD_H - 40 : STREETS[si] - ROAD_W / 2 - 16);
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // Park block: trees only.
      if (x0 >= PARK.x0 - 20 && x1 <= PARK.x1 + 20 && y0 >= PARK.y0 - 20 && y1 <= PARK.y1 + 20) {
        for (let t = 0; t < 26; t++) {
          trees.push({ x: rng.range(PARK.x0 + 20, PARK.x1 - 20), y: rng.range(PARK.y0 + 20, PARK.y1 - 20), r: rng.range(7, 12) });
        }
        continue;
      }
      // Bay block: water, no buildings.
      if (x0 >= BAY.x0 - 20 && y0 >= BAY.y0 - 20) continue;
      const count = rng.int(1, 3);
      for (let b = 0; b < count; b++) {
        const w = rng.range(70, Math.min(150, (x1 - x0) / count));
        const h = rng.range(60, Math.min(130, y1 - y0));
        const bx = rng.range(x0, x1 - w);
        const by = rng.range(y0, y1 - h);
        const rect = { x: bx, y: by, w, h, color: rng.pick(palette), roof: rng.pick(['#5a4a3a', '#3f4a5a', '#6a5a4a']) };
        // Keep landmark clearings free of buildings.
        const landmarks = [GARAGE, SPRAY, HIDEOUT, VAULT, DOCKS, HOSPITAL, POLICE_HQ];
        const clear = landmarks.some((lm) => lm.x > bx - 90 && lm.x < bx + w + 90 && lm.y > by - 90 && lm.y < by + h + 90);
        if (clear) continue;
        buildings.push(rect);
      }
      // A few street trees along the block edges.
      for (let t = 0; t < 4; t++) {
        trees.push({ x: rng.range(x0, x1), y: rng.range(y0, y1), r: rng.range(6, 10) });
      }
    }
  }

  // 15 hidden packages, spread across districts, never inside a building or
  // in the water.
  const packages = [];
  let guard = 0;
  while (packages.length < PACKAGE_COUNT && guard < 4000) {
    guard++;
    const x = rng.range(120, BEACH_X - 60);
    const y = rng.range(120, WORLD_H - 120);
    if (isWater(x, y)) continue;
    if (buildings.some((b) => x > b.x - 24 && x < b.x + b.w + 24 && y > b.y - 24 && y < b.y + b.h + 24)) continue;
    if (packages.some((p) => Math.hypot(p.x - x, p.y - y) < 220)) continue;
    packages.push({ x, y, id: packages.length, taken: false });
  }

  return { buildings, trees, packages, seed };
}

// --- Geometry helpers shared by every system -----------------------------

export function isRoad(x, y) {
  const hw = ROAD_W / 2;
  if (AVENUES.some((ax) => Math.abs(x - ax) <= hw)) return true;
  if (STREETS.some((sy) => Math.abs(y - sy) <= hw)) return true;
  return false;
}

export function isWater(x, y) {
  if (x >= SEA_X) return true;
  if (x >= BAY.x0 && x <= BAY.x1 && y >= BAY.y0 && y <= BAY.y1) return true;
  return false;
}

export function isBeach(x, y) {
  return x >= BEACH_X && x < SEA_X && !isWater(x, y);
}

export function onRoadPoint(rng) {
  // A random point on a random road (used for traffic / pedestrian spawns).
  if (rng.chance(0.5)) {
    return { x: rng.pick(AVENUES) + rng.range(-26, 26), y: rng.range(80, WORLD_H - 80) };
  }
  return { x: rng.range(80, BEACH_X - 80), y: rng.pick(STREETS) + rng.range(-26, 26) };
}

// Circle vs building rectangles. Returns the building hit, or null.
export function hitBuilding(world, x, y, r) {
  for (const b of world.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// The nearest point on any road to (x, y) — handy for respawns and fares.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const ax of AVENUES) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; best = { x: ax, y }; }
  }
  for (const sy of STREETS) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x, y: sy }; }
  }
  return best;
}

// Push a circle out of buildings / water / world bounds. Mutates pos.
export function collideWorld(world, pos, r) {
  pos.x = Math.max(r + 4, Math.min(WORLD_W - r - 4, pos.x));
  pos.y = Math.max(r + 4, Math.min(WORLD_H - r - 4, pos.y));
  const b = hitBuilding(world, pos.x, pos.y, r);
  if (b) {
    const dxLeft = pos.x + r - b.x;
    const dxRight = b.x + b.w + r - pos.x;
    const dyTop = pos.y + r - b.y;
    const dyBottom = b.y + b.h + r - pos.y;
    const m = Math.min(dxLeft, dxRight, dyTop, dyBottom);
    if (m === dxLeft) pos.x = b.x - r;
    else if (m === dxRight) pos.x = b.x + b.w + r;
    else if (m === dyTop) pos.y = b.y - r;
    else pos.y = b.y + b.h + r;
  }
  // Shallow water stops feet and wheels alike (except the beach strip).
  if (isWater(pos.x, pos.y)) {
    if (pos.x >= SEA_X) pos.x = SEA_X - r;
    else if (pos.y >= BAY.y0) pos.y = BAY.y0 - r;
    else if (pos.x >= BAY.x0) pos.x = BAY.x0 - r;
  }
  return b !== null;
}
