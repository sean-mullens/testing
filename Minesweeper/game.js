const boardEl = document.getElementById('board');
const minesEl = document.getElementById('mines');
const timeEl = document.getElementById('time');
const msgEl = document.getElementById('msg');
const levelEl = document.getElementById('level');

let W, H, MINES, cells, started, over, revealedCount, flagCount, timer, seconds;

function idx(x, y) { return y * W + x; }

function neighbours(x, y) {
  const out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(cells[idx(nx, ny)]);
  }
  return out;
}

function newGame() {
  const [w, h, m] = levelEl.value.split(',').map(Number);
  W = w; H = h; MINES = m;
  started = false; over = false; revealedCount = 0; flagCount = 0; seconds = 0;
  clearInterval(timer);
  timeEl.textContent = '0';
  minesEl.textContent = MINES;
  msgEl.textContent = 'Left click reveals. Right click flags. Double click a number to clear its neighbours.';

  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${W}, 28px)`;
  cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const el = document.createElement('div');
    el.className = 'c';
    boardEl.appendChild(el);
    cells.push({ x, y, el, mine: false, open: false, flag: false, n: 0 });
  }
}

function placeMines(safeX, safeY) {
  const banned = new Set();
  banned.add(idx(safeX, safeY));
  neighbours(safeX, safeY).forEach(c => banned.add(idx(c.x, c.y)));
  let placed = 0;
  while (placed < MINES) {
    const i = (Math.random() * cells.length) | 0;
    if (cells[i].mine || banned.has(i)) continue;
    cells[i].mine = true;
    placed++;
  }
  for (const c of cells) c.n = neighbours(c.x, c.y).filter(n => n.mine).length;
}

function reveal(cell) {
  if (cell.open || cell.flag || over) return;
  const stack = [cell];
  while (stack.length) {
    const c = stack.pop();
    if (c.open || c.flag) continue;
    c.open = true;
    revealedCount++;
    c.el.classList.add('open');
    if (c.mine) { loss(c); return; }
    if (c.n > 0) {
      c.el.textContent = c.n;
      c.el.classList.add('n' + c.n);
    } else {
      for (const n of neighbours(c.x, c.y)) if (!n.open && !n.flag) stack.push(n);
    }
  }
  checkWin();
}

function chord(cell) {
  if (!cell.open || cell.n === 0 || over) return;
  const ns = neighbours(cell.x, cell.y);
  if (ns.filter(n => n.flag).length !== cell.n) return;
  ns.filter(n => !n.flag && !n.open).forEach(reveal);
}

function loss(hit) {
  over = true;
  clearInterval(timer);
  for (const c of cells) {
    if (c.mine) { c.el.textContent = '✷'; c.el.classList.add('open'); }
    if (c.flag && !c.mine) { c.el.textContent = '✗'; c.el.classList.add('open'); }
  }
  hit.el.classList.add('mine');
  msgEl.textContent = 'You hit a mine. Start a new game to try again.';
}

function checkWin() {
  if (revealedCount === cells.length - MINES) {
    over = true;
    clearInterval(timer);
    cells.filter(c => c.mine && !c.flag).forEach(c => { c.el.classList.add('flag'); c.el.textContent = '⚑'; });
    flagCount = MINES;
    minesEl.textContent = '0';
    msgEl.textContent = `Cleared in ${seconds}s. Nicely done.`;
  }
}

function startTimer() {
  timer = setInterval(() => { seconds++; timeEl.textContent = seconds; }, 1000);
}

boardEl.addEventListener('click', e => {
  const i = [...boardEl.children].indexOf(e.target);
  if (i < 0 || over) return;
  const cell = cells[i];
  if (!started) { started = true; placeMines(cell.x, cell.y); startTimer(); }
  reveal(cell);
});

boardEl.addEventListener('dblclick', e => {
  const i = [...boardEl.children].indexOf(e.target);
  if (i < 0 || over) return;
  chord(cells[i]);
});

boardEl.addEventListener('contextmenu', e => {
  e.preventDefault();
  const i = [...boardEl.children].indexOf(e.target);
  if (i < 0 || over) return;
  const c = cells[i];
  if (c.open) return;
  c.flag = !c.flag;
  c.el.classList.toggle('flag', c.flag);
  c.el.textContent = c.flag ? '⚑' : '';
  flagCount += c.flag ? 1 : -1;
  minesEl.textContent = MINES - flagCount;
});

document.getElementById('new').addEventListener('click', newGame);
levelEl.addEventListener('change', newGame);
newGame();
