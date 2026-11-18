// World generation: road grid, buildings, parks, beach, sea, marina,
// parking lots, hidden packages and parked cars. Deterministic per seed.
import { WORLD_W, WORLD_H, BLOCK, ROAD_W, DISTRICTS, PACKAGE_COUNT } from './config.js';
import { mulberry32, pick, range, intRange, shuffle } from './random.js';

export function verticalRoads() {
  const xs = [];
  for (let x = 200; x < WORLD_W; x += BLOCK) xs.push(x);
  return xs;
}

export function horizontalRoads() {
  const ys = [];
  for (let y = 200; y < WORLD_H; y += BLOCK) ys.push(y);
  return ys;
}

export function isOnRoad(x, y) {
  for (const rx of verticalRoads()) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of horizontalRoads()) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  // Between districts (avenues, beach strip): name the nearest district centre.
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const cx = d.x + d.w / 2;
    const cy = d.y + d.h / 2;
    const dist = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const vRoads = verticalRoads();
  const hRoads = horizontalRoads();
  const palette = ['#b08a5a', '#8a7a6a', '#6a8aa0', '#a06a7a', '#7a9a6a', '#9a8a5a', '#5a6a8a', '#c0a080'];
  // One building per city block, inset from the roads, skipping beach/sea.
  for (let i = 0; i < vRoads.length - 1; i++) {
    for (let j = 0; j < hRoads.length - 1; j++) {
      const bx = vRoads[i] + ROAD_W / 2 + 14;
      const by = hRoads[j] + ROAD_W / 2 + 14;
      const bw = BLOCK - ROAD_W - 28;
      const bh = BLOCK - ROAD_W - 28;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      if (cx > 3300) continue; // beach strip: no buildings
      if (cx > 2950 && cy > 2050) continue; // marina water
      buildings.push({
        x: bx, y: by, w: bw, h: bh,
        color: pick(rng, palette),
        roof: pick(rng, ['#5a4a3a', '#3a4a5a', '#6a5a4a', '#4a5a3a']),
        height: intRange(rng, 1, 4),
        windows: intRange(rng, 4, 12),
      });
    }
  }
  const parks = [
    { x: 640, y: 1040, w: 280, h: 280, name: 'Palm Park' },
    { x: 2240, y: 640, w: 280, h: 280, name: 'Hill Park' },
    { x: 1040, y: 2240, w: 280, h: 200, name: 'Bay Park' },
  ];
  // Hidden packages: scattered on sidewalks and corners, never on roads.
  const packageSpots = [];
  const spots = [];
  for (let i = 0; i < 60; i++) {
    const x = range(rng, 120, 3260);
    const y = range(rng, 120, 2460);
    if (!isOnRoad(x, y)) spots.push({ x, y });
  }
  for (const s of shuffle(rng, spots).slice(0, PACKAGE_COUNT)) packageSpots.push(s);
  // Parked cars along road edges.
  const parked = [];
  const kinds = ['sedan', 'hatch', 'van', 'taxi', 'muscle', 'truck'];
  for (let i = 0; i < 26; i++) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, vRoads) : pick(rng, hRoads);
    const along = range(rng, 260, WORLD_H - 260);
    const x = vertical ? road + ROAD_W / 2 - 16 : along;
    const y = vertical ? along : road + ROAD_W / 2 - 16;
    if (x > 3280) continue;
    parked.push({
      kind: pick(rng, kinds),
      x, y,
      angle: vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
      occupied: false, health: 100, id: i,
    });
  }
  // The Comet GT prize car waits at the Marina dock.
  parked.push({ kind: 'sports', x: 3150, y: 2250, angle: -Math.PI / 2, occupied: false, health: 100, id: 100 });
  return { buildings, parks, packageSpots, parked, seed };
}

export function collideCircleRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function resolveBuildings(world, x, y, r) {
  let nx = x;
  let ny = y;
  for (const b of world.buildings) {
    if (collideCircleRect(nx, ny, r, b)) {
      const cx = Math.max(b.x, Math.min(nx, b.x + b.w));
      const cy = Math.max(b.y, Math.min(ny, b.y + b.h));
      const dx = nx - cx;
      const dy = ny - cy;
      const d = Math.hypot(dx, dy) || 1;
      const push = r - d + 0.5;
      nx += (dx / d) * push;
      ny += (dy / d) * push;
    }
  }
  nx = Math.max(30, Math.min(WORLD_W - 30, nx));
  ny = Math.max(30, Math.min(WORLD_H - 30, ny));
  return { x: nx, y: ny };
}
