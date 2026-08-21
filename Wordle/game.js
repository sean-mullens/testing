const gridEl = document.getElementById('grid');
const kbEl = document.getElementById('kb');
const msgEl = document.getElementById('msg');

const ROWS = 6, LEN = 5;
const KB = ['qwertyuiop', 'asdfghjkl', '\u21B5zxcvbnm\u232B'];
const VALID = new Set(WORDS);

let answer, guesses, current, finished, keyState;

function build() {
  gridEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    for (let c = 0; c < LEN; c++) {
      const t = document.createElement('div');
      t.className = 'tile';
      row.appendChild(t);
    }
    gridEl.appendChild(row);
  }
  kbEl.innerHTML = '';
  for (const line of KB) {
    const kr = document.createElement('div');
    kr.className = 'krow';
    for (const ch of line) {
      const b = document.createElement('button');
      b.className = 'key';
      b.dataset.k = ch;
      b.textContent = ch === '\u21B5' ? 'Enter' : ch === '\u232B' ? 'Del' : ch;
      b.addEventListener('click', () => handle(ch === '\u21B5' ? 'Enter' : ch === '\u232B' ? 'Backspace' : ch));
      kr.appendChild(b);
    }
    kbEl.appendChild(kr);
  }
}

function newGame() {
  answer = WORDS[(Math.random() * WORDS.length) | 0];
  guesses = [];
  current = '';
  finished = false;
  keyState = {};
  build();
  msgEl.textContent = 'Guess the five-letter word in six tries.';
}

// two passes so repeated letters are scored the way Wordle does it
function score(guess, target) {
  const res = new Array(LEN).fill('miss');
  const left = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === target[i]) res[i] = 'hit';
    else left[target[i]] = (left[target[i]] || 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] === 'hit') continue;
    if (left[guess[i]] > 0) { res[i] = 'near'; left[guess[i]]--; }
  }
  return res;
}

function drawCurrent() {
  const row = gridEl.children[guesses.length];
  if (!row) return;
  for (let i = 0; i < LEN; i++) {
    const t = row.children[i];
    t.textContent = current[i] || '';
    t.classList.toggle('filled', !!current[i]);
  }
}

const RANK = { miss: 0, near: 1, hit: 2 };

function submit() {
  if (current.length < LEN) { flash('Not enough letters'); return; }
  if (!VALID.has(current)) { flash('That word is not in the list'); return; }

  const res = score(current, answer);
  const row = gridEl.children[guesses.length];
  const word = current;
  guesses.push(word);
  current = '';

  res.forEach((r, i) => {
    setTimeout(() => {
      const t = row.children[i];
      t.classList.add(r);
      const ch = word[i];
      if (!keyState[ch] || RANK[r] > RANK[keyState[ch]]) {
        keyState[ch] = r;
        const key = kbEl.querySelector(`[data-k="${ch}"]`);
        if (key) { key.classList.remove('hit', 'near', 'miss'); key.classList.add(r); }
      }
    }, i * 220);
  });

  setTimeout(() => {
    if (word === answer) {
      finished = true;
      const n = guesses.length;
      msgEl.textContent = n === 1 ? 'First try. Remarkable.' : `Got it in ${n} guesses.`;
    } else if (guesses.length === ROWS) {
      finished = true;
      msgEl.textContent = `Out of guesses — the word was ${answer.toUpperCase()}.`;
    }
  }, LEN * 220);
}

function flash(text) {
  msgEl.textContent = text;
  const row = gridEl.children[guesses.length];
  if (row) {
    row.classList.add('shake');
    setTimeout(() => row.classList.remove('shake'), 340);
  }
}

function handle(key) {
  if (finished) return;
  if (key === 'Enter') submit();
  else if (key === 'Backspace') { current = current.slice(0, -1); drawCurrent(); }
  else if (/^[a-z]$/.test(key) && current.length < LEN) { current += key; drawCurrent(); }
}

addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'Enter' || k === 'Backspace' || /^[a-z]$/.test(k)) e.preventDefault();
  handle(k);
});

document.getElementById('new').addEventListener('click', newGame);
newGame();
