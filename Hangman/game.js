const CATEGORIES = {
  Animals: ['elephant', 'penguin', 'giraffe', 'dolphin', 'squirrel', 'leopard', 'tortoise', 'flamingo', 'octopus', 'raccoon'],
  Countries: ['portugal', 'thailand', 'morocco', 'iceland', 'ethiopia', 'malaysia', 'colombia', 'denmark', 'mongolia', 'uruguay'],
  Food: ['spaghetti', 'avocado', 'pancake', 'cinnamon', 'artichoke', 'dumpling', 'espresso', 'pineapple', 'chocolate', 'baguette'],
  Science: ['gravity', 'molecule', 'neutron', 'entropy', 'catalyst', 'velocity', 'chromosome', 'telescope', 'magnetism', 'photosynthesis'],
  Instruments: ['trombone', 'clarinet', 'accordion', 'ukulele', 'timpani', 'harmonica', 'saxophone', 'mandolin', 'cello', 'bagpipes']
};

const canvas = document.getElementById('gallows');
const ctx = canvas.getContext('2d');
const wordEl = document.getElementById('word');
const lettersEl = document.getElementById('letters');
const msgEl = document.getElementById('msg');
const catEl = document.getElementById('cat');
const wrongEl = document.getElementById('wrong');

const MAX = 6;
let word, category, guessed, wrong, over;

function newGame() {
  const cats = Object.keys(CATEGORIES);
  category = cats[(Math.random() * cats.length) | 0];
  const list = CATEGORIES[category];
  word = list[(Math.random() * list.length) | 0];
  guessed = new Set();
  wrong = 0;
  over = false;
  catEl.textContent = category;
  wrongEl.textContent = '0';
  msgEl.textContent = 'Pick a letter. Six wrong guesses and the round is over.';
  buildLetters();
  renderWord();
  draw();
}

function buildLetters() {
  lettersEl.innerHTML = '';
  for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
    const b = document.createElement('button');
    b.textContent = ch;
    b.dataset.ch = ch;
    b.addEventListener('click', () => guess(ch));
    lettersEl.appendChild(b);
  }
}

function renderWord() {
  wordEl.innerHTML = '';
  for (const ch of word) {
    const s = document.createElement('span');
    const shown = guessed.has(ch);
    s.textContent = shown ? ch : '';
    if (shown) s.classList.add('found');
    else if (over) { s.textContent = ch; s.classList.add('missed'); }
    wordEl.appendChild(s);
  }
}

function guess(ch) {
  if (over || guessed.has(ch)) return;
  guessed.add(ch);
  const btn = lettersEl.querySelector(`[data-ch="${ch}"]`);
  if (btn) btn.disabled = true;

  if (!word.includes(ch)) {
    wrong++;
    wrongEl.textContent = wrong;
    if (wrong >= MAX) {
      over = true;
      msgEl.textContent = `Out of guesses — the word was "${word}".`;
    }
  } else if ([...word].every(c => guessed.has(c))) {
    over = true;
    msgEl.textContent = `Solved with ${MAX - wrong} guess${MAX - wrong === 1 ? '' : 'es'} to spare.`;
  }
  renderWord();
  draw();
}

function draw() {
  ctx.fillStyle = '#0c0e15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#4a5280';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  // gallows
  ctx.beginPath();
  ctx.moveTo(30, 220); ctx.lineTo(150, 220);
  ctx.moveTo(75, 220); ctx.lineTo(75, 30);
  ctx.lineTo(180, 30); ctx.lineTo(180, 58);
  ctx.stroke();

  ctx.strokeStyle = '#ff8080';
  ctx.lineWidth = 4;
  const parts = [
    () => { ctx.beginPath(); ctx.arc(180, 80, 22, 0, Math.PI * 2); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.moveTo(180, 102); ctx.lineTo(180, 160); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.moveTo(180, 115); ctx.lineTo(152, 140); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.moveTo(180, 115); ctx.lineTo(208, 140); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.moveTo(180, 160); ctx.lineTo(158, 200); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.moveTo(180, 160); ctx.lineTo(202, 200); ctx.stroke(); }
  ];
  for (let i = 0; i < wrong; i++) parts[i]();
}

addEventListener('keydown', e => {
  const ch = e.key.toLowerCase();
  if (/^[a-z]$/.test(ch)) guess(ch);
});
document.getElementById('new').addEventListener('click', newGame);
newGame();
