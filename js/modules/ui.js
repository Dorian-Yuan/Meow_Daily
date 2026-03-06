/**
 * ui.js - 极致比例校准版
 */
import { getDB, getConfig, saveConfig, addOrUpdateRecord, deleteRecord } from '../store.js';

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
    // 切换后滚动到顶部
    window.scrollTo(0, 0);
}

function renderHome() {
    const db = getDB();
    const suiSui = db.cats[0];
    const weightRecords = db.records[suiSui.cat_id]?.weight || [];
    const latestWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1].weight_kg : '--';

    mainContent.innerHTML = `
        <div class="content-wrapper">
            <!-- 录入入口 -->
            <section class="quick-actions">
                <div class="action-item" data-type="routine"><div class="action-icon">🧹</div><div class="action-label">日常</div></div>
                <div class="action-item" data-type="food"><div class="action-icon">🍴</div><div class="action-label">饮食</div></div>
                <div class="action-item" data-type="weight"><div class="action-icon">⚖️</div><div class="action-label">体重</div></div>
                <div class="action-item" data-type="medical"><div class="action-icon">🏥</div><div class="action-label">就诊</div></div>
            </section>

            <!-- 体重卡片 - 增加内部呼吸感 -->
            <div class="card">
                <h3>体重监测</h3>
                <div style="display:flex; align-items:baseline; gap:8px; margin-top:4px;">
                    <span style="font-size:36px; font-weight:900; color:var(--color-primary); line-height:1;">${latestWeight}</span>
                    <span style="font-size:16px; font-weight:700; color:var(--color-text-hint);">kg</span>
                </div>
                <p style="font-size:12px; color:var(--color-text-hint); margin-top:12px;">✨ 这里的记录每一点都在见证成长</p>
            </div>

            <!-- 提醒卡片 - 修正贴边问题 -->
            <div class="card" style="border-left: 6px solid var(--color-yellow); background: #FFFDF5; padding-left: 30px;">
                <h3>提醒事项</h3>
                <p style="font-size:14px; color:var(--color-text-main); font-weight:500;">岁岁今天表现很棒喵，暂时没有待办任务！🐾</p>
            </div>
        </div>
    `;

    document.querySelectorAll('.action-item').forEach(el => {
        el.onclick = () => alert('正在加载录入表单...'); 
    });
}

function renderRecords() {
    const db = getDB();
    const suiSui = db.cats[0];
    const catRecords = db.records[suiSui.cat_id] || {};
    let all = [];
    Object.keys(catRecords).forEach(c => catRecords[c].forEach(r => all.push({...r, _c: c})));
    all.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (all.length === 0) {
        mainContent.innerHTML = `<div class="content-wrapper"><div class="card" style="text-align:center; padding:40px;"><p style="color:var(--color-text-hint);">暂无记录</p></div></div>`;
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
        html += `
            <div class="card" style="margin-bottom:4px; padding:16px 20px; display:flex; align-items:center; gap:16px;">
                <div style="width:44px; height:44px; background:var(--color-bg); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px;">${r._c === 'weight' ? '⚖️' : '🐾'}</div>
                <div style="flex:1;">
                    <div style="font-size:14px; font-weight:800; color:var(--color-text-title);">${r.type || '日常记录'}</div>
                    <div style="font-size:11px; color:var(--color-text-hint); margin-top:2px;">${r.timestamp}</div>
                </div>
                <div style="font-size:16px; font-weight:900; color:var(--color-primary);">${r.weight_kg ? r.weight_kg+'kg' : ''}</div>
            </div>
        `;
    });
    mainContent.innerHTML = html + '</div>';
}

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
                    <label style="display:block; font-size:12px; font-weight:800; margin-bottom:8px; color:var(--color-text-hint); text-transform:uppercase;">GitHub Token</label>
                    <input type="password" id="i-token" style="width:100%; padding:14px; border:1px solid var(--color-divider); border-radius:12px; font-size:14px;" value="${config.githubToken}">
                </div>
                <div style="margin-bottom:24px;">
                    <label style="display:block; font-size:12px; font-weight:800; margin-bottom:8px; color:var(--color-text-hint); text-transform:uppercase;">AI Key</label>
                    <input type="password" id="i-ai" style="width:100%; padding:14px; border:1px solid var(--color-divider); border-radius:12px; font-size:14px;" value="${config.aiKey}">
                </div>
                <button id="i-save" style="width:100%; padding:16px; background:var(--color-primary); color:white; border:none; border-radius:14px; font-weight:800; font-size:15px; cursor:pointer;">保存配置</button>
            </div>
        </div>
    `;
    document.getElementById('btn-back').onclick = () => switchTab('profile');
    document.getElementById('i-save').onclick = () => {
        saveConfig({ ...config, githubToken: document.getElementById('i-token').value, aiKey: document.getElementById('i-ai').value });
        alert('配置已生效！🐾');
        switchTab('profile');
    };
}

export function initAIEntry() {
    document.getElementById('ai-entry').onclick = () => alert('AI 记事已就绪');
}
