const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

const N = 24, S = canvas.width / N;
let snake, dir, pendingDir, food, score, best = 0, alive, speed, acc, lastTime;

function reset() {
  snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
  dir = { x: 1, y: 0 };
  pendingDir = dir;
  score = 0;
  alive = true;
  speed = 8;          // ticks per second
  acc = 0;
  lastTime = performance.now();
  placeFood();
  msgEl.textContent = 'Arrow keys or WASD to steer';
  draw();
}

function placeFood() {
  do {
    food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
}

function step() {
  dir = pendingDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N;
  // the tail tip moves away this tick, so it is not a collision
  const hitSelf = snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y);

  if (hitWall || hitSelf) {
    alive = false;
    best = Math.max(best, score);
    bestEl.textContent = best;
    msgEl.textContent = 'Game over — press Space to play again';
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    if (speed < 20) speed += 0.3;
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#161a28';
  ctx.lineWidth = 1;
  for (let i = 1; i < N; i++) {
    ctx.beginPath();
    ctx.moveTo(i * S + 0.5, 0); ctx.lineTo(i * S + 0.5, canvas.height);
    ctx.moveTo(0, i * S + 0.5); ctx.lineTo(canvas.width, i * S + 0.5);
    ctx.stroke();
  }

  // food
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.arc(food.x * S + S / 2, food.y * S + S / 2, S * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // snake
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const t = 1 - i / (snake.length + 6);
    ctx.fillStyle = i === 0 ? '#a8f5c8' : `rgba(125,226,168,${0.35 + 0.55 * t})`;
    ctx.fillRect(s.x * S + 2, s.y * S + 2, S - 4, S - 4);
  }

  if (!alive) {
    ctx.fillStyle = 'rgba(12,14,21,0.72)';
    ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
    ctx.fillStyle = '#e7e9f3';
    ctx.font = '20px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER — ' + score, canvas.width / 2, canvas.height / 2 + 7);
    ctx.textAlign = 'left';
  }
}

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  if (alive) {
    acc += dt;
    const interval = 1 / speed;
    while (acc >= interval) {
      acc -= interval;
      if (alive) step();
    }
    draw();
  }
  requestAnimationFrame(loop);
}

const KEYS = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
};

addEventListener('keydown', e => {
  if (e.key === ' ') {
    e.preventDefault();
    if (!alive) { reset(); scoreEl.textContent = 0; }
    return;
  }
  const nd = KEYS[e.key] || KEYS[e.key.toLowerCase()];
  if (!nd) return;
  e.preventDefault();
  if (nd.x === -dir.x && nd.y === -dir.y) return; // no instant reversal
  pendingDir = nd;
});

// touch swipe
let touchStart = null;
canvas.addEventListener('touchstart', e => { touchStart = e.touches[0]; }, { passive: true });
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.clientX, dy = t.clientY - touchStart.clientY;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) { if (!alive) { reset(); scoreEl.textContent = 0; } return; }
  const nd = Math.abs(dx) > Math.abs(dy)
    ? { x: Math.sign(dx), y: 0 }
    : { x: 0, y: Math.sign(dy) };
  if (nd.x === -dir.x && nd.y === -dir.y) return;
  pendingDir = nd;
});

reset();
requestAnimationFrame(loop);
