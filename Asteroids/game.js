const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const msgEl = document.getElementById('msg');

const SIZES = { 3: 46, 2: 26, 1: 15 };
const POINTS = { 3: 20, 2: 50, 1: 100 };
let ship, rocks, bullets, bits, score, lives, wave, over, keys = {}, fireCd = 0;

function wrap(o) {
  if (o.x < 0) o.x += W;
  if (o.x > W) o.x -= W;
  if (o.y < 0) o.y += H;
  if (o.y > H) o.y -= H;
}

function makeRock(x, y, size) {
  const n = 9 + ((Math.random() * 4) | 0);
  const verts = [];
  for (let i = 0; i < n; i++) verts.push({ a: i * 2 * Math.PI / n, d: 0.62 + Math.random() * 0.45 });
  const speed = (0.5 + Math.random() * 0.9) * (4 - size) * 0.55;
  const dir = Math.random() * Math.PI * 2;
  return {
    x, y, size, r: SIZES[size], verts,
    vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
    ang: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.02
  };
}

function rockPoints(r) {
  return r.verts.map(v => ({
    x: r.x + Math.cos(v.a + r.ang) * v.d * r.r,
    y: r.y + Math.sin(v.a + r.ang) * v.d * r.r
  }));
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function shipPoints(s) {
  const pts = [[18, 0], [-12, -11], [-7, 0], [-12, 11]];
  return pts.map(([x, y]) => ({
    x: s.x + x * Math.cos(s.ang) - y * Math.sin(s.ang),
    y: s.y + x * Math.sin(s.ang) + y * Math.cos(s.ang)
  }));
}

function spawnWave() {
  rocks = [];
  const count = 3 + wave;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = Math.random() * W;
      y = Math.random() * H;
    } while (Math.hypot(x - W / 2, y - H / 2) < 170);
    rocks.push(makeRock(x, y, 3));
  }
}

function resetShip() {
  ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, ang: -Math.PI / 2, thrusting: false, invuln: 2.5 };
}

function newGame() {
  score = 0; lives = 3; wave = 1; over = false;
  bullets = []; bits = [];
  scoreEl.textContent = 0; livesEl.textContent = 3; waveEl.textContent = 1;
  resetShip();
  spawnWave();
  msgEl.textContent = '← → to turn, ↑ to thrust, Space to fire.';
}

function burst(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 2.6;
    bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.6, color });
  }
}

function splitRock(i) {
  const r = rocks[i];
  score += POINTS[r.size];
  scoreEl.textContent = score;
  burst(r.x, r.y, 12, '#5fd6d6');
  rocks.splice(i, 1);
  if (r.size > 1) {
    rocks.push(makeRock(r.x, r.y, r.size - 1));
    rocks.push(makeRock(r.x, r.y, r.size - 1));
  }
  if (!rocks.length) {
    wave++;
    waveEl.textContent = wave;
    spawnWave();
    msgEl.textContent = `Wave ${wave}.`;
  }
}

function loseShip() {
  burst(ship.x, ship.y, 26, '#ff8080');
  lives--;
  livesEl.textContent = lives;
  if (lives <= 0) {
    over = true;
    msgEl.textContent = `Ship lost for good. Final score ${score}. Press Space to start again.`;
  } else {
    resetShip();
  }
}

function update(dt) {
  for (const b of bits) {
    b.x += b.vx; b.y += b.vy; b.life -= dt;
  }
  bits = bits.filter(b => b.life > 0);

  for (const r of rocks) {
    r.x += r.vx; r.y += r.vy; r.ang += r.spin;
    wrap(r);
  }

  if (over) return;

  if (keys.ArrowLeft) ship.ang -= 4.2 * dt;
  if (keys.ArrowRight) ship.ang += 4.2 * dt;
  ship.thrusting = !!keys.ArrowUp;
  if (ship.thrusting) {
    ship.vx += Math.cos(ship.ang) * 330 * dt;
    ship.vy += Math.sin(ship.ang) * 330 * dt;
  }
  const drag = Math.pow(0.6, dt);
  ship.vx *= drag; ship.vy *= drag;
  const sp = Math.hypot(ship.vx, ship.vy);
  if (sp > 400) { ship.vx = ship.vx / sp * 400; ship.vy = ship.vy / sp * 400; }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrap(ship);
  if (ship.invuln > 0) ship.invuln -= dt;

  fireCd -= dt;
  if (keys[' '] && fireCd <= 0 && bullets.length < 5) {
    bullets.push({
      x: ship.x + Math.cos(ship.ang) * 18,
      y: ship.y + Math.sin(ship.ang) * 18,
      vx: Math.cos(ship.ang) * 480 + ship.vx * 0.4,
      vy: Math.sin(ship.ang) * 480 + ship.vy * 0.4,
      life: 1.15
    });
    fireCd = 0.22;
  }

  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    wrap(b);
  }
  bullets = bullets.filter(b => b.life > 0);

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ri = rocks.length - 1; ri >= 0; ri--) {
      const r = rocks[ri];
      if (Math.hypot(b.x - r.x, b.y - r.y) > r.r * 1.1) continue;
      if (!pointInPoly(b.x, b.y, rockPoints(r))) continue;
      bullets.splice(bi, 1);
      splitRock(ri);
      break;
    }
  }

  if (ship.invuln <= 0) {
    const pts = shipPoints(ship);
    for (let ri = rocks.length - 1; ri >= 0; ri--) {
      const r = rocks[ri];
      if (Math.hypot(ship.x - r.x, ship.y - r.y) > r.r + 20) continue;
      const poly = rockPoints(r);
      const hit = pts.some(p => pointInPoly(p.x, p.y, poly)) || pointInPoly(r.x, r.y, pts);
      if (hit) { splitRock(ri); loseShip(); break; }
    }
  }
}

function draw() {
  ctx.fillStyle = '#07080d';
  ctx.fillRect(0, 0, W, H);

  for (const b of bits) {
    ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 1.6));
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#8fb8ff';
  ctx.lineWidth = 2;
  for (const r of rocks) {
    const pts = rockPoints(r);
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
  }

  ctx.fillStyle = '#e7e9f3';
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!over) {
    const blink = ship.invuln > 0 && ((performance.now() / 90) | 0) % 2 === 0;
    if (!blink) {
      const pts = shipPoints(ship);
      ctx.strokeStyle = '#5fd6d6';
      ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      if (ship.thrusting) {
        const back = { x: ship.x - Math.cos(ship.ang) * 10, y: ship.y - Math.sin(ship.ang) * 10 };
        const tip = { x: ship.x - Math.cos(ship.ang) * (18 + Math.random() * 10), y: ship.y - Math.sin(ship.ang) * (18 + Math.random() * 10) };
        ctx.strokeStyle = '#f2c14e';
        ctx.beginPath();
        ctx.moveTo(back.x, back.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
    }
  } else {
    ctx.fillStyle = '#e7e9f3';
    ctx.font = '22px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER — ' + score, W / 2, H / 2);
    ctx.textAlign = 'left';
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') {
    e.preventDefault();
    if (over) newGame();
  }
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key] = false; });

newGame();
loop();
