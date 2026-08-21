const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const msgEl = document.getElementById('msg');
const drawEl = document.getElementById('draw');

const CW = 88, CH = 124, M = 16, GX = 14, FAN_UP = 30, FAN_DOWN = 12;
const TOP_Y = M, TAB_Y = M + CH + 30;
const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
const RED = [false, true, true, false];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let stock, waste, found, tab, drag = null, moves, seconds, timer, won, history;

const colX = i => M + i * (CW + GX);

function newDeal() {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ r, s, up: false });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  tab = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < 7; i++) for (let j = 0; j <= i; j++) {
    const c = deck.pop();
    c.up = j === i;
    tab[i].push(c);
  }
  stock = deck;
  waste = [];
  found = [[], [], [], []];
  drag = null; moves = 0; seconds = 0; won = false; history = [];
  movesEl.textContent = '0';
  timeEl.textContent = '0:00';
  msgEl.textContent = 'Drag cards to build the tableau down in alternating colours. Double click sends a card home.';
  clearInterval(timer);
  timer = setInterval(() => {
    if (won) return;
    seconds++;
    timeEl.textContent = `${(seconds / 60) | 0}:${String(seconds % 60).padStart(2, '0')}`;
  }, 1000);
  draw();
}

function snapshot() {
  history.push(JSON.stringify({ stock, waste, found, tab, moves }));
  if (history.length > 120) history.shift();
}

function undo() {
  const s = history.pop();
  if (!s) return;
  const st = JSON.parse(s);
  ({ stock, waste, found, tab, moves } = st);
  won = false;
  movesEl.textContent = moves;
  draw();
}

function tabCardY(i, j) {
  let y = TAB_Y;
  for (let k = 0; k < j; k++) y += tab[i][k].up ? FAN_UP : FAN_DOWN;
  return y;
}

function wasteVisible() {
  const n = Number(drawEl.value) === 3 ? Math.min(3, waste.length) : Math.min(1, waste.length);
  return waste.slice(waste.length - n);
}

function canStackTab(card, pile) {
  if (!pile.length) return card.r === 13;
  const top = pile[pile.length - 1];
  return top.up && RED[top.s] !== RED[card.s] && top.r === card.r + 1;
}

function canStackFound(card, pile) {
  if (!pile.length) return card.r === 1;
  const top = pile[pile.length - 1];
  return top.s === card.s && top.r === card.r - 1;
}

function countMove() {
  moves++;
  movesEl.textContent = moves;
  if (found.every(f => f.length === 13)) {
    won = true;
    clearInterval(timer);
    msgEl.textContent = `All four suits home in ${moves} moves and ${timeEl.textContent}.`;
  }
}

function flipExposed(i) {
  const p = tab[i];
  if (p.length && !p[p.length - 1].up) p[p.length - 1].up = true;
}

function dealFromStock() {
  snapshot();
  const n = Number(drawEl.value);
  if (!stock.length) {
    if (!waste.length) { history.pop(); return; }
    stock = waste.reverse().map(c => ({ ...c, up: false }));
    waste = [];
  } else {
    for (let k = 0; k < n && stock.length; k++) {
      const c = stock.pop();
      c.up = true;
      waste.push(c);
    }
  }
  countMove();
  draw();
}

function sendHome(card, from) {
  for (let f = 0; f < 4; f++) {
    if (!canStackFound(card, found[f])) continue;
    snapshot();
    if (from.type === 'waste') waste.pop();
    else if (from.type === 'tab') { tab[from.i].pop(); }
    else if (from.type === 'found') found[from.i].pop();
    found[f].push(card);
    if (from.type === 'tab') flipExposed(from.i);
    countMove();
    draw();
    return true;
  }
  return false;
}

