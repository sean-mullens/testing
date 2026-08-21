const SIZE = 4, CELL = 100, GAP = 12;
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

let grid, tiles, score, best = 0, animating = false, finished = false, reached2048 = false;

function pos(r, c) {
  return { x: GAP + c * (CELL + GAP), y: GAP + r * (CELL + GAP) };
}

function buildBackground() {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const d = document.createElement('div');
    d.className = 'cell';
    const p = pos(r, c);
    d.style.left = p.x + 'px';
    d.style.top = p.y + 'px';
    boardEl.appendChild(d);
  }
}

function makeTile(r, c, val) {
  const el = document.createElement('div');
  el.className = 'tile v' + Math.min(val, 2048) + ' new';
  el.textContent = val;
  const p = pos(r, c);
  el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  boardEl.appendChild(el);
  const t = { r, c, val, el };
  tiles.push(t);
  grid[r][c] = t;
  return t;
}

function newGame() {
  boardEl.querySelectorAll('.tile').forEach(e => e.remove());
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  tiles = [];
  score = 0; finished = false; reached2048 = false; animating = false;
  scoreEl.textContent = 0;
  msgEl.textContent = 'Arrow keys or swipe. Join the tiles to reach 2048.';
  addRandom(); addRandom();
}

function addRandom() {
  const free = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) free.push([r, c]);
  if (!free.length) return;
  const [r, c] = free[(Math.random() * free.length) | 0];
  makeTile(r, c, Math.random() < 0.9 ? 2 : 4);
}

function lineOrder(dir) {
  const out = [];
  for (let i = 0; i < SIZE; i++) {
    const line = [];
    for (let j = 0; j < SIZE; j++) {
      if (dir === 'left') line.push([i, j]);
      else if (dir === 'right') line.push([i, SIZE - 1 - j]);
      else if (dir === 'up') line.push([j, i]);
      else line.push([SIZE - 1 - j, i]);
    }
    out.push(line);
  }
  return out;
}

function move(dir) {
  if (animating || finished) return;
  let moved = false;
  const merges = [];

  for (const line of lineOrder(dir)) {
    const seq = line.map(([r, c]) => grid[r][c]).filter(Boolean);
    let slot = 0;
    for (let i = 0; i < seq.length; i++) {
      const t = seq[i];
      const [r, c] = line[slot++];
      if (i + 1 < seq.length && seq[i + 1].val === t.val) {
        merges.push({ keep: t, gone: seq[i + 1], r, c });
        i++;
        moved = true;
      } else {
        if (t.r !== r || t.c !== c) moved = true;
        t.r = r; t.c = c;
      }
    }
  }
  if (!moved) return;

  for (const m of merges) {
    m.keep.r = m.r; m.keep.c = m.c;
    m.gone.r = m.r; m.gone.c = m.c;
  }

  animating = true;
  for (const t of tiles) {
    t.el.classList.remove('new', 'pop');
    const p = pos(t.r, t.c);
    t.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }

  setTimeout(() => {
    for (const m of merges) {
      m.gone.el.remove();
      tiles = tiles.filter(t => t !== m.gone);
      m.keep.val *= 2;
      m.keep.el.textContent = m.keep.val;
      m.keep.el.className = 'tile v' + Math.min(m.keep.val, 2048) + ' pop';
      score += m.keep.val;
      if (m.keep.val === 2048 && !reached2048) {
        reached2048 = true;
        msgEl.textContent = 'You made 2048. Keep going for a bigger tile.';
      }
    }
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    for (const t of tiles) grid[t.r][t.c] = t;

    scoreEl.textContent = score;
    best = Math.max(best, score);
    bestEl.textContent = best;

    addRandom();
    animating = false;
    if (isStuck()) {
      finished = true;
      msgEl.textContent = 'No moves left. Final score ' + score + ' — start a new game.';
    }
  }, 115);
}

function isStuck() {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (!grid[r][c]) return false;
    if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].val === grid[r][c].val) return false;
    if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].val === grid[r][c].val) return false;
  }
  return true;
}

const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down'
};
addEventListener('keydown', e => {
  const dir = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
  if (!dir) return;
  e.preventDefault();
  move(dir);
});

let ts = null;
boardEl.addEventListener('touchstart', e => { ts = e.touches[0]; }, { passive: true });
boardEl.addEventListener('touchend', e => {
  if (!ts) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - ts.clientX, dy = t.clientY - ts.clientY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});

document.getElementById('new').addEventListener('click', newGame);

buildBackground();
newGame();
