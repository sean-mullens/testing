const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const msgEl = document.getElementById('msg');
const sizeEl = document.getElementById('size');

let N, state, els, moves, done;

function build() {
  N = Number(sizeEl.value);
  boardEl.style.gridTemplateColumns = `repeat(${N}, 66px)`;
  boardEl.innerHTML = '';
  els = [];
  for (let i = 0; i < N * N; i++) {
    const d = document.createElement('div');
    d.className = 'lamp';
    d.addEventListener('click', () => play(i));
    boardEl.appendChild(d);
    els.push(d);
  }
}

function toggle(i) {
  const x = i % N, y = (i / N) | 0;
  const targets = [i];
  if (x > 0) targets.push(i - 1);
  if (x < N - 1) targets.push(i + 1);
  if (y > 0) targets.push(i - N);
  if (y < N - 1) targets.push(i + N);
  for (const t of targets) state[t] ^= 1;
}

function render() {
  for (let i = 0; i < state.length; i++) els[i].classList.toggle('on', !!state[i]);
}

function newPuzzle() {
  build();
  state = new Array(N * N).fill(0);
  // scrambling with real clicks guarantees the puzzle is solvable
  const clicks = N * N;
  for (let k = 0; k < clicks; k++) if (Math.random() < 0.5) toggle((Math.random() * N * N) | 0);
  if (state.every(v => !v)) return newPuzzle();
  moves = 0; done = false;
  movesEl.textContent = '0';
  msgEl.textContent = 'Clicking a lamp flips it and its four neighbours. Turn every light off.';
  render();
}

function play(i) {
  if (done) return;
  toggle(i);
  moves++;
  movesEl.textContent = moves;
  render();
  if (state.every(v => !v)) {
    done = true;
    msgEl.textContent = `All out in ${moves} moves.`;
  }
}

document.getElementById('new').addEventListener('click', newPuzzle);
sizeEl.addEventListener('change', newPuzzle);
newPuzzle();
