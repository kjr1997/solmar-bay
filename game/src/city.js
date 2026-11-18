// Solmar Bay's layout, built once from a seed: the road grid, the blocks between
// the roads, the buildings, parks, beach, marina, landmarks, parked cars and the
// intersection graph the traffic drives on. Nothing here draws or steps.
import { AVENUES, AVENUE_W, DISTRICTS, PALETTE, SAND, STREETS, STREET_W, WATER, WORLD } from './config.js';

const ROOFS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE, PALETTE.roofF];
const VILLA_ROOFS = ['#e07856', '#f2b04e', '#e88ca0', '#7ec8a9', '#d9a05b'];

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function inWaterRects(x, y) {
  for (const w of WATER) if (x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h) return true;
  return false;
}

// The bands of buildable land between the roads.
function landBands() {
  const xs = [[40, 340]];
  for (let i = 0; i < AVENUES.length; i += 1) {
    const left = AVENUES[i] + AVENUE_W / 2 + 40;
    const right = (i + 1 < AVENUES.length ? AVENUES[i + 1] - AVENUE_W / 2 : 3300) - 40;
    if (right > left) xs.push([left, right]);
  }
  const ys = [[40, 300]];
  for (let i = 0; i < STREETS.length; i += 1) {
    const top = STREETS[i] + STREET_W / 2 + 40;
    const bottom = (i + 1 < STREETS.length ? STREETS[i + 1] - STREET_W / 2 : 2320) - 40;
    if (bottom > top) ys.push([top, bottom]);
  }
  return { xs, ys };
}

function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'Solmar Bay';
}

