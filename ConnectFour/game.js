const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const msgEl = document.getElementById('msg');
const diffEl = document.getElementById('diff');
const wEl = document.getElementById('w'), lEl = document.getElementById('l');

const COLS = 7, ROWS = 6, S = 90, TOP = 90;
const HUMAN = 1, CPU = 2;
let board, turn, over, winLine, hover = -1, falling = null, tally = { w: 0, l: 0 };

canvas.height = TOP + ROWS * S;

function newRound() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  turn = HUMAN; over = false; winLine = null; falling = null;
  msgEl.textContent = 'Click a column to drop a disc.';
  draw();
}

function dropRow(b, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (!b[r][c]) return r;
  return -1;
}

function winnerLine(b) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = b[r][c];
    if (!p) continue;
    for (const [dr, dc] of dirs) {
      const cells = [[r, c]];
      for (let k = 1; k < 4; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS || b[rr][cc] !== p) break;
        cells.push([rr, cc]);
      }
      if (cells.length === 4) return { player: p, cells };
    }
  }
  return null;
}

const full = b => b[0].every(v => v);

function windowScore(cells, player) {
  const other = player === CPU ? HUMAN : CPU;
  const mine = cells.filter(v => v === player).length;
  const theirs = cells.filter(v => v === other).length;
  const empty = cells.filter(v => !v).length;
  if (mine && theirs) return 0;
  if (mine === 4) return 100000;
  if (mine === 3 && empty === 1) return 120;
  if (mine === 2 && empty === 2) return 12;
  if (theirs === 4) return -100000;
  if (theirs === 3 && empty === 1) return -160;   // block threats a bit harder than we attack
  if (theirs === 2 && empty === 2) return -12;
  return 0;
}

function heuristic(b, player) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) if (b[r][3] === player) score += 6;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of dirs) {
      const rr = r + dr * 3, cc = c + dc * 3;
      if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) continue;
      const cells = [0, 1, 2, 3].map(k => b[r + dr * k][c + dc * k]);
      score += windowScore(cells, player);
    }
  }
  return score;
}

const ORDER = [3, 2, 4, 1, 5, 0, 6];

function minimax(b, depth, alpha, beta, maximizing) {
  const win = winnerLine(b);
  if (win) return { score: (win.player === CPU ? 1 : -1) * (500000 + depth) };
  if (full(b) || depth === 0) return { score: heuristic(b, CPU) };

  let best = { score: maximizing ? -Infinity : Infinity, move: null };
  for (const c of ORDER) {
    const r = dropRow(b, c);
    if (r < 0) continue;
    b[r][c] = maximizing ? CPU : HUMAN;
    const { score } = minimax(b, depth - 1, alpha, beta, !maximizing);
    b[r][c] = 0;
    if (maximizing) {
      if (score > best.score) best = { score, move: c };
      alpha = Math.max(alpha, score);
    } else {
      if (score < best.score) best = { score, move: c };
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function place(col, player, onDone) {
  const row = dropRow(board, col);
  if (row < 0) return false;
  falling = { col, row, player, y: TOP - S / 2, vy: 0 };
  const target = TOP + row * S + S / 2;
  const step = () => {
    falling.vy += 2.6;
    falling.y += falling.vy;
    if (falling.y >= target) {
      falling = null;
      board[row][col] = player;
      const win = winnerLine(board);
      if (win) {
        over = true; winLine = win.cells;
        if (player === HUMAN) { tally.w++; msgEl.textContent = 'Four in a row — you win.'; }
        else { tally.l++; msgEl.textContent = 'The computer connects four.'; }
        wEl.textContent = tally.w; lEl.textContent = tally.l;
      } else if (full(board)) {
        over = true;
        msgEl.textContent = 'The board is full. A draw.';
      }
      draw();
      if (onDone && !over) onDone();
      return;
    }
    draw();
    requestAnimationFrame(step);
  };
  step();
  return true;
}

function cpuTurn() {
  turn = CPU;
  msgEl.textContent = 'Computer is thinking…';
  setTimeout(() => {
    const depth = Number(diffEl.value);
    const move = minimax(board.map(r => r.slice()), depth, -Infinity, Infinity, true).move;
    const col = move === null || move === undefined ? ORDER.find(c => dropRow(board, c) >= 0) : move;
    place(col, CPU, () => { turn = HUMAN; msgEl.textContent = 'Your move.'; });
  }, 120);
}

function draw() {
  ctx.fillStyle = '#12141c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!over && turn === HUMAN && hover >= 0 && !falling) {
    ctx.fillStyle = 'rgba(242,193,78,0.10)';
    ctx.fillRect(hover * S, 0, S, canvas.height);
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(hover * S + S / 2, TOP / 2, S * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }

  if (falling) {
    ctx.fillStyle = falling.player === HUMAN ? '#f2c14e' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(falling.col * S + S / 2, falling.y, S * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }

  // board drawn as a plate with holes punched through it
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP, canvas.width, ROWS * S);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    ctx.moveTo(c * S + S / 2 + S * 0.38, TOP + r * S + S / 2);
    ctx.arc(c * S + S / 2, TOP + r * S + S / 2, S * 0.38, 0, Math.PI * 2);
  }
  ctx.clip('evenodd');
  ctx.fillStyle = '#2b3a6b';
  ctx.fillRect(0, TOP, canvas.width, ROWS * S);
  ctx.restore();

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = board[r][c];
    if (!v) continue;
    const won = winLine && winLine.some(([wr, wc]) => wr === r && wc === c);
    ctx.fillStyle = v === HUMAN ? '#f2c14e' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(c * S + S / 2, TOP + r * S + S / 2, S * 0.38, 0, Math.PI * 2);
    ctx.fill();
    if (won) {
      ctx.strokeStyle = '#e7e9f3';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  hover = ((e.clientX - rect.left) / rect.width * COLS) | 0;
  draw();
});
canvas.addEventListener('mouseleave', () => { hover = -1; draw(); });
canvas.addEventListener('click', e => {
  if (over || turn !== HUMAN || falling) return;
  const rect = canvas.getBoundingClientRect();
  const col = ((e.clientX - rect.left) / rect.width * COLS) | 0;
  if (dropRow(board, col) < 0) return;
  turn = null;
  place(col, HUMAN, cpuTurn);
});

document.getElementById('new').addEventListener('click', newRound);
newRound();
