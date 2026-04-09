const COLORS = ['#F28C38', '#4066E0', '#10B981', '#FACC15', '#EC4899', '#8B5CF6'];
const TRAIL_MAX = 30;
const BALL_SIZE = 48;
const FISH_SIZE = 32;
const FRICTION = 0.985;
const BOUNCE = 0.7;

export function createYarnBallApp(container, prefs = {}) {
    let colorIndex = 0;
    let ballX, ballY, vx = 0, vy = 0;
    let dragging = false, dragOffsetX = 0, dragOffsetY = 0;
    let lastX = 0, lastY = 0, lastTime = 0;
    let trail = [];
    let animId = null;

    let mode = prefs.mode || 'challenge';
    let challengeTime = prefs.challengeTime || 30;
    let maxFish = prefs.maxFish || 100;
    let gameRunning = false;
    let score = 0;
    let timeLeft = challengeTime;
    let timerInterval = null;
    let fishes = [];

    container.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
        .yarn-mode-tabs{display:flex;gap:6px;margin:8px 16px;background:var(--color-card-bg);border-radius:10px;padding:3px;border:1px solid var(--color-divider)}
        .yarn-mode-tab{flex:1;text-align:center;padding:8px;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;color:var(--color-text-hint)}
        .yarn-mode-tab.active{background:var(--color-primary);color:#fff;box-shadow:0 2px 6px rgba(64,102,224,.3)}
        .yarn-game-hud{display:flex;justify-content:space-between;align-items:center;padding:6px 16px;font-size:16px;font-weight:900;color:var(--color-text-title)}
        .yarn-game-hud .score{color:#F28C38}
        .yarn-game-hud .timer{color:var(--color-primary)}
        .yarn-canvas{flex:1;position:relative;overflow:hidden;touch-action:none}
        .yarn-ball{position:absolute;font-size:40px;cursor:grab;user-select:none;z-index:5;line-height:1;transition:filter .3s}
        .yarn-ball:active{cursor:grabbing}
        .yarn-trail{position:absolute;inset:0;pointer-events:none;z-index:1}
        .yarn-fish{position:absolute;font-size:${FISH_SIZE}px;z-index:3;line-height:1;pointer-events:none;animation:fish-pop .3s ease-out}
        @keyframes fish-pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
        .yarn-fish-collect{animation:fish-collect .3s ease-out forwards}
        @keyframes fish-collect{to{transform:scale(1.5);opacity:0}}
        .yarn-score-pop{position:absolute;font-size:18px;font-weight:900;color:#F28C38;z-index:10;pointer-events:none;animation:score-float .6s ease-out forwards}
        @keyframes score-float{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-30px)}}
        .yarn-result{position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:20;backdrop-filter:blur(4px)}
        .yarn-result-card{background:var(--color-card-bg);padding:32px;border-radius:24px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2);animation:result-pop .4s cubic-bezier(.34,1.56,.64,1) forwards;transform:scale(.9)}
        @keyframes result-pop{to{transform:scale(1)}}
        .yarn-result-card .emoji{font-size:56px;line-height:1;margin-bottom:12px;display:block}
        .yarn-result-card h3{font-size:22px;font-weight:900;color:var(--color-text-title);margin:0 0 8px}
        .yarn-result-card p{font-size:15px;font-weight:700;color:var(--color-text-main);margin:0 0 20px}
        .yarn-result-btn{padding:14px 32px;border:none;border-radius:16px;background:var(--color-primary);color:#fff;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(64,102,224,.3);transition:transform .2s}
        .yarn-result-btn:active{transform:scale(.95)}
        .yarn-start-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:15;background:rgba(0,0,0,.4);backdrop-filter:blur(2px)}
        .yarn-start-overlay .start-emoji{font-size:64px;line-height:1;margin-bottom:16px}
        .yarn-start-overlay .start-title{font-size:20px;font-weight:900;color:#fff;margin-bottom:8px}
        .yarn-start-overlay .start-desc{font-size:13px;color:#ccc;margin-bottom:24px;text-align:center;max-width:240px}
        .yarn-start-btn{padding:14px 36px;border:none;border-radius:16px;background:var(--color-primary);color:#fff;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(64,102,224,.3);transition:transform .2s}
        .yarn-start-btn:active{transform:scale(.95)}
    `;
    container.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'flex:1;display:flex;flex-direction:column;height:100%;overflow:hidden;position:relative';

    const modeTabs = document.createElement('div');
    modeTabs.className = 'yarn-mode-tabs';
    modeTabs.innerHTML = `<div class="yarn-mode-tab ${mode === 'free' ? 'active' : ''}" data-mode="free">🧶 自由</div><div class="yarn-mode-tab ${mode === 'challenge' ? 'active' : ''}" data-mode="challenge">🐟 挑战</div>`;

    const gameHud = document.createElement('div');
    gameHud.className = 'yarn-game-hud';
    gameHud.style.display = mode === 'challenge' ? 'flex' : 'none';
    gameHud.innerHTML = `<span class="score">🐟 × <span id="yarn-score">0</span></span><span class="timer">⏱ <span id="yarn-timer">${challengeTime}</span>s</span>`;

    const canvas = document.createElement('div');
    canvas.className = 'yarn-canvas';

    const trailEl = document.createElement('div');
    trailEl.className = 'yarn-trail';

    const ballEl = document.createElement('div');
    ballEl.className = 'yarn-ball';
    ballEl.textContent = '🧶';

    canvas.append(trailEl, ballEl);
    wrapper.append(modeTabs, gameHud, canvas);
    container.appendChild(wrapper);

    function getBounds() {
        return { w: canvas.clientWidth, h: canvas.clientHeight };
    }

    function initPosition() {
        const b = getBounds();
        ballX = b.w / 2 - BALL_SIZE / 2;
        ballY = b.h / 2 - BALL_SIZE / 2;
    }

    function updateBall() {
        ballEl.style.transform = `translate(${ballX}px, ${ballY}px)`;
        ballEl.style.filter = `drop-shadow(0 2px 6px ${COLORS[colorIndex]}66)`;
    }

    function renderTrail() {
        trailEl.innerHTML = '';
        trail.forEach((pos, i) => {
            const dot = document.createElement('div');
            const opacity = (i + 1) / trail.length * 0.5;
            const size = 6 + (i / trail.length) * 6;
            dot.style.cssText = `position:absolute;left:${pos.x + BALL_SIZE / 2 - size / 2}px;top:${pos.y + BALL_SIZE / 2 - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${COLORS[pos.ci]};opacity:${opacity};pointer-events:none`;
            trailEl.appendChild(dot);
        });
    }

    function spawnFish() {
        if (!gameRunning) return;
        if (fishes.filter(f => f.alive).length >= maxFish) return;
        const b = getBounds();
        const padding = 20;
        const fx = padding + Math.random() * (b.w - FISH_SIZE - padding * 2);
        const fy = padding + Math.random() * (b.h - FISH_SIZE - padding * 2);
        const fishEl = document.createElement('div');
        fishEl.className = 'yarn-fish';
        fishEl.textContent = '🐟';
        fishEl.style.left = fx + 'px';
        fishEl.style.top = fy + 'px';
        canvas.appendChild(fishEl);
        const fish = { el: fishEl, x: fx, y: fy, alive: true };
        fishes.push(fish);

        const elapsed = challengeTime - timeLeft;
        const lifetime = Math.max(2000, 4000 - elapsed * 50);
        setTimeout(() => {
            if (fish.alive) {
                fish.alive = false;
                fish.el.remove();
                fishes = fishes.filter(f => f !== fish);
            }
            if (gameRunning) spawnFish();
        }, lifetime);
    }

    function checkCollision() {
        const bx = ballX + BALL_SIZE / 2;
        const by = ballY + BALL_SIZE / 2;
        for (const fish of fishes) {
            if (!fish.alive) continue;
            const fx = fish.x + FISH_SIZE / 2;
            const fy = fish.y + FISH_SIZE / 2;
            const dist = Math.hypot(bx - fx, by - fy);
            if (dist < (BALL_SIZE + FISH_SIZE) / 2) {
                fish.alive = false;
                fish.el.classList.add('yarn-fish-collect');
                setTimeout(() => fish.el.remove(), 300);
                score++;
                const scoreEl = wrapper.querySelector('#yarn-score');
                if (scoreEl) scoreEl.textContent = score;

                const pop = document.createElement('div');
                pop.className = 'yarn-score-pop';
                pop.textContent = '+1';
                pop.style.left = fish.x + 'px';
                pop.style.top = fish.y + 'px';
                canvas.appendChild(pop);
                setTimeout(() => pop.remove(), 600);

                fishes = fishes.filter(f => f !== fish);
                if (gameRunning) {
                    setTimeout(() => { if (gameRunning) spawnFish(); }, 500);
                }
            }
        }
    }

    function showResult() {
        gameRunning = false;
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        fishes.forEach(f => { if (f.el.parentNode) f.el.remove(); });
        fishes = [];

        let paws = 1;
        if (score >= 8) paws = 3;
        else if (score >= 4) paws = 2;

        const result = document.createElement('div');
        result.className = 'yarn-result';
        result.innerHTML = `
            <div class="yarn-result-card">
                <span class="emoji">🐟</span>
                <h3>收集了 ${score} 条小鱼干！</h3>
                <p>${'🐾'.repeat(paws)}${'🖤'.repeat(3 - paws)}</p>
                <button class="yarn-result-btn">再来一局</button>
            </div>
        `;
        wrapper.appendChild(result);
        result.querySelector('.yarn-result-btn').addEventListener('click', () => {
            result.remove();
            startChallenge();
        });
    }

    function startChallenge() {
        score = 0;
        timeLeft = challengeTime;
        gameRunning = true;
        trail = [];
        trailEl.innerHTML = '';
        fishes.forEach(f => { if (f.el.parentNode) f.el.remove(); });
        fishes = [];

        const scoreEl = wrapper.querySelector('#yarn-score');
        const timerEl = wrapper.querySelector('#yarn-timer');
        if (scoreEl) scoreEl.textContent = '0';
        if (timerEl) timerEl.textContent = challengeTime;

        initPosition();
        vx = 0;
        vy = 0;

        spawnFish();

        timerInterval = setInterval(() => {
            timeLeft--;
            if (timerEl) timerEl.textContent = timeLeft;
            if (timeLeft <= 0) {
                showResult();
            }
        }, 1000);
    }

    function showChallengeStart() {
        const overlay = document.createElement('div');
        overlay.className = 'yarn-start-overlay';
        overlay.innerHTML = `
            <div class="start-emoji">🐟</div>
            <div class="start-title">小鱼干收集</div>
            <div class="start-desc">甩动毛线球，在 ${challengeTime} 秒内收集尽可能多的小鱼干！</div>
            <button class="yarn-start-btn">开始挑战</button>
        `;
        wrapper.appendChild(overlay);
        overlay.querySelector('.yarn-start-btn').addEventListener('click', () => {
            overlay.remove();
            startChallenge();
        });
    }

    function switchMode(newMode) {
        mode = newMode;
        modeTabs.querySelectorAll('.yarn-mode-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.mode === mode);
        });
        gameHud.style.display = mode === 'challenge' ? 'flex' : 'none';

        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        gameRunning = false;
        fishes.forEach(f => { if (f.el.parentNode) f.el.remove(); });
        fishes = [];
        trail = [];
        trailEl.innerHTML = '';
        const existingResult = wrapper.querySelector('.yarn-result');
        if (existingResult) existingResult.remove();
        const existingStart = wrapper.querySelector('.yarn-start-overlay');
        if (existingStart) existingStart.remove();

        initPosition();
        vx = 0;
        vy = 0;

        if (mode === 'challenge') {
            showChallengeStart();
        }
    }

    modeTabs.querySelectorAll('.yarn-mode-tab').forEach(tab => {
        tab.addEventListener('click', () => switchMode(tab.dataset.mode));
    });

    function animate() {
        if (!dragging) {
            vx *= FRICTION;
            vy *= FRICTION;
            ballX += vx;
            ballY += vy;

            const b = getBounds();
            if (ballX < 0) { ballX = 0; vx = -vx * BOUNCE; }
            if (ballX > b.w - BALL_SIZE) { ballX = b.w - BALL_SIZE; vx = -vx * BOUNCE; }
            if (ballY < 0) { ballY = 0; vy = -vy * BOUNCE; }
            if (ballY > b.h - BALL_SIZE) { ballY = b.h - BALL_SIZE; vy = -vy * BOUNCE; }

            if (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) {
                trail.push({ x: ballX, y: ballY, ci: colorIndex });
                if (trail.length > TRAIL_MAX) trail.shift();
            } else {
                vx = 0;
                vy = 0;
            }
        }

        updateBall();
        renderTrail();

        if (gameRunning) {
            checkCollision();
        }

        animId = requestAnimationFrame(animate);
    }

    function getPointerPos(e) {
        const touch = e.touches ? e.touches[0] : e;
        const rect = canvas.getBoundingClientRect();
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function onPointerDown(e) {
        e.preventDefault();
        const pos = getPointerPos(e);
        const dx = pos.x - (ballX + BALL_SIZE / 2);
        const dy = pos.y - (ballY + BALL_SIZE / 2);
        if (dx * dx + dy * dy > (BALL_SIZE * 0.8) ** 2) return;
        dragging = true;
        dragOffsetX = pos.x - ballX;
        dragOffsetY = pos.y - ballY;
        lastX = pos.x;
        lastY = pos.y;
        lastTime = Date.now();
        vx = 0;
        vy = 0;
    }

    function onPointerMove(e) {
        if (!dragging) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const b = getBounds();
        ballX = Math.max(0, Math.min(b.w - BALL_SIZE, pos.x - dragOffsetX));
        ballY = Math.max(0, Math.min(b.h - BALL_SIZE, pos.y - dragOffsetY));

        const now = Date.now();
        const dt = now - lastTime;
        if (dt > 0) {
            vx = (pos.x - lastX) / dt * 16;
            vy = (pos.y - lastY) / dt * 16;
        }
        lastX = pos.x;
        lastY = pos.y;
        lastTime = now;

        trail.push({ x: ballX, y: ballY, ci: colorIndex });
        if (trail.length > TRAIL_MAX) trail.shift();
    }

    function onPointerUp() {
        dragging = false;
    }

    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    initPosition();
    updateBall();
    animId = requestAnimationFrame(animate);

    if (mode === 'challenge') {
        showChallengeStart();
    }

    return {
        destroy() {
            if (animId) cancelAnimationFrame(animId);
            if (timerInterval) clearInterval(timerInterval);
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            window.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('touchend', onPointerUp);
        }
    };
}
