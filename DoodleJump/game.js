const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

const GRAVITY = 1500, BOUNCE = -720, PW = 68, PH = 14, GAP = 78;
let player, plats, camera, score, best = 0, over, keys = {}, tilt = 0;

function makePlatform(y) {
  const roll = Math.random();
  const type = score > 400 && roll < 0.18 ? 'break' : (score > 200 && roll < 0.38 ? 'move' : 'solid');
  return {
    x: Math.random() * (W - PW),
    y,
    type,
    vx: type === 'move' ? (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 60) : 0,
    used: false,
    spring: Math.random() < 0.09
  };
}

function newGame() {
  player = { x: W / 2 - 18, y: H - 140, w: 36, h: 36, vx: 0, vy: BOUNCE };
  plats = [{ x: W / 2 - PW / 2, y: H - 90, type: 'solid', vx: 0, used: false, spring: false }];
  for (let y = H - 170; y > -H; y -= GAP) plats.push(makePlatform(y));
  camera = 0; score = 0; over = false;
  scoreEl.textContent = 0;
  msgEl.textContent = '← → to steer. You bounce automatically — do not fall off the bottom.';
}

function update(dt) {
  if (over) return;

  const accel = 1500;
  if (keys.ArrowLeft) player.vx -= accel * dt;
  if (keys.ArrowRight) player.vx += accel * dt;
  if (!keys.ArrowLeft && !keys.ArrowRight) player.vx *= Math.pow(0.02, dt);
  player.vx = Math.max(-420, Math.min(420, player.vx));
  tilt = player.vx / 1600;

  player.x += player.vx * dt;
  if (player.x + player.w < 0) player.x = W;          // wrap around the sides
  if (player.x > W) player.x = -player.w;

  const prevBottom = player.y + player.h;
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;

  for (const p of plats) {
    if (p.vx) {
      p.x += p.vx * dt;
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x + PW > W) { p.x = W - PW; p.vx *= -1; }
    }
    if (p.gone) continue;
    const bottom = player.y + player.h;
    if (player.vy > 0 && prevBottom <= p.y + 6 && bottom >= p.y && bottom <= p.y + PH + 12
        && player.x + player.w > p.x && player.x < p.x + PW) {
      player.vy = BOUNCE * (p.spring ? 1.55 : 1);
      if (p.type === 'break') p.gone = true;
    }
  }

  // camera follows once the player passes the upper third
  const threshold = H * 0.38;
  if (player.y < threshold) {
    const shift = threshold - player.y;
    player.y = threshold;
    camera += shift;
    for (const p of plats) p.y += shift;
    score = Math.max(score, Math.floor(camera / 10));
    scoreEl.textContent = score;
  }

  // recycle anything that scrolled off the bottom back up top
  for (const p of plats) {
    if (p.y > H) {
      const highest = Math.min(...plats.map(q => q.y));
      Object.assign(p, makePlatform(highest - GAP + (Math.random() * 24 - 12)));
      p.gone = false;
    }
  }

  if (player.y > H) {
    over = true;
    best = Math.max(best, score);
    bestEl.textContent = best;
    msgEl.textContent = `You fell at ${score}. Press Space to climb again.`;
  }
}

function draw() {
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, W, H);

  // faint parallax band so the climb reads as movement
  ctx.fillStyle = '#141827';
  for (let i = 0; i < 8; i++) {
    const y = ((i * 140 + camera * 0.25) % (H + 140)) - 70;
    ctx.fillRect(0, y, W, 3);
  }

  for (const p of plats) {
    if (p.gone) continue;
    ctx.fillStyle = p.type === 'break' ? '#a15a6b' : p.type === 'move' ? '#5fd6d6' : '#7de2a8';
    ctx.fillRect(p.x, p.y, PW, PH);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(p.x, p.y + PH - 4, PW, 4);
    if (p.spring) {
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(p.x + PW / 2 - 6, p.y - 9, 12, 9);
    }
  }

  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.rotate(tilt);
  ctx.fillStyle = '#c08bff';
  ctx.beginPath();
  ctx.ellipse(0, 0, player.w / 2, player.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#12141c';
  ctx.beginPath();
  ctx.arc(-6, -5, 3, 0, Math.PI * 2);
  ctx.arc(6, -5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#12141c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 3, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();

  if (over) {
    ctx.fillStyle = 'rgba(12,14,21,0.78)';
    ctx.fillRect(0, H / 2 - 40, W, 80);
    ctx.fillStyle = '#e7e9f3';
    ctx.font = '20px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FELL AT ' + score, W / 2, H / 2 + 7);
    ctx.textAlign = 'left';
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.04);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') { e.preventDefault(); if (over) newGame(); }
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key] = false; });

newGame();
loop();
