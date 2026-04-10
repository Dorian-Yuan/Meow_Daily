const DIFFICULTIES = {
    easy: { time: 30, baseDisplay: 1800, minDisplay: 1200, doubleMouseAt: 999, bombChance: 0 },
    medium: { time: 30, baseDisplay: 1500, minDisplay: 800, doubleMouseAt: 15, bombChance: 0 },
    hard: { time: 45, baseDisplay: 1200, minDisplay: 600, doubleMouseAt: 10, bombChance: 0.1 }
};

const COMBO_MULTIPLIERS = [1, 1, 1.5, 2, 2.5, 3];

export function createWhackMouseApp(container, options = {}) {
    container.innerHTML = '';
    container.style.position = 'relative';

    const defaultDiff = options.difficulty || 'medium';
    let currentDiff = defaultDiff;

    let score = 0;
    let timeLeft = DIFFICULTIES[currentDiff].time;
    let gameRunning = false;
    let timerInterval = null;
    let mouseTimeouts = [];
    let combo = 0;
    let maxCombo = 0;
    let lastHitTime = 0;

    const info = document.createElement('div');
    info.className = 'whack-info';
    container.appendChild(info);

    const grid = document.createElement('div');
    grid.className = 'whack-grid';
    const holes = [];
    for (let i = 0; i < 9; i++) {
        const hole = document.createElement('div');
        hole.className = 'whack-hole';
        const mouse = document.createElement('div');
        mouse.className = 'whack-mouse';
        mouse.textContent = '🐭';
        hole.appendChild(mouse);
        hole.addEventListener('click', () => handleClick(i));
        grid.appendChild(hole);
        holes.push({ el: hole, mouse, active: false, type: 'normal' });
    }
    container.appendChild(grid);

    function updateInfo() {
        const diff = DIFFICULTIES[currentDiff];
        const timeClass = timeLeft <= 5 ? 'whack-time-warning' : '';
        const comboText = combo >= 2 ? `<span class="whack-combo">${combo}连击! ×${COMBO_MULTIPLIERS[Math.min(combo, 5)]}</span>` : '';
        info.innerHTML = `<span>🐾 ${score}</span>${comboText}<span class="${timeClass}">⏱ ${timeLeft}s</span>`;
    }

    function getDisplayTime() {
        const diff = DIFFICULTIES[currentDiff];
        const elapsed = diff.time - timeLeft;
        const progress = elapsed / diff.time;
        return Math.max(diff.minDisplay, diff.baseDisplay - progress * (diff.baseDisplay - diff.minDisplay));
    }

    function spawnMouse() {
        if (!gameRunning) return;
        const available = holes.filter(h => !h.active);
        if (available.length === 0) return;
        const hole = available[Math.floor(Math.random() * available.length)];
        const diff = DIFFICULTIES[currentDiff];

        let type = 'normal';
        const rand = Math.random();
        if (diff.bombChance > 0 && rand < diff.bombChance) type = 'bomb';
        else if (rand < diff.bombChance + 0.15) type = 'golden';

        hole.active = true;
        hole.type = type;
        hole.mouse.className = 'whack-mouse visible';

        if (type === 'golden') {
            hole.mouse.textContent = '🐹';
            hole.mouse.classList.add('golden');
        } else if (type === 'bomb') {
            hole.mouse.textContent = '💣';
            hole.mouse.classList.add('bomb');
        } else {
            hole.mouse.textContent = '🐭';
        }

        const displayTime = type === 'golden' ? getDisplayTime() * 0.7 : getDisplayTime();
        const tid = setTimeout(() => {
            if (hole.active && gameRunning) {
                hole.mouse.className = 'whack-mouse missed';
                hole.mouse.textContent = '😏';
                if (type !== 'bomb') {
                    combo = 0;
                    updateInfo();
                }
                const missTid = setTimeout(() => {
                    hole.mouse.className = 'whack-mouse';
                    hole.mouse.textContent = '🐭';
                    hole.active = false;
                    hole.type = 'normal';
                }, 400);
                mouseTimeouts.push(missTid);
            }
            hole.active = false;
        }, displayTime);
        mouseTimeouts.push(tid);
    }

    function scheduleSpawn() {
        if (!gameRunning) return;
        const diff = DIFFICULTIES[currentDiff];
        const elapsed = diff.time - timeLeft;
        const delay = 600 + Math.random() * 800;
        const tid = setTimeout(() => {
            spawnMouse();
            scheduleSpawn();
            if (elapsed >= diff.doubleMouseAt) {
                const tid2 = setTimeout(() => spawnMouse(), 200 + Math.random() * 400);
                mouseTimeouts.push(tid2);
            }
        }, delay);
        mouseTimeouts.push(tid);
    }

    function handleClick(index) {
        const hole = holes[index];
        if (!hole.active || !gameRunning) return;
        hole.active = false;

        const now = Date.now();
        const type = hole.type;

        if (type === 'bomb') {
            score = Math.max(0, score - 20);
            combo = 0;
            hole.mouse.className = 'whack-mouse hit';
            hole.mouse.textContent = '💥';

            const floater = document.createElement('div');
            floater.className = 'whack-float penalty';
            floater.textContent = '-20';
            floater.style.left = '50%';
            floater.style.top = '10%';
            floater.style.transform = 'translateX(-50%)';
            hole.el.appendChild(floater);

            grid.classList.add('whack-shake');
            setTimeout(() => grid.classList.remove('whack-shake'), 150);

            setTimeout(() => {
                floater.remove();
                hole.mouse.className = 'whack-mouse';
                hole.mouse.textContent = '🐭';
                hole.type = 'normal';
            }, 600);
        } else {
            if (now - lastHitTime < 2000) combo++;
            else combo = 1;
            lastHitTime = now;
            if (combo > maxCombo) maxCombo = combo;

            const multiplier = COMBO_MULTIPLIERS[Math.min(combo, 5)];
            const baseScore = type === 'golden' ? 30 : 10;
            const points = Math.round(baseScore * multiplier);
            score += points;

            hole.mouse.className = 'whack-mouse hit';
            hole.mouse.textContent = '🐾';

            const splash = document.createElement('div');
            splash.className = 'whack-splash';
            splash.textContent = type === 'golden' ? '✨' : '🐾';
            splash.style.left = '50%';
            splash.style.top = '30%';
            splash.style.transform = 'translateX(-50%)';
            hole.el.appendChild(splash);

            const floater = document.createElement('div');
            floater.className = 'whack-float';
            floater.textContent = `+${points}`;
            floater.style.left = '50%';
            floater.style.top = '10%';
            floater.style.transform = 'translateX(-50%)';
            hole.el.appendChild(floater);

            setTimeout(() => {
                splash.remove();
                floater.remove();
                hole.mouse.className = 'whack-mouse';
                hole.mouse.textContent = '🐭';
                hole.type = 'normal';
            }, 600);
        }

        updateInfo();
    }

    function getBestKey() {
        return `meow_whack_best_${currentDiff}`;
    }

    function loadBest() {
        try { return parseInt(localStorage.getItem(getBestKey()) || '0'); } catch { return 0; }
    }

    function saveBest(s) {
        const best = loadBest();
        if (s > best) {
            localStorage.setItem(getBestKey(), String(s));
            return true;
        }
        return false;
    }

    function endGame() {
        gameRunning = false;
        clearInterval(timerInterval);
        mouseTimeouts.forEach(t => clearTimeout(t));
        mouseTimeouts = [];
        holes.forEach(h => {
            h.active = false;
            h.mouse.className = 'whack-mouse';
            h.mouse.textContent = '🐭';
            h.type = 'normal';
        });

        const isNewRecord = saveBest(score);
        const best = loadBest();
        const paws = score >= 150 ? '🐾🐾🐾' : score >= 80 ? '🐾🐾' : '🐾';

        const result = document.createElement('div');
        result.className = 'whack-result';
        result.innerHTML = `
            <div class="whack-result-content">
                <div style="font-size:22px;color:var(--color-text-title);font-weight:bold">游戏结束!</div>
                <div class="score">${score} 分</div>
                <div class="rating">${paws}</div>
                ${maxCombo >= 3 ? `<div class="combo-best">最高连击: ${maxCombo}连!</div>` : ''}
                ${isNewRecord ? '<div class="new-record">🏆 新纪录！</div>' : ''}
                ${best > 0 ? `<div class="best-score">最高分: ${best}</div>` : ''}
                <button class="whack-btn">再来一局</button>
            </div>
        `;
        result.querySelector('.whack-btn').addEventListener('click', () => {
            result.remove();
            startGame();
        });
        container.appendChild(result);
    }

    function startGame() {
        const diff = DIFFICULTIES[currentDiff];
        score = 0;
        timeLeft = diff.time;
        combo = 0;
        maxCombo = 0;
        lastHitTime = 0;
        gameRunning = true;
        mouseTimeouts = [];
        updateInfo();
        holes.forEach(h => {
            h.active = false;
            h.mouse.className = 'whack-mouse';
            h.mouse.textContent = '🐭';
            h.type = 'normal';
        });
        timerInterval = setInterval(() => {
            timeLeft--;
            updateInfo();
            if (timeLeft <= 3 && timeLeft > 0) {
                grid.classList.add('whack-shake');
                setTimeout(() => grid.classList.remove('whack-shake'), 150);
            }
            if (timeLeft <= 0) endGame();
        }, 1000);
        scheduleSpawn();
    }

    startGame();

    return {
        destroy() {
            gameRunning = false;
            clearInterval(timerInterval);
            mouseTimeouts.forEach(t => clearTimeout(t));
            mouseTimeouts = [];
        }
    };
}
