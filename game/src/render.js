// Drawing only: the world state in, pixels out. The camera shows a 1280x720
// window onto the 3600x2600 city, scaled to fit the browser window. Everything
// is flat vector shapes with a warm sun-soaked palette; buildings get a drop
// shadow and a south wall so the city reads as solid from above.
import { AVENUES, AVENUE_W, FONT, PALETTE, STREETS, STREET_W, VIEW, WORLD } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left') {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    ctx.font = fonts.get(size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }
  function circle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function drawGround(state, city) {
    const cam = state.camera;
    const vx0 = cam.x - VIEW.width / 2 - 40;
    const vy0 = cam.y - VIEW.height / 2 - 40;
    const vx1 = cam.x + VIEW.width / 2 + 40;
    const vy1 = cam.y + VIEW.height / 2 + 40;
    // Grass base.
    rect(vx0, vy0, vx1 - vx0, vy1 - vy0, PALETTE.grass);
    // Dry patches for texture.
    ctx.fillStyle = PALETTE.grassDry;
    for (let i = 0; i < 40; i += 1) {
      const px = ((i * 977) % WORLD.width);
      const py = ((i * 571) % WORLD.height);
      if (px > vx0 && px < vx1 && py > vy0 && py < vy1) {
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(px, py, 26 + (i % 5) * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // Beach sand and sea.
    rect(city.sand.x, 0, city.sand.w, city.sand.h, PALETTE.sand);
    for (const w of city.water) {
      rect(w.x, w.y, w.w, w.h, PALETTE.water);
      rect(w.x, w.y, w.w, 26, PALETTE.waterDeep);
    }
    // Foam line where the sea meets the sand.
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const wave = Math.sin(state.elapsed * 1.4) * 3;
    ctx.moveTo(3480 + wave, Math.max(vy0, 0));
    ctx.lineTo(3480 + wave, Math.min(vy1, 2350));
    ctx.stroke();
    // Parks.
    for (const park of city.parks) {
      rect(park.x, park.y, park.w, park.h, PALETTE.park);
    }
    // Piers.
    for (const pier of city.piers) {
      rect(pier.x, pier.y, pier.w, pier.h, '#a87c4f');
      ctx.strokeStyle = '#8a653c';
      ctx.lineWidth = 2;
      for (let y = pier.y + 12; y < pier.y + pier.h; y += 18) {
        ctx.beginPath();
        ctx.moveTo(pier.x, y);
        ctx.lineTo(pier.x + pier.w, y);
        ctx.stroke();
      }
    }
    // Sidewalks: pale bands along every road.
    for (const ax of AVENUES) rect(ax - AVENUE_W / 2 - 16, 0, AVENUE_W + 32, WORLD.height, PALETTE.sidewalk);
    for (const sy of STREETS) rect(0, sy - STREET_W / 2 - 16, WORLD.width, STREET_W + 32, PALETTE.sidewalk);
    // Asphalt.
    for (const ax of AVENUES) rect(ax - AVENUE_W / 2, 0, AVENUE_W, WORLD.height, PALETTE.road);
    for (const sy of STREETS) rect(0, sy - STREET_W / 2, WORLD.width, STREET_W, PALETTE.road);
    // Lane dashes down the avenues and along the streets.
    ctx.fillStyle = PALETTE.lane;
    for (const ax of AVENUES) {
      for (let y = 30; y < WORLD.height; y += 64) {
        if (y > vy0 && y < vy1) ctx.fillRect(ax - 2, y, 4, 34);
      }
    }
    for (const sy of STREETS) {
      for (let x = 30; x < WORLD.width; x += 64) {
        if (x > vx0 && x < vx1) ctx.fillRect(x, sy - 2, 34, 4);
      }
    }
    // Street names, painted on the asphalt.
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#e8e4da';
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('OCEAN AVE', 3200, 620);
    ctx.fillText('MAIN ST', 1900, 1250);
    ctx.fillText('BAY ST', 1900, 2150);
    ctx.restore();
  }

  function drawBuildings(state, city) {
    const cam = state.camera;
    const vx0 = cam.x - VIEW.width / 2 - 120;
    const vy0 = cam.y - VIEW.height / 2 - 120;
    const vx1 = cam.x + VIEW.width / 2 + 120;
    const vy1 = cam.y + VIEW.height / 2 + 120;
    for (const b of city.buildings) {
      if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
      const h = b.height * 7;
      // Drop shadow and the south wall, so height reads from above.
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(b.x + 9, b.y + 11 + h, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x, b.y + b.h, b.w, h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Roof furniture: a darker inset and an AC box or two.
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, 14, 10);
      ctx.fillRect(b.x + b.w * 0.65, b.y + b.h * 0.6, 14, 10);
      if (b.roof === PALETTE.glass) {
        ctx.fillStyle = PALETTE.glassHi;
        for (let i = 0; i < 3; i += 1) ctx.fillRect(b.x + 10 + i * 16, b.y + 10, 8, b.h - 20);
      }
    }
    // Trees.
    for (const t of city.trees) {
      if (t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
      circle(t.x + 4, t.y + 5, t.r, 'rgba(0,0,0,0.25)');
      circle(t.x, t.y, t.r, PALETTE.tree);
      circle(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.55, '#3f9a4c');
    }
  }

  function drawCarShape(car, isPlayer) {
    const def = car.def;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-def.len / 2 + 4, -def.wid / 2 + 5, def.len, def.wid);
    // Wheels.
    ctx.fillStyle = '#15151a';
    const wl = def.len / 2 - 12;
    const ww = def.wid / 2 + 1;
    ctx.fillRect(-wl, -ww - 2, 16, 6);
    ctx.fillRect(wl - 8, -ww - 2, 16, 6);
    ctx.fillRect(-wl, ww - 4, 16, 6);
    ctx.fillRect(wl - 8, ww - 4, 16, 6);
    // Body.
    ctx.fillStyle = car.color;
    ctx.beginPath();
    const r = 8;
    ctx.roundRect(-def.len / 2, -def.wid / 2, def.len, def.wid, r);
    ctx.fill();
    // Windshield and rear window.
    ctx.fillStyle = 'rgba(20,30,44,0.85)';
    ctx.fillRect(def.len * 0.18, -def.wid / 2 + 4, def.len * 0.14, def.wid - 8);
    ctx.fillRect(-def.len * 0.32, -def.wid / 2 + 4, def.len * 0.1, def.wid - 8);
    // Taxi checker band, police light bar, sports stripe.
    if (car.type === 'taxi') {
      ctx.fillStyle = '#20242e';
      for (let x = -def.len / 2 + 6; x < def.len / 2 - 6; x += 12) ctx.fillRect(x, -3, 6, 6);
    }
    if (car.type === 'police') {
      ctx.fillStyle = '#f4f6f8';
      ctx.fillRect(-def.len * 0.08, -def.wid / 2 + 3, def.len * 0.16, def.wid - 6);
      const flash = Math.floor(Date.now() / 300) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#2f6fd0';
      ctx.beginPath();
      ctx.arc(0, -def.wid / 2 + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? '#2f6fd0' : '#ff3b30';
      ctx.beginPath();
      ctx.arc(0, def.wid / 2 - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (car.type === 'sports') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(-def.len / 2 + 4, -2, def.len - 8, 4);
    }
    // Headlights and brake lights.
    ctx.fillStyle = '#fff8c9';
    ctx.fillRect(def.len / 2 - 3, -def.wid / 2 + 3, 3, 5);
    ctx.fillRect(def.len / 2 - 3, def.wid / 2 - 8, 3, 5);
    ctx.fillStyle = car.brakeLight ? '#ff2e1f' : '#a33';
    ctx.fillRect(-def.len / 2, -def.wid / 2 + 3, 3, 5);
    ctx.fillRect(-def.len / 2, def.wid / 2 - 8, 3, 5);
    ctx.restore();
    if (isPlayer) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(car.x, car.y, def.len / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (car.hp < 45 && car.hp > 0) {
      const puff = Math.sin(Date.now() / 160) * 2;
      circle(car.x + Math.cos(car.angle) * def.len * 0.3, car.y + Math.sin(car.angle) * def.len * 0.3 + puff, 7, 'rgba(90,90,90,0.55)');
    }
  }

  function drawPedShape(ped, isCop) {
    if (ped.mood === 'down') {
      ctx.save();
      ctx.translate(ped.x, ped.y);
      ctx.rotate(ped.angle);
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(14, 0, 6, ped.skin);
      ctx.restore();
      return;
    }
    // Shadow, body, head, and a nose tick for direction.
    circle(ped.x + 2, ped.y + 3, 13, 'rgba(0,0,0,0.28)');
    circle(ped.x, ped.y, 12, ped.shirt);
    circle(ped.x + Math.cos(ped.angle) * 4, ped.y + Math.sin(ped.angle) * 4, 6, ped.skin);
    if (isCop) {
      circle(ped.x, ped.y - 3, 6, PALETTE.copBlue);
      text('★', ped.x, ped.y - 12, 10, PALETTE.copBlue, 'center');
    }
  }

  function drawMarker(x, y, label, pulse) {
    const r = 26 + Math.sin(pulse * 4) * 4;
    ctx.strokeStyle = PALETTE.marker;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.marker;
    ctx.save();
    ctx.translate(x, y - 34);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
    if (label) {
      ctx.font = `bold 15px ${FONT}`;
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(12,14,20,0.78)';
      ctx.fillRect(x - w / 2, y - 78, w, 24);
      text(label, x, y - 61, 15, '#ffd23a', 'center');
    }
  }

  function drawWorld(state, city, missionTarget) {
    const cam = state.camera;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.save();
    ctx.translate(VIEW.width / 2 - cam.x, VIEW.height / 2 - cam.y);
    drawGround(state, city);
    // Skid marks.
    ctx.strokeStyle = 'rgba(20,20,26,0.5)';
    ctx.lineWidth = 5;
    for (const s of state.skids) {
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.angle) * 10, s.y - Math.sin(s.angle) * 10);
      ctx.lineTo(s.x + Math.cos(s.angle) * 10, s.y + Math.sin(s.angle) * 10);
      ctx.stroke();
    }
    drawBuildings(state, city);
    // Mission marker and package blips on the ground.
    if (missionTarget) drawMarker(missionTarget.x, missionTarget.y, missionTarget.label, state.elapsed);
    for (const pkg of state.runPackages) {
      if (pkg.taken) continue;
      circle(pkg.x, pkg.y, 12, '#ffd23a');
      circle(pkg.x, pkg.y, 6, '#b8860b');
      text('$', pkg.x, pkg.y + 5, 14, '#20242e', 'center');
    }
    for (const h of state.hidden) {
      if (h.found) continue;
      const d = Math.hypot(h.x - state.player.x, h.y - state.player.y);
      if (d > 320) continue; // hidden until you are close
      circle(h.x, h.y, 9, PALETTE.blipPackage);
      text('?', h.x, h.y + 4, 12, '#0e3a1e', 'center');
    }
    for (const drop of state.cashDrops) {
      ctx.save();
      ctx.translate(drop.x, drop.y);
      ctx.rotate(Math.sin(state.elapsed * 3 + drop.x) * 0.3);
      rect(-9, -6, 18, 12, '#7de07a');
      ctx.strokeStyle = '#2f7d3a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-9, -6, 18, 12);
      ctx.restore();
    }
    // Landmark name plates, kept out of the HUD's corners.
    for (const key of ['garage', 'bank', 'hospital', 'police', 'paynspray', 'hideout', 'marina']) {
      const lm = city.landmarks[key];
      if (Math.hypot(lm.x - cam.x, lm.y - cam.y) > 700) continue;
      const sx = lm.x - cam.x + VIEW.width / 2;
      const sy = lm.y - 58 - cam.y + VIEW.height / 2;
      if (sy < 190 || sy > 640 || sx < 40 || sx > 1240) continue;
      if (sx < 300 && sy > 480) continue; // the minimap lives bottom-left
      ctx.font = `bold 14px ${FONT}`;
      const w = ctx.measureText(lm.name).width + 14;
      ctx.fillStyle = 'rgba(12,14,20,0.66)';
      ctx.fillRect(lm.x - w / 2, lm.y - 58, w, 22);
      text(lm.name, lm.x, lm.y - 43, 14, '#f4f6f8', 'center');
    }
    // Cars, sorted so nearer ones overlap farther ones; peds; player.
    const cars = [...state.cars].sort((a, b) => a.y - b.y);
    for (const car of cars) {
      if (Math.hypot(car.x - cam.x, car.y - cam.y) > 760) continue;
      drawCarShape(car, car === state.playerCar);
    }
    for (const ped of state.peds) {
      if (Math.hypot(ped.x - cam.x, ped.y - cam.y) > 760) continue;
      drawPedShape(ped, false);
    }
    for (const cop of state.cops) {
      if (Math.hypot(cop.x - cam.x, cop.y - cam.y) > 760) continue;
      drawPedShape(cop, true);
    }
    const p = state.player;
    if (!p.inCar) {
      // The player on foot: coral shirt, white ring, punch swing.
      circle(p.x + 2, p.y + 3, 14, 'rgba(0,0,0,0.3)');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      circle(p.x, p.y, 13, PALETTE.player);
      circle(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6.5, '#f2c89b');
      if (p.punchAnim > 0) {
        ctx.strokeStyle = '#ffd23a';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 26, p.angle - 0.7, p.angle + 0.7);
        ctx.stroke();
      }
      if (p.hurtTimer > 0) {
        ctx.strokeStyle = 'rgba(255,60,40,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Particles.
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      circle(pt.x, pt.y, pt.size, pt.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  resize();
  window.addEventListener('resize', resize);
  return { drawWorld, ctx, view };
}
