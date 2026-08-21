// # wall, . target, $ crate, * crate on target, @ player, + player on target
const LEVELS = [
  ["########",
   "#      #",
   "#  $.  #",
   "#  @   #",
   "#      #",
   "########"],

  ["#########",
   "#       #",
   "#  ###  #",
   "#  $ .  #",
   "#  @    #",
   "#  ###  #",
   "#       #",
   "#########"],

  ["##########",
   "#        #",
   "#  $  .  #",
   "#        #",
   "#  $  .  #",
   "#   @    #",
   "##########"],

  ["##########",
   "#  #     #",
   "#  #  .  #",
   "#  $     #",
   "#  @     #",
   "#        #",
   "##########"],

  ["##########",
   "#        #",
   "#  $$    #",
   "#  .. @  #",
   "#        #",
   "##########"],

  ["############",
   "#          #",
   "#  #####   #",
   "#  #   #   #",
   "#  # $     #",
   "#  # @     #",
   "#  #####   #",
   "#       .  #",
   "############"]
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const pushesEl = document.getElementById('pushes');
const msgEl = document.getElementById('msg');
const levelEl = document.getElementById('level');

const S = 40;
let walls, targets, boxes, player, W, H, moves, pushes, history, won;

LEVELS.forEach((_, i) => {
  const o = document.createElement('option');
  o.value = i; o.textContent = 'Level ' + (i + 1);
  levelEl.appendChild(o);
});

const key = (x, y) => x + ',' + y;

function load(n) {
  const rows = LEVELS[n];
  W = Math.max(...rows.map(r => r.length));
  H = rows.length;
  walls = new Set(); targets = new Set(); boxes = new Set();
  for (let y = 0; y < H; y++) {
    const row = rows[y].padEnd(W, ' ');
    for (let x = 0; x < W; x++) {
      const ch = row[x];
      if (ch === '#') walls.add(key(x, y));
      if (ch === '.' || ch === '*' || ch === '+') targets.add(key(x, y));
      if (ch === '$' || ch === '*') boxes.add(key(x, y));
      if (ch === '@' || ch === '+') player = { x, y };
    }
  }
  canvas.width = W * S;
  canvas.height = H * S;
  moves = 0; pushes = 0; history = []; won = false;
  movesEl.textContent = '0';
  pushesEl.textContent = '0';
  msgEl.textContent = 'Arrow keys or WASD to push every crate onto a target. U undoes, R resets.';
  draw();
}

function move(dx, dy) {
  if (won) return;
  const nx = player.x + dx, ny = player.y + dy;
  if (walls.has(key(nx, ny))) return;

  let pushed = false;
  if (boxes.has(key(nx, ny))) {
    const bx = nx + dx, by = ny + dy;
    if (walls.has(key(bx, by)) || boxes.has(key(bx, by))) return;
    history.push({ boxes: new Set(boxes), player: { ...player }, moves, pushes });
    boxes.delete(key(nx, ny));
    boxes.add(key(bx, by));
    pushed = true;
  } else {
    history.push({ boxes: new Set(boxes), player: { ...player }, moves, pushes });
  }

  player = { x: nx, y: ny };
  moves++;
  if (pushed) pushes++;
  movesEl.textContent = moves;
  pushesEl.textContent = pushes;
  draw();

  if ([...boxes].every(b => targets.has(b))) {
    won = true;
    const next = Number(levelEl.value) + 1;
    msgEl.textContent = next < LEVELS.length
      ? `Level clear in ${moves} moves. Press N for the next level.`
      : `Every level clear. That was the last one.`;
  }
}

function undo() {
  const prev = history.pop();
  if (!prev) return;
  boxes = prev.boxes; player = prev.player; moves = prev.moves; pushes = prev.pushes; won = false;
  movesEl.textContent = moves;
  pushesEl.textContent = pushes;
  draw();
}

function draw() {
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = key(x, y);
    if (walls.has(k)) {
      ctx.fillStyle = '#333a58';
      ctx.fillRect(x * S, y * S, S, S);
      ctx.fillStyle = '#3d456a';
      ctx.fillRect(x * S + 3, y * S + 3, S - 6, S - 6);
    } else {
      ctx.fillStyle = '#171b28';
      ctx.fillRect(x * S + 1, y * S + 1, S - 2, S - 2);
    }
    if (targets.has(k)) {
      ctx.strokeStyle = '#7de2a8';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * S + 13, y * S + 13, S - 26, S - 26);
    }
  }

  for (const b of boxes) {
    const [x, y] = b.split(',').map(Number);
    const on = targets.has(b);
    ctx.fillStyle = on ? '#4fd18b' : '#e0954a';
    ctx.fillRect(x * S + 5, y * S + 5, S - 10, S - 10);
    ctx.fillStyle = on ? '#2f8f60' : '#a86a2e';
    ctx.fillRect(x * S + 11, y * S + 11, S - 22, S - 22);
  }

  ctx.fillStyle = '#8fb8ff';
  ctx.beginPath();
  ctx.arc(player.x * S + S / 2, player.y * S + S / 2, S * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') { e.preventDefault(); move(0, -1); }
  else if (k === 'arrowdown' || k === 's') { e.preventDefault(); move(0, 1); }
  else if (k === 'arrowleft' || k === 'a') { e.preventDefault(); move(-1, 0); }
  else if (k === 'arrowright' || k === 'd') { e.preventDefault(); move(1, 0); }
  else if (k === 'u') undo();
  else if (k === 'r') load(Number(levelEl.value));
  else if (k === 'n') {
    const next = Number(levelEl.value) + 1;
    if (next < LEVELS.length) { levelEl.value = next; load(next); }
  }
});

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('reset').addEventListener('click', () => load(Number(levelEl.value)));
levelEl.addEventListener('change', () => load(Number(levelEl.value)));
load(0);
