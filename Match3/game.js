const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const msgEl = document.getElementById('msg');

const N = 8, S = 56, TYPES = 6;
const COLORS = ['#ff6b6b', '#f2c14e', '#7de2a8', '#5fd6d6', '#8fb8ff', '#c08bff'];

let grid, score, movesLeft, sel, phase, pendingSwap, combo, gameOver;

function gem(t, fr, fc) { return { t, fr, fc, sc: 1, dying: false }; }

function newBoard() {
  grid = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => gem((Math.random() * TYPES) | 0, r, c)));
  // deal a board with no matches already on it
  while (findMatches().size) {
    for (const k of findMatches()) {
      const [r, c] = k.split(',').map(Number);
      grid[r][c].t = (Math.random() * TYPES) | 0;
    }
  }
  score = 0; movesLeft = 30; sel = null; phase = 'idle'; pendingSwap = null; combo = 0; gameOver = false;
  scoreEl.textContent = 0;
  movesEl.textContent = movesLeft;
  msgEl.textContent = 'Swap two neighbours to line up three or more.';
}

function findMatches() {
  const hits = new Set();
  for (let r = 0; r < N; r++) {
    let run = 1;
    for (let c = 1; c <= N; c++) {
      const same = c < N && grid[r][c] && grid[r][c - 1] && grid[r][c].t === grid[r][c - 1].t;
      if (same) run++;
      else {
        if (run >= 3) for (let k = c - run; k < c; k++) hits.add(r + ',' + k);
        run = 1;
      }
    }
  }
  for (let c = 0; c < N; c++) {
    let run = 1;
    for (let r = 1; r <= N; r++) {
      const same = r < N && grid[r][c] && grid[r - 1][c] && grid[r][c].t === grid[r - 1][c].t;
      if (same) run++;
      else {
        if (run >= 3) for (let k = r - run; k < r; k++) hits.add(k + ',' + c);
        run = 1;
      }
    }
  }
  return hits;
}

function swapCells(a, b) {
  const tmp = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = tmp;
}

function hasMove() {
  const dirs = [[0, 1], [1, 0]];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    for (const [dr, dc] of dirs) {
      const r2 = r + dr, c2 = c + dc;
      if (r2 >= N || c2 >= N) continue;
      swapCells({ r, c }, { r: r2, c: c2 });
      const found = findMatches().size > 0;
      swapCells({ r, c }, { r: r2, c: c2 });
      if (found) return true;
    }
  }
  return false;
}

function startClear() {
  const hits = findMatches();
  if (!hits.size) return false;
  combo++;
  const gained = hits.size * 10 * combo;
  score += gained;
  scoreEl.textContent = score;
  if (combo > 1) msgEl.textContent = `Cascade ×${combo} — ${gained} points.`;
  for (const k of hits) {
    const [r, c] = k.split(',').map(Number);
    grid[r][c].dying = true;
  }
  phase = 'clear';
  return true;
}

function collapse() {
  for (let c = 0; c < N; c++) {
    const column = [];
    for (let r = N - 1; r >= 0; r--) if (grid[r][c] && !grid[r][c].dying) column.push(grid[r][c]);
    let r = N - 1;
    for (const g of column) { grid[r][c] = g; r--; }
    let spawn = 1;
    for (; r >= 0; r--) {
      grid[r][c] = gem((Math.random() * TYPES) | 0, -spawn, c);
      spawn++;
    }
  }
  phase = 'fall';
}

function animate(dt) {
  let moving = false;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const g = grid[r][c];
    if (!g) continue;
    const speed = 14 * dt;
    if (Math.abs(g.fr - r) > 0.01) { g.fr += Math.sign(r - g.fr) * Math.min(speed, Math.abs(r - g.fr)); moving = true; }
    else g.fr = r;
    if (Math.abs(g.fc - c) > 0.01) { g.fc += Math.sign(c - g.fc) * Math.min(speed, Math.abs(c - g.fc)); moving = true; }
    else g.fc = c;
    const target = g.dying ? 0 : 1;
    if (Math.abs(g.sc - target) > 0.01) { g.sc += Math.sign(target - g.sc) * Math.min(6 * dt, Math.abs(target - g.sc)); moving = true; }
    else g.sc = target;
  }
  return moving;
}

