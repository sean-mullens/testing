const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const msgEl = document.getElementById('msg');

const SPRITES = [
  [["..X..X..", "...XX...", "..XXXX..", ".XX..XX.", "XXXXXXXX", "X.XXXX.X", "X.X..X.X", "..XX.XX."],
   ["..X..X..", "X..XX..X", "X.XXXX.X", "XXX..XXX", "XXXXXXXX", ".XXXXXX.", "..X..X..", ".X.XX.X."]],
  [["..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", "..X..X..", ".X.XX.X.", "X.X..X.X", "..X..X.."],
   ["..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", ".X.XX.X.", "X......X", ".X....X.", "..XXXX.."]],
  [["...XX...", "..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", ".X.XX.X.", "X......X", ".X....X."],
   ["...XX...", "..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", "..X..X..", ".X.XX.X.", "X.X..X.X"]]
];
const ROW_TYPE = [0, 0, 1, 1, 2];
const ROW_POINTS = [30, 30, 20, 20, 10];
const ROW_COLOR = ['#c08bff', '#c08bff', '#5fd6d6', '#5fd6d6', '#7de2a8'];

const COLS = 11, ROWS = 5, PX = 4, AW = 8 * PX, AH = 8 * PX;
let aliens, dir, dropPending, stepClock, frame, ship, shots, bombs, shields, score, lives, wave, over, keys = {}, fireCooldown = 0;

function newWave(first) {
  aliens = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    aliens.push({
      x: 70 + c * 46, y: 70 + r * 42,
      type: ROW_TYPE[r], points: ROW_POINTS[r], color: ROW_COLOR[r], alive: true
    });
  }
  dir = 1; dropPending = false; stepClock = 0; frame = 0;
  shots = []; bombs = [];
  if (first) buildShields();
  ship = { x: W / 2 - 22, y: H - 52, w: 44, h: 18, speed: 6 };
}

function buildShields() {
  shields = [];
  const shape = [
    "..XXXXXXXX..",
    ".XXXXXXXXXX.",
    "XXXXXXXXXXXX",
    "XXXXXXXXXXXX",
    "XXX......XXX",
    "XX........XX"
  ];
  for (let s = 0; s < 4; s++) {
    const ox = 70 + s * 160, oy = H - 160;
    for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 'X') shields.push({ x: ox + c * 7, y: oy + r * 7, s: 7, hp: 3 });
    }
  }
}

function newGame() {
  score = 0; lives = 3; wave = 1; over = false;
  scoreEl.textContent = 0; livesEl.textContent = 3; waveEl.textContent = 1;
  newWave(true);
  msgEl.textContent = '← → to move, Space to fire.';
}

function stepAliens() {
  const live = aliens.filter(a => a.alive);
  if (!live.length) {
    wave++;
    waveEl.textContent = wave;
    newWave(false);
    msgEl.textContent = `Wave ${wave}.`;
    return;
  }
  const minX = Math.min(...live.map(a => a.x));
  const maxX = Math.max(...live.map(a => a.x + AW));

  if (dropPending) {
    live.forEach(a => { a.y += 22; });
    dir *= -1;
    dropPending = false;
  } else {
    live.forEach(a => { a.x += dir * 14; });
    if (minX + dir * 14 < 12 || maxX + dir * 14 > W - 12) dropPending = true;
  }
  frame ^= 1;

  if (live.some(a => a.y + AH >= ship.y)) endGame('The invaders reached your line.');

  // the fewer left, the faster they come
  const shooters = {};
  for (const a of live) {
    const key = Math.round(a.x);
    if (!shooters[key] || a.y > shooters[key].y) shooters[key] = a;
  }
  const cand = Object.values(shooters);
  if (cand.length && Math.random() < 0.55) {
    const a = cand[(Math.random() * cand.length) | 0];
    bombs.push({ x: a.x + AW / 2 - 2, y: a.y + AH, w: 4, h: 12, vy: 3.6 + wave * 0.25 });
  }
}

