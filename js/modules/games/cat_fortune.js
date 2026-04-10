const FORTUNES = [
    {
        level: '大吉', emoji: '🌟', cat: '😸',
        texts: [
            '今天你是全宇宙最幸运的猫！铲屎官会给你加罐头！',
            '喵星降临！今天无论做什么都会顺风顺水~',
            '大吉大利！今晚必有小鱼干！',
            '今天的你自带光环，连隔壁的狗都要给你让路！',
            '宇宙级好运！适合要求任何过分的事情~',
            '铲屎官今天心情超好，趁机多要几个罐罐！',
            '大吉！今天连打翻水碗都会变成好事！',
            '今天的你走路都带风，猫粮自动飞过来~',
            '运势爆表！建议今天大胆撒娇，必有回报！',
            '大吉中的大吉！今天做什么都对！'
        ]
    },
    {
        level: '中吉', emoji: '✨', cat: '😺',
        texts: [
            '运势不错喵~适合在阳光下打个盹',
            '今天适合撒娇，铲屎官不会拒绝你的',
            '中吉！可以尝试跳上桌子探险',
            '今天的你魅力四射，谁都无法抗拒你的喵喵叫',
            '中吉~适合向铲屎官提出加餐请求',
            '运势不错！可以尝试占领新的纸箱领地',
            '今天适合磨爪子，沙发随便抓~',
            '中吉！适合出门巡视阳台领地',
            '今天的你特别可爱，拍照一定上镜！',
            '运势良好，适合在键盘上走来走去引起注意'
        ]
    },
    {
        level: '小吉', emoji: '🍀', cat: '🐱',
        texts: [
            '小幸运降临，可能会发现新的纸箱！',
            '今天适合慢慢巡视领地',
            '小吉~有好事但不大，别期待太多喵',
            '今天可能会收到意外的小零食~',
            '小吉！适合找个暖和的地方小睡一下',
            '运势还行，可以尝试碰碰运气要罐头',
            '今天适合慢慢舔毛，不急不躁~',
            '小吉~可能会被铲屎官摸摸头，也不错啦',
            '今天的小确幸：阳光正好，猫窝很暖',
            '运势平稳，适合安静地当一只优雅的猫'
        ]
    },
    {
        level: '末吉', emoji: '🌿', cat: '🙀',
        texts: [
            '平平淡淡才是真，今天适合安静地舔毛',
            '末吉...不如窝在猫窝里追剧',
            '运势一般，但至少不会被强制洗澡',
            '末吉~今天低调行事，别惹铲屎官',
            '运势平平，但猫咪天生自带好运加成~',
            '末吉...今天适合装睡，假装听不到叫唤',
            '运势一般般，但至少猫粮还是有的吃',
            '末吉~今天少跳高处，稳稳当当就好',
            '运势平淡，但平淡也是一种幸福喵~',
            '末吉...今天别太作，安安静静最安全'
        ]
    },
    {
        level: '凶', emoji: '💨', cat: '😾',
        texts: [
            '小心！可能会被强制洗澡...快躲起来！',
            '凶！今天别惹铲屎官，乖乖待着',
            '运势低迷...建议装可怜博同情',
            '凶...今天千万别跳上餐桌！',
            '运势不佳，建议躲在床底下度过今天',
            '凶！今天可能会有客人来，提前找好藏身处',
            '运势低迷...别让铲屎官抓到你去剪指甲',
            '凶...今天不适合冒险，远离吸尘器！',
            '运势不好，但别担心，明天会更好的喵~',
            '凶！今天格外小心，别打翻任何东西！'
        ]
    }
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

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem('meow_fortune_history') || '[]');
    } catch { return []; }
}

function saveHistory(entry) {
    const history = loadHistory();
    const today = getTodayKey();
    const existing = history.findIndex(h => h.key === today);
    if (existing >= 0) history[existing] = entry;
    else history.push(entry);
    while (history.length > 7) history.shift();
    localStorage.setItem('meow_fortune_history', JSON.stringify(history));
}

export function createCatFortuneApp(container, options = {}) {
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

    const actionsEl = document.createElement('div');
    actionsEl.className = 'fortune-actions';

    const reRollBtn = document.createElement('button');
    reRollBtn.className = 'fortune-btn-secondary';
    reRollBtn.textContent = '换签文';

    const newFortuneBtn = document.createElement('button');
    newFortuneBtn.className = 'fortune-btn';
    newFortuneBtn.textContent = '重新求签';

    actionsEl.append(reRollBtn, newFortuneBtn);
    actionsEl.style.display = 'none';
    resultEl.append(levelEl, textEl);

    const historyEl = document.createElement('div');
    historyEl.className = 'fortune-history';

    wrap.append(catEl, hint, resultEl, actionsEl, historyEl);
    container.appendChild(wrap);

    let currentFortuneIdx = null;
    let isAnimating = false;
    let thinkingInterval = null;
    let revealTimeout = null;

    function renderHistory() {
        const history = loadHistory();
        historyEl.innerHTML = '';
        if (history.length === 0) return;
        history.forEach(h => {
            const item = document.createElement('div');
            item.className = 'fortune-history-item';
            const f = FORTUNES[h.idx];
            item.innerHTML = `<span class="fh-emoji">${f.emoji}</span><span class="fh-level">${f.level}</span>`;
            item.title = h.date;
            historyEl.appendChild(item);
        });
    }

    function showResult(fortuneIdx, text) {
        const f = FORTUNES[fortuneIdx];
        catEl.textContent = f.cat;
        catEl.classList.remove('fortune-thinking');
        levelEl.textContent = `${f.emoji} ${f.level}`;
        levelEl.className = 'fortune-level fortune-reveal-blur';
        if (fortuneIdx === 0) levelEl.classList.add('fortune-great');
        else if (fortuneIdx === 4) levelEl.classList.add('fortune-bad');
        textEl.textContent = text;
        resultEl.style.display = 'block';
        actionsEl.style.display = 'flex';
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
        actionsEl.style.display = 'none';
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
                const d = new Date();
                const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                saveHistory({ key: cacheKey, date: dateStr, idx });
                renderHistory();
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

    function newFortune() {
        localStorage.removeItem(getTodayKey());
        currentFortuneIdx = null;
        startFortune();
    }

    catEl.addEventListener('click', startFortune);
    reRollBtn.addEventListener('click', reRoll);
    newFortuneBtn.addEventListener('click', newFortune);

    const cacheKey = getTodayKey();
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const data = JSON.parse(cached);
        currentFortuneIdx = data.idx;
        showResult(data.idx, data.text);
    }

    renderHistory();

    return {
        destroy() {
            if (thinkingInterval) clearInterval(thinkingInterval);
            if (revealTimeout) clearTimeout(revealTimeout);
        }
    };
}
