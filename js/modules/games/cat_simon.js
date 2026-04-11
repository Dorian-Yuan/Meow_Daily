const CAT_BUTTONS = [
    { emoji: '😸', color: 'var(--color-routine-fg)', freq: 261.63 },
    { emoji: '😺', color: 'var(--color-food-fg)', freq: 329.63 },
    { emoji: '😻', color: 'var(--color-weight-fg)', freq: 392.00 },
    { emoji: '😼', color: 'var(--color-medical-fg)', freq: 523.25 },
    { emoji: '🙀', color: 'var(--color-success)', freq: 440.00 },
    { emoji: '😾', color: 'var(--color-danger)', freq: 349.23 }
];

export function createCatSimonApp(container, options = {}) {
    container.innerHTML = '';
    const numKeys = options.keys || 4;
    const buttons = CAT_BUTTONS.slice(0, numKeys);

    let sequence = [];
    let playerIndex = 0;
    let level = 0;
    let bestLevel = 0;
    let isPlaying = false;
    let isShowingSequence = false;
    let audioCtx = null;

    try { bestLevel = parseInt(localStorage.getItem('meow_simon_best') || '0'); } catch {}

    function getAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function playTone(freq, duration = 300) {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration / 1000);
        } catch {}
    }

    function playErrorTone() {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch {}
    }

    function highlightButton(idx, duration = 400) {
        const btn = container.querySelectorAll('.simon-btn')[idx];
        if (!btn) return;
        btn.classList.add('highlight');
        playTone(buttons[idx].freq, duration);
        setTimeout(() => btn.classList.remove('highlight'), duration * 0.8);
    }

    function nextRound() {
        level++;
        if (level > bestLevel) {
            bestLevel = level;
            try { localStorage.setItem('meow_simon_best', String(bestLevel)); } catch {}
        }
        sequence.push(Math.floor(Math.random() * numKeys));
        playerIndex = 0;
        updateInfo();
        showSequence();
    }

    function showSequence() {
        isShowingSequence = true;
        const speed = Math.max(300, 600 - level * 20);
        let i = 0;
        const interval = setInterval(() => {
            if (i >= sequence.length) {
                clearInterval(interval);
                isShowingSequence = false;
                return;
            }
            highlightButton(sequence[i], speed);
            i++;
        }, speed + 150);
    }

    function handlePlayerClick(idx) {
        if (isShowingSequence || !isPlaying) return;
        highlightButton(idx, 200);

        if (sequence[playerIndex] === idx) {
            playerIndex++;
            if (playerIndex >= sequence.length) {
                setTimeout(nextRound, 600);
            }
        } else {
            playErrorTone();
            gameOver();
        }
    }

    function gameOver() {
        isPlaying = false;
        updateInfo();
        const overlay = container.querySelector('.simon-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.querySelector('.simon-overlay-level').textContent = level - 1;
        }
    }

    function startGame() {
        sequence = [];
        level = 0;
        isPlaying = true;
        const overlay = container.querySelector('.simon-overlay');
        if (overlay) overlay.style.display = 'none';
        nextRound();
    }

    function updateInfo() {
        const levelEl = container.querySelector('.simon-level');
        const bestEl = container.querySelector('.simon-best');
        if (levelEl) levelEl.textContent = level;
        if (bestEl) bestEl.textContent = bestLevel;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'simon-wrapper';

    const info = document.createElement('div');
    info.className = 'simon-info';
    info.innerHTML = `<span>🔮 关卡 <span class="simon-level">0</span></span><span>🏆 最高 <span class="simon-best">${bestLevel}</span></span>`;
    wrapper.appendChild(info);

    const grid = document.createElement('div');
    grid.className = 'simon-grid';
    grid.style.gridTemplateColumns = numKeys <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';
    buttons.forEach((btn, i) => {
        const el = document.createElement('div');
        el.className = 'simon-btn';
        el.style.background = btn.color;
        el.innerHTML = `<span class="simon-btn-emoji">${btn.emoji}</span>`;
        el.addEventListener('click', () => handlePlayerClick(i));
        grid.appendChild(el);
    });
    wrapper.appendChild(grid);

    const startBtn = document.createElement('button');
    startBtn.className = 'simon-start-btn';
    startBtn.textContent = '开始游戏';
    startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        startGame();
    });
    wrapper.appendChild(startBtn);

    const overlay = document.createElement('div');
    overlay.className = 'simon-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
        <div class="simon-overlay-content">
            <div style="font-size:22px;font-weight:bold;color:var(--color-text-title)">游戏结束!</div>
            <div>到达关卡 <span class="simon-overlay-level">0</span></div>
            <button class="simon-start-btn" id="simon-restart">再来一局</button>
        </div>
    `;
    wrapper.appendChild(overlay);
    overlay.querySelector('#simon-restart').addEventListener('click', startGame);

    container.appendChild(wrapper);

    return {
        destroy() {
            if (audioCtx) audioCtx.close();
        }
    };
}
