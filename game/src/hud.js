// HUD, minimap, title/pause/help screens, objective arrow, district toast.
import { WORLD_W, WORLD_H, MISSIONS } from './config.js';

export function drawHud(ctx, game, w, h) {
  const { save, police, player, missionState } = game;
  // Top-left: health and car condition.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 12, 12, 210, 64, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${Math.max(0, Math.round(player.health))}`, 24, 36);
  const carLabel = player.inCar && player.car
    ? `${player.car.def.name}  ${Math.max(0, Math.round(player.car.health))}%`
    : 'On foot';
  ctx.fillText(carLabel, 24, 60);
  // Top-right: cash and wanted stars.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, w - 232, 12, 220, 64, 8);
  ctx.fill();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${save.cash.toLocaleString('en-US')}`, w - 24, 40);
  ctx.font = '22px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < police.wanted ? '★' : '☆';
  ctx.fillStyle = police.wanted > 0 ? '#ffd840' : '#888888';
  ctx.fillText(stars, w - 24, 66);
  // Mission line under the top bar.
  const m = MISSIONS[missionState.index];
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const missionText = m
    ? `JOB ${m.id}: ${m.name} — ${missionState.objective ? missionState.objective.label : m.brief}`
    : 'All jobs done — free roam!';
  ctx.font = 'bold 14px sans-serif';
  const tw = ctx.measureText(missionText).width + 24;
  roundRect(ctx, (w - tw) / 2, 12, tw, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd840';
  ctx.textAlign = 'center';
  ctx.fillText(missionText, w / 2, 32);
  if (m && m.timeLimit && missionState.timer > 0) {
    ctx.fillStyle = missionState.timer < 30 ? '#ff5040' : '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`⏱ ${Math.ceil(missionState.timer)}s`, w / 2, 58);
  }
  // Message toast.
  if (game.toast && game.toastTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const mw = ctx.measureText(game.toast).width + 28;
    roundRect(ctx, (w - mw) / 2, h - 130, mw, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(game.toast, w / 2, h - 110);
  }
  // District toast.
  if (game.districtToast && game.districtTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(game.districtToast, w / 2, 120);
  }
  // Controls hint.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  const hint = player.inCar
    ? 'WASD drive · Space handbrake · E exit · P pause · H help · M mute'
    : 'WASD move · Shift run · Space punch · E enter car · P pause · H help';
  ctx.fillText(hint, 224, h - 14);
  // Packages counter, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`Packages ${missionState.packages.length}/15  ·  Jobs ${missionState.done.length}/5`, w - 14, h - 14);
  ctx.textAlign = 'left';
  // Objective arrow when the target is off-screen.
  drawObjectiveArrow(ctx, game, w, h);
}

function drawObjectiveArrow(ctx, game, w, h) {
  const obj = game.missionState.objective;
  if (!obj || game.state !== 'play') return;
  const cam = game.camera;
  const sx = obj.x - cam.x;
  const sy = obj.y - cam.y;
  if (sx > 0 && sx < w && sy > 0 && sy < h) {
    // On screen: pulsing marker.
    const pulse = 10 + Math.sin(game.time * 5) * 4;
    ctx.strokeStyle = '#ffd840';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, pulse + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd840';
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const cx = w / 2;
  const cy = h / 2;
  const ang = Math.atan2(sy - cy, sx - cx);
  const ex = cx + Math.cos(ang) * (Math.min(w, h) / 2 - 50);
  const ey = cy + Math.sin(ang) * (Math.min(w, h) / 2 - 50);
  const dist = Math.round(Math.hypot(obj.x - game.player.x, obj.y - game.player.y));
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(ang);
  ctx.fillStyle = '#ffd840';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -12);
  ctx.lineTo(-10, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${dist}m`, ex, ey + 28);
}

