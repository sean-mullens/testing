const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

const GRAVITY = 1500, FLAP = -430, GROUND = 70;
const PIPE_W = 66, SPACING = 210;
let bird, pipes, score, best = 0, state, spawnX, speed, clouds;

function newGame() {
  bird = { x: 120, y: H / 2, vy: 0, r: 14, rot: 0 };
  pipes = [];
  clouds = Array.from({ length: 6 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 260, s: 20 + Math.random() * 34, v: 8 + Math.random() * 14 }));
  score = 0; speed = 150; spawnX = W + 60;
  state = 'ready';
  scoreEl.textContent = 0;
  msgEl.textContent = 'Click or press Space to flap.';
  for (let i = 0; i < 3; i++) addPipe(W + 120 + i * SPACING);
}

function addPipe(x) {
  const margin = 90;
  const gap = Math.max(140, 190 - score * 1.5);
  const top = margin + Math.random() * (H - GROUND - gap - margin * 2);
  pipes.push({ x, top, gap, passed: false });
}

function flap() {
  if (state === 'dead') { newGame(); return; }
  if (state === 'ready') { state = 'play'; msgEl.textContent = ''; }
  bird.vy = FLAP;
}

function die() {
  state = 'dead';
  best = Math.max(best, score);
  bestEl.textContent = best;
  msgEl.textContent = `Down at ${score}. Click or press Space to go again.`;
}

function update(dt) {
  for (const c of clouds) {
    c.x -= c.v * dt;
    if (c.x < -c.s * 2) { c.x = W + c.s; c.y = 40 + Math.random() * 260; }
  }

  if (state === 'ready') {
    bird.y = H / 2 + Math.sin(performance.now() / 260) * 10;
    return;
  }

  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;
  bird.rot = Math.max(-0.5, Math.min(1.3, bird.vy / 700));

  if (state === 'dead') {
    if (bird.y > H - GROUND - bird.r) { bird.y = H - GROUND - bird.r; bird.vy = 0; }
    return;
  }

  speed = 150 + score * 3;
  for (const p of pipes) {
    p.x -= speed * dt;
    if (!p.passed && p.x + PIPE_W < bird.x) {
      p.passed = true;
      score++;
      scoreEl.textContent = score;
    }
  }
  if (pipes.length && pipes[pipes.length - 1].x < W - SPACING) addPipe(W + 20);
  pipes = pipes.filter(p => p.x > -PIPE_W - 10);

  if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0; }
  if (bird.y + bird.r > H - GROUND) { bird.y = H - GROUND - bird.r; die(); return; }

  for (const p of pipes) {
    const inX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W;
    if (!inX) continue;
    if (bird.y - bird.r < p.top || bird.y + bird.r > p.top + p.gap) { die(); return; }
  }
}

function drawPipe(p) {
  const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
  grad.addColorStop(0, '#3f8a5a');
  grad.addColorStop(0.4, '#4fd18b');
  grad.addColorStop(1, '#2f6a45');
  ctx.fillStyle = grad;
  ctx.fillRect(p.x, 0, PIPE_W, p.top);
  ctx.fillRect(p.x, p.top + p.gap, PIPE_W, H - GROUND - p.top - p.gap);
  ctx.fillStyle = '#57e09a';
  ctx.fillRect(p.x - 5, p.top - 20, PIPE_W + 10, 20);
  ctx.fillRect(p.x - 5, p.top + p.gap, PIPE_W + 10, 20);
}

function draw() {
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#161b2a';
  for (const c of clouds) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.s, 0, Math.PI * 2);
    ctx.arc(c.x + c.s * 0.8, c.y + 6, c.s * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  pipes.forEach(drawPipe);

  ctx.fillStyle = '#2a2f4a';
  ctx.fillRect(0, H - GROUND, W, GROUND);
  ctx.fillStyle = '#343b5e';
  for (let x = -((performance.now() / 12) % 40); x < W; x += 40) ctx.fillRect(x, H - GROUND, 22, 8);

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rot);
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.r + 4, bird.r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0954a';
  ctx.beginPath();
  ctx.ellipse(-3, 2, 8, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#12141c';
  ctx.beginPath();
  ctx.arc(7, -4, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8f4a';
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(24, 3); ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#e7e9f3';
  ctx.font = 'bold 44px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(score, W / 2, 72);
  ctx.textAlign = 'left';
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.04);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('mousedown', flap);
canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, { passive: false });
addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flap(); }
});

newGame();
loop();
