const CAT_FACTS_ZH = [
    '猫咪每天大约花 70% 的时间在睡觉，一生中约 2/3 在睡眠中度过',
    '猫咪的鼻纹和人类指纹一样，每只猫都是独一无二的',
    '猫咪能发出超过 100 种不同的声音，而狗只能发出约 10 种',
    '猫咪的心跳速度是人类的两倍，每分钟约 110-140 次',
    '猫咪的耳朵有 32 块肌肉控制，而人类只有 6 块',
    '猫咪无法尝到甜味，它们缺少感受甜味的味觉受体',
    '一只名叫 Stubbs 的猫在阿拉斯加一个小镇当了 20 年市长',
    '猫咪的胡须和身体一样宽，用来判断能否通过狭窄空间',
    '猫咪在跳跃时能跳到自身高度的 5-6 倍',
    '古埃及人如果家里的猫去世了，全家人会剃掉眉毛表示哀悼',
    '猫咪的夜视能力是人类的 6 倍',
    '猫咪之间很少用喵喵叫交流，喵叫主要是为了和人类沟通',
    '猫咪的 purr（呼噜声）频率在 25-150Hz 之间，有促进骨骼愈合的作用',
    '世界上最大的猫品种是缅因猫，体重可达 12 公斤以上',
    '猫咪喝水时舌头是向后卷的，像勺子一样把水舀起来',
    '猫咪的视野角度约 200 度，比人类的 180 度更广',
    '一只猫一天大约舔毛 2-3 小时，这是它们保持清洁的方式',
    '猫咪对振动非常敏感，能在地震前感知到异常',
    '橘猫中约 80% 是公猫，这与 X 染色体上的橙色基因有关',
    '猫咪的爪子有汗腺，紧张时会通过肉垫出汗'
];

const CAT_ASCII = [
    '=^.^=', '(=^･ω･^=)', '(=^・ω・^=)', '( ⓛ ω ⓛ *)',
    '=´∇｀=', '(=^‥^=)', '(=^ ◡ ^=)', 'ฅ^•ﻌ•^ฅ',
    '(=^-ω-^=)', '(=^･ｪ･^=)', '(=^∇^=)', 'ฅ(•ㅅ•❀)ฅ',
    '(=^･ω･^)y＝', '(=ↀωↀ=)', '(=^・x・^=)', 'ฅ(=^･ω･^=)ฅ',
    '(=^ ◡ •=)', '(=^‥‥^=)', '(=^・_・^=)', '(=^⋏^=)',
    '(=^◡^=)', '(=^･ｪ･^)∫', 'ฅ(๑*д*๑)ฅ', '(=^ x ^=)',
    '(=^∇^=)ﾉ', '(=^･ω･^)= ∫', '(=^・ω・^)★', 'ฅ(•̀ᴗ•́)و',
    '(=^ ◡ ^=)♡', '(=^･ω･^)=✧', 'ฅ(˘ω˘)ฅ', '(=^・ﻌ・^=)'
];

