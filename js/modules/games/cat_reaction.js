export function createCatReactionApp(container, options = {}) {
    container.innerHTML = '';
    const totalRounds = options.rounds || 5;
    let currentRound = 0;
    let times = [];
    let state = 'idle';
    let startTime = 0;
    let waitTimeout = null;
    let bestAvg = 0;

    try { bestAvg = parseFloat(localStorage.getItem('meow_reaction_best') || '0'); } catch {}

    function startGame() {
        currentRound = 0;
        times = [];
        const overlay = container.querySelector('.reaction-overlay');
        if (overlay) overlay.style.display = 'none';
        nextRound();
    }

    function nextRound() {
        state = 'waiting';
        updateZone('😼', '等待...', 'var(--color-bg-warm)');

        const delay = 1000 + Math.random() * 3000;
        waitTimeout = setTimeout(() => {
            state = 'ready';
            startTime = performance.now();
            updateZone('🐭', '快点击!', 'var(--color-danger-light)');
        }, delay);
    }

    function handleClick() {
        if (state === 'waiting') {
            clearTimeout(waitTimeout);
            state = 'tooEarly';
            updateZone('🙀', '太早了！点击重试', 'var(--color-orange-light)');
            setTimeout(() => nextRound(), 1000);
        } else if (state === 'ready') {
            const reactionTime = Math.round(performance.now() - startTime);
            times.push(reactionTime);
            currentRound++;
            state = 'clicked';
            updateZone('🐾', `${reactionTime}ms`, 'var(--color-routine-bg)');

            if (currentRound >= totalRounds) {
                setTimeout(showResult, 800);
            } else {
                setTimeout(nextRound, 800);
            }
        }
    }

    function updateZone(emoji, text, bg) {
        const zone = container.querySelector('.reaction-zone');
        if (!zone) return;
        zone.style.background = bg;
        zone.querySelector('.reaction-emoji').textContent = emoji;
        zone.querySelector('.reaction-text').textContent = text;
    }

    function updateInfo() {
        const info = container.querySelector('.reaction-info');
        if (!info) return;
        info.innerHTML = `<span>⚡ ${currentRound}/${totalRounds}</span><span>🏆 ${bestAvg > 0 ? bestAvg + 'ms' : '--'}</span>`;
    }

    function showResult() {
        state = 'result';
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const fastest = Math.min(...times);
        const slowest = Math.max(...times);
        const paws = avg < 250 ? '🐾🐾🐾' : avg < 400 ? '🐾🐾' : '🐾';

        if (avg < bestAvg || bestAvg === 0) {
            bestAvg = avg;
            try { localStorage.setItem('meow_reaction_best', String(bestAvg)); } catch {}
        }

        const overlay = container.querySelector('.reaction-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.querySelector('.reaction-avg').textContent = `${avg}ms`;
            overlay.querySelector('.reaction-fastest').textContent = `${fastest}ms`;
            overlay.querySelector('.reaction-slowest').textContent = `${slowest}ms`;
            overlay.querySelector('.reaction-paws').textContent = paws;
        }
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'reaction-wrapper';

    const info = document.createElement('div');
    info.className = 'reaction-info';
    info.innerHTML = `<span>⚡ 0/${totalRounds}</span><span>🏆 ${bestAvg > 0 ? bestAvg + 'ms' : '--'}</span>`;
    wrapper.appendChild(info);

    const zone = document.createElement('div');
    zone.className = 'reaction-zone';
    zone.innerHTML = `
        <span class="reaction-emoji">🐱</span>
        <span class="reaction-text">点击开始</span>
    `;
    zone.addEventListener('click', () => {
        if (state === 'idle') startGame();
        else handleClick();
    });
    wrapper.appendChild(zone);

    const overlay = document.createElement('div');
    overlay.className = 'reaction-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
        <div class="reaction-overlay-content">
            <div style="font-size:22px;font-weight:bold;color:var(--color-text-title)">测试完成!</div>
            <div class="reaction-paws">🐾</div>
            <div>平均 <span class="reaction-avg">0</span>ms</div>
            <div>最快 <span class="reaction-fastest">0</span>ms</div>
            <div>最慢 <span class="reaction-slowest">0</span>ms</div>
            <button class="reaction-btn" id="reaction-restart">再来一次</button>
        </div>
    `;
    wrapper.appendChild(overlay);
    overlay.querySelector('#reaction-restart').addEventListener('click', startGame);

    container.appendChild(wrapper);

    return {
        destroy() {
            clearTimeout(waitTimeout);
        }
    };
}
