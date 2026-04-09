const COLORS = ['#F28C38', '#4066E0', '#10B981', '#FACC15', '#EC4899', '#8B5CF6'];
const TRAIL_MAX = 30;
const BALL_SIZE = 48;
const FRICTION = 0.985;
const BOUNCE = 0.7;

export function createYarnBallApp(container) {
    let colorIndex = 0;
    let ballX, ballY, vx = 0, vy = 0;
    let dragging = false, dragOffsetX = 0, dragOffsetY = 0;
    let lastX = 0, lastY = 0, lastTime = 0;
    let trail = [];
    let animId = null;

    container.innerHTML = `
        <div class="yarn-ball-canvas">
            <div class="yarn-ball-trail"></div>
            <div class="yarn-ball-item">🧶</div>
            <div class="yarn-ball-toolbar">
                <button class="yarn-ball-btn" data-action="color">🎨</button>
                <button class="yarn-ball-btn" data-action="clear">🗑️</button>
            </div>
        </div>
    `;

    const canvas = container.querySelector('.yarn-ball-canvas');
    const ballEl = container.querySelector('.yarn-ball-item');
    const trailEl = container.querySelector('.yarn-ball-trail');
    const colorBtn = container.querySelector('[data-action="color"]');
    const clearBtn = container.querySelector('[data-action="clear"]');

    function getBounds() {
        return { w: canvas.clientWidth, h: canvas.clientHeight - 48 };
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
            dot.className = 'yarn-ball-trail-dot';
            const opacity = (i + 1) / trail.length * 0.5;
            const size = 6 + (i / trail.length) * 6;
            dot.style.cssText = `
                position:absolute;
                left:${pos.x + BALL_SIZE / 2 - size / 2}px;
                top:${pos.y + BALL_SIZE / 2 - size / 2}px;
                width:${size}px;
                height:${size}px;
                border-radius:50%;
                background:${COLORS[pos.ci]};
                opacity:${opacity};
                pointer-events:none;
            `;
            trailEl.appendChild(dot);
        });
    }

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

    colorBtn.addEventListener('click', () => {
        colorIndex = (colorIndex + 1) % COLORS.length;
        ballEl.style.filter = `drop-shadow(0 2px 6px ${COLORS[colorIndex]}66)`;
    });

    clearBtn.addEventListener('click', () => {
        trail = [];
        trailEl.innerHTML = '';
    });

    initPosition();
    updateBall();
    animId = requestAnimationFrame(animate);

    return {
        destroy() {
            if (animId) cancelAnimationFrame(animId);
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            window.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('touchend', onPointerUp);
        }
    };
}
