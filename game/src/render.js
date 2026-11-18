// Canvas rendering: sun-soaked city, sea, cars, people, police, effects.
import { WORLD_W, WORLD_H, ROAD_W, DISTRICTS, VEHICLES, SPRAY, GARAGE, HIDEOUT, VAULT, MARINA_DOCK } from './config.js';
import { verticalRoads, horizontalRoads, districtAt } from './world.js';

export function drawWorld(ctx, game, cam) {
  const { world } = game;
  ctx.fillStyle = '#8fae6a';
  ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
  // District ground tints.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.tint;
    ctx.fillRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
  }
  // Beach sand and sea on the east edge.
  ctx.fillStyle = '#e8d49a';
  ctx.fillRect(3300 - cam.x, 0 - cam.y, 220, WORLD_H);
  ctx.fillStyle = '#2a7ab8';
  ctx.fillRect(3520 - cam.x, 0 - cam.y, WORLD_W - 3520, WORLD_H);
  // Sea shimmer: animated wave lines on the water.
  ctx.fillStyle = '#3a9ad8';
  for (let i = 0; i < 24; i++) {
    const wy = (i * 137 + Math.floor(game.time * 20)) % WORLD_H;
    ctx.fillRect(3520 - cam.x, wy - cam.y, 80, 3);
  }
  // Palm trees along the beach promenade.
  ctx.fillStyle = '#6a4a2a';
  for (let py = 120; py < WORLD_H; py += 220) {
    ctx.fillRect(3330 - cam.x, py - cam.y, 6, 26);
    ctx.fillStyle = '#3a8a3a';
    ctx.beginPath();
    ctx.arc(3333 - cam.x, py - cam.y - 4, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a4a2a';
  }
  // Marina water.
  ctx.fillStyle = '#2a7ab8';
  ctx.fillRect(2950 - cam.x, 2050 - cam.y, 650, 550);
  // Parks.
  for (const park of world.parks) {
    ctx.fillStyle = '#5a9a4a';
    ctx.fillRect(park.x - cam.x, park.y - cam.y, park.w, park.h);
    ctx.fillStyle = '#3a7a3a';
    for (let i = 0; i < 8; i++) {
      const tx = park.x + 30 + (i * 37) % (park.w - 60);
      const ty = park.y + 30 + (i * 53) % (park.h - 60);
      ctx.beginPath();
      ctx.arc(tx - cam.x, ty - cam.y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Roads.
  ctx.fillStyle = '#3a3a42';
  for (const rx of verticalRoads()) ctx.fillRect(rx - ROAD_W / 2 - cam.x, 0 - cam.y, ROAD_W, WORLD_H);
  for (const ry of horizontalRoads()) ctx.fillRect(0 - cam.x, ry - ROAD_W / 2 - cam.y, WORLD_W, ROAD_W);
  // Road centre dashes.
  ctx.fillStyle = '#e8d840';
  for (const rx of verticalRoads()) {
    for (let y = 0; y < WORLD_H; y += 60) ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 28);
  }
  for (const ry of horizontalRoads()) {
    for (let x = 0; x < WORLD_W; x += 60) ctx.fillRect(x - cam.x, ry - 2 - cam.y, 28, 4);
  }
  // Sidewalk edges.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  for (const rx of verticalRoads()) {
    ctx.beginPath(); ctx.moveTo(rx - ROAD_W / 2 - cam.x, 0); ctx.lineTo(rx - ROAD_W / 2 - cam.x, WORLD_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + ROAD_W / 2 - cam.x, 0); ctx.lineTo(rx + ROAD_W / 2 - cam.x, WORLD_H); ctx.stroke();
  }
  // Landmarks.
  drawLandmark(ctx, GARAGE.x, GARAGE.y, cam, '#e8a020', 'GARAGE');
  drawLandmark(ctx, SPRAY.x, SPRAY.y, cam, '#c040c0', "PAY 'N SPRAY");
  drawLandmark(ctx, HIDEOUT.x, HIDEOUT.y, cam, '#40c080', 'HIDEOUT');
  drawLandmark(ctx, VAULT.x, VAULT.y, cam, '#c0c0c0', 'VAULT');
  drawLandmark(ctx, MARINA_DOCK.x, MARINA_DOCK.y, cam, '#40a0e0', 'MARINA');
  // Buildings with shaded roofs and windows.
  for (const b of world.buildings) {
    if (b.x + b.w < cam.x || b.x > cam.x + cam.w || b.y + b.h < cam.y || b.y > cam.y + cam.h) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x - cam.x + 8, b.y - cam.y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x - cam.x + 8, b.y - cam.y + 8, b.w - 16, b.h - 16);
    ctx.fillStyle = 'rgba(255,240,160,0.85)';
    const cols = Math.max(2, Math.floor(b.w / 46));
    const rows = Math.max(2, Math.floor(b.h / 46));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i + j) % 3 === 0) continue;
        ctx.fillRect(b.x - cam.x + 16 + i * 44, b.y - cam.y + 16 + j * 44, 16, 12);
      }
    }
  }
  // Hidden packages (green sparkles).
  for (let i = 0; i < world.packageSpots.length; i++) {
    if (game.missionState.packages.includes(i)) continue;
    const s = world.packageSpots[i];
    const bob = Math.sin(game.time * 3 + i) * 3;
    ctx.fillStyle = '#30e060';
    ctx.beginPath();
    ctx.arc(s.x - cam.x, s.y - cam.y + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', s.x - cam.x, s.y - cam.y + bob + 4);
  }
}

