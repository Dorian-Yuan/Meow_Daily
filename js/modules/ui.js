/**
 * ui.js - 核心逻辑修复版 (100% 恢复录入与 AI 功能)
 */
import { getDB, getConfig, saveConfig, addOrUpdateRecord, deleteRecord } from '../store.js';
import { parseTextWithAI, processMentionedTime } from '../api/ai.js';

const mainContent = document.getElementById('main-content');

export function switchTab(tabName) {
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    switch (tabName) {
        case 'home': renderHome(); break;
        case 'records': renderRecords(); break;
        case 'profile': renderProfile(); break;
        case 'settings': renderSettings(); break;
    }
    window.scrollTo(0, 0);
}

/**
 * 首页渲染
 */
function renderHome() {
    const db = getDB();
    const suiSui = db.cats[0];
    const weightRecords = db.records[suiSui.cat_id]?.weight || [];
    const latestWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1].weight_kg : '--';

    mainContent.innerHTML = `
        <div class="content-wrapper">
            <section class="quick-actions">
                <div class="action-item" data-type="routine"><div class="action-icon">🧹</div><div class="action-label">日常</div></div>
                <div class="action-item" data-type="food"><div class="action-icon">🍴</div><div class="action-label">饮食</div></div>
                <div class="action-item" data-type="weight"><div class="action-icon">⚖️</div><div class="action-label">体重</div></div>
                <div class="action-item" data-type="medical"><div class="action-icon">🏥</div><div class="action-label">就诊</div></div>
            </section>

            <div class="card">
                <h3>体重监测</h3>
                <div style="display:flex; align-items:baseline; gap:8px; margin-top:4px;">
                    <span style="font-size:32px; font-weight:900; color:var(--color-primary); line-height:1;">${latestWeight}</span>
                    <span style="font-size:14px; color:var(--color-text-hint); font-weight:700;">kg</span>
                </div>
                <p style="font-size:12px; color:var(--color-text-hint); margin-top:12px;">✨ 最近一次称重：${weightRecords.length > 0 ? weightRecords[weightRecords.length - 1].timestamp : '尚未记录'}</p>
            </div>

            <div class="card" style="border-left: 6px solid var(--color-yellow); background: #FFFDF5; padding-left: 30px;">
                <h3>提醒事项</h3>
                <p style="font-size:14px; color:var(--color-text-main); font-weight:500;">岁岁今天表现很棒喵，暂时没有待办任务！🐾</p>
            </div>
        </div>
    `;

    // 绑定点击事件，调用 showEntryDrawer 而非 alert
    document.querySelectorAll('.action-item').forEach(el => {
        el.onclick = () => showEntryDrawer(el.dataset.type);
    });
}

/**
 * 记录流渲染
 */
function renderRecords() {
    const db = getDB();
    const suiSui = db.cats[0];
    const catRecords = db.records[suiSui.cat_id] || {};
    let all = [];
    Object.keys(catRecords).forEach(c => catRecords[c].forEach(r => all.push({...r, _c: c})));
    all.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (all.length === 0) {
        mainContent.innerHTML = `<div class="content-wrapper"><div class="card" style="text-align:center; padding:40px;"><p style="color:var(--color-text-hint);">还没有记过岁岁的生活呢喵~</p></div></div>`;
        return;
    }

    let html = '<div class="content-wrapper">';
    let lastMonth = '';
    all.forEach(r => {
        const month = r.timestamp.slice(0, 7);
        if (month !== lastMonth) {
            lastMonth = month;
            html += `<h2 style="font-size:16px; font-weight:800; margin: 8px 0 4px;">${month.replace('-', '年')}月</h2>`;
        }
        const icons = { routine: '🧹', food: '🍴', weight: '⚖️', medical: '🏥' };
        html += `
            <div class="card" style="margin-bottom:4px; padding:16px 20px; display:flex; align-items:center; gap:16px; cursor:pointer;" data-id="${r.record_id}" data-category="${r._c}">
                <div style="width:44px; height:44px; background:var(--color-bg); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px;">${icons[r._c] || '🐾'}</div>
                <div style="flex:1;">
                    <div style="font-size:14px; font-weight:800; color:var(--color-text-title);">${r.type || '日常记录'}</div>
                    <div style="font-size:11px; color:var(--color-text-hint); margin-top:2px;">${r.timestamp}</div>
                </div>
                <div style="font-size:16px; font-weight:900; color:var(--color-primary);">${r.weight_kg ? r.weight_kg+'kg' : (r.cost ? '￥'+r.cost : '')}</div>
            </div>
        `;
    });
    mainContent.innerHTML = html + '</div>';

    mainContent.querySelectorAll('.card[data-id]').forEach(card => {
        card.onclick = () => showEntryDrawer(card.dataset.category, card.dataset.id);
    });
}

/**
 * 唤起录入/编辑抽屉
 */