export function drawMinimap(ctx, game, w, h) {
  const size = 190;
  const x0 = 14;
  const y0 = h - size - 34;
  const sx = size / WORLD_W;
  const sy = size / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, x0 - 6, y0 - 6, size + 12, size + 12, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  ctx.fillStyle = '#3a5a3a';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#2a7ab8';
  ctx.fillRect(x0 + 3520 * sx, y0, size - 3520 * sx, size);
  ctx.fillStyle = '#e8d49a';
  ctx.fillRect(x0 + 3300 * sx, y0, 220 * sx, size);
  ctx.fillStyle = '#4a4a52';
  for (let x = 200; x < WORLD_W; x += 400) ctx.fillRect(x0 + (x - 48) * sx, y0, 96 * sx, size);
  for (let y = 200; y < WORLD_H; y += 400) ctx.fillRect(x0, y0 + (y - 48) * sy, size, 96 * sy);
  ctx.fillStyle = '#6a6a72';
  for (const b of game.world.buildings) ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, b.w * sx, b.h * sy);
  // Markers: mission yellow, police red, packages green, player white.
  const obj = game.missionState.objective;
  if (obj) {
    ctx.fillStyle = '#ffd840';
    ctx.beginPath();
    ctx.arc(x0 + obj.x * sx, y0 + obj.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#30e060';
  for (let i = 0; i < game.world.packageSpots.length; i++) {
    if (game.missionState.packages.includes(i)) continue;
    const s = game.world.packageSpots[i];
    ctx.fillRect(x0 + s.x * sx - 1, y0 + s.y * sy - 1, 3, 3);
  }
  ctx.fillStyle = '#ff3030';
  for (const cop of game.police.cops) {
    ctx.beginPath();
    ctx.arc(x0 + cop.x * sx, y0 + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cruiser of game.police.cruisers) {
    ctx.beginPath();
    ctx.arc(x0 + cruiser.x * sx, y0 + cruiser.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + game.player.x * sx, y0 + game.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x0 + game.player.x * sx, y0 + game.player.y * sy, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR BAY', x0, y0 - 8);
}

export function drawTitle(ctx, game, w, h) {
  ctx.fillStyle = '#0a1420';
  ctx.fillRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ff9a3c');
  grad.addColorStop(0.55, '#c04080');
  grad.addColorStop(1, '#203060');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.62);
  ctx.fillStyle = '#2a7ab8';
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = '#e8d49a';
  ctx.fillRect(0, h * 0.60, w, 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', w / 2, h * 0.30);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffd840';
  ctx.fillText('A sun-soaked open-world crime story', w / 2, h * 0.30 + 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px sans-serif';
  ctx.fillText('Steal cars. Outrun the law. Work for Rico. Own the Bay.', w / 2, h * 0.30 + 72);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, w / 2 - 260, h * 0.52, 520, 130, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  if (game.hasSave) {
    ctx.fillText('SPACE — Continue your save', w / 2, h * 0.52 + 36);
    ctx.fillText('N — New game', w / 2, h * 0.52 + 66);
  } else {
    ctx.fillText('SPACE — Start a new game', w / 2, h * 0.52 + 36);
  }
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#cccccc';
  ctx.fillText('WASD move / drive · Space punch / handbrake · E enter car · P pause · H help', w / 2, h * 0.52 + 100);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.fillText('Original game. No real places, people or brands. Runs fully offline.', w / 2, h - 20);
}

export function drawPaused(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', w / 2, h / 2 - 20);
  ctx.font = '16px sans-serif';
  ctx.fillText('P or Esc to resume · H for help · M to mute', w / 2, h / 2 + 16);
}

export function drawHelp(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOW TO PLAY', w / 2, 90);
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  const lines = [
    'On foot: WASD move, Shift run, Space punch, E enter a car.',
    'Driving: WASD drive, Space handbrake, E get out.',
    'Stealing an occupied car, hitting people or ramming cops raises your wanted stars.',
    'Foot cops chase and arrest you; cruisers ram your car. Hide 10s to cool down.',
    'Pay \'n Spray ($100) clears your wanted level and repairs your car.',
    'Rico has 5 jobs: steal a car, deliver packages, drive a taxi, steal the Comet GT, crack the vault.',
    '15 hidden packages pay $100 each. After job 3 you can take taxi fares for cash.',
    'Knock a pedestrian down and they drop cash. Progress saves automatically.',
    'P / Esc pause · H help · M mute · Space continue / N new game on the title screen.',
  ];
  lines.forEach((line, i) => ctx.fillText('•  ' + line, w / 2 - 380, 140 + i * 34));
  ctx.textAlign = 'center';
  ctx.fillText('Press H or Esc to close', w / 2, h - 60);
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
