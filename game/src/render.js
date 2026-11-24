// Solmar Bay — canvas rendering: city, cars, people, effects, HUD,
// minimap, title / pause / help screens and off-screen objective arrows.
import { WORLD_W, WORLD_H, AVENUES, STREETS, ROAD_W, DISTRICTS, BEACH_X,
  SEA_X, PLACES, CAR_TYPES } from './config.js';
import { districtAt, isOnRoad } from './world.js';
import { missionObjectiveText, currentMission } from './missions.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0 };
    this.zoom = 1;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = this.canvas.clientWidth;
    this.viewH = this.canvas.clientHeight;
  }

  render(game, dt) {
    const ctx = this.ctx;
    const W = this.viewW, H = this.viewH;
    const player = game.player;
    const focus = player.inCar || player;
    // Smooth camera follow.
    const tx = focus.x - W / 2, ty = focus.y - H / 2;
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 6);
    this.cam.x = Math.max(-80, Math.min(WORLD_W - W + 80, this.cam.x));
    this.cam.y = Math.max(-80, Math.min(WORLD_H - H + 80, this.cam.y));

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-this.cam.x, -this.cam.y);
    this.drawGround(ctx, game);
    this.drawRoads(ctx);
    this.drawParkAndLot(ctx);
    this.drawMarina(ctx, game);
    this.drawBuildings(ctx, game);
    this.drawTrees(ctx, game);
    this.drawSprayShop(ctx);
    this.drawMarkers(ctx, game);
    this.drawPackages(ctx, game);
    this.drawCashDrops(ctx, game);
    this.drawCars(ctx, game);
    this.drawPeds(ctx, game);
    this.drawCops(ctx, game);
    this.drawPlayer(ctx, game);
    this.drawParticles(ctx, game);
    ctx.restore();

    if (game.state === 'title') this.drawTitle(ctx, game, W, H);
    else if (game.state === 'paused') this.drawPaused(ctx, game, W, H);
    else if (game.state === 'help') this.drawHelp(ctx, game, W, H);
    else {
      this.drawHUD(ctx, game, W, H);
      this.drawMinimap(ctx, game, W, H);
      this.drawOffscreenArrow(ctx, game, W, H);
      this.drawToasts(ctx, game, W, H);
      if (game.flashTimer > 0) this.drawFlash(ctx, game, W, H);
    }
  }

  drawGround(ctx, game) {
    // Base ground first: the district rects do not tile the whole world,
    // so the middle band would otherwise stay canvas-black.
    ctx.fillStyle = '#75705f';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    // District ground colours.
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }
    // Beach sand and sea.
    ctx.fillStyle = '#ecd9a0';
    ctx.fillRect(BEACH_X, 0, SEA_X - BEACH_X, WORLD_H);
    ctx.fillStyle = '#2a6ea8';
    ctx.fillRect(SEA_X, 0, WORLD_W - SEA_X, WORLD_H);
    ctx.fillStyle = '#3a82b8';
    for (let y = 40; y < WORLD_H; y += 160) {
      ctx.fillRect(SEA_X + 30, y, 190, 5);
      ctx.fillRect(SEA_X + 90, y + 80, 140, 5);
    }
    // Sidewalk tint around roads is drawn by the road pass.
  }

  drawRoads(ctx) {
    ctx.fillStyle = '#3c3c40';
    for (const ax of AVENUES) ctx.fillRect(ax - ROAD_W / 2, 0, ROAD_W, WORLD_H);
    for (const sy of STREETS) ctx.fillRect(0, sy - ROAD_W / 2, WORLD_W, ROAD_W);
    // Centre dashes.
    ctx.fillStyle = '#d8c860';
    for (const ax of AVENUES) {
      for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(ax - 2, y, 4, 30);
    }
    for (const sy of STREETS) {
      for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x, sy - 2, 30, 4);
    }
    // Crosswalks at every intersection.
    ctx.fillStyle = '#d8d8d8';
    for (const ax of AVENUES) {
      for (const sy of STREETS) {
        for (let i = -3; i <= 3; i++) {
          ctx.fillRect(ax + i * 12 - 4, sy - ROAD_W / 2 + 6, 8, 14);
          ctx.fillRect(ax + i * 12 - 4, sy + ROAD_W / 2 - 20, 8, 14);
        }
      }
    }
  }

  drawParkAndLot(ctx) {
    const park = PLACES.park;
    ctx.fillStyle = '#4a7a3a';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = '#5a8a4a';
    ctx.fillRect(park.x + 40, park.y + 40, park.w - 80, park.h - 80);
    ctx.fillStyle = '#6a9a5a';
    ctx.beginPath();
    ctx.ellipse(park.x + park.w / 2, park.y + park.h / 2, 90, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PALM PARK', park.x + park.w / 2, park.y + 26);
    const lot = PLACES.parkingLot;
    ctx.fillStyle = '#55555c';
    ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.strokeRect(lot.x + 30 + i * 58, lot.y + 40, 44, 90);
      ctx.strokeRect(lot.x + 30 + i * 58, lot.y + lot.h - 130, 44, 90);
    }
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText('DOWNTOWN LOT', lot.x + lot.w / 2, lot.y + 26);
  }

  drawMarina(ctx, game) {
    // The bay water in the south-east corner.
    ctx.fillStyle = '#2a6ea8';
    ctx.fillRect(2620, 2080, 980, 520);
    ctx.fillStyle = '#8a6a44';
    for (let i = 0; i < 4; i++) ctx.fillRect(2700 + i * 130, 2140, 90, 14);
    ctx.fillStyle = '#c8a060';
    ctx.fillRect(2620, 2080, 980, 18);
    for (const boat of game.city.boats) {
      ctx.save();
      ctx.translate(boat.x, boat.y);
      ctx.rotate(boat.angle);
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(-34, -12, 68, 24);
      ctx.fillStyle = '#3a6ab5';
      ctx.fillRect(-10, -20, 20, 8);
      ctx.restore();
    }
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MARINA', 2880, 2120);
  }

  drawBuildings(ctx, game) {
    for (const b of game.city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      // Windows along the edges.
      ctx.fillStyle = '#ffe9a0';
      const cols = Math.max(2, Math.floor(b.w / 34));
      const rows = Math.max(2, Math.floor(b.h / 34));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if ((i + j) % 3 === 0) continue;
          ctx.fillRect(b.x + 12 + i * 32, b.y + 12 + j * 32, 12, 14);
        }
      }
      if (b.tall) {
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 8, 16, 16);
      }
    }
  }

  drawTrees(ctx, game) {
    for (const t of game.city.trees) {
      ctx.fillStyle = '#7a5a34';
      ctx.fillRect(t.x - 2, t.y - 2, 4, 10);
      ctx.fillStyle = '#2f7a2f';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 6, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f9a3f';
      ctx.beginPath();
      ctx.arc(t.x - 4, t.y - 9, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSprayShop(ctx) {
    const s = PLACES.spray;
    ctx.fillStyle = '#c83232';
    ctx.fillRect(s.x - 70, s.y - 46, 140, 92);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(s.x - 70, s.y - 46, 140, 26);
    ctx.fillStyle = '#20242c';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("PAY 'N SPRAY", s.x, s.y - 28);
    ctx.fillStyle = '#ffd23c';
    ctx.font = '11px sans-serif';
    ctx.fillText('$100 — clears wanted', s.x, s.y + 30);
  }

  drawMarkers(ctx, game) {
    const m = game.missions;
    const drawMarker = (x, y, color, label) => {
      const bob = Math.sin(game.time * 3) * 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y - 34 + bob);
      ctx.lineTo(x - 11, y - 12 + bob);
      ctx.lineTo(x + 11, y - 12 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (label) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - 42 + bob);
      }
    };
    if (m.target) drawMarker(m.target.x, m.target.y, '#ffd23c', m.target.label);
    drawMarker(PLACES.garage.x, PLACES.garage.y, '#3ab5a8', "Rico's Garage");
    drawMarker(PLACES.hideout.x, PLACES.hideout.y, '#7a3ab5', 'Hideout');
  }

  drawPackages(ctx, game) {
    for (const pkg of game.city.packages) {
      if (pkg.taken) continue;
      const bob = Math.sin(game.time * 4 + pkg.x) * 3;
      ctx.fillStyle = '#39d353';
      ctx.beginPath();
      ctx.arc(pkg.x, pkg.y + bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', pkg.x, pkg.y + bob + 4);
    }
  }

  drawCashDrops(ctx, game) {
    for (const d of game.cashDrops) {
      ctx.fillStyle = '#39d353';
      ctx.fillRect(d.x - 9, d.y - 6, 18, 12);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$' + d.amount, d.x, d.y + 3);
    }
  }

  drawCarShape(ctx, car, withLights) {
    const def = CAR_TYPES[car.type];
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-def.w / 2 + 3, -def.h / 2 + 4, def.w, def.h);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-def.w / 2, -def.h / 2, def.w, def.h, 6);
    ctx.fill();
    // Cabin and windshield.
    ctx.fillStyle = '#1c2733';
    ctx.beginPath();
    ctx.roundRect(-def.w / 6, -def.h / 2 + 4, def.w / 3, def.h - 8, 3);
    ctx.fill();
    ctx.fillStyle = '#8fd0e8';
    ctx.fillRect(def.w / 6, -def.h / 2 + 5, 4, def.h - 10);
    // Wheels.
    ctx.fillStyle = '#181818';
    const wx = def.w / 2 - 9, wy = def.h / 2 - 1;
    ctx.fillRect(wx - 8, -wy - 4, 12, 5);
    ctx.fillRect(wx - 8, wy - 1, 12, 5);
    ctx.fillRect(-wx - 4, -wy - 4, 12, 5);
    ctx.fillRect(-wx - 4, wy - 1, 12, 5);
    if (car.type === 'taxi') {
      ctx.fillStyle = '#ffd23c';
      ctx.fillRect(-6, -def.h / 2 + 2, 12, 5);
      ctx.fillStyle = '#20242c';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, -def.h / 2 + 7);
    }
    if (car.type === 'police') {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-def.w / 2 + 4, -def.h / 2 + 3, def.w - 8, 4);
      ctx.fillStyle = '#c83232';
      ctx.fillRect(-4, -def.h / 2 - 3, 8, 4);
      ctx.fillStyle = '#3a6ab5';
      ctx.fillRect(4, -def.h / 2 - 3, 8, 4);
      if (withLights && Math.floor(game.time * 4) % 2 === 0) {
        ctx.fillStyle = 'rgba(200,50,50,0.5)';
        ctx.beginPath(); ctx.arc(-10, 0, 16, 0, Math.PI * 2); ctx.fill();
      } else if (withLights) {
        ctx.fillStyle = 'rgba(60,120,220,0.5)';
        ctx.beginPath(); ctx.arc(10, 0, 16, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (car.brakeLight) {
      ctx.fillStyle = '#ff2a2a';
      ctx.fillRect(-def.w / 2 - 2, -def.h / 2 + 3, 3, 6);
      ctx.fillRect(-def.w / 2 - 2, def.h / 2 - 9, 3, 6);
    }
    if (car.smoke > 0.1) {
      ctx.fillStyle = 'rgba(120,120,120,' + (0.5 * car.smoke) + ')';
      ctx.beginPath();
      ctx.arc(-def.w / 2 - 8, 0, 8 + car.smoke * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawCars(ctx, game) {
    const all = [...game.city.parked, ...game.traffic, ...game.policeCars];
    if (game.player.inCar) all.push(game.player.inCar);
    const seen = new Set();
    for (const car of all) {
      if (!car || seen.has(car.id)) continue;
      seen.add(car.id);
      this.drawCarShape(ctx, car, car.isPolice);
    }
  }

  drawPerson(ctx, x, y, angle, skin, shirt, walkPhase, down, label) {
    ctx.save();
    ctx.translate(x, y);
    if (down > 0) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shirt;
      ctx.fillRect(-14, -6, 22, 12);
      ctx.restore();
      return;
    }
    const swing = Math.sin(walkPhase) * 4;
    ctx.rotate(angle);
    // Legs.
    ctx.strokeStyle = '#2a2a30';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(-swing, 10);
    ctx.moveTo(0, -2); ctx.lineTo(swing, 10);
    ctx.stroke();
    // Body and head.
    ctx.fillStyle = shirt;
    ctx.fillRect(-6, -6, 14, 12);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(8, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20242c';
    ctx.beginPath(); ctx.arc(9, -2, 5, 0, Math.PI); ctx.fill();
    ctx.restore();
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 16);
    }
  }

  drawPeds(ctx, game) {
    for (const p of game.peds) {
      this.drawPerson(ctx, p.x, p.y, p.angle, p.skin, p.shirt, p.walkPhase, p.down, null);
    }
  }

  drawCops(ctx, game) {
    for (const cop of game.cops) {
      this.drawPerson(ctx, cop.x, cop.y, cop.angle, '#e8c090', '#20242c', game.time * 10, cop.down, null);
      // Badge dot and cap.
      if (cop.down <= 0) {
        ctx.fillStyle = '#ffd23c';
        ctx.beginPath(); ctx.arc(cop.x, cop.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  drawPlayer(ctx, game) {
    const p = game.player;
    if (p.inCar) return; // driver is inside the car shape
    if (p.arrested > 0) {
      ctx.fillStyle = '#ffd23c';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ARRESTED', p.x, p.y - 24);
    }
    this.drawPerson(ctx, p.x, p.y, p.angle, '#e8c090', '#e84a4a', p.walkPhase, 0, null);
    if (p.punchTimer > 0) {
      ctx.fillStyle = '#e8c090';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawParticles(ctx, game) {
    for (const pt of game.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
      ctx.globalAlpha = 1;
    }
  }

  // ---- HUD and screens (screen space) ----

  drawHUD(ctx, game, W, H) {
    const p = game.player;
    // Health + car condition, top-left.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(12, 12, 220, 64, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SOLMAR BAY', 22, 32);
    this.bar(ctx, 22, 40, 180, 10, p.hp / 100, '#39d353');
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText('HP ' + Math.ceil(p.hp), 22, 66);
    if (p.inCar) {
      const def = CAR_TYPES[p.inCar.type];
      ctx.fillText(def.name + '  •  ' + Math.ceil(p.inCar.hp) + '%', 110, 66);
      this.bar(ctx, 110, 40, 92, 10, p.inCar.hp / 100, '#e8b820');
    }
    // Cash + wanted stars, top-right.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(W - 232, 12, 220, 64, 8); ctx.fill();
    ctx.fillStyle = '#39d353';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('$' + p.cash.toLocaleString('en-US'), W - 24, 38);
    ctx.font = '22px sans-serif';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < game.wanted.stars ? '★' : '☆';
    ctx.fillStyle = game.wanted.stars > 0 ? '#ffd23c' : '#888';
    ctx.fillText(stars, W - 24, 66);
    // Mission line, top-centre.
    const cur = currentMission(game.missions);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const label = cur ? ('MISSION ' + (game.missions.index + 1) + '/5 — ' + cur.name + '  ($' + cur.reward + ')') : 'FREE ROAM';
    ctx.font = 'bold 13px sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2 - 14, 12, tw + 28, 26, 8); ctx.fill();
    ctx.fillStyle = '#ffd23c';
    ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, 30);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#fff';
    const obj = missionObjectiveText(game);
    const ow = ctx.measureText(obj).width;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(W / 2 - ow / 2 - 12, 42, ow + 24, 24, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(obj, W / 2, 59);
    // District toast.
    if (game.zoneToastTimer > 0) {
      ctx.globalAlpha = Math.min(1, game.zoneToastTimer);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(game.zoneToast, W / 2, H - 130);
      ctx.globalAlpha = 1;
    }
    // Vault crack progress.
    if (game.missions.index === 4 && game.missions.stage === 'crack' && game.missions.vaultTimer > 0) {
      const v = game.missions.vaultTimer / 3;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 130, H / 2 + 60, 260, 22, 8); ctx.fill();
      this.bar(ctx, W / 2 - 124, H / 2 + 65, 248, 12, v, '#ffd23c');
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('CRACKING THE VAULT…', W / 2, H / 2 + 52);
    }
    // Controls hint, bottom-right.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(W - 330, H - 34, 318, 22, 8); ctx.fill();
    ctx.fillStyle = '#ddd';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('WASD move/drive • Space punch/brake • E enter car • P pause • H help', W - 20, H - 19);
  }

  bar(ctx, x, y, w, h, frac, color) {
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, w * Math.min(1, frac)), h, 4); ctx.fill();
  }

  drawMinimap(ctx, game, W, H) {
    const mw = 200, mh = 146;
    const x0 = 12, y0 = H - mh - 12;
    const sx = mw / WORLD_W, sy = mh / WORLD_H;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(x0, y0, mw, mh, 8); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, mw, mh); ctx.clip();
    ctx.fillStyle = '#4a5a4a';
    ctx.fillRect(x0, y0, mw, mh);
    ctx.fillStyle = '#2a6ea8';
    ctx.fillRect(x0 + SEA_X * sx, y0, mw - SEA_X * sx, mh);
    ctx.fillStyle = '#3c3c40';
    for (const ax of AVENUES) ctx.fillRect(x0 + ax * sx - 2, y0, 4, mh);
    for (const sy2 of STREETS) ctx.fillRect(x0, y0 + sy2 * sy - 2, mw, 4);
    ctx.fillStyle = '#6a6a72';
    for (const b of game.city.buildings) ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
    const dot = (x, y, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x0 + x * sx, y0 + y * sy, r, 0, Math.PI * 2); ctx.fill();
    };
    for (const pkg of game.city.packages) if (!pkg.taken) dot(pkg.x, pkg.y, '#39d353', 2);
    if (game.missions.target) dot(game.missions.target.x, game.missions.target.y, '#ffd23c', 5);
    dot(PLACES.spray.x, PLACES.spray.y, '#ff7ab8', 3);
    dot(PLACES.garage.x, PLACES.garage.y, '#3ab5a8', 3);
    for (const cop of game.cops) dot(cop.x, cop.y, '#ff3b30', 2.5);
    for (const car of game.policeCars) dot(car.x, car.y, '#ff3b30', 3);
    const p = game.player.inCar || game.player;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#20242c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SOLMAR BAY', x0 + 6, y0 + 13);
    ctx.fillStyle = '#9fd0ff';
    ctx.textAlign = 'right';
    ctx.fillText('SEA →', x0 + mw - 6, y0 + 13);
    ctx.textAlign = 'left';
  }

  drawOffscreenArrow(ctx, game, W, H) {
    const m = game.missions;
    if (!m.target || game.state !== 'playing') return;
    const t = m.target;
    const sx = t.x - this.cam.x, sy = t.y - this.cam.y;
    if (sx > 40 && sx < W - 40 && sy > 40 && sy < H - 40) return;
    const cx = Math.max(40, Math.min(W - 40, sx));
    const cy = Math.max(110, Math.min(H - 60, sy));
    const ang = Math.atan2(sy - cy, sx - cx);
    const dist = Math.round(Math.hypot(t.x - (game.player.inCar || game.player).x, t.y - (game.player.inCar || game.player).y));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dist + 'm', cx, cy + 28);
  }

  drawToasts(ctx, game, W, H) {
    ctx.textAlign = 'center';
    game.toasts.forEach((toast, i) => {
      ctx.globalAlpha = Math.min(1, toast.life);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      const tw = ctx.measureText(toast.text).width;
      ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2 - 12, H - 96 - i * 30, tw + 24, 22, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '13px sans-serif';
      ctx.fillText(toast.text, W / 2, H - 81 - i * 30);
      ctx.globalAlpha = 1;
    });
  }

  drawFlash(ctx, game, W, H) {
    ctx.globalAlpha = Math.min(1, game.flashTimer);
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.flashMessage, W / 2, H / 2 - 40);
    ctx.globalAlpha = 1;
  }

  panel(ctx, W, H, title, lines) {
    ctx.fillStyle = 'rgba(10,14,22,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, H / 2 - 110);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 - 60 + i * 28));
  }

  drawTitle(ctx, game, W, H) {
    this.panel(ctx, W, H, 'SOLMAR BAY', [
      'A top-down open-world crime game — explore the city, steal cars,',
      'outrun the cops and run five missions for Rico.',
      '',
      'WASD move / drive  •  Shift run  •  Space punch / handbrake',
      'E enter or exit a car  •  P pause  •  H help  •  M mute',
      '',
      game.hasSave ? 'SPACE — continue your saved game' : 'SPACE — start a new game',
      'N — new game',
      '',
      'Cash, missions and hidden packages save automatically.',
    ]);
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Packages found: ' + game.packagesFound + '/15   •   Missions done: ' +
      game.missions.done.filter(Boolean).length + '/5', W / 2, H / 2 + 170);
  }

  drawPaused(ctx, game, W, H) {
    this.panel(ctx, W, H, 'PAUSED', [
      'P or Esc — resume',
      'H — help',
      'M — ' + (game.audio.muted ? 'unmute sound' : 'mute sound'),
      '',
      'Progress saves automatically after every mission.',
    ]);
  }

  drawHelp(ctx, game, W, H) {
    this.panel(ctx, W, H, 'HOW TO PLAY', [
      'On foot: WASD to walk, Shift to run, Space to punch, E to enter a car.',
      'Driving: WASD to drive, Space is the handbrake, E to get out.',
      'Stealing a car with a driver, hitting people or ramming cops raises',
      'your wanted stars. Cops chase on foot and in cruisers.',
      'Hide for 10 seconds, then one star fades every 8 seconds.',
      "Pay 'n Spray ($100) clears your wanted level and repairs your car.",
      'Follow the yellow marker for Rico\'s missions. Green dots are hidden',
      'packages worth $100 each. After mission 3, taxi fares pay cash.',
      '',
      'H or Esc — back to the game',
    ]);
  }
}
