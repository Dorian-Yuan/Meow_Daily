const FORTUNES = [
    { level: '大吉', emoji: '🌟', cat: '😸', texts: ['今天你是全宇宙最幸运的猫！铲屎官会给你加罐头！', '喵星降临！今天无论做什么都会顺风顺水~', '大吉大利！今晚必有小鱼干！'] },
    { level: '中吉', emoji: '✨', cat: '😺', texts: ['运势不错喵~适合在阳光下打个盹', '今天适合撒娇，铲屎官不会拒绝你的', '中吉！可以尝试跳上桌子探险'] },
    { level: '小吉', emoji: '🍀', cat: '🐱', texts: ['小幸运降临，可能会发现新的纸箱！', '今天适合慢慢巡视领地', '小吉~有好事但不大，别期待太多喵'] },
    { level: '末吉', emoji: '🌿', cat: '🙀', texts: ['平平淡淡才是真，今天适合安静地舔毛', '末吉...不如窝在猫窝里追剧', '运势一般，但至少不会被强制洗澡'] },
    { level: '凶', emoji: '💨', cat: '😾', texts: ['小心！可能会被强制洗澡...快躲起来！', '凶！今天别惹铲屎官，乖乖待着', '运势低迷...建议装可怜博同情'] }
];

const WEIGHTS = [15, 25, 30, 20, 10];

function getTodayKey() {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `meow_fortune_${date}`;
}

function pickFortune() {
    const total = WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < WEIGHTS.length; i++) {
        r -= WEIGHTS[i];
        if (r <= 0) return i;
    }
    return WEIGHTS.length - 1;
}

function pickText(fortune) {
    return fortune.texts[Math.floor(Math.random() * fortune.texts.length)];
}

export function createCatFortuneApp(container) {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'fortune-container';

    const catEl = document.createElement('div');
    catEl.className = 'fortune-cat';
    catEl.textContent = '😺';

    const hint = document.createElement('div');
    hint.className = 'fortune-hint';
    hint.textContent = '点击猫咪求签喵~';

    const resultEl = document.createElement('div');
    resultEl.className = 'fortune-result';
    resultEl.style.display = 'none';

    const levelEl = document.createElement('div');
    levelEl.className = 'fortune-level';

    const textEl = document.createElement('div');
    textEl.className = 'fortune-text';

    const btnEl = document.createElement('button');
    btnEl.className = 'fortune-btn';
    btnEl.textContent = '再摇一次';
    btnEl.style.display = 'none';

    resultEl.append(levelEl, textEl);
    wrap.append(catEl, hint, resultEl, btnEl);
    container.appendChild(wrap);

    let currentFortuneIdx = null;
    let isAnimating = false;
    let thinkingInterval = null;
    let revealTimeout = null;

    function showResult(fortuneIdx, text) {
        const f = FORTUNES[fortuneIdx];
        catEl.textContent = f.cat;
        catEl.classList.remove('fortune-thinking');
        levelEl.textContent = `${f.emoji} ${f.level}`;
        textEl.textContent = text;
        resultEl.style.display = 'block';
        btnEl.style.display = 'inline-block';
        hint.style.display = 'none';
        isAnimating = false;
    }

    function startFortune() {
        if (isAnimating) return;
        isAnimating = true;

        const cacheKey = getTodayKey();
        const cached = localStorage.getItem(cacheKey);

        catEl.classList.add('fortune-thinking');
        resultEl.style.display = 'none';
        btnEl.style.display = 'none';
        hint.textContent = '猫咪正在思考中...';

        const thinkingFrames = ['🐱', '😺', '😸', '🐱', '😻', '🐱', '😺'];
        let frame = 0;
        thinkingInterval = setInterval(() => {
            catEl.textContent = thinkingFrames[frame % thinkingFrames.length];
            frame++;
        }, 250);

        revealTimeout = setTimeout(() => {
            clearInterval(thinkingInterval);
            thinkingInterval = null;

            if (cached) {
                const data = JSON.parse(cached);
                currentFortuneIdx = data.idx;
                showResult(data.idx, data.text);
            } else {
                const idx = pickFortune();
                currentFortuneIdx = idx;
                const text = pickText(FORTUNES[idx]);
                localStorage.setItem(cacheKey, JSON.stringify({ idx, text }));
                showResult(idx, text);
            }
        }, 2000);
    }

    function reRoll() {
        if (currentFortuneIdx === null) return;
        const f = FORTUNES[currentFortuneIdx];
        const text = pickText(f);
        textEl.textContent = text;
        const cacheKey = getTodayKey();
        localStorage.setItem(cacheKey, JSON.stringify({ idx: currentFortuneIdx, text }));
    }

    catEl.addEventListener('click', startFortune);
    btnEl.addEventListener('click', reRoll);

    const cacheKey = getTodayKey();
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const data = JSON.parse(cached);
        currentFortuneIdx = data.idx;
        showResult(data.idx, data.text);
    }

    return {
        destroy() {
            if (thinkingInterval) clearInterval(thinkingInterval);
            if (revealTimeout) clearTimeout(revealTimeout);
        }
    };
}
