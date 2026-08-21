const boardEl = document.getElementById('board');
const msgEl = document.getElementById('msg');
const diffEl = document.getElementById('diff');
const sideEl = document.getElementById('side');
const wEl = document.getElementById('w'), dEl = document.getElementById('d'), lEl = document.getElementById('l');

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let board, human, cpu, turn, over, tally = { w: 0, d: 0, l: 0 }, squares = [];

function build() {
  boardEl.innerHTML = '';
  squares = [];
  for (let i = 0; i < 9; i++) {
    const d = document.createElement('div');
    d.className = 'sq';
    d.addEventListener('click', () => play(i));
    boardEl.appendChild(d);
    squares.push(d);
  }
}

function winnerOf(b) {
  for (const [a, x, c] of LINES) if (b[a] && b[a] === b[x] && b[a] === b[c]) return { mark: b[a], line: [a, x, c] };
  return b.includes('') ? null : { mark: 'draw', line: [] };
}

function minimax(b, player, depth) {
  const res = winnerOf(b);
  if (res) {
    if (res.mark === cpu) return { score: 10 - depth };
    if (res.mark === human) return { score: depth - 10 };
    return { score: 0 };
  }
  let best = null;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = player;
    const { score } = minimax(b, player === 'X' ? 'O' : 'X', depth + 1);
    b[i] = '';
    if (!best || (player === cpu ? score > best.score : score < best.score)) best = { score, move: i };
  }
  return best;
}

function cpuMove() {
  const empty = [...board.keys()].filter(i => !board[i]);
  if (!empty.length) return;
  const level = diffEl.value;
  const blunder = level === 'easy' ? 0.65 : level === 'medium' ? 0.25 : 0;
  const move = Math.random() < blunder
    ? empty[(Math.random() * empty.length) | 0]
    : minimax(board.slice(), cpu, 0).move;
  place(move, cpu);
}

function place(i, mark) {
  board[i] = mark;
  squares[i].textContent = mark;
  squares[i].classList.add(mark.toLowerCase());
  const res = winnerOf(board);
  if (res) finish(res);
  else turn = turn === 'X' ? 'O' : 'X';
}

function finish(res) {
  over = true;
  res.line.forEach(i => squares[i].classList.add('win'));
  if (res.mark === 'draw') { tally.d++; msgEl.textContent = 'A draw.'; }
  else if (res.mark === human) { tally.w++; msgEl.textContent = 'You win.'; }
  else { tally.l++; msgEl.textContent = 'The computer wins.'; }
  wEl.textContent = tally.w; dEl.textContent = tally.d; lEl.textContent = tally.l;
}

function play(i) {
  if (over || board[i] || turn !== human) return;
  place(i, human);
  if (!over) setTimeout(cpuMove, 180);
}

function newRound() {
  board = Array(9).fill('');
  human = sideEl.value;
  cpu = human === 'X' ? 'O' : 'X';
  turn = 'X';
  over = false;
  build();
  msgEl.textContent = 'Your move.';
  if (turn !== human) setTimeout(cpuMove, 250);
}

document.getElementById('new').addEventListener('click', newRound);
sideEl.addEventListener('change', newRound);
diffEl.addEventListener('change', newRound);
newRound();