function hitTest(mx, my) {
  for (let i = 0; i < 7; i++) {
    const p = tab[i];
    for (let j = p.length - 1; j >= 0; j--) {
      const x = colX(i), y = tabCardY(i, j);
      const bottom = j === p.length - 1 ? y + CH : tabCardY(i, j + 1);
      if (mx >= x && mx <= x + CW && my >= y && my <= bottom) {
        return p[j].up ? { type: 'tab', i, j } : null;
      }
    }
  }
  const vis = wasteVisible();
  if (vis.length) {
    const x = colX(1) + (vis.length - 1) * 22, y = TOP_Y;
    if (mx >= x && mx <= x + CW && my >= y && my <= y + CH) return { type: 'waste', i: 0, j: waste.length - 1 };
  }
  for (let f = 0; f < 4; f++) {
    const x = colX(3 + f), y = TOP_Y;
    if (mx >= x && mx <= x + CW && my >= y && my <= y + CH && found[f].length) return { type: 'found', i: f, j: found[f].length - 1 };
  }
  const sx = colX(0);
  if (mx >= sx && mx <= sx + CW && my >= TOP_Y && my <= TOP_Y + CH) return { type: 'stock' };
  return null;
}

function overlap(ax, ay, bx, by) {
  const ox = Math.min(ax + CW, bx + CW) - Math.max(ax, bx);
  const oy = Math.min(ay + CH, by + CH) - Math.max(ay, by);
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

function dropDrag() {
  const card = drag.cards[0];
  let bestArea = 0, best = null;

  if (drag.cards.length === 1) {
    for (let f = 0; f < 4; f++) {
      if (!canStackFound(card, found[f])) continue;
      const a = overlap(drag.x, drag.y, colX(3 + f), TOP_Y);
      if (a > bestArea) { bestArea = a; best = { type: 'found', i: f }; }
    }
  }
  for (let i = 0; i < 7; i++) {
    if (!canStackTab(card, tab[i])) continue;
    const y = tab[i].length ? tabCardY(i, tab[i].length - 1) + (tab[i][tab[i].length - 1].up ? FAN_UP : FAN_DOWN) : TAB_Y;
    const a = overlap(drag.x, drag.y, colX(i), y);
    if (a > bestArea) { bestArea = a; best = { type: 'tab', i }; }
  }

  if (!best) { drag = null; draw(); return; }

  snapshot();
  if (drag.from.type === 'waste') waste.splice(waste.length - drag.cards.length, drag.cards.length);
  else if (drag.from.type === 'tab') tab[drag.from.i].splice(drag.from.j, drag.cards.length);
  else if (drag.from.type === 'found') found[drag.from.i].splice(found[drag.from.i].length - drag.cards.length, drag.cards.length);

  if (best.type === 'found') found[best.i].push(...drag.cards);
  else tab[best.i].push(...drag.cards);

  if (drag.from.type === 'tab') flipExposed(drag.from.i);
  drag = null;
  countMove();
  draw();
}

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSlot(x, y, glyph) {
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  rr(x, y, CW, CH, 9);
  ctx.stroke();
  if (glyph) {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.font = '34px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(glyph, x + CW / 2, y + CH / 2 + 12);
    ctx.textAlign = 'left';
  }
}

function drawCard(c, x, y) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  if (!c.up) {
    ctx.fillStyle = '#2f3a72';
    rr(x, y, CW, CH, 9);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#4a5aa8';
    ctx.lineWidth = 2;
    rr(x + 7, y + 7, CW - 14, CH - 14, 6);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#f4f2ea';
  rr(x, y, CW, CH, 9);
  ctx.fill();
  ctx.restore();

  const col = RED[c.s] ? '#c0392b' : '#1d2230';
  ctx.fillStyle = col;
  ctx.font = 'bold 20px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(RANKS[c.r], x + 8, y + 26);
  ctx.font = '18px ui-monospace, monospace';
  ctx.fillText(SUITS[c.s], x + 8, y + 46);
  ctx.font = '40px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(SUITS[c.s], x + CW / 2, y + CH / 2 + 22);
  ctx.textAlign = 'left';
}

function draw() {
  ctx.fillStyle = '#14352a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawSlot(colX(0), TOP_Y, stock.length ? '' : '\u21BB');
  if (stock.length) drawCard({ up: false }, colX(0), TOP_Y);

  drawSlot(colX(1), TOP_Y, '');
  wasteVisible().forEach((c, k) => drawCard(c, colX(1) + k * 22, TOP_Y));

  for (let f = 0; f < 4; f++) {
    drawSlot(colX(3 + f), TOP_Y, SUITS[f]);
    const p = found[f];
    if (p.length) drawCard(p[p.length - 1], colX(3 + f), TOP_Y);
  }

  for (let i = 0; i < 7; i++) {
    if (!tab[i].length) drawSlot(colX(i), TAB_Y, '');
    tab[i].forEach((c, j) => drawCard(c, colX(i), tabCardY(i, j)));
  }

  if (drag) drag.cards.forEach((c, k) => drawCard(c, drag.x, drag.y + k * FAN_UP));

  if (won) {
    ctx.fillStyle = 'rgba(10,25,18,0.8)';
    ctx.fillRect(0, canvas.height / 2 - 44, canvas.width, 88);
    ctx.fillStyle = '#e7e9f3';
    ctx.font = '24px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN', canvas.width / 2, canvas.height / 2 + 8);
    ctx.textAlign = 'left';
  }
}

