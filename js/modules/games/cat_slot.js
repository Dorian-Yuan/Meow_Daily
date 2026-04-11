const SYMBOLS = ['🐱', '🐟', '🧶', '🐭', '🐾', '😻'];
const REEL_COUNT = 3;
const VISIBLE_ROWS = 3;

export function createCatSlotApp(container) {
    container.innerHTML = '';
    let fishCoins = 100;
    let spinning = false;

    try { fishCoins = parseInt(localStorage.getItem('meow_slot_coins') || '100'); } catch {}

    function saveCoins() {
        try { localStorage.setItem('meow_slot_coins', String(fishCoins)); } catch {}
    }

    function spin() {
        if (spinning || fishCoins < 10) return;
        spinning = true;
        fishCoins -= 10;
        updateCoins();

        const results = [];
        for (let i = 0; i < REEL_COUNT; i++) {
            results.push([]);
            for (let j = 0; j < VISIBLE_ROWS; j++) {
                results[i].push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
            }
        }

        const reels = container.querySelectorAll('.slot-reel-strip');
        reels.forEach((reel, i) => {
            reel.classList.add('spinning');
            reel.innerHTML = '';
            for (let j = 0; j < 20 + VISIBLE_ROWS; j++) {
                const sym = document.createElement('div');
                sym.className = 'slot-symbol';
                sym.textContent = j >= 20 ? results[i][j - 20] : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                reel.appendChild(sym);
            }
        });

        const delays = [800, 1200, 1600];
        reels.forEach((reel, i) => {
            setTimeout(() => {
                reel.classList.remove('spinning');
                reel.classList.add('stopping');
                setTimeout(() => reel.classList.remove('stopping'), 300);
            }, delays[i]);
        });

        setTimeout(() => {
            checkWin(results);
            spinning = false;
        }, 1800);
    }

    function checkWin(results) {
        const midRow = results.map(r => r[1]);
        const topRow = results.map(r => r[0]);
        const botRow = results.map(r => r[2]);

        let winAmount = 0;
        let winMsg = '';

        if (midRow[0] === midRow[1] && midRow[1] === midRow[2]) {
            winAmount = 50;
            winMsg = `三连 ${midRow[0]}${midRow[1]}${midRow[2]}! +50🥫`;
        } else if (midRow[0] === midRow[1] || midRow[1] === midRow[2]) {
            winAmount = 15;
            winMsg = `两连! +15🥫`;
        }

        if (topRow[0] === topRow[1] && topRow[1] === topRow[2]) {
            winAmount += 30;
            winMsg = `上线三连! +30🥫`;
        }
        if (botRow[0] === botRow[1] && botRow[1] === botRow[2]) {
            winAmount += 30;
            winMsg = `下线三连! +30🥫`;
        }

        if (winAmount > 0) {
            fishCoins += winAmount;
            saveCoins();
            updateCoins();
            showWinEffect(winMsg);
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
        effect.classList.add('win-flash');
        setTimeout(() => {
            effect.style.display = 'none';
            effect.classList.remove('win-flash');
        }, 2000);
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
        destroy() {}
    };
}
