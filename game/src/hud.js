// The HUD and the menus, drawn in screen space on top of the world: cash and
// wanted stars top-right, health and car condition top-left, the mission line
// under it, the minimap bottom-left, and the title / pause / help panels.
import { FONT, PALETTE, VIEW, WORLD } from './config.js';
import { MISSION_LIST, missionTarget } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_HELP = 'help';

const MAP = { x: 24, y: VIEW.height - 24 - 168, w: 224, h: 168 };

export function createHud(canvas) {
  const ctx = canvas.getContext('2d');
  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left') {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    ctx.font = fonts.get(size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }
  function boldText(value, x, y, size, color, align = 'left') {
    if (!fonts.has(`b${size}`)) fonts.set(`b${size}`, `bold ${size}px ${FONT}`);
    ctx.font = fonts.get(`b${size}`);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }
  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
  }
  function star(x, y, size, filled) {
    ctx.fillStyle = filled ? PALETTE.star : PALETTE.starEmpty;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? size : size * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawStars(state) {
    panel(VIEW.width - 24 - 250, 16, 250, 84);
    boldText(`$${state.cash.toLocaleString('en-US')}`, VIEW.width - 40, 42, 26, PALETTE.cash, 'right');
    for (let i = 0; i < 5; i += 1) {
      star(VIEW.width - 226 + i * 34, 64, 11, i < state.wanted);
    }
    text(state.wanted > 0 ? 'WANTED' : 'CLEAN', VIEW.width - 40, 88, 13, state.wanted > 0 ? '#ff8a7a' : PALETTE.hudMuted, 'right');
  }

  function drawVitals(state) {
    panel(16, 16, 250, state.playerCar ? 92 : 64);
    const p = state.player;
    text('HEALTH', 28, 40, 13, PALETTE.hudMuted);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(28, 48, 226, 10);
    ctx.fillStyle = p.hp > 30 ? '#7de07a' : '#ff5a4e';
    ctx.fillRect(28, 48, 226 * Math.max(0, p.hp / 100), 10);
    if (state.playerCar) {
      const car = state.playerCar;
      text(`${car.def.name.toUpperCase()}  ·  ${Math.round(Math.abs(car.speed) * 0.12)} mph`, 28, 82, 13, PALETTE.hudMuted);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(28, 90, 226, 8);
      ctx.fillStyle = car.hp > 40 ? '#4fc3f7' : '#ff5a4e';
      ctx.fillRect(28, 90, 226 * Math.max(0, car.hp / 100), 8);
    }
  }

  function drawMissionLine(state, world) {
    const target = missionTarget(world);
    const mission = state.mission;
    let line = '';
    let sub = '';
    if (mission) {
      const def = MISSION_LIST.find((m) => m.id === mission.id);
      line = `${def.title}  ·  $${def.reward}`;
      sub = target ? target.label : '';
      if (mission.id === 'm3') sub += `  ·  ${Math.ceil(mission.timer)}s left`;
      if (mission.id === 'm5' && mission.step === 1) sub += `  ·  ${Math.min(3, mission.data.vault ?? 0).toFixed(1)}s`;
    } else if (state.storyComplete) {
      line = 'Story complete — free roam';
      sub = state.fare ? 'Fare in progress' : 'Steal cars, run fares, find the 15 hidden packages.';
    } else {
      line = 'Rico will call soon…';
      sub = 'Explore Solmar Bay while you wait.';
    }
    panel(16, 116, 430, 56);
    boldText(line, 28, 140, 17, '#ffd23a');
    text(sub, 28, 162, 14, PALETTE.hudText);
  }

  function drawMinimap(state, world) {
    const sx = MAP.w / WORLD.width;
    const sy = MAP.h / WORLD.height;
    panel(MAP.x - 6, MAP.y - 6, MAP.w + 12, MAP.h + 12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP.x, MAP.y, MAP.w, MAP.h);
    ctx.clip();
    ctx.fillStyle = '#5da24e';
    ctx.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
    // Water and sand.
    ctx.fillStyle = '#2fa8c9';
    ctx.fillRect(MAP.x + 3480 * sx, MAP.y, 120 * sx, MAP.h);
    ctx.fillRect(MAP.x + 2800 * sx, MAP.y + 2350 * sy, 800 * sx, 250 * sy);
    ctx.fillStyle = '#f0d193';
    ctx.fillRect(MAP.x + 3300 * sx, MAP.y, 180 * sx, 2350 * sy);
    // Roads.
    ctx.fillStyle = '#3a3a46';
    for (const ax of [400, 1000, 1600, 2200, 2800, 3200]) ctx.fillRect(MAP.x + (ax - 60) * sx, MAP.y, 120 * sx, MAP.h);
    for (const sy2 of [350, 800, 1250, 1700, 2150]) ctx.fillRect(MAP.x, MAP.y + (sy2 - 50) * sy, MAP.w, 100 * sy);
    // Buildings.
    ctx.fillStyle = '#8f8a80';
    for (const b of world.city.buildings) ctx.fillRect(MAP.x + b.x * sx, MAP.y + b.y * sy, b.w * sx, b.h * sy);
    // Blips: packages green, mission yellow, cops red, player white.
    const blip = (x, y, r, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(MAP.x + x * sx, MAP.y + y * sy, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const h of state.hidden) if (!h.found) blip(h.x, h.y, 2.5, PALETTE.blipPackage);
    const target = missionTarget(world);
    if (target) {
      blip(target.x, target.y, 5, PALETTE.blipMission);
      ctx.strokeStyle = PALETTE.blipMission;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(MAP.x + target.x * sx, MAP.y + target.y * sy, 8 + Math.sin(state.elapsed * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const cop of state.cops) blip(cop.x, cop.y, 3, PALETTE.blipPolice);
    for (const car of state.cars) if (car.driver === 'police') blip(car.x, car.y, 3.5, PALETTE.blipPolice);
    // The player: a white dot with a black ring, always on top.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(MAP.x + state.player.x * sx, MAP.y + state.player.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#20242e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(MAP.x + state.player.x * sx, MAP.y + state.player.y * sy, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    text(state.district.toUpperCase(), MAP.x, MAP.y + MAP.h + 22, 13, PALETTE.hudText);
  }

  function drawToastAndBanner(state) {
    if (state.toast) {
      ctx.font = `15px ${FONT}`;
      const w = ctx.measureText(state.toast.text).width + 28;
      panel((VIEW.width - w) / 2, VIEW.height - 118, w, 34);
      text(state.toast.text, VIEW.width / 2, VIEW.height - 95, 15, PALETTE.hudText, 'center');
    }
    if (state.banner) {
      const b = state.banner;
      panel(VIEW.width / 2 - 320, 190, 640, 96);
      boldText(b.title, VIEW.width / 2, 228, 30, '#ffd23a', 'center');
      ctx.font = `16px ${FONT}`;
      const words = b.text.split(' ');
      const lines = [''];
      for (const word of words) {
        if ((lines[lines.length - 1] + ' ' + word).trim().length > 62) lines.push(word);
        else lines[lines.length - 1] = `${lines[lines.length - 1]} ${word}`.trim();
      }
      lines.slice(0, 2).forEach((line, i) => text(line, VIEW.width / 2, 258 + i * 22, 16, PALETTE.hudText, 'center'));
    }
  }

  /** An off-screen arrow pointing at the mission marker, with the distance. */
  function drawEdgeArrow(state, world) {
    const target = missionTarget(world);
    if (!target) return;
    const cam = state.camera;
    const dx = target.x - cam.x;
    const dy = target.y - cam.y;
    if (Math.abs(dx) < VIEW.width / 2 - 40 && Math.abs(dy) < VIEW.height / 2 - 40) return;
    const angle = Math.atan2(dy, dx);
    const ex = VIEW.width / 2 + Math.cos(angle) * (VIEW.width / 2 - 70);
    const ey = VIEW.height / 2 + Math.sin(angle) * (VIEW.height / 2 - 70);
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const dist = Math.round(Math.hypot(dx, dy));
    text(`${dist}m`, ex, ey + 30, 13, '#ffd23a', 'center');
  }

  function drawControlsHint() {
    text('WASD drive / walk · E enter car · Space punch / handbrake · Shift run · Esc pause · M mute', VIEW.width - 24, VIEW.height - 24, 13, 'rgba(244,246,248,0.6)', 'right');
  }

  function drawPanelBox(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 30;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    panel(x, y, width, height);
    boldText(title, VIEW.width / 2, y + 62, 44, accent ?? '#ffd23a', 'center');
    lines.forEach((line, i) => text(line, VIEW.width / 2, y + 108 + i * 30, 17, PALETTE.hudText, 'center'));
    boldText(prompt, VIEW.width / 2, y + height - 30, 18, '#7de07a', 'center');
  }

  function draw(state, world, screen, save) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    const ox = (canvas.width - VIEW.width * scale) / 2;
    const oy = (canvas.height - VIEW.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    if (screen === SCREEN_TITLE) {
      drawPanelBox('SOLMAR BAY', [
        'A sun-soaked open-world crime game. Steal cars, outrun the SBPD,',
        'run jobs for Rico — and pull off the Bay Heist.',
        '',
        save ? `Welcome back — $${save.cash.toLocaleString('en-US')} in your pocket, ${save.missionsDone.length}/5 jobs done.` : 'New in town. $100 in your pocket and the whole city ahead.',
      ], 'Press Space or click to play  ·  H for how to play');
      return;
    }
    drawStars(state);
    drawVitals(state);
    drawMissionLine(state, world);
    drawMinimap(state, world);
    drawToastAndBanner(state);
    drawEdgeArrow(state, world);
    drawControlsHint();
    if (screen === SCREEN_PAUSED) {
      drawPanelBox('PAUSED', ['The city waits for no one — except now.'], 'Press P or Esc to resume');
    } else if (screen === SCREEN_HELP) {
      drawPanelBox('HOW TO PLAY', [
        'WASD / arrows — walk and drive · Shift — run / boost',
        'E — get in or out of a car · Space — punch, or handbrake in a car',
        'Steal cars, follow the yellow marker, finish all five jobs.',
        'Stars mean the SBPD is after you. Hide, or visit Spray \'n\' Go.',
        'Find the 15 green hidden packages. Taxis pay fares after the taxi job.',
      ], 'Press H or Esc to go back');
    }
  }

  return { draw };
}