export function createCatFactsApp(container) {
    container.innerHTML = '';

    let favorites = [];
    try { favorites = JSON.parse(localStorage.getItem('meow_facts_fav') || '[]'); } catch {}

    function saveFavorites() {
        try { localStorage.setItem('meow_facts_fav', JSON.stringify(favorites)); } catch {}
    }

    function getRandomFact() {
        return CAT_FACTS_ZH[Math.floor(Math.random() * CAT_FACTS_ZH.length)];
    }

    function getRandomAscii() {
        return CAT_ASCII[Math.floor(Math.random() * CAT_ASCII.length)];
    }

    async function fetchOnlineFact() {
        try {
            const res = await fetch('https://catfact.ninja/fact', { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                const data = await res.json();
                return data.fact;
            }
        } catch {}
        return null;
    }

    function isFavorited(text) {
        return favorites.includes(text);
    }

    function toggleFavorite(text) {
        const idx = favorites.indexOf(text);
        if (idx >= 0) favorites.splice(idx, 1);
        else favorites.push(text);
        saveFavorites();
    }

    function copyToClipboard(text) {
        try {
            navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }

    let currentFact = getRandomFact();

    const wrapper = document.createElement('div');
    wrapper.className = 'facts-wrapper';

    const tabs = document.createElement('div');
    tabs.className = 'facts-tabs';
    tabs.innerHTML = `
        <button class="facts-tab active" data-tab="facts">📖 冷知识</button>
        <button class="facts-tab" data-tab="ascii">😺 颜文字</button>
        <button class="facts-tab" data-tab="fav">⭐ 收藏</button>
    `;
    wrapper.appendChild(tabs);

    const factsPanel = document.createElement('div');
    factsPanel.className = 'facts-panel';
    factsPanel.innerHTML = `
        <div class="facts-card">
            <div class="facts-emoji">🐱</div>
            <div class="facts-text">${currentFact}</div>
            <div class="facts-actions">
                <button class="facts-btn" id="facts-copy">📋 复制</button>
                <button class="facts-btn" id="facts-fav">⭐ 收藏</button>
                <button class="facts-btn" id="facts-next">🔄 换一条</button>
            </div>
        </div>
    `;
    wrapper.appendChild(factsPanel);

    const asciiPanel = document.createElement('div');
    asciiPanel.className = 'ascii-panel';
    asciiPanel.style.display = 'none';
    asciiPanel.innerHTML = `
        <div class="ascii-card">
            <div class="ascii-display">${getRandomAscii()}</div>
            <div class="ascii-actions">
                <button class="facts-btn" id="ascii-copy">📋 复制</button>
                <button class="facts-btn" id="ascii-next">🔄 换一个</button>
            </div>
        </div>
        <div class="ascii-grid"></div>
    `;
    wrapper.appendChild(asciiPanel);

    const favPanel = document.createElement('div');
    favPanel.className = 'fav-panel';
    favPanel.style.display = 'none';
    wrapper.appendChild(favPanel);

    container.appendChild(wrapper);

    function renderFavPanel() {
        favPanel.innerHTML = '';
        if (favorites.length === 0) {
            favPanel.innerHTML = '<div class="fav-empty">还没有收藏哦~</div>';
            return;
        }
        favorites.forEach(fav => {
            const item = document.createElement('div');
            item.className = 'fav-item';
            item.innerHTML = `<span>${fav}</span><button class="fav-remove" data-text="${fav}">✕</button>`;
            favPanel.appendChild(item);
        });
        favPanel.querySelectorAll('.fav-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                toggleFavorite(btn.dataset.text);
                renderFavPanel();
            });
        });
    }

    function renderAsciiGrid() {
        const grid = asciiPanel.querySelector('.ascii-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const shuffled = [...CAT_ASCII].sort(() => Math.random() - 0.5).slice(0, 12);
        shuffled.forEach(ascii => {
            const item = document.createElement('div');
            item.className = 'ascii-item';
            item.textContent = ascii;
            item.addEventListener('click', () => {
                copyToClipboard(ascii);
                item.classList.add('copied');
                setTimeout(() => item.classList.remove('copied'), 600);
            });
            grid.appendChild(item);
        });
    }

    tabs.querySelectorAll('.facts-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.querySelectorAll('.facts-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            factsPanel.style.display = target === 'facts' ? 'block' : 'none';
            asciiPanel.style.display = target === 'ascii' ? 'block' : 'none';
            favPanel.style.display = target === 'fav' ? 'block' : 'none';
            if (target === 'fav') renderFavPanel();
            if (target === 'ascii') renderAsciiGrid();
        });
    });

    factsPanel.querySelector('#facts-copy').addEventListener('click', () => {
        copyToClipboard(currentFact);
    });
    factsPanel.querySelector('#facts-fav').addEventListener('click', () => {
        toggleFavorite(currentFact);
        const btn = factsPanel.querySelector('#facts-fav');
        btn.textContent = isFavorited(currentFact) ? '⭐ 已收藏' : '⭐ 收藏';
    });
    factsPanel.querySelector('#facts-next').addEventListener('click', async () => {
        const onlineFact = await fetchOnlineFact();
        if (onlineFact) {
            currentFact = onlineFact;
        } else {
            currentFact = getRandomFact();
        }
        factsPanel.querySelector('.facts-text').textContent = currentFact;
        factsPanel.querySelector('#facts-fav').textContent = isFavorited(currentFact) ? '⭐ 已收藏' : '⭐ 收藏';
    });

    asciiPanel.querySelector('#ascii-copy').addEventListener('click', () => {
        const display = asciiPanel.querySelector('.ascii-display');
        copyToClipboard(display.textContent);
    });
    asciiPanel.querySelector('#ascii-next').addEventListener('click', () => {
        const display = asciiPanel.querySelector('.ascii-display');
        display.textContent = getRandomAscii();
    });

    renderAsciiGrid();

    fetchOnlineFact().then(fact => {
        if (fact) {
            currentFact = fact;
            const textEl = factsPanel.querySelector('.facts-text');
            if (textEl) textEl.textContent = currentFact;
        }
    });

    return {
        destroy() {}
    };
}
