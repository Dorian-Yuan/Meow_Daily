const THEMES = {
    cat: ['🐱', '😺', '😸', '😹', '😻', '😼', '🐟', '🧶', '🐾', '🐭'],
    food: ['🍣', '🍕', '🍔', '🌮', '🍜', '🍰', '🍩', '🍪', '🧁', '🍿'],
    nature: ['🌸', '🌺', '🌻', '🌹', '🍀', '🌈', '⭐', '🌙', '☀️', '❄️']
};

const DIFFICULTIES = {
    easy: { cols: 3, rows: 4, pairs: 6, starMoves: [8, 12], starTime: [20, 35] },
    medium: { cols: 4, rows: 4, pairs: 8, starMoves: [12, 18], starTime: [40, 60] },
    hard: { cols: 5, rows: 4, pairs: 10, starMoves: [16, 24], starTime: [60, 90] }
};

function createCatMemoryApp(container, options = {}) {
    const defaultDiff = options.difficulty || 'medium';
    const defaultTheme = options.theme || 'random';

    let cards = [], flipped = [], matched = 0, moves = 0, timer = null, seconds = 0, locked = false;
    let currentDiff = defaultDiff;
    let currentTheme = defaultTheme;

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

    function getStars(m, t) {
        const d = DIFFICULTIES[currentDiff];
        if (m <= d.starMoves[0] && t <= d.starTime[0]) return 3;
        if (m <= d.starMoves[1]) return 2;
        return 1;
    }

    function getBestKey() {
        return `meow_memory_best_${currentDiff}`;
    }

    function loadBest() {
        try { return JSON.parse(localStorage.getItem(getBestKey()) || 'null'); } catch { return null; }
    }

    function saveBest(movesVal, timeVal) {
        const best = loadBest();
        if (!best || movesVal < best.moves || (movesVal === best.moves && timeVal < best.time)) {
            localStorage.setItem(getBestKey(), JSON.stringify({ moves: movesVal, time: timeVal }));
            return true;
        }
        return false;
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

    function getEmojis() {
        const theme = currentTheme === 'random'
            ? ['cat', 'food', 'nature'][Math.floor(Math.random() * 3)]
            : currentTheme;
        return THEMES[theme];
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
                    const diff = DIFFICULTIES[currentDiff];
                    if (matched === diff.pairs) showResult();
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
        const stars = getStars(moves, seconds);
        const isNewRecord = saveBest(moves, seconds);
        const best = loadBest();
        const diff = DIFFICULTIES[currentDiff];

        const overlay = document.createElement('div');
        overlay.className = 'memory-result';
        overlay.innerHTML = `
            <div class="memory-result-content">
                <h3>🎉 恭喜完成!</h3>
                <div class="stars">${'⭐'.repeat(stars)}</div>
                <p>步数: ${moves}</p>
                <p>用时: ${formatTime(seconds)}</p>
                ${isNewRecord ? '<p class="new-record">🏆 新纪录！</p>' : ''}
                ${best ? `<p style="font-size:12px;color:var(--color-text-hint)">最佳: ${best.moves}步 / ${formatTime(best.time)}</p>` : ''}
                <button class="memory-btn" id="memRestart">重新开始</button>
            </div>
        `;
        wrapper.appendChild(overlay);
        overlay.querySelector('#memRestart').addEventListener('click', restart);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        });
    }

    function buildGrid() {
        grid.innerHTML = '';
        const diff = DIFFICULTIES[currentDiff];
        const emojis = getEmojis();
        const deck = shuffle([...emojis.slice(0, diff.pairs), ...emojis.slice(0, diff.pairs)]);
        grid.dataset.cols = diff.cols;
        grid.style.maxWidth = diff.cols <= 3 ? '280px' : diff.cols <= 4 ? '360px' : '420px';

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

    function startWithDifficulty(diff) {
        currentDiff = diff;
        restart();
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

    restart();

    return {
        destroy() {
            stopTimer();
        }
    };
}

export { createCatMemoryApp };
