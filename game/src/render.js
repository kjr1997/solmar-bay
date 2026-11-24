// Rendering: the canvas world (roads, buildings, beach, sea, park, cars,
// people, markers, particles), the HUD, the minimap and the menus. All art
// is drawn with canvas primitives — no images, no fonts loaded over the net.
import {
  WORLD_W, WORLD_H, AVENUES, STREETS, ROAD_W, BEACH_X, SEA_X, BAY, PARK,
  GARAGE, SPRAY, HIDEOUT, VAULT, DOCKS, HOSPITAL, POLICE_HQ, districtAt,
} from './config.js';
import { missionTarget, missionObjective, currentMission } from './missions.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, v) {
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  const { len, wid } = v.spec;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 8);
  ctx.fill();
  ctx.fillStyle = v.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 8);
  ctx.fill();
  // Windshield + roof.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  roundRect(ctx, len * 0.08, -wid / 2 + 3, len * 0.22, wid - 6, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, -len * 0.28, -wid / 2 + 3, len * 0.2, wid - 6, 4);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 2, 3, 5);
  ctx.fillRect(len / 2 - 2, wid / 2 - 7, 3, 5);
  if (v.type === 'police') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-len / 2 + 2, -wid / 2 + 2, len - 4, 6);
    ctx.fillStyle = '#e33';
    ctx.fillRect(-6, -wid / 2 - 2, 12, 5);
    ctx.fillStyle = '#36c';
    ctx.fillRect(-6, wid / 2 - 3, 12, 5);
  }
  if (v.type === 'taxi') {
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  ctx.restore();
  if (v.smoke > 0.1) {
    ctx.fillStyle = `rgba(80,80,80,${0.35 * v.smoke})`;
    ctx.beginPath();
    ctx.arc(v.x - Math.cos(v.angle) * v.spec.len * 0.5, v.y - Math.sin(v.angle) * v.spec.len * 0.5, 6 + v.smoke * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPed(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.state === 'down') {
    ctx.rotate(1.2);
    ctx.fillStyle = p.shirt;
    roundRect(ctx, -9, -5, 18, 10, 4);
    ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(11, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(0, -9, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWorld(ctx, game) {
  const { world, camera } = game;
  const x0 = camera.x - 40;
  const y0 = camera.y - 40;
  const x1 = camera.x + VIEW_W + 40;
  const y1 = camera.y + VIEW_H + 40;

  // Ground: grass base, sand on the beach, water on the sea and bay.
  // fillClipped never draws a negative-width rect (a plain fillRect with a
  // negative width paints backwards and would flood the screen).
  const fillClipped = (x, y, w, h) => {
    const cx = Math.max(x, x0);
    const cy = Math.max(y, y0);
    const cw = Math.min(x + w, x1) - cx;
    const ch = Math.min(y + h, y1) - cy;
    if (cw > 0 && ch > 0) ctx.fillRect(cx, cy, cw, ch);
  };
  ctx.fillStyle = '#7fae5a';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = '#e8d28a';
  fillClipped(BEACH_X, y0, SEA_X - BEACH_X, y1 - y0);
  ctx.fillStyle = '#2f7fc2';
  fillClipped(SEA_X, y0, WORLD_W - SEA_X, y1 - y0);
  fillClipped(BAY.x0, BAY.y0, BAY.x1 - BAY.x0, BAY.y1 - BAY.y0);
  // Waves along the shoreline.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = Math.max(y0, 0); y < Math.min(y1, WORLD_H); y += 46) {
    ctx.moveTo(SEA_X + 4, y);
    ctx.quadraticCurveTo(SEA_X + 14, y + 12, SEA_X + 4, y + 24);
  }
  ctx.stroke();

  // Roads: asphalt with centre dashes.
  ctx.fillStyle = '#3d3d46';
  for (const ax of AVENUES) ctx.fillRect(ax - ROAD_W / 2, Math.max(y0, 0), ROAD_W, Math.min(y1, WORLD_H) - Math.max(y0, 0));
  for (const sy of STREETS) ctx.fillRect(Math.max(x0, 0), sy - ROAD_W / 2, Math.min(x1, BEACH_X) - Math.max(x0, 0), ROAD_W);
  ctx.strokeStyle = '#e8c33e';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  for (const ax of AVENUES) { ctx.moveTo(ax, Math.max(y0, 0)); ctx.lineTo(ax, Math.min(y1, WORLD_H)); }
  for (const sy of STREETS) { ctx.moveTo(Math.max(x0, 0), sy); ctx.lineTo(Math.min(x1, BEACH_X), sy); }
  ctx.stroke();
  ctx.setLineDash([]);

  // Park.
  ctx.fillStyle = '#5da244';
  ctx.fillRect(PARK.x0, PARK.y0, PARK.x1 - PARK.x0, PARK.y1 - PARK.y0);
  ctx.fillStyle = '#6fb354';
  ctx.beginPath();
  ctx.arc((PARK.x0 + PARK.x1) / 2, (PARK.y0 + PARK.y1) / 2, 90, 0, Math.PI * 2);
  ctx.fill();

  // Buildings.
  for (const b of world.buildings) {
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(b.x + 10, b.y + 10, Math.min(18, b.w - 20), 10);
  }
  // Trees.
  for (const t of world.trees) {
    if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
    ctx.fillStyle = '#2f7a33';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a9a4a';
    ctx.beginPath();
    ctx.arc(t.x - 2, t.y - 2, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Landmarks: garage, spray shop, hideout, vault, docks, hospital, HQ.
  drawLandmark(ctx, GARAGE.x, GARAGE.y, '#e8c33e', 'GARAGE');
  drawLandmark(ctx, SPRAY.x, SPRAY.y, '#3ec9d0', 'SPRAY');
  drawLandmark(ctx, HIDEOUT.x, HIDEOUT.y, '#8a3ed0', 'HIDEOUT');
  drawLandmark(ctx, VAULT.x, VAULT.y, '#e33', 'VAULT');
  drawLandmark(ctx, DOCKS.x, DOCKS.y, '#f08a2e', 'DOCKS');
  drawLandmark(ctx, HOSPITAL.x, HOSPITAL.y, '#fff', 'HOSPITAL');
  drawLandmark(ctx, POLICE_HQ.x, POLICE_HQ.y, '#36c', 'POLICE');

  // Hidden packages (green glow).
  for (const p of world.packages) {
    if (p.taken) continue;
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    const pulse = 0.6 + 0.4 * Math.sin(game.time * 4 + p.id);
    ctx.fillStyle = `rgba(60,220,90,${0.25 + 0.2 * pulse})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2ecc40';
    roundRect(ctx, p.x - 7, p.y - 5, 14, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x - 1, p.y - 5, 2, 10);
  }

  // Mission markers: drop-offs, fare passenger, package drops.
  const target = missionTarget(game);
  if (target) drawTargetMarker(ctx, game, target);

  // Cash drops on the ground.
  for (const c of game.cashDrops) {
    ctx.fillStyle = '#2ecc40';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', c.x, c.y + 3);
  }

  // Cars, cops, peds, player.
  for (const v of game.cars) if (!v.dead) drawCar(ctx, v);
  for (const cop of game.cops) drawCop(ctx, cop);
  for (const p of game.peds) drawPed(ctx, p);
  drawPlayerFigure(ctx, game);

  // Particles (skid dust, punch stars, pickup sparkles).
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLandmark(ctx, x, y, color, label) {
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  roundRect(ctx, x - 26, y - 16, 52, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 3);
}

function drawTargetMarker(ctx, game, target) {
  const bob = Math.sin(game.time * 3) * 5;
  ctx.fillStyle = 'rgba(232,195,62,0.9)';
  ctx.beginPath();
  ctx.moveTo(target.x, target.y - 34 + bob);
  ctx.lineTo(target.x - 11, target.y - 52 + bob);
  ctx.lineTo(target.x + 11, target.y - 52 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,195,62,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 26 + Math.sin(game.time * 3) * 4, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCop(ctx, cop) {
  ctx.save();
  ctx.translate(cop.x, cop.y);
  if (cop.state === 'down') {
    ctx.rotate(1.2);
    ctx.fillStyle = '#2b3a55';
    roundRect(ctx, -9, -5, 18, 10, 4);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b3a55';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c33e';
    ctx.fillRect(-7, -2, 14, 3);
    ctx.fillStyle = '#e8b48a';
    ctx.beginPath();
    ctx.arc(0, -9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b3a55';
    ctx.fillRect(-5, -15, 10, 4);
  }
  ctx.restore();
}

function drawPlayerFigure(ctx, game) {
  const { player } = game;
  if (player.inCar) return; // the car drawing covers the driver
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(player.angle);
  // A white-jacketed figure with a direction nose so facing is readable.
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d0483e';
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(2, -5);
  ctx.lineTo(2, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-1, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  if (player.punching) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(14, 0, 10, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

// --- HUD -----------------------------------------------------------------

export function drawHUD(ctx, game) {
  const { player, wanted, save, missions } = game;
  ctx.textAlign = 'left';

  // Top-left: health and car health.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 12, 12, 210, 64, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SOLMAR BAY', 22, 30);
  bar(ctx, 22, 38, 150, 10, player.health / 100, '#e33');
  ctx.fillStyle = '#fff';
  ctx.font = '11px sans-serif';
  ctx.fillText(`HP ${Math.ceil(player.health)}`, 178, 47);
  if (player.inCar) {
    bar(ctx, 22, 54, 150, 10, Math.max(0, player.inCar.health) / 100, '#f08a2e');
    ctx.fillStyle = '#fff';
    ctx.fillText(`${player.inCar.spec.name} ${Math.ceil(player.inCar.health)}%`, 178, 63);
  } else {
    ctx.fillStyle = '#ccc';
    ctx.fillText('on foot — E to enter a car', 22, 63);
  }

  // Top-right: cash and wanted stars.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, VIEW_W - 232, 12, 220, 64, 8);
  ctx.fill();
  ctx.fillStyle = '#2ecc40';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${save.cash.toLocaleString()}`, VIEW_W - 24, 40);
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < wanted.stars ? '#ffd23e' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', VIEW_W - 214 + i * 26, 66);
  }

  // Mission line, top-centre.
  const mission = currentMission(missions);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const line = mission ? `RICO — ${mission.name}  ·  ${missionObjective(missions)}` : 'All jobs done — free roam!';
  ctx.font = 'bold 13px sans-serif';
  const w = ctx.measureText(line).width + 24;
  roundRect(ctx, (VIEW_W - w) / 2, 12, w, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.textAlign = 'center';
  ctx.fillText(line, VIEW_W / 2, 32);
  ctx.textAlign = 'left';

  // Toast messages (mission complete, package found...).
  if (missions.messageTimer > 0) {
    ctx.globalAlpha = Math.min(1, missions.messageTimer);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const mw = ctx.measureText(missions.message).width + 28;
    roundRect(ctx, (VIEW_W - mw) / 2, 52, mw, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(missions.message, VIEW_W / 2, 72);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Zone toast.
  if (game.zoneToast > 0) {
    ctx.globalAlpha = Math.min(1, game.zoneToast);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.zone, VIEW_W / 2, VIEW_H - 150);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // Off-screen objective arrow + distance.
  const target = missionTarget(game);
  if (target) drawObjectiveArrow(ctx, game, target);

  // Controls hint, bottom-right (kept short so it fits its bar).
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, VIEW_W - 332, VIEW_H - 34, 320, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#ddd';
  ctx.font = '10px sans-serif';
  ctx.fillText('WASD move/drive · Space punch/brake · E enter car · P pause', VIEW_W - 324, VIEW_H - 19);

  // Vault crack progress bar.
  if (missions.index === 4 && missions.stage === 'vault' && missions.vaultTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, VIEW_W / 2 - 110, VIEW_H - 110, 220, 22, 6);
    ctx.fill();
    bar(ctx, VIEW_W / 2 - 104, VIEW_H - 104, 208, 10, missions.vaultTimer / 3, '#ffd23e');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING VAULT…', VIEW_W / 2, VIEW_H - 88);
    ctx.textAlign = 'left';
  }
}

function bar(ctx, x, y, w, h, ratio, color) {
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.fillStyle = color;
  if (ratio > 0) {
    roundRect(ctx, x, y, Math.max(4, w * Math.max(0, Math.min(1, ratio))), h, 3);
    ctx.fill();
  }
}

function drawObjectiveArrow(ctx, game, target) {
  const { player, camera } = game;
  const sx = target.x - camera.x;
  const sy = target.y - camera.y;
  const onScreen = sx > 60 && sx < VIEW_W - 60 && sy > 60 && sy < VIEW_H - 60;
  if (onScreen) return;
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const ang = Math.atan2(sy - cy, sx - cx);
  const ax = cx + Math.cos(ang) * (VIEW_W / 2 - 70);
  const ay = cy + Math.sin(ang) * (VIEW_H / 2 - 70);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-8, -12);
  ctx.lineTo(-8, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const dist = Math.round(Math.hypot(target.x - player.x, target.y - player.y));
  const label = `${target.label} ${dist}m`;
  // Put the label on the side away from the minimap: above the arrow when
  // the arrow sits in the bottom half of the screen.
  const labelY = ay + (Math.sin(ang) > 0 ? -26 : 30);
  ctx.font = 'bold 13px sans-serif';
  const lw = ctx.measureText(label).width + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, ax - lw / 2, labelY - 14, lw, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.textAlign = 'center';
  ctx.fillText(label, ax, labelY);
  ctx.textAlign = 'left';
}

// --- Minimap ---------------------------------------------------------------

export function drawMinimap(ctx, game) {
  const size = 190;
  const mx = 14;
  const my = VIEW_H - size - 14;
  const scale = size / WORLD_W;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, mx - 4, my - 4, size + 8, size + 8, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, size, size);
  ctx.clip();
  ctx.fillStyle = '#4a7a3a';
  ctx.fillRect(mx, my, size, size);
  // Water.
  ctx.fillStyle = '#2f7fc2';
  ctx.fillRect(mx + SEA_X * scale, my, size - SEA_X * scale, size);
  ctx.fillRect(mx + BAY.x0 * scale, my + BAY.y0 * scale, (BAY.x1 - BAY.x0) * scale, (BAY.y1 - BAY.y0) * scale);
  // Roads.
  ctx.fillStyle = '#888';
  for (const ax of AVENUES) ctx.fillRect(mx + (ax - 20) * scale, my, 40 * scale, size);
  for (const sy of STREETS) ctx.fillRect(mx, my + (sy - 20) * scale, size, 40 * scale);
  // Buildings.
  ctx.fillStyle = '#c9b18a';
  for (const b of game.world.buildings) {
    ctx.fillRect(mx + b.x * scale, my + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
  }
  const dot = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx + x * scale, my + y * scale, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Packages green, mission target yellow, cops red, player white.
  for (const p of game.world.packages) if (!p.taken) dot(p.x, p.y, '#2ecc40', 2.5);
  const target = missionTarget(game);
  if (target) dot(target.x, target.y, '#ffd23e', 4);
  for (const cop of game.cops) dot(cop.x, cop.y, '#ff4444', 2.5);
  for (const v of game.cars) if (v.driver === 'police') dot(v.x, v.y, '#ff4444', 3);
  dot(game.player.x, game.player.y, '#fff', 4);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(mx + game.player.x * scale, my + game.player.y * scale, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(districtAt(game.player.x, game.player.y), mx + 2, my + size + 12);
}

// --- Menus -----------------------------------------------------------------

export function drawTitle(ctx, game) {
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Sun-soaked skyline silhouette.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#ff9a5a');
  grad.addColorStop(0.55, '#e85d75');
  grad.addColorStop(1, '#2b3a55');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(20,20,40,0.85)';
  const skyline = [90, 150, 110, 190, 130, 170, 210, 140, 180, 120, 200, 150, 90];
  let x = 0;
  for (const h of skyline) {
    ctx.fillRect(x, VIEW_H - 260 - h, 100, h + 260);
    x += 100;
  }
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(VIEW_W - 220, 130, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SOLMAR BAY', VIEW_W / 2, 210);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffd23e';
  ctx.fillText('A TOP-DOWN OPEN-WORLD CRIME GAME', VIEW_W / 2, 250);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('Steal cars. Outrun the cops. Run Rico\'s five jobs. Find 15 hidden packages.', VIEW_W / 2, 300);
  ctx.font = 'bold 18px sans-serif';
  if (game.hasSave) {
    ctx.fillText('SPACE — continue your game', VIEW_W / 2, 420);
    ctx.fillText('N — new game', VIEW_W / 2, 452);
  } else {
    ctx.fillText('SPACE — start a new game', VIEW_W / 2, 420);
  }
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#ddd';
  ctx.fillText('WASD move / drive · Shift sprint · Space punch / handbrake · E enter car · H help · M mute', VIEW_W / 2, 520);
  ctx.fillText('Progress saves to this browser automatically.', VIEW_W / 2, 548);
  ctx.textAlign = 'left';
  if (game.hasSave) {
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#ffd23e';
    ctx.textAlign = 'center';
    ctx.fillText(`Saved: $${game.save.cash.toLocaleString()} · job ${Math.min(game.save.mission + 1, 5)}/5 · ${game.save.packages.length}/15 packages`, VIEW_W / 2, 592);
    ctx.textAlign = 'left';
  }
}

export function drawHelp(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('HOW TO PLAY', VIEW_W / 2, 120);
  ctx.font = '16px sans-serif';
  const lines = [
    'On foot: WASD move, Shift sprint, Space punch, E get in a car.',
    'Driving: WASD drive, Space handbrake, E get out.',
    'Steal a parked car for free; yanking a driver out adds 1 wanted star.',
    'Wanted 0–5 stars: cops chase on foot, cruisers ram your car.',
    'Hide for 10s and stars drop one every 8s. Pay \'n Spray ($100) clears them.',
    'Rico\'s jobs: steal a car, run packages, taxi shift, steal the Comet GT, crack the vault.',
    '15 hidden packages ($100 each) glow green on the minimap.',
    'Knock a pedestrian down and they drop cash. Taxi fares open after job 3.',
    'P / Esc pause · H help · M mute · progress saves automatically.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 180 + i * 34));
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Press H or Esc to close', VIEW_W / 2, 180 + lines.length * 34 + 20);
  ctx.textAlign = 'left';
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '16px sans-serif';
  ctx.fillText('P / Esc to resume · H help · M mute', VIEW_W / 2, VIEW_H / 2 + 30);
  ctx.textAlign = 'left';
}

export function drawBusted(ctx) {
  ctx.fillStyle = 'rgba(10,10,30,0.85)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('BUSTED!', VIEW_W / 2, VIEW_H / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText('The Solmar Bay PD took $150 and your wanted level. Back on the street.', VIEW_W / 2, VIEW_H / 2 + 24);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Press SPACE to continue', VIEW_W / 2, VIEW_H / 2 + 70);
  ctx.textAlign = 'left';
}