function endGame(text) {
  over = true;
  msgEl.textContent = `${text} Final score ${score}. Press Space to start again.`;
}

function hitShield(x, y, w, h) {
  for (const b of shields) {
    if (b.hp <= 0) continue;
    if (x < b.x + b.s && x + w > b.x && y < b.y + b.s && y + h > b.y) { b.hp--; return true; }
  }
  return false;
}

function update(dt) {
  if (over) return;

  if (keys.ArrowLeft) ship.x -= ship.speed;
  if (keys.ArrowRight) ship.x += ship.speed;
  ship.x = Math.max(8, Math.min(W - ship.w - 8, ship.x));

  fireCooldown -= dt;
  if (keys[' '] && fireCooldown <= 0 && shots.length < 3) {
    shots.push({ x: ship.x + ship.w / 2 - 2, y: ship.y - 10, w: 4, h: 12, vy: -9 });
    fireCooldown = 0.32;
  }

  const live = aliens.filter(a => a.alive).length;
  const interval = Math.max(0.06, (0.62 - wave * 0.04) * (live / (COLS * ROWS)) + 0.06);
  stepClock += dt;
  if (stepClock >= interval) { stepClock = 0; stepAliens(); }

  for (const s of shots) {
    s.y += s.vy;
    if (hitShield(s.x, s.y, s.w, s.h)) { s.dead = true; continue; }
    for (const a of aliens) {
      if (!a.alive) continue;
      if (s.x < a.x + AW && s.x + s.w > a.x && s.y < a.y + AH && s.y + s.h > a.y) {
        a.alive = false;
        s.dead = true;
        score += a.points;
        scoreEl.textContent = score;
        break;
      }
    }
  }
  shots = shots.filter(s => !s.dead && s.y > -20);

  for (const b of bombs) {
    b.y += b.vy;
    if (hitShield(b.x, b.y, b.w, b.h)) { b.dead = true; continue; }
    if (b.x < ship.x + ship.w && b.x + b.w > ship.x && b.y + b.h > ship.y && b.y < ship.y + ship.h) {
      b.dead = true;
      lives--;
      livesEl.textContent = lives;
      if (lives <= 0) endGame('Your last ship is gone.');
      else { ship.x = W / 2 - ship.w / 2; bombs = []; }
      break;
    }
  }
  bombs = bombs.filter(b => !b.dead && b.y < H + 20);
}

function drawSprite(pattern, x, y, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < pattern.length; r++) for (let c = 0; c < pattern[r].length; c++) {
    if (pattern[r][c] === 'X') ctx.fillRect(x + c * PX, y + r * PX, PX, PX);
  }
}

function draw() {
  ctx.fillStyle = '#07080d';
  ctx.fillRect(0, 0, W, H);

  for (const a of aliens) {
    if (!a.alive) continue;
    drawSprite(SPRITES[a.type][frame], a.x, a.y, a.color);
  }

  for (const b of shields) {
    if (b.hp <= 0) continue;
    ctx.fillStyle = ['#2f5b3f', '#3f8a5a', '#4fd18b'][b.hp - 1];
    ctx.fillRect(b.x, b.y, b.s, b.s);
  }

  ctx.fillStyle = '#8fb8ff';
  ctx.fillRect(ship.x, ship.y + 6, ship.w, ship.h - 6);
  ctx.fillRect(ship.x + ship.w / 2 - 3, ship.y, 6, 8);

  ctx.fillStyle = '#e7e9f3';
  for (const s of shots) ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = '#ff8080';
  for (const b of bombs) ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.fillStyle = '#232840';
  ctx.fillRect(0, H - 22, W, 3);

  if (over) {
    ctx.fillStyle = 'rgba(7,8,13,0.78)';
    ctx.fillRect(0, H / 2 - 40, W, 80);
    ctx.fillStyle = '#e7e9f3';
    ctx.font = '22px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER — ' + score, W / 2, H / 2 + 8);
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
