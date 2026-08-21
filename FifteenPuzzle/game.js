const N = 4, TILE = 96, GAP = 12;
const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const msgEl = document.getElementById('msg');

let board;      // board[i] = tile number (0 = empty)
let els = {};   // tile number -> element
let moves, seconds, timer, running, solved;

function xy(i) { return { x: GAP + (i % N) * (TILE + GAP), y: GAP + ((i / N) | 0) * (TILE + GAP) }; }

function build() {
  boardEl.innerHTML = '';
  els = {};
  for (let n = 1; n < N * N; n++) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.textContent = n;
    el.addEventListener('click', () => clickTile(n));
    boardEl.appendChild(el);
    els[n] = el;
  }
}

function render() {
  for (let i = 0; i < board.length; i++) {
    const n = board[i];
    if (!n) continue;
    const p = xy(i);
    els[n].style.transform = `translate(${p.x}px, ${p.y}px)`;
    els[n].classList.toggle('home', n === i + 1);
  }
}

function shuffle() {
  board = [...Array(N * N).keys()].map(i => (i + 1) % (N * N)); // 1..15 then 0
  // only ever apply legal moves, so the result is always solvable
  let blank = board.indexOf(0), prev = -1;
  for (let k = 0; k < 400; k++) {
    const opts = neighboursOf(blank).filter(i => i !== prev);
    const pick = opts[(Math.random() * opts.length) | 0];
    board[blank] = board[pick];
    board[pick] = 0;
    prev = blank;
    blank = pick;
  }
  if (isSolved()) return shuffle();
  moves = 0; seconds = 0; running = false; solved = false;
  clearInterval(timer);
  movesEl.textContent = '0';
  timeEl.textContent = '0';
  msgEl.textContent = 'Click a tile next to the gap, or use the arrow keys.';
  render();
}

function neighboursOf(i) {
  const x = i % N, y = (i / N) | 0, out = [];
  if (x > 0) out.push(i - 1);
  if (x < N - 1) out.push(i + 1);
  if (y > 0) out.push(i - N);
  if (y < N - 1) out.push(i + N);
  return out;
}

function isSolved() {
  for (let i = 0; i < N * N - 1; i++) if (board[i] !== i + 1) return false;
  return board[N * N - 1] === 0;
}

function slide(from) {
  const blank = board.indexOf(0);
  if (!neighboursOf(blank).includes(from)) return;
  board[blank] = board[from];
  board[from] = 0;
  moves++;
  movesEl.textContent = moves;
  if (!running) { running = true; timer = setInterval(() => { seconds++; timeEl.textContent = seconds; }, 1000); }
  render();
  if (isSolved()) {
    solved = true;
    running = false;
    clearInterval(timer);
    msgEl.textContent = `Solved in ${moves} moves and ${seconds}s.`;
  }
}

function clickTile(n) {
  if (solved) return;
  slide(board.indexOf(n));
}

addEventListener('keydown', e => {
  if (solved) return;
  const blank = board.indexOf(0);
  const x = blank % N, y = (blank / N) | 0;
  let from = -1;
  // arrow key moves the tile in that direction into the gap
  if (e.key === 'ArrowUp' && y < N - 1) from = blank + N;
  else if (e.key === 'ArrowDown' && y > 0) from = blank - N;
  else if (e.key === 'ArrowLeft' && x < N - 1) from = blank + 1;
  else if (e.key === 'ArrowRight' && x > 0) from = blank - 1;
  else return;
  e.preventDefault();
  slide(from);
});

document.getElementById('new').addEventListener('click', shuffle);
build();
shuffle();
