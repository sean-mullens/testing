const boardEl = document.getElementById('board');
const padEl = document.getElementById('pad');
const msgEl = document.getElementById('msg');
const timeEl = document.getElementById('time');
const diffEl = document.getElementById('diff');

let solution, puzzle, given, cells, sel = 0, seconds = 0, timer = null, done = false;

const rowOf = i => (i / 9) | 0;
const colOf = i => i % 9;
const boxOf = i => ((rowOf(i) / 3) | 0) * 3 + ((colOf(i) / 3) | 0);

function allowed(b, i, v) {
  const r = rowOf(i), c = colOf(i), br = (r / 3 | 0) * 3, bc = (c / 3 | 0) * 3;
  for (let k = 0; k < 9; k++) {
    if (b[r * 9 + k] === v) return false;
    if (b[k * 9 + c] === v) return false;
    if (b[(br + (k / 3 | 0)) * 9 + bc + (k % 3)] === v) return false;
  }
  return true;
}

function shuffled(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fill(b, i = 0) {
  if (i === 81) return true;
  if (b[i]) return fill(b, i + 1);
  for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (allowed(b, i, v)) {
      b[i] = v;
      if (fill(b, i + 1)) return true;
      b[i] = 0;
    }
  }
  return false;
}

// counts up to `limit` solutions so we can prove the puzzle has exactly one
function countSolutions(b, limit = 2) {
  let i = b.indexOf(0);
  if (i === -1) return 1;
  let total = 0;
  for (let v = 1; v <= 9; v++) {
    if (!allowed(b, i, v)) continue;
    b[i] = v;
    total += countSolutions(b, limit - total);
    b[i] = 0;
    if (total >= limit) break;
  }
  return total;
}

function generate(holes) {
  solution = new Array(81).fill(0);
  fill(solution);
  puzzle = solution.slice();
  let removed = 0;
  for (const i of shuffled([...Array(81).keys()])) {
    if (removed >= holes) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle.slice(), 2) !== 1) puzzle[i] = backup;
    else removed++;
  }
  given = puzzle.map(v => v !== 0);
}

function build() {
  boardEl.innerHTML = '';
  cells = [];
  for (let i = 0; i < 81; i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    if (colOf(i) % 3 === 2 && colOf(i) !== 8) d.classList.add('br');
    if (rowOf(i) % 3 === 2 && rowOf(i) !== 8) d.classList.add('bb');
    d.addEventListener('click', () => { sel = i; render(); });
    boardEl.appendChild(d);
    cells.push(d);
  }
  padEl.innerHTML = '';
  for (let v = 1; v <= 9; v++) {
    const b = document.createElement('button');
    b.textContent = v;
    b.addEventListener('click', () => enter(v));
    padEl.appendChild(b);
  }
}

function conflicts(i) {
  const v = puzzle[i];
  if (!v) return false;
  for (let k = 0; k < 81; k++) {
    if (k === i || puzzle[k] !== v) continue;
    if (rowOf(k) === rowOf(i) || colOf(k) === colOf(i) || boxOf(k) === boxOf(i)) return true;
  }
  return false;
}

function render() {
  for (let i = 0; i < 81; i++) {
    const el = cells[i];
    el.textContent = puzzle[i] || '';
    el.className = 'cell'
      + (colOf(i) % 3 === 2 && colOf(i) !== 8 ? ' br' : '')
      + (rowOf(i) % 3 === 2 && rowOf(i) !== 8 ? ' bb' : '')
      + (given[i] ? ' given' : '');
    if (i === sel) el.classList.add('sel');
    else if (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel)) el.classList.add('peer');
    if (puzzle[sel] && puzzle[i] === puzzle[sel] && i !== sel) el.classList.add('same');
    if (conflicts(i)) el.classList.add('bad');
  }
}

function enter(v) {
  if (done || given[sel]) return;
  puzzle[sel] = puzzle[sel] === v ? 0 : v;
  render();
  if (puzzle.every((x, i) => x === solution[i])) {
    done = true;
    clearInterval(timer);
    msgEl.textContent = `Solved in ${timeEl.textContent}.`;
  }
}

function tick() {
  seconds++;
  timeEl.textContent = `${(seconds / 60) | 0}:${String(seconds % 60).padStart(2, '0')}`;
}

function newPuzzle() {
  msgEl.textContent = 'Generating…';
  clearInterval(timer);
  setTimeout(() => {
    generate(Number(diffEl.value));
    sel = puzzle.indexOf(0);
    seconds = 0; done = false;
    timeEl.textContent = '0:00';
    timer = setInterval(tick, 1000);
    msgEl.textContent = 'Pick a cell, then type 1–9. Backspace clears it.';
    render();
  }, 10);
}

addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') { enter(Number(e.key)); return; }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    if (!given[sel] && !done) { puzzle[sel] = 0; render(); }
    return;
  }
  const r = rowOf(sel), c = colOf(sel);
  if (e.key === 'ArrowUp' && r > 0) sel -= 9;
  else if (e.key === 'ArrowDown' && r < 8) sel += 9;
  else if (e.key === 'ArrowLeft' && c > 0) sel -= 1;
  else if (e.key === 'ArrowRight' && c < 8) sel += 1;
  else return;
  e.preventDefault();
  render();
});

document.getElementById('new').addEventListener('click', newPuzzle);
diffEl.addEventListener('change', newPuzzle);
document.getElementById('check').addEventListener('click', () => {
  const wrong = puzzle.filter((v, i) => v && v !== solution[i]).length;
  const empty = puzzle.filter(v => !v).length;
  msgEl.textContent = wrong
    ? `${wrong} number${wrong > 1 ? 's are' : ' is'} in the wrong place.`
    : empty ? `Everything so far is correct. ${empty} cells to go.` : 'Solved.';
});
document.getElementById('solve').addEventListener('click', () => {
  puzzle = solution.slice();
  done = true;
  clearInterval(timer);
  render();
  msgEl.textContent = 'Solution revealed. Start a new puzzle when you are ready.';
});

build();
newPuzzle();