function showEntryDrawer(type, recordId = null) {
    const titles = { routine: '日常记录', food: '饮食录入', weight: '称重记录', medical: '就诊/健康' };
    const db = getDB();
    const suiSui = db.cats[0];
    const oldData = recordId ? db.records[suiSui.cat_id][type].find(r => r.record_id === recordId) : null;

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    // 直接注入内联样式确保层级
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
        background: 'rgba(0,0,0,0.4)', zIndex: '2000', display: 'flex',
        flexDirection: 'column', justifyContent: 'flex-end'
    });

    const now = oldData ? oldData.timestamp.replace(' ', 'T') : new Date().toLocaleString('sv-SE').slice(0, 16);

    let dynamicHTML = '';
    if (type === 'routine') {
        dynamicHTML = `<div class="form-group"><label>事项</label><select id="f-type" class="form-input"><option value="洗澡">洗澡</option><option value="驱虫">驱虫</option><option value="换猫砂">换猫砂</option><option value="剪指甲">剪指甲</option></select></div>`;
    } else if (type === 'food') {
        dynamicHTML = `<div class="form-group"><label>品牌</label><input type="text" id="f-brand" class="form-input" value="${oldData?.brand||''}" placeholder="如：百利"></div><div class="form-group"><label>种类</label><input type="text" id="f-kind" class="form-input" value="${oldData?.type||''}" placeholder="如：干粮"></div>`;
    } else if (type === 'weight') {
        dynamicHTML = `<div class="form-group"><label>体重 (kg)</label><input type="number" step="0.01" id="f-weight" class="form-input" value="${oldData?.weight_kg||''}"></div>`;
    } else if (type === 'medical') {
        dynamicHTML = `<div class="form-group"><label>类型</label><select id="f-type" class="form-input"><option value="检查">检查</option><option value="疫苗">疫苗</option><option value="生病">生病</option><option value="绝育">绝育</option></select></div><div class="form-group"><label>花费</label><input type="number" id="f-cost" class="form-input" value="${oldData?.cost||''}"></div>`;
    }

    overlay.innerHTML = `
        <div class="drawer-content" style="background:white; border-top-left-radius:24px; border-top-right-radius:24px; padding:24px; animation: drawer-slide-up 0.3s ease-out;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="font-size:18px; font-weight:800;">${oldData ? '🐾 修改' : '🐾 记一笔'}${titles[type]}</h2>
                <span id="close-drawer" style="font-size:24px; cursor:pointer; padding:10px;">×</span>
            </div>
            <div class="form-group"><label>发生时间</label><input type="datetime-local" id="f-time" class="form-input" value="${now}"></div>
            ${dynamicHTML}
            <div class="form-group"><label>备注说明</label><textarea id="f-note" class="form-input" rows="2" placeholder="岁岁有什么想说的？">${oldData?.note||''}</textarea></div>
            <div style="display:flex; gap:12px; margin-top:20px;">
                ${oldData ? `<button id="btn-del" style="flex:1; background:#FEE2E2; color:#DC2626; border:none; border-radius:12px; padding:14px; font-weight:700;">删除</button>` : ''}
                <button id="btn-save" style="flex:2; background:var(--color-primary); color:white; border:none; border-radius:12px; font-weight:700; padding:14px;">保存记录</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    document.getElementById('close-drawer').onclick = close;
    overlay.onclick = (e) => { if(e.target === overlay) close(); };

    document.getElementById('btn-save').onclick = () => {
        const record = {
            record_id: oldData ? oldData.record_id : 'r_' + Date.now(),
            timestamp: document.getElementById('f-time').value.replace('T', ' '),
            note: document.getElementById('f-note').value
        };
        if(type==='routine') record.type = document.getElementById('f-type').value;
        if(type==='food') { record.brand = document.getElementById('f-brand').value; record.type = document.getElementById('f-kind').value; }
        if(type==='weight') record.weight_kg = parseFloat(document.getElementById('f-weight').value);
        if(type==='medical') { record.type = document.getElementById('f-type').value; record.cost = parseFloat(document.getElementById('f-cost').value); }

        addOrUpdateRecord(suiSui.cat_id, type, record);
        close();
        switchTab(document.querySelector('.tab-item.active').dataset.tab);
    };

    if(oldData) {
        document.getElementById('btn-del').onclick = () => {
            if(confirm('要删除这条记录吗？')) {
                deleteRecord(suiSui.cat_id, type, recordId);
                close();
                switchTab('records');
            }
        };
    }
}

/**
 * 渲染“我的”页面
 */
function renderProfile() {
    const db = getDB();
    const suiSui = db.cats[0];
    mainContent.innerHTML = `
        <div class="content-wrapper">
            <div class="card" style="text-align:center; padding: 40px 24px;">
                <div style="width:80px; height:80px; background:var(--color-bg); border-radius:40px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; font-size:32px;">🐱</div>
                <h2 style="font-size:22px; font-weight:900;">${suiSui.name}</h2>
                <p style="color:var(--color-text-hint); font-size:13px; margin-top:6px; font-weight:600;">已陪伴岁岁 800 天</p>
            </div>
            <div class="card" style="padding:0; overflow:hidden;">
                <div id="btn-settings" style="display:flex; justify-content:space-between; align-items:center; padding:20px 24px; cursor:pointer;">
                    <span style="font-size:15px; font-weight:700;">系统设置</span>
                    <span style="color:var(--color-text-hint); font-size:12px;">❯</span>
                </div>
            </div>
        </div>
    `;
    document.getElementById('btn-settings').onclick = () => switchTab('settings');
}

/**
 * 设置页面渲染
 */
function renderSettings() {
    const config = getConfig();
    mainContent.innerHTML = `
        <div class="content-wrapper">
            <div style="display:flex; align-items:center; margin-bottom:8px;">
                <span id="btn-back" style="cursor:pointer; font-size:24px; padding:8px 12px 8px 0;">←</span>
                <h2 style="font-size:18px; font-weight:800;">系统设置</h2>
            </div>
            <div class="card">
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-size:12px; font-weight:800; margin-bottom:8px; color:var(--color-text-hint);">GITHUB TOKEN</label>
                    <input type="password" id="i-token" class="form-input" style="width:100%; padding:14px; border:1px solid var(--color-divider); border-radius:12px;" value="${config.githubToken}">
                </div>
                <div style="margin-bottom:24px;">
                    <label style="display:block; font-size:12px; font-weight:800; margin-bottom:8px; color:var(--color-text-hint);">AI KEY (CHATANYWHERE)</label>
                    <input type="password" id="i-ai" class="form-input" style="width:100%; padding:14px; border:1px solid var(--color-divider); border-radius:12px;" value="${config.aiKey}">
                </div>
                <button id="i-save" style="width:100%; padding:16px; background:var(--color-primary); color:white; border:none; border-radius:14px; font-weight:800; font-size:15px; cursor:pointer;">保存配置</button>
            </div>
        </div>
    `;
    document.getElementById('btn-back').onclick = () => switchTab('profile');
    document.getElementById('i-save').onclick = () => {
        saveConfig({ ...config, githubToken: document.getElementById('i-token').value, aiKey: document.getElementById('i-ai').value });
        alert('配置生效！🐾');
        switchTab('profile');
    };
}

/**
 * 初始化 AI 录入抽屉 (修复 alert 占位)
 */
export function initAIEntry() {
    const btn = document.getElementById('ai-entry');
    if (!btn) return;
    btn.onclick = () => {
        const overlay = document.createElement('div');
        overlay.className = 'drawer-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            background: 'rgba(0,0,0,0.4)', zIndex: '2000', display: 'flex',
            flexDirection: 'column', justifyContent: 'flex-end'
        });

        overlay.innerHTML = `
            <div class="drawer-content" style="background:white; border-top-left-radius:24px; border-top-right-radius:24px; padding:24px; animation: drawer-slide-up 0.3s ease-out;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h2 style="font-size:18px; font-weight:800;">🐾 AI 智能记事</h2>
                    <span id="close-ai" style="font-size:24px; cursor:pointer; padding:10px;">×</span>
                </div>
                <textarea id="ai-input" class="form-input" rows="4" style="width:100%; padding:14px; border:1px solid var(--color-divider); border-radius:12px; font-size:14px;" placeholder="可以说：岁岁刚才称了体重，5.2kg"></textarea>
                <button id="ai-parse" style="width:100%; margin-top:16px; background:var(--color-yellow); color:#78350F; border:none; border-radius:14px; padding:16px; font-weight:800; font-size:15px; cursor:pointer;">让 AI 帮我记</button>
                <div id="ai-loading" style="display:none; text-align:center; margin-top:16px; font-size:14px;">喵喵正在思考中... 🧠</div>
                <div id="ai-result" style="display:none; margin-top:16px; padding:16px; background:var(--color-bg); border-radius:12px; border:2px dashed var(--color-yellow);"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('close-ai').onclick = () => overlay.remove();

        const input = document.getElementById('ai-input');
        const parseBtn = document.getElementById('ai-parse');
        const loading = document.getElementById('ai-loading');
        const resultDiv = document.getElementById('ai-result');

        parseBtn.onclick = async () => {
            if (!input.value.trim()) return;
            loading.style.display = 'block';
            parseBtn.disabled = true;
            try {
                const res = await parseTextWithAI(input.value);
                const time = processMentionedTime(res.mentioned_time);
                loading.style.display = 'none';
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div style="font-size:14px; line-height:1.6;">
                        <p><strong>识别分类：</strong>${res.category}</p>
                        <p><strong>发生时间：</strong>${time}</p>
                        <p><strong>识别内容：</strong>${JSON.stringify(res.parsed_data)}</p>
                        <button id="ai-confirm" style="width:100%; margin-top:16px; background:var(--color-primary); color:white; border:none; border-radius:10px; padding:12px; font-weight:700;">确认录入</button>
                    </div>
                `;
                document.getElementById('ai-confirm').onclick = () => {
                    addOrUpdateRecord(getDB().cats[0].cat_id, res.category, { record_id: 'r_'+Date.now(), timestamp: time, ...res.parsed_data });
                    overlay.remove();
                    switchTab('home');
                };
            } catch (e) {
                loading.style.display = 'none';
                parseBtn.disabled = false;
                alert(e.message);
            }
        };
    };
}