export function buildCity(random) {
  const buildings = [];
  const trees = [];
  const parks = [];
  const piers = [
    { x: 2988, y: 2320, w: 24, h: 200 },
    { x: 3288, y: 2320, w: 24, h: 200 },
  ];
  const { xs, ys } = landBands();

  // Fixed landmarks: name, marker point (where missions point), building rect.
  const landmarks = {
    garage:    { name: "Rico's Garage",  x: 700,  y: 1230, bx: 560,  by: 940,  bw: 260, bh: 130 },
    bank:      { name: 'Solmar Bank',    x: 1890, y: 1215, bx: 1780, by: 930,  bw: 230, bh: 150 },
    hospital:  { name: 'Solmar General', x: 2490, y: 775,  bx: 2380, by: 500,  bw: 220, bh: 130 },
    paynspray: { name: "Spray 'n' Go",  x: 2990, y: 1680, bx: 2900, by: 1400, bw: 180, bh: 110 },
    police:    { name: 'SBPD HQ',        x: 1310, y: 320,  bx: 1200, by: 100,  bw: 220, bh: 130 },
    marina:    { name: 'Marina Lot',     x: 3000, y: 1925, bx: 0,    by: 0,    bw: 0,   bh: 0 },
    hideout:   { name: 'Hideout',        x: 200,  y: 1945, bx: 110,  by: 1820, bw: 180, bh: 120 },
    taxiStand: { name: 'Taxi Stand',     x: 1000, y: 1700, bx: 0,    by: 0,    bw: 0,   bh: 0 },
  };

  function addBuilding(x, y, w, h, height, roof) {
    buildings.push({ x, y, w, h, height, roof, wall: shade(roof, -28) });
  }
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (n & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }

  // One park block and one parking-lot block are fixed; the rest get buildings.
  const parkBlock = { x: 460, y: 1300, w: 480, h: 350 };
  const lotBlock = { x: 1060, y: 1750, w: 480, h: 350 };
  parks.push(parkBlock);
  for (let i = 0; i < 26; i += 1) {
    trees.push({
      x: parkBlock.x + 30 + random() * (parkBlock.w - 60),
      y: parkBlock.y + 30 + random() * (parkBlock.h - 60),
      r: 12 + random() * 8,
    });
  }

  for (const [bx0, bx1] of xs) {
    for (const [by0, by1] of ys) {
      const block = { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };
      if (rectsOverlap(block, parkBlock) || rectsOverlap(block, lotBlock)) continue;
      if (inWaterRects(block.x + block.w / 2, block.y + block.h / 2)) continue;
      const cx = block.x + block.w / 2;
      const cy = block.y + block.h / 2;
      const district = districtAt(cx, cy);
      const downtown = district === 'Downtown';
      const industrial = district === 'Industrial';
      const villas = district === 'Palm Heights';
      // Landmark buildings go in their own blocks first.
      let placed = false;
      for (const key of Object.keys(landmarks)) {
        const lm = landmarks[key];
        if (lm.bw > 0 && lm.bx >= block.x - 10 && lm.bx + lm.bw <= block.x + block.w + 10
          && lm.by >= block.y - 10 && lm.by + lm.bh <= block.y + block.h + 10) {
          addBuilding(lm.bx, lm.by, lm.bw, lm.bh, downtown ? 3 : 1, key === 'bank' ? PALETTE.glass : random.pick(ROOFS));
          placed = true;
        }
      }
      if (placed) continue;
      if (industrial) {
        addBuilding(block.x + 20, block.y + 20, block.w - 40, block.h - 40, 1, PALETTE.warehouse);
        continue;
      }
      if (villas) {
        const n = 2;
        for (let i = 0; i < n; i += 1) {
          const w = 90 + random() * 60;
          const h = 80 + random() * 50;
          addBuilding(block.x + 25 + i * (block.w / 2), block.y + 25 + random() * 40, w, h, 1, random.pick(VILLA_ROOFS));
          trees.push({ x: block.x + 40 + random() * (block.w - 80), y: block.y + block.h - 50, r: 13 + random() * 6 });
        }
        continue;
      }
      const count = downtown && random.chance(0.5) ? 1 : 2;
      for (let i = 0; i < count; i += 1) {
        const w = Math.min(block.w - 50, 130 + random() * (downtown ? 160 : 90));
        const h = Math.min(block.h - 50, 110 + random() * (downtown ? 130 : 70));
        const x = block.x + 25 + (count === 1 ? (block.w - w) / 2 - 25 : i * (block.w / 2));
        const y = block.y + 25 + random() * 30;
        addBuilding(x, y, w, h, downtown ? 2 + (random.chance(0.4) ? 1 : 0) : 1, downtown && random.chance(0.55) ? PALETTE.glass : random.pick(ROOFS));
      }
      if (random.chance(0.5)) {
        trees.push({ x: block.x + 30 + random() * (block.w - 60), y: block.y + block.h - 35, r: 11 + random() * 6 });
      }
    }
  }

  // Parked cars: the lot block in a grid, plus kerb parking along the avenues.
  const parked = [];
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      parked.push({ x: lotBlock.x + 70 + col * 110, y: lotBlock.y + 90 + row * 130, angle: Math.PI / 2, type: null });
    }
  }
  // The Comet GT always waits in the marina lot.
  parked.push({ x: 3000, y: 1925, angle: -Math.PI / 2, type: 'sports', color: '#e83a5e' });
  parked.push({ x: 2920, y: 1925, angle: -Math.PI / 2, type: null });
  parked.push({ x: 3080, y: 1925, angle: -Math.PI / 2, type: null });
  for (const ave of AVENUES) {
    for (let i = 0; i < 3; i += 1) {
      const y = 200 + random() * 2000;
      const side = random.chance(0.5) ? -1 : 1;
      parked.push({ x: ave + side * (AVENUE_W / 2 - 16), y, angle: side > 0 ? Math.PI / 2 : -Math.PI / 2, type: null });
    }
  }

  // Intersection graph: node id "ax,sy" -> {x, y, neighbours}.
  const nodes = new Map();
  function nodeId(ax, sy) { return `${ax},${sy}`; }
  for (const ax of AVENUES) {
    for (const sy of STREETS) {
      nodes.set(nodeId(ax, sy), { x: ax, y: sy, neighbours: [] });
    }
  }
  for (const ax of AVENUES) {
    for (let i = 0; i < STREETS.length - 1; i += 1) {
      const a = nodes.get(nodeId(ax, STREETS[i]));
      const b = nodes.get(nodeId(ax, STREETS[i + 1]));
      a.neighbours.push(b);
      b.neighbours.push(a);
    }
  }
  for (const sy of STREETS) {
    for (let i = 0; i < AVENUES.length - 1; i += 1) {
      const a = nodes.get(nodeId(AVENUES[i], sy));
      const b = nodes.get(nodeId(AVENUES[i + 1], sy));
      a.neighbours.push(b);
      b.neighbours.push(a);
    }
  }
  function nearestNode(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const node of nodes.values()) {
      const d = (node.x - x) ** 2 + (node.y - y) ** 2;
      if (d < bestD) { bestD = d; best = node; }
    }
    return best;
  }

  function onRoad(x, y) {
    for (const ax of AVENUES) if (Math.abs(x - ax) <= AVENUE_W / 2) return true;
    for (const sy of STREETS) if (Math.abs(y - sy) <= STREET_W / 2) return true;
    return false;
  }
  function inWater(x, y) {
    if (inWaterRects(x, y)) {
      for (const p of piers) if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return false;
      return true;
    }
    return false;
  }
  function buildingAt(x, y, r) {
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }
  // Push a circle out of buildings and water; returns true when it was blocked.
  function resolveCircle(body, r) {
    let blocked = false;
    const b = buildingAt(body.x, body.y, r);
    if (b) {
      const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
      const dx = body.x - cx;
      const dy = body.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < r) {
        if (d > 0.001) { body.x = cx + (dx / d) * r; body.y = cy + (dy / d) * r; }
        else body.y = b.y - r;
        blocked = true;
      }
    }
    if (inWater(body.x, body.y)) {
      // Shove back toward the beach: water only borders the east and south-east.
      if (body.x > SAND.x) body.x = SAND.x + 320 - r;
      else body.y = 2350 - r;
      blocked = true;
    }
    body.x = Math.max(20, Math.min(WORLD.width - 20, body.x));
    body.y = Math.max(20, Math.min(WORLD.height - 20, body.y));
    return blocked;
  }

  return {
    buildings, trees, parks, piers, landmarks, parked, nodes, nearestNode,
    onRoad, inWater, buildingAt, resolveCircle, districtAt,
    sand: SAND, water: WATER,
  };
}
