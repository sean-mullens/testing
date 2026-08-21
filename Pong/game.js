const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const msgEl = document.getElementById('msg');
const diffEl = document.getElementById('diff');

const PW = 14, PH = 92, TARGET = 7;
let you, cpu, ball, scoreYou, scoreCpu, serving, over, keys = {};
let cpuTarget = H / 2, reactionClock = 0;

function reset(serveToPlayer) {
  you = { x: 24, y: H / 2 - PH / 2 };
  cpu = { x: W - 24 - PW, y: H / 2 - PH / 2, speed: 7.2 };
  ball = { x: W / 2, y: H / 2, r: 8, vx: 0, vy: 0, dir: serveToPlayer ? -1 : 1 };
  serving = true;
  msgEl.textContent = 'Press Space to serve.';
}

function newMatch() {
  scoreYou = 0; scoreCpu = 0; over = false;
  reset(true);
}

function serve() {
  if (over) { newMatch(); return; }
  if (!serving) return;
  serving = false;
  const angle = (Math.random() * 0.7 - 0.35);
  const speed = 8;
  ball.vx = Math.cos(angle) * speed * ball.dir;
  ball.vy = Math.sin(angle) * speed;
  msgEl.textContent = '';
}

function point(toPlayer) {
  if (toPlayer) scoreYou++; else scoreCpu++;
  if (scoreYou >= TARGET || scoreCpu >= TARGET) {
    over = true;
    msgEl.textContent = (scoreYou > scoreCpu ? 'You win the match.' : 'The computer wins the match.') + ' Press Space to play again.';
    serving = true;
    ball.vx = ball.vy = 0;
    ball.x = W / 2; ball.y = H / 2;
    return;
  }
  reset(!toPlayer);
}

function update(dt) {
  if (keys.ArrowUp) you.y -= 9;
  if (keys.ArrowDown) you.y += 9;
  you.y = Math.max(0, Math.min(H - PH, you.y));

  // the CPU only re-reads the ball every so often, which is what makes it beatable
  reactionClock -= dt;
  if (reactionClock <= 0) {
    reactionClock = Number(diffEl.value);
    if (ball.vx > 0) {
      const timeToReach = (cpu.x - ball.x) / (ball.vx || 1);
      let predicted = ball.y + ball.vy * timeToReach;
      const span = 2 * H;
      predicted = ((predicted % span) + span) % span;
      if (predicted > H) predicted = span - predicted;
      cpuTarget = predicted + (Math.random() - 0.5) * 60;
    } else {
      cpuTarget = H / 2 + (Math.random() - 0.5) * 80;
    }
  }
  const centre = cpu.y + PH / 2;
  const delta = cpuTarget - centre;
  cpu.y += Math.max(-cpu.speed, Math.min(cpu.speed, delta));
  cpu.y = Math.max(0, Math.min(H - PH, cpu.y));

  if (serving || over) {
    if (serving && !over) { ball.y = (ball.dir < 0 ? you.y : cpu.y) + PH / 2; ball.x = ball.dir < 0 ? you.x + PW + 14 : cpu.x - 14; }
    return;
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
  if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); }

  const bounce = (p, towardRight) => {
    const rel = (ball.y - (p.y + PH / 2)) / (PH / 2);
    const angle = Math.max(-1, Math.min(1, rel)) * (Math.PI / 4);
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, 17);
    ball.vx = Math.cos(angle) * speed * (towardRight ? 1 : -1);
    ball.vy = Math.sin(angle) * speed;
  };

  if (ball.vx < 0 && ball.x - ball.r <= you.x + PW && ball.x - ball.r >= you.x - 6
      && ball.y >= you.y && ball.y <= you.y + PH) {
    ball.x = you.x + PW + ball.r;
    bounce(you, true);
  }
  if (ball.vx > 0 && ball.x + ball.r >= cpu.x && ball.x + ball.r <= cpu.x + PW + 6
      && ball.y >= cpu.y && ball.y <= cpu.y + PH) {
    ball.x = cpu.x - ball.r;
    bounce(cpu, false);
  }

  if (ball.x < -30) point(false);
  else if (ball.x > W + 30) point(true);
}

function draw() {
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#232840';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 14]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#2e3452';
  ctx.font = '64px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(scoreYou, W / 2 - 70, 76);
  ctx.fillText(scoreCpu, W / 2 + 70, 76);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#8fb8ff';
  ctx.fillRect(you.x, you.y, PW, PH);
  ctx.fillStyle = '#ff8080';
  ctx.fillRect(cpu.x, cpu.y, PW, PH);

  ctx.fillStyle = '#e7e9f3';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  you.y = (e.clientY - rect.top) / rect.height * H - PH / 2;
  you.y = Math.max(0, Math.min(H - PH, you.y));
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  you.y = (e.touches[0].clientY - rect.top) / rect.height * H - PH / 2;
  you.y = Math.max(0, Math.min(H - PH, you.y));
}, { passive: false });
canvas.addEventListener('click', serve);
addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') { e.preventDefault(); serve(); }
});
addEventListener('keyup', e => { keys[e.key] = false; });

newMatch();
loop();