function update(dt) {
  const moving = animate(dt);
  if (moving) return;

  if (phase === 'swap') {
    if (findMatches().size) {
      combo = 0; pendingSwap = null;
      movesLeft--;
      movesEl.textContent = Math.max(0, movesLeft);
      startClear();
    }
    else {
      swapCells(pendingSwap.a, pendingSwap.b);
      pendingSwap = null;
      phase = 'swapback';
      msgEl.textContent = 'That swap makes no line — try another.';
    }
  } else if (phase === 'swapback') {
    phase = 'idle';
    checkExhausted();
  } else if (phase === 'clear') {
    collapse();
  } else if (phase === 'fall') {
    if (!startClear()) {
      phase = 'idle';
      combo = 0;
      if (!hasMove()) newBoardKeepScore();
      else checkExhausted();
    }
  }
}

function checkExhausted() {
  if (movesLeft <= 0 && !gameOver) {
    gameOver = true;
    msgEl.textContent = `Out of moves. Final score ${score}. Start a new board to play again.`;
  }
}

function newBoardKeepScore() {
  const keptScore = score, keptMoves = movesLeft;
  newBoard();
  score = keptScore; movesLeft = keptMoves;
  scoreEl.textContent = score;
  movesEl.textContent = movesLeft;
  msgEl.textContent = 'No moves were left, so the board was reshuffled.';
}

function drawGem(g) {
  const x = g.fc * S + S / 2, y = g.fr * S + S / 2, rad = (S / 2 - 5) * g.sc;
  if (rad <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = COLORS[g.t];
  ctx.beginPath();
  const sides = [4, 3, 6, 5, 8, 4][g.t];
  const rot = g.t === 0 ? Math.PI / 4 : (g.t === 5 ? 0 : -Math.PI / 2);
  for (let i = 0; i < sides; i++) {
    const a = rot + i * 2 * Math.PI / sides;
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(-rad * 0.25, -rad * 0.3, rad * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = (r + c) % 2 ? '#141828' : '#171c2e';
    ctx.fillRect(c * S, r * S, S, S);
  }
  if (sel) {
    ctx.strokeStyle = '#e7e9f3';
    ctx.lineWidth = 2;
    ctx.strokeRect(sel.c * S + 2, sel.r * S + 2, S - 4, S - 4);
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c]) drawGem(grid[r][c]);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function cellAt(evt) {
  const rect = canvas.getBoundingClientRect();
  const p = evt.touches ? evt.touches[0] : evt;
  const c = ((p.clientX - rect.left) / rect.width * N) | 0;
  const r = ((p.clientY - rect.top) / rect.height * N) | 0;
  if (r < 0 || c < 0 || r >= N || c >= N) return null;
  return { r, c };
}

function pick(cell) {
  if (!cell || phase !== 'idle' || gameOver) return;
  if (!sel) { sel = cell; return; }
  const dist = Math.abs(sel.r - cell.r) + Math.abs(sel.c - cell.c);
  if (dist === 0) { sel = null; return; }
  if (dist !== 1) { sel = cell; return; }
  const a = sel, b = cell;
  sel = null;
  swapCells(a, b);
  pendingSwap = { a, b };
  phase = 'swap';
}

canvas.addEventListener('mousedown', e => pick(cellAt(e)));
canvas.addEventListener('touchstart', e => { e.preventDefault(); pick(cellAt(e)); }, { passive: false });
document.getElementById('new').addEventListener('click', newBoard);

newBoard();
requestAnimationFrame(loop);
