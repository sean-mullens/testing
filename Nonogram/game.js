const wrap = document.getElementById('wrap');
const msgEl = document.getElementById('msg');
const sizeEl = document.getElementById('size');

let N, pattern, rowClues, colClues, state, cellEls, solved;
let dragging = false, dragValue = 0;

function cluesOf(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out;
}

// every arrangement of a clue inside a line of the given length
function placements(clue, len) {
  const res = [];
  (function go(i, start, arr) {
    if (i === clue.length) {
      const a = arr.slice();
      while (a.length < len) a.push(0);
      res.push(a);
      return;
    }
    const need = clue.slice(i).reduce((s, v) => s + v, 0) + (clue.length - i - 1);
    for (let p = start; p + need <= len; p++) {
      const a = arr.slice();
      while (a.length < p) a.push(0);
      for (let k = 0; k < clue[i]; k++) a.push(1);
      if (i < clue.length - 1) a.push(0);
      go(i + 1, a.length, a);
    }
  })(0, 0, []);
  return res;
}

// constraint-propagation solver: true only if the puzzle needs no guessing
function logicallySolvable(rc, cc, n) {
  const st = Array.from({ length: n }, () => Array(n).fill(-1));
  let rowOpts, colOpts;
  try {
    rowOpts = rc.map(c => placements(c, n));
    colOpts = cc.map(c => placements(c, n));
  } catch { return false; }

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < n; r++) {
      const opts = rowOpts[r].filter(o => o.every((v, c) => st[r][c] < 0 || st[r][c] === v));
      if (!opts.length) return false;
      rowOpts[r] = opts;
      for (let c = 0; c < n; c++) {
        if (st[r][c] >= 0) continue;
        const v = opts[0][c];
        if (opts.every(o => o[c] === v)) { st[r][c] = v; changed = true; }
      }
    }
    for (let c = 0; c < n; c++) {
      const opts = colOpts[c].filter(o => o.every((v, r) => st[r][c] < 0 || st[r][c] === v));
      if (!opts.length) return false;
      colOpts[c] = opts;
      for (let r = 0; r < n; r++) {
        if (st[r][c] >= 0) continue;
        const v = opts[0][r];
        if (opts.every(o => o[r] === v)) { st[r][c] = v; changed = true; }
      }
    }
  }
  return st.every(row => row.every(v => v >= 0));
}

function generate(n) {
  for (let attempt = 0; attempt < 250; attempt++) {
    const density = 0.45 + Math.random() * 0.2;
    const p = Array.from({ length: n }, () => Array.from({ length: n }, () => Math.random() < density ? 1 : 0));
    const rc = p.map(cluesOf);
    const cc = [];
    for (let c = 0; c < n; c++) cc.push(cluesOf(p.map(r => r[c])));
    if (rc.some(c => !c.length) || cc.some(c => !c.length)) continue;
    if (logicallySolvable(rc, cc, n)) return { pattern: p, rowClues: rc, colClues: cc };
  }
  // fall back to whatever we last built rather than hanging
  const p = Array.from({ length: n }, () => Array.from({ length: n }, () => Math.random() < 0.5 ? 1 : 0));
  const rc = p.map(cluesOf);
  const cc = [];
  for (let c = 0; c < n; c++) cc.push(cluesOf(p.map(r => r[c])));
  return { pattern: p, rowClues: rc, colClues: cc };
}

function newPuzzle() {
  N = Number(sizeEl.value);
  msgEl.textContent = 'Generating…';
  setTimeout(() => {
    const g = generate(N);
    pattern = g.pattern; rowClues = g.rowClues; colClues = g.colClues;
    state = Array.from({ length: N }, () => Array(N).fill(0)); // 0 empty, 1 filled, 2 marked
    solved = false;
    render();
    msgEl.textContent = 'Left click fills, right click marks a blank.';
  }, 10);
}

function render() {
  const clueW = 34 + 12 * Math.max(...rowClues.map(c => c.length));
  const clueH = 30 + 14 * Math.max(...colClues.map(c => c.length));
  wrap.style.gridTemplateColumns = `${clueW}px repeat(${N}, 30px)`;
  wrap.style.gridTemplateRows = `${clueH}px repeat(${N}, 30px)`;
  wrap.innerHTML = '';
  cellEls = [];

  const corner = document.createElement('div');
  wrap.appendChild(corner);

  for (let c = 0; c < N; c++) {
    const d = document.createElement('div');
    d.className = 'clue col';
    d.dataset.col = c;
    d.innerHTML = colClues[c].map(v => `<span>${v}</span>`).join('');
    wrap.appendChild(d);
  }

  for (let r = 0; r < N; r++) {
    const rd = document.createElement('div');
    rd.className = 'clue row';
    rd.dataset.row = r;
    rd.innerHTML = rowClues[r].map(v => `<span>${v}</span>`).join('');
    wrap.appendChild(rd);
    const row = [];
    for (let c = 0; c < N; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (c % 5 === 4) cell.classList.add('edgeR');
      if (r % 5 === 4) cell.classList.add('edgeB');
      cell.dataset.r = r; cell.dataset.c = c;
      wrap.appendChild(cell);
      row.push(cell);
    }
    cellEls.push(row);
  }
  paintAll();
}

function paintCell(r, c) {
  const el = cellEls[r][c], v = state[r][c];
  el.classList.toggle('fill', v === 1);
  el.classList.toggle('mark', v === 2);
  el.textContent = v === 2 ? '×' : '';
}

function paintAll() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) paintCell(r, c);
  updateClues();
}

function updateClues() {
  wrap.querySelectorAll('.clue.row').forEach(el => {
    const r = Number(el.dataset.row);
    const line = state[r].map(v => v === 1 ? 1 : 0);
    el.classList.toggle('done', cluesOf(line).join() === rowClues[r].join());
  });
  wrap.querySelectorAll('.clue.col').forEach(el => {
    const c = Number(el.dataset.col);
    const line = state.map(row => row[c] === 1 ? 1 : 0);
    el.classList.toggle('done', cluesOf(line).join() === colClues[c].join());
  });
}

function checkWin() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (pattern[r][c] === 1 && state[r][c] !== 1) return;
    if (pattern[r][c] === 0 && state[r][c] === 1) return;
  }
  solved = true;
  msgEl.textContent = 'Solved. The picture is complete.';
}

function set(r, c, v) {
  if (solved || state[r][c] === v) return;
  state[r][c] = v;
  paintCell(r, c);
  updateClues();
  checkWin();
}

wrap.addEventListener('mousedown', e => {
  const cell = e.target.closest('.cell');
  if (!cell || solved) return;
  e.preventDefault();
  const r = +cell.dataset.r, c = +cell.dataset.c;
  const want = e.button === 2 ? 2 : 1;
  dragValue = state[r][c] === want ? 0 : want;
  dragging = true;
  set(r, c, dragValue);
});
wrap.addEventListener('mouseover', e => {
  if (!dragging) return;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  set(+cell.dataset.r, +cell.dataset.c, dragValue);
});
addEventListener('mouseup', () => { dragging = false; });
wrap.addEventListener('contextmenu', e => e.preventDefault());

document.getElementById('new').addEventListener('click', newPuzzle);
document.getElementById('clear').addEventListener('click', () => {
  if (!state) return;
  state = state.map(row => row.map(() => 0));
  solved = false;
  paintAll();
});
sizeEl.addEventListener('change', newPuzzle);
newPuzzle();
