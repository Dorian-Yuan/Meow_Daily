const SYMBOLS = ['🐱', '🐟', '🧶', '🐭', '🐾', '😻'];
const REEL_COUNT = 3;
const VISIBLE_ROWS = 3;
const SYMBOL_H = 70;
const SPIN_SYMBOLS = 15;

export function createCatSlotApp(container) {
    container.innerHTML = '';
    let fishCoins = 100;
    let spinning = false;
    let animFrames = [];

    try { fishCoins = parseInt(localStorage.getItem('meow_slot_coins') || '100'); } catch {}

    function saveCoins() {
        try { localStorage.setItem('meow_slot_coins', String(fishCoins)); } catch {}
    }

    function spin() {
        if (spinning || fishCoins < 10) return;
        spinning = true;
        fishCoins -= 10;
        updateCoins();
        animFrames.forEach(id => cancelAnimationFrame(id));
        animFrames = [];

        const results = [];
        for (let i = 0; i < REEL_COUNT; i++) {
            results.push([]);
            for (let j = 0; j < VISIBLE_ROWS; j++) {
                results[i].push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
            }
        }

        const strips = container.querySelectorAll('.slot-reel-strip');
        strips.forEach((strip, i) => {
            strip.innerHTML = '';
            strip.style.transition = 'none';
            strip.style.transform = 'translateY(0)';

            for (let j = 0; j < SPIN_SYMBOLS; j++) {
                const sym = document.createElement('div');
                sym.className = 'slot-symbol';
                sym.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                strip.appendChild(sym);
            }
            for (let j = 0; j < VISIBLE_ROWS; j++) {
                const sym = document.createElement('div');
                sym.className = 'slot-symbol';
                sym.textContent = results[i][j];
                strip.appendChild(sym);
            }
        });

        const totalSymbols = SPIN_SYMBOLS + VISIBLE_ROWS;
        const targetY = -(totalSymbols - VISIBLE_ROWS) * SYMBOL_H;

        strips.forEach((strip, i) => {
            const delay = 600 + i * 400;
            const duration = 800 + i * 200;

            let startTime = null;
            let startY = 0;
            const endY = targetY;

            function animate(timestamp) {
                if (!startTime) startTime = timestamp + delay;
                const elapsed = timestamp - startTime;

                if (elapsed < 0) {
                    animFrames.push(requestAnimationFrame(animate));
                    return;
                }

                if (elapsed >= duration) {
                    strip.style.transition = 'none';
                    strip.style.transform = `translateY(${endY}px)`;
                    return;
                }

                const progress = elapsed / duration;
                const eased = 1 - Math.pow(1 - progress, 3);
                const currentY = startY + (endY - startY) * eased;
                strip.style.transition = 'none';
                strip.style.transform = `translateY(${currentY}px)`;
                animFrames.push(requestAnimationFrame(animate));
            }

            animFrames.push(requestAnimationFrame(animate));
        });

        const totalTime = 600 + 2 * 400 + 800 + 2 * 200 + 100;
        setTimeout(() => {
            checkWin(results);
            spinning = false;
        }, totalTime);
    }

    function checkWin(results) {
        const midRow = results.map(r => r[1]);
        const topRow = results.map(r => r[0]);
        const botRow = results.map(r => r[2]);

        let winAmount = 0;
        const winMsgs = [];

        if (midRow[0] === midRow[1] && midRow[1] === midRow[2]) {
            winAmount += 50;
            winMsgs.push(`中线 ${midRow[0]}${midRow[1]}${midRow[2]} +50🥫`);
        }
        if (topRow[0] === topRow[1] && topRow[1] === topRow[2]) {
            winAmount += 30;
            winMsgs.push(`上线 ${topRow[0]}${topRow[1]}${topRow[2]} +30🥫`);
        }
        if (botRow[0] === botRow[1] && botRow[1] === botRow[2]) {
            winAmount += 30;
            winMsgs.push(`下线 ${botRow[0]}${botRow[1]}${botRow[2]} +30🥫`);
        }

        if (results[0][0] === results[1][1] && results[1][1] === results[2][2]) {
            winAmount += 40;
            winMsgs.push(`对角↘ ${results[0][0]}${results[1][1]}${results[2][2]} +40🥫`);
        }
        if (results[0][2] === results[1][1] && results[1][1] === results[2][0]) {
            winAmount += 40;
            winMsgs.push(`对角↗ ${results[0][2]}${results[1][1]}${results[2][0]} +40🥫`);
        }

        if (winAmount >= 100) {
            winAmount += 50;
            winMsgs.push('🌟 满贯奖励 +50🥫');
        }

        if (winAmount > 0) {
            fishCoins += winAmount;
            saveCoins();
            updateCoins();
            showWinEffect(winMsgs.join('\n'));
        }

        if (fishCoins <= 0) {
            fishCoins = 100;
            saveCoins();
            updateCoins();
            showWinEffect('小鱼干用完了，重新发放 100🥫');
        }
    }

    function showWinEffect(msg) {
        const effect = container.querySelector('.slot-win-effect');
        if (!effect) return;
        effect.textContent = msg;
        effect.style.display = 'block';
        effect.style.whiteSpace = 'pre-line';
        effect.classList.add('win-flash');
        setTimeout(() => {
            effect.style.display = 'none';
            effect.classList.remove('win-flash');
        }, 2500);
    }

    function updateCoins() {
        const el = container.querySelector('.slot-coins');
        if (el) el.textContent = `🥫 ${fishCoins}`;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'slot-wrapper';

    const info = document.createElement('div');
    info.className = 'slot-info';
    info.innerHTML = `<span class="slot-coins">🥫 ${fishCoins}</span><span>每次 10🥫</span>`;
    wrapper.appendChild(info);

    const payTable = document.createElement('div');
    payTable.className = 'slot-paytable';
    payTable.innerHTML = `
        <span>中线三连 +50</span>
        <span>上线/下线 +30</span>
        <span>对角线 +40</span>
    `;
    wrapper.appendChild(payTable);

    const machine = document.createElement('div');
    machine.className = 'slot-machine';
    for (let i = 0; i < REEL_COUNT; i++) {
        const reel = document.createElement('div');
        reel.className = 'slot-reel';
        const strip = document.createElement('div');
        strip.className = 'slot-reel-strip';
        for (let j = 0; j < VISIBLE_ROWS; j++) {
            const sym = document.createElement('div');
            sym.className = 'slot-symbol';
            sym.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            strip.appendChild(sym);
        }
        reel.appendChild(strip);
        machine.appendChild(reel);
    }
    wrapper.appendChild(machine);

    const winEffect = document.createElement('div');
    winEffect.className = 'slot-win-effect';
    winEffect.style.display = 'none';
    wrapper.appendChild(winEffect);

    const spinBtn = document.createElement('button');
    spinBtn.className = 'slot-spin-btn';
    spinBtn.textContent = '🎰 拉杆!';
    spinBtn.addEventListener('click', spin);
    wrapper.appendChild(spinBtn);

    container.appendChild(wrapper);

    return {
        destroy() {
            animFrames.forEach(id => cancelAnimationFrame(id));
        }
    };
}
