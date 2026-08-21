const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const msgEl = document.getElementById('msg');

const BRICK_ROWS = 6, BRICK_COLS = 10, BRICK_H = 24, PAD = 6;
const BRICK_W = (W - PAD * (BRICK_COLS + 1)) / BRICK_COLS;
const ROW_COLORS = ['#ff6b6b', '#f0904a', '#f2c14e', '#7de2a8', '#5fd6d6', '#8fb8ff'];

let paddle, ball, bricks, score, lives, level, stuck, over, keys = {};

function makeBricks() {
  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) for (let c = 0; c < BRICK_COLS; c++) {
    bricks.push({
      x: PAD + c * (BRICK_W + PAD),
      y: 70 + r * (BRICK_H + PAD),
      w: BRICK_W, h: BRICK_H,
      color: ROW_COLORS[r],
      points: (BRICK_ROWS - r) * 10,
      alive: true
    });
  }
}

function resetBall() {
  stuck = true;
  ball = { x: paddle.x + paddle.w / 2, y: paddle.y - 9, r: 8, vx: 0, vy: 0, speed: 6 + level * 0.4 };
  msgEl.textContent = 'Press Space or click to launch.';
}

function newGame() {
  paddle = { x: W / 2 - 55, y: H - 32, w: 110, h: 13, speed: 9 };
  score = 0; lives = 3; level = 1; over = false;
  scoreEl.textContent = 0; livesEl.textContent = 3; levelEl.textContent = 1;
  makeBricks();
  resetBall();
}

function launch() {
  if (over) { newGame(); return; }
  if (!stuck) return;
  stuck = false;
  const angle = (-60 + Math.random() * 120) * Math.PI / 180;
  ball.vx = Math.sin(angle) * ball.speed;
  ball.vy = -Math.cos(angle) * ball.speed;
  msgEl.textContent = '';
}

function hitBrick(b) {
  // resolve on the axis with the smaller overlap so corners behave
  const overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
  const overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
  if (overlapX < overlapY) ball.vx *= -1;
  else ball.vy *= -1;
  b.alive = false;
  score += b.points;
  scoreEl.textContent = score;
}

function update() {
  if (over) return;

  if (keys.ArrowLeft) paddle.x -= paddle.speed;
  if (keys.ArrowRight) paddle.x += paddle.speed;
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

  if (stuck) { ball.x = paddle.x + paddle.w / 2; ball.y = paddle.y - ball.r - 1; return; }

  // step in slices so a fast ball cannot tunnel through a brick
  const steps = Math.ceil(Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) / 4);
  for (let s = 0; s < steps; s++) {
    ball.x += ball.vx / steps;
    ball.y += ball.vy / steps;

    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

    // paddle: bounce angle depends on where it lands
    if (ball.vy > 0 && ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h
        && ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r) {
      const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      const angle = Math.max(-1, Math.min(1, rel)) * (Math.PI / 3);
      const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.01, 13);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      ball.y = paddle.y - ball.r - 1;
    }

    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        hitBrick(b);
        break;
      }
    }

    if (ball.y - ball.r > H) {
      lives--;
      livesEl.textContent = lives;
      if (lives <= 0) {
        over = true;
        msgEl.textContent = `Game over with ${score} points. Press Space to start again.`;
      } else {
        resetBall();
      }
      return;
    }
  }

  if (bricks.every(b => !b.alive)) {
    level++;
    levelEl.textContent = level;
    paddle.w = Math.max(70, paddle.w - 8);
    makeBricks();
    resetBall();
    msgEl.textContent = `Level ${level}. Press Space to launch.`;
  }
}

function draw() {
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, W, H);

  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x, b.y + b.h - 5, b.w, 5);
  }

  ctx.fillStyle = '#e7e9f3';
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

  ctx.fillStyle = '#7de2a8';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  if (over) {
    ctx.fillStyle = 'rgba(12,14,21,0.75)';
    ctx.fillRect(0, H / 2 - 40, W, 80);
    ctx.fillStyle = '#e7e9f3';
    ctx.font = '22px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER — ' + score, W / 2, H / 2 + 8);
    ctx.textAlign = 'left';
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  paddle.x = (e.clientX - rect.left) / rect.width * W - paddle.w / 2;
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  paddle.x = (e.touches[0].clientX - rect.left) / rect.width * W - paddle.w / 2;
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
}, { passive: false });
canvas.addEventListener('click', launch);
addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') { e.preventDefault(); launch(); }
});
addEventListener('keyup', e => { keys[e.key] = false; });

newGame();
loop();