function mouse(e) {
  const rect = canvas.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
  return {
    x: (p.clientX - rect.left) / rect.width * canvas.width,
    y: (p.clientY - rect.top) / rect.height * canvas.height
  };
}

function startDrag(e) {
  if (won) return;
  const { x, y } = mouse(e);
  const h = hitTest(x, y);
  if (!h) return;

  if (h.type === 'stock') { dealFromStock(); return; }

  let cards, ox, oy;
  if (h.type === 'tab') {
    cards = tab[h.i].slice(h.j);
    if (cards.some(c => !c.up)) return;
    ox = x - colX(h.i);
    oy = y - tabCardY(h.i, h.j);
  } else if (h.type === 'waste') {
    cards = [waste[waste.length - 1]];
    const k = wasteVisible().length - 1;
    ox = x - (colX(1) + k * 22);
    oy = y - TOP_Y;
  } else {
    cards = [found[h.i][found[h.i].length - 1]];
    ox = x - colX(3 + h.i);
    oy = y - TOP_Y;
  }
  drag = { cards, from: h, ox, oy, x: x - ox, y: y - oy };
  draw();
}

canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e); }, { passive: false });

function moveDrag(e) {
  if (!drag) return;
  const { x, y } = mouse(e);
  drag.x = x - drag.ox;
  drag.y = y - drag.oy;
  draw();
}
addEventListener('mousemove', moveDrag);
canvas.addEventListener('touchmove', e => { e.preventDefault(); moveDrag(e); }, { passive: false });

function endDrag() { if (drag) dropDrag(); }
addEventListener('mouseup', endDrag);
canvas.addEventListener('touchend', e => { e.preventDefault(); endDrag(); }, { passive: false });

canvas.addEventListener('dblclick', e => {
  if (won) return;
  const { x, y } = mouse(e);
  const h = hitTest(x, y);
  if (!h || h.type === 'stock') return;
  if (h.type === 'tab' && h.j !== tab[h.i].length - 1) return;
  const card = h.type === 'waste' ? waste[waste.length - 1]
    : h.type === 'found' ? found[h.i][found[h.i].length - 1]
      : tab[h.i][h.j];
  if (!sendHome(card, h)) msgEl.textContent = 'That card has nowhere to go yet.';
});

document.getElementById('new').addEventListener('click', newDeal);
document.getElementById('undo').addEventListener('click', undo);
drawEl.addEventListener('change', newDeal);

newDeal();