function drawLandmark(ctx, x, y, cam, color, label) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - cam.x, y - cam.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x - cam.x, y - cam.y - 22);
}

export function drawCar(ctx, car, cam) {
  const def = car.def || VEHICLES[car.kind];
  ctx.save();
  ctx.translate(car.x - cam.x, car.y - cam.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-def.len / 2 + 4, -def.wid / 2 + 4, def.len, def.wid);
  ctx.fillStyle = car.color || def.color;
  roundRect(ctx, -def.len / 2, -def.wid / 2, def.len, def.wid, 7);
  ctx.fill();
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(-def.len / 6, -def.wid / 2 + 3, def.len / 3, def.wid - 6);
  ctx.fillStyle = '#d8e8f0';
  ctx.fillRect(def.len / 2 - 10, -def.wid / 2 + 3, 6, 5);
  ctx.fillRect(def.len / 2 - 10, def.wid / 2 - 8, 6, 5);
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2020';
    ctx.fillRect(-def.len / 2, -def.wid / 2 + 2, 4, 6);
    ctx.fillRect(-def.len / 2, def.wid / 2 - 8, 4, 6);
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#202020';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  if (car.kind === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -def.wid / 2 + 2, 12, def.wid - 4);
    ctx.fillStyle = '#e02020';
    ctx.fillRect(-def.len / 2 + 2, -def.wid / 2 + 2, 8, 5);
    ctx.fillStyle = '#2040e0';
    ctx.fillRect(-def.len / 2 + 2, def.wid / 2 - 7, 8, 5);
  }
  if (car.health < 40) {
    ctx.fillStyle = 'rgba(120,120,120,0.7)';
    ctx.beginPath();
    ctx.arc(-def.len / 4, 0, 8 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPed(ctx, ped, cam) {
  const bob = Math.sin(ped.walkPhase) * 2;
  ctx.save();
  ctx.translate(ped.x - cam.x, ped.y - cam.y);
  if (ped.down > 0) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = ped.shirt;
    ctx.fillRect(-10, -5, 20, 10);
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(13, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = ped.shirt;
  ctx.fillRect(-7, -6 + bob, 14, 16);
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(0, -12 + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#202030';
  ctx.fillRect(-7, 10, 5, 8);
  ctx.fillRect(2, 10, 5, 8);
  ctx.restore();
}

export function drawPlayer(ctx, player, cam) {
  const bob = player.moving ? Math.sin(player.walkPhase) * 2 : 0;
  ctx.save();
  ctx.translate(player.x - cam.x, player.y - cam.y);
  ctx.rotate(player.angle);
  if (player.punchTimer > 0) {
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(8, -4, 16, 6);
  }
  ctx.fillStyle = '#e04040';
  ctx.fillRect(-8, -7 + bob, 16, 15);
  ctx.fillStyle = '#f0c090';
  ctx.beginPath();
  ctx.arc(12, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#202030';
  ctx.fillRect(-8, 8, 6, 9);
  ctx.fillRect(2, 8, 6, 9);
  ctx.restore();
  // Arrest flash ring.
  if (player.arrested > 0) {
    ctx.strokeStyle = '#ff2020';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x - cam.x, player.y - cam.y, 26, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCop(ctx, cop, cam) {
  ctx.save();
  ctx.translate(cop.x - cam.x, cop.y - cam.y);
  ctx.rotate(cop.angle);
  ctx.fillStyle = '#203060';
  ctx.fillRect(-8, -7, 16, 15);
  ctx.fillStyle = '#f0c090';
  ctx.beginPath();
  ctx.arc(12, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#203060';
  ctx.fillRect(5, -10, 14, 6);
  ctx.restore();
}
