function createCatMemoryApp(container) {
  const emojis = ['🐱', '😺', '😸', '😹', '😻', '😼', '🐟', '🧶'];
  let cards = [], flipped = [], matched = 0, moves = 0, timer = null, seconds = 0, locked = false;

  const style = document.createElement('style');
  style.textContent = `
.memory-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:360px;margin:0 auto;padding:10px}
.memory-card{perspective:600px;cursor:pointer;aspect-ratio:1}
.memory-card-inner{position:relative;width:100%;height:100%;transition:transform 0.5s;transform-style:preserve-3d}
.memory-card.flipped .memory-card-inner,.memory-card.matched .memory-card-inner{transform:rotateY(180deg)}
.memory-card-front,.memory-card-back{position:absolute;width:100%;height:100%;backface-visibility:hidden;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:2rem}
.memory-card-front{background:linear-gradient(135deg,#ffb6c1,#ffd1dc);border:2px solid #f8a4b8;transform:rotateY(180deg)}
.memory-card-back{background:linear-gradient(135deg,#a8e6cf,#dcedc1);border:2px solid #88d8a8;font-size:1.5rem}
.memory-card.matched .memory-card-front{animation:matchPop 0.4s ease}
@keyframes matchPop{0%{transform:rotateY(180deg) scale(1)}50%{transform:rotateY(180deg) scale(1.15)}100%{transform:rotateY(180deg) scale(1)}}
.memory-info{display:flex;justify-content:space-around;max-width:360px;margin:0 auto 10px;padding:8px 0;font-size:0.95rem;color:#555}
.memory-info span{background:#f0f0f0;padding:4px 12px;border-radius:12px}
.memory-result{position:absolute;inset:0;background:rgba(0,0,0,0.55);display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:16px;z-index:10}
.memory-result h3{color:#fff;font-size:1.3rem;margin-bottom:8px}
.memory-result p{color:#eee;font-size:0.95rem;margin:4px 0}
.memory-result .stars{font-size:1.8rem;margin:8px 0}
.memory-btn{margin-top:12px;padding:8px 20px;border:none;border-radius:20px;background:linear-gradient(135deg,#ffb6c1,#ffd1dc);color:#555;font-size:0.95rem;cursor:pointer;transition:transform 0.2s}
.memory-btn:hover{transform:scale(1.05)}
`;
  container.appendChild(style);

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function getStars(m) {
    if (m <= 10) return '⭐⭐⭐';
    if (m <= 16) return '⭐⭐';
    return '⭐';
  }

  function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
      seconds++;
      timeEl.textContent = `⏱ ${formatTime(seconds)}`;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function flipCard(card) {
    if (locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (flipped.length >= 2) return;
    startTimer();
    card.classList.add('flipped');
    flipped.push(card);

    if (flipped.length === 2) {
      moves++;
      movesEl.textContent = `🐾 ${moves} 步`;
      locked = true;
      const [a, b] = flipped;
      if (a.dataset.emoji === b.dataset.emoji) {
        setTimeout(() => {
          a.classList.add('matched');
          b.classList.add('matched');
          matched++;
          flipped = [];
          locked = false;
          if (matched === 8) showResult();
        }, 300);
      } else {
        setTimeout(() => {
          a.classList.remove('flipped');
          b.classList.remove('flipped');
          flipped = [];
          locked = false;
        }, 800);
      }
    }
  }

  function showResult() {
    stopTimer();
    const overlay = document.createElement('div');
    overlay.className = 'memory-result';
    overlay.innerHTML = `
      <h3>🎉 恭喜完成!</h3>
      <div class="stars">${getStars(moves)}</div>
      <p>步数: ${moves}</p>
      <p>用时: ${formatTime(seconds)}</p>
      <button class="memory-btn" id="memRestart">重新开始</button>
    `;
    wrapper.appendChild(overlay);
    overlay.querySelector('#memRestart').addEventListener('click', restart);
  }

  function buildGrid() {
    grid.innerHTML = '';
    const deck = shuffle([...emojis, ...emojis]);
    deck.forEach((emoji) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.emoji = emoji;
      card.innerHTML = `
        <div class="memory-card-inner">
          <div class="memory-card-front">${emoji}</div>
          <div class="memory-card-back">🐾</div>
        </div>`;
      card.addEventListener('click', () => flipCard(card));
      grid.appendChild(card);
    });
  }

  function restart() {
    stopTimer();
    seconds = 0;
    moves = 0;
    matched = 0;
    flipped = [];
    locked = false;
    movesEl.textContent = '🐾 0 步';
    timeEl.textContent = '⏱ 0:00';
    const result = wrapper.querySelector('.memory-result');
    if (result) result.remove();
    buildGrid();
  }

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';

  const info = document.createElement('div');
  info.className = 'memory-info';
  const movesEl = document.createElement('span');
  movesEl.textContent = '🐾 0 步';
  const timeEl = document.createElement('span');
  timeEl.textContent = '⏱ 0:00';
  info.appendChild(movesEl);
  info.appendChild(timeEl);

  const grid = document.createElement('div');
  grid.className = 'memory-grid';

  const restartBtn = document.createElement('button');
  restartBtn.className = 'memory-btn';
  restartBtn.textContent = '重新开始';
  restartBtn.style.display = 'block';
  restartBtn.style.margin = '12px auto 0';
  restartBtn.addEventListener('click', restart);

  wrapper.appendChild(info);
  wrapper.appendChild(grid);
  wrapper.appendChild(restartBtn);
  container.appendChild(wrapper);

  buildGrid();

  return {
    destroy() {
      stopTimer();
    }
  };
}

export { createCatMemoryApp };
