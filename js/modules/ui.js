/**
 * ui.js - Meow_Daily V2 核心交互逻辑
 * 严格遵循 Spec 与 Memorandum
 */
import {
    getDB, getConfig, saveConfig, addOrUpdateRecord, deleteRecord,
    updateCatProfile, mergeDB, setDB
} from '../store.js';
import { parseTextWithAI, processMentionedTime } from '../api/ai.js';
import { fetchCloudDB, pushCloudDB } from '../api/github.js';

const mainContent = document.getElementById('main-content');

// ---- 辅助工具 ----

/** 获取北京时间字符串 YYYY-MM-DD HH:mm */
function getBJNow() {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Toast 通知 */
function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ---- Tab 切换 ----

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

// ---- 页面渲染函数 ----

/**
 * 首页渲染 - 仪表盘与提醒引擎
 */
function renderHome() {
    const db = getDB();
    const suiSui = db.cats[0];
    const weightRecords = db.records[suiSui.cat_id]?.weight || [];
    const latestWeight = weightRecords.length > 0 ? [...weightRecords].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].weight_kg : '--';

    // 提醒引擎逻辑
    const reminders = [];
    const cycles = db.settings.reminder_cycles;
    const catRecs = db.records[suiSui.cat_id] || {};
    const now = new Date(getBJNow().replace(/-/g, '/'));

    const checkCycle = (type, label, icon) => {
        const lastRec = (catRecs.routine || []).filter(r => r.type === label)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
        if (lastRec) {
            const lastDate = new Date(lastRec.timestamp.replace(/-/g, '/'));
            const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            if (diffDays >= cycles[type]) {
                reminders.push({ label, days: diffDays, icon });
            }
        } else {
            reminders.push({ label, days: '?', icon, never: true });
        }
    };

    checkCycle('nail_clipping', '剪指甲', '✂️');
    checkCycle('litter_change', '换猫砂', '🧹');
    checkCycle('deworming', '驱虫', '💊');

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

            <div class="card" style="border-left: 6px solid var(--color-yellow); background: #FFFDF5; padding-left: 20px;">
                <h3>提醒事项</h3>
                ${reminders.length === 0 ?
            `<p style="font-size:14px; color:var(--color-text-main); font-weight:500;">${suiSui.name}今天表现很棒喵，暂时没有待办任务！🐾</p>` :
            reminders.map(r => `
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                            <span style="font-size:18px;">${r.icon}</span>
                            <div style="flex:1;">
                                <div style="font-size:14px; font-weight:800;">该${r.label}了</div>
                                <div style="font-size:11px; color:var(--color-text-hint);">距离上次已过 ${r.days} 天</div>
                            </div>
                            <button class="btn profile-edit-btn" style="padding:6px 12px; margin:0; font-size:11px;" onclick="window.meow_quick_record('${r.label}')">去记录</button>
                        </div>
                    `).join('')
        }
            </div>
        </div>
    `;

    document.querySelectorAll('.action-item').forEach(el => {
        el.onclick = () => showEntryDrawer(el.dataset.type);
    });

    window.meow_quick_record = (label) => {
        const type = 'routine';
        showEntryDrawer(type, null, label);
    };
}

/**
 * 记录流渲染 - 标准化标题格式
 */
function renderRecords() {
    const db = getDB();
    const suiSui = db.cats[0];
    const catRecords = db.records[suiSui.cat_id] || {};
    let all = [];

    const catMap = { routine: '日常', food: '饮食', weight: '体重', medical: '就诊' };

    Object.keys(catRecords).forEach(c => {
        catRecords[c].forEach(r => {
            all.push({ ...r, _c: c, _catLabel: catMap[c] });
        });
    });

    all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (all.length === 0) {
        mainContent.innerHTML = `
            <div class="content-wrapper">
                <div class="card" style="text-align:center; padding:60px 24px;">
                    <p style="color:var(--color-text-hint); font-size:14px; font-weight:600;">还没有记过${suiSui.name}的生活呢喵~ 🐾</p>
                </div>
            </div>
        `;
        return;
    }

    let html = '<div class="content-wrapper">';
    let lastMonth = '';
    all.forEach(r => {
        const month = r.timestamp.slice(0, 7);
        if (month !== lastMonth) {
            lastMonth = month;
            html += `<h2 style="font-size:15px; font-weight:900; margin: 8px 12px 12px; color:var(--color-text-hint);">${month.replace('-', '年')}月</h2>`;
        }

        const icons = { routine: '🧹', food: '🍴', weight: '⚖️', medical: '🏥' };
        const displayTitle = `${r._catLabel}-${r.type || (r._c === 'weight' ? '称重' : '记录')}`;

        html += `
            <div class="card" style="margin-bottom:8px; padding:16px; display:flex; align-items:center; gap:16px; cursor:pointer;" data-id="${r.record_id}" data-category="${r._c}">
                <div style="width:48px; height:48px; background:var(--color-bg); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px;">${icons[r._c] || '🐾'}</div>
                <div style="flex:1;">
                    <div style="font-size:14px; font-weight:800; color:var(--color-text-title);">${displayTitle}</div>
                    <div style="font-size:11px; color:var(--color-text-hint); margin-top:4px; font-weight:600;">${r.timestamp}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:16px; font-weight:900; color:var(--color-primary);">${r.weight_kg ? r.weight_kg + 'kg' : (r.cost ? '￥' + r.cost : '')}</div>
                    ${r.note ? `<div style="font-size:10px; color:var(--color-text-hint); margin-top:2px;">有备注</div>` : ''}
                </div>
            </div>
        `;
    });
    mainContent.innerHTML = html + '</div>';

    mainContent.querySelectorAll('.card[data-id]').forEach(card => {
        card.onclick = () => showEntryDrawer(card.dataset.category, card.dataset.id);
    });
}

/**
 * 唤起录入/编辑抽屉 - 深度重绘
 */
function showEntryDrawer(category, recordId = null, presetSubtype = null) {
    const titles = { routine: '日常记录', food: '饮食录入', weight: '称重记录', medical: '就诊/健康' };
    const db = getDB();
    const suiSui = db.cats[0];
    const oldData = recordId ? db.records[suiSui.cat_id][category].find(r => r.record_id === recordId) : null;

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';

    const defaultTime = oldData ? oldData.timestamp.replace(' ', 'T') : getBJNow().replace(' ', 'T');

    let dynamicHTML = '';
    if (category === 'routine') {
        const types = ['剪指甲', '换猫砂', '驱虫', '洗澡', '梳毛', '刷牙'];
        const currentType = presetSubtype || oldData?.type || '剪指甲';
        dynamicHTML = `
            <div class="form-group">
                <label>事项类型</label>
                <select id="f-type" class="form-input">
                    ${types.map(t => `<option value="${t}" ${currentType === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>`;
    } else if (category === 'food') {
        const presets = ['猫粮', '冻干', '罐罐', '猫条', '自制'];
        dynamicHTML = `
            <div class="form-group">
                <label>品牌名称</label>
                <input type="text" id="f-brand" class="form-input" value="${oldData?.brand || ''}" placeholder="如：百利/巅峰">
            </div>
            <div class="form-group">
                <label>种类标签</label>
                <input type="text" id="f-kind" class="form-input" value="${oldData?.type || ''}" placeholder="请选择或输入">
                <div class="preset-tags">
                    ${presets.map(p => `<span class="preset-tag ${oldData?.type === p ? 'active' : ''}" data-val="${p}">${p}</span>`).join('')}
                </div>
            </div>`;
    } else if (category === 'weight') {
        dynamicHTML = `
            <div class="form-group">
                <label>称重结果 (kg)</label>
                <input type="number" step="0.01" id="f-weight" class="form-input" value="${oldData?.weight_kg || ''}" placeholder="0.00">
            </div>`;
    } else if (category === 'medical') {
        const types = ['检查', '疫苗', '生病', '绝育', '洗牙'];
        const currentType = oldData?.type || '检查';
        dynamicHTML = `
            <div class="form-group">
                <label>就诊类型</label>
                <select id="f-type" class="form-input">
                    ${types.map(t => `<option value="${t}" ${currentType === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>花费金额 (元)</label>
                <input type="number" id="f-cost" class="form-input" value="${oldData?.cost || ''}" placeholder="0">
            </div>`;
    }

    overlay.innerHTML = `
        <div class="drawer-panel">
            <div class="drawer-handle"></div>
            <div class="drawer-header">
                <h2 class="drawer-title">${oldData ? '🐾 修改' : '🐾 记一笔'}${titles[category]}</h2>
                <span id="close-drawer" class="drawer-close">×</span>
            </div>
            <div class="form-group">
                <label>发生时间</label>
                <input type="datetime-local" id="f-time" class="form-input" value="${defaultTime}">
            </div>
            ${dynamicHTML}
            <div class="form-group">
                <label>备注说明</label>
                <textarea id="f-note" class="form-input" rows="3" placeholder="写点什么吧...">${oldData?.note || ''}</textarea>
            </div>
            <div class="drawer-actions">
                ${oldData ? `<button id="btn-del" class="btn-drawer-delete">删除记录</button>` : ''}
                <button id="btn-save" class="btn-drawer-save">保存记录</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 绑定事件
    const close = () => {
        overlay.querySelector('.drawer-panel').style.transform = 'translateY(100%)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('#close-drawer').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    // 饮食预设点击逻辑
    if (category === 'food') {
        overlay.querySelectorAll('.preset-tag').forEach(tag => {
            tag.onclick = () => {
                overlay.querySelectorAll('.preset-tag').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                overlay.querySelector('#f-kind').value = tag.dataset.val;
            };
        });
    }

    overlay.querySelector('#btn-save').onclick = async () => {
        const record = {
            record_id: oldData ? oldData.record_id : 'r_' + Date.now(),
            timestamp: overlay.querySelector('#f-time').value.replace('T', ' '),
            note: overlay.querySelector('#f-note').value
        };

        if (category === 'routine') record.type = overlay.querySelector('#f-type').value;
        if (category === 'food') {
            record.brand = overlay.querySelector('#f-brand').value;
            record.type = overlay.querySelector('#f-kind').value;
        }
        if (category === 'weight') record.weight_kg = parseFloat(overlay.querySelector('#f-weight').value) || 0;
        if (category === 'medical') {
            record.type = overlay.querySelector('#f-type').value;
            record.cost = parseFloat(overlay.querySelector('#f-cost').value) || 0;
        }

        addOrUpdateRecord(suiSui.cat_id, category, record);
        showToast(oldData ? '已更新 🐾' : '记录成功 🐾', 'success');
        close();
        switchTab(document.querySelector('.tab-item.active').dataset.tab);
    };

    if (oldData) {
        overlay.querySelector('#btn-del').onclick = () => {
            if (confirm('要删除这条记录吗？')) {
                deleteRecord(suiSui.cat_id, category, recordId);
                showToast('已删除 🐾');
                close();
                switchTab('records');
            }
        };
    }
}

/**
 * 渲染“我的”页面 - 档案管理
 */
function renderProfile() {
    const db = getDB();
    const suiSui = db.cats[0];

    // 计算天数
    const adoptionDate = new Date(suiSui.adoption_date.replace(/-/g, '/'));
    const now = new Date(getBJNow().split(' ')[0].replace(/-/g, '/'));
    const companionDays = Math.floor((now - adoptionDate) / (1000 * 60 * 60 * 24)) + 1;

    mainContent.innerHTML = `
        <div class="content-wrapper">
            <div class="card" style="text-align:center; padding: 48px 24px 32px;">
                <div style="width:96px; height:96px; background:var(--color-bg); border-radius:48px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; font-size:42px; border:4px solid var(--color-divider);">🐱</div>
                <h2 style="font-size:24px; font-weight:900; color:var(--color-text-title);">${suiSui.name}</h2>
                <div style="margin-top:12px; display:flex; justify-content:center; gap:8px;">
                    <span class="tag tag-success"><span>♂</span> <span>${suiSui.gender === 'neutered_male' ? '已绝育' : '男孩子'}</span></span>
                </div>
                <p style="color:var(--color-text-hint); font-size:14px; margin-top:20px; font-weight:700; letter-spacing:0.5px;">已陪伴${suiSui.name} ${companionDays} 天</p>
                <div id="btn-edit-profile" class="profile-edit-btn">⚙️ 修改资料</div>
            </div>
            
            <div class="card" style="padding:12px 24px;">
                <div class="milestone-item">
                    <div class="milestone-icon">🎂</div>
                    <div style="flex:1;">
                        <div style="font-size:14px; font-weight:800;">出生日期</div>
                        <div style="font-size:12px; color:var(--color-text-hint);">${suiSui.birth_date}</div>
                    </div>
                </div>
                <div class="milestone-item">
                    <div class="milestone-icon">🏠</div>
                    <div style="flex:1;">
                        <div style="font-size:14px; font-weight:800;">来到家里</div>
                        <div style="font-size:12px; color:var(--color-text-hint);">${suiSui.adoption_date}</div>
                    </div>
                </div>
                <div class="milestone-item">
                    <div class="milestone-icon">💊</div>
                    <div style="flex:1;">
                        <div style="font-size:14px; font-weight:800;">绝育时间</div>
                        <div style="font-size:12px; color:var(--color-text-hint);">${suiSui.neutering_date || '尚未填写'}</div>
                    </div>
                </div>
            </div>

            <div class="card" style="padding:0; overflow:hidden;">
                <div id="btn-settings" style="display:flex; justify-content:space-between; align-items:center; padding:20px 24px; cursor:pointer;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:18px;">⚙️</span>
                        <span style="font-size:15px; font-weight:700;">系统设置</span>
                    </div>
                    <span style="color:var(--color-text-hint); font-size:12px;">❯</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-settings').onclick = () => switchTab('settings');
    document.getElementById('btn-edit-profile').onclick = () => showProfileDrawer();
}

/**
 * 修改档案抽屉
 */
function showProfileDrawer() {
    const db = getDB();
    const suiSui = db.cats[0];

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.innerHTML = `
        <div class="drawer-panel">
            <div class="drawer-handle"></div>
            <div class="drawer-header">
                <h2 class="drawer-title">🐱 修改资料</h2>
                <span id="close-drawer" class="drawer-close">×</span>
            </div>
            <div class="form-group">
                <label>小猫姓名</label>
                <input type="text" id="p-name" class="form-input" value="${suiSui.name}">
            </div>
            <div class="form-group">
                <label>性别状态</label>
                <select id="p-gender" class="form-input">
                    <option value="neutered_male" ${suiSui.gender === 'neutered_male' ? 'selected' : ''}>已绝育公猫</option>
                    <option value="male" ${suiSui.gender === 'male' ? 'selected' : ''}>未绝育公猫</option>
                    <option value="neutered_female" ${suiSui.gender === 'neutered_female' ? 'selected' : ''}>已绝育母猫</option>
                    <option value="female" ${suiSui.gender === 'female' ? 'selected' : ''}>未绝育母猫</option>
                </select>
            </div>
            <div class="form-group">
                <label>出生日期</label>
                <input type="date" id="p-birth" class="form-input" value="${suiSui.birth_date}">
            </div>
            <div class="form-group">
                <label>来到家里</label>
                <input type="date" id="p-adoption" class="form-input" value="${suiSui.adoption_date}">
            </div>
            <div class="form-group">
                <label>绝育时间</label>
                <input type="date" id="p-neutering" class="form-input" value="${suiSui.neutering_date || ''}">
            </div>
            <button id="p-save" class="btn-drawer-save" style="margin-top:20px;">更新资料</button>
        </div>
    `;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#close-drawer').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.querySelector('#p-save').onclick = () => {
        const updates = {
            name: overlay.querySelector('#p-name').value,
            gender: overlay.querySelector('#p-gender').value,
            birth_date: overlay.querySelector('#p-birth').value,
            adoption_date: overlay.querySelector('#p-adoption').value,
            neutering_date: overlay.querySelector('#p-neutering').value
        };
        updateCatProfile(suiSui.cat_id, updates);
        showToast('资料已更新 🐾', 'success');
        close();
        renderProfile();
    };
}

/**
 * 设置页面渲染 - 自定义模型支持
 */
function renderSettings() {
    const config = getConfig();
    mainContent.innerHTML = `
        <div class="content-wrapper">
            <div style="display:flex; align-items:center; margin-bottom:12px; gap:8px;">
                <span id="btn-back" style="cursor:pointer; font-size:24px; padding:4px;">←</span>
                <h2 style="font-size:18px; font-weight:900;">系统设置</h2>
            </div>
            
            <div class="card">
                <div class="form-group">
                    <label>GITHUB REPO (USER/REPO)</label>
                    <input type="text" id="i-repo" class="form-input" value="${config.githubRepo || ''}" placeholder="例如: yourname/meow_daily">
                </div>
                <div class="form-group">
                    <label>GITHUB TOKEN</label>
                    <input type="password" id="i-token" class="form-input" value="${config.githubToken || ''}">
                </div>
                
                <hr style="border:none; border-top:1.5px dashed var(--color-divider); margin:12px 0 24px;">
                
                <div class="form-group">
                    <label>AI KEY (CHATANYWHERE)</label>
                    <input type="password" id="i-ai" class="form-input" value="${config.aiKey || ''}">
                </div>
                <div class="form-group">
                    <label>AI MODEL NAME</label>
                    <input type="text" id="i-model" class="form-input" value="${config.aiModel || 'gpt-3.5-turbo'}" placeholder="例如: gpt-4o-mini">
                </div>
                
                <button id="i-save" class="btn-drawer-save" style="margin-top:12px;">保存配置</button>
            </div>
            
            <div style="text-align:center; padding:20px;">
                <p style="font-size:11px; color:var(--color-text-hint); font-weight:600;">Meow_Daily V2.0.3 "SuiSui" Premium Build</p>
            </div>
        </div>
    `;

    document.getElementById('btn-back').onclick = () => switchTab('profile');
    document.getElementById('i-save').onclick = () => {
        const newCfg = {
            githubRepo: document.getElementById('i-repo').value.trim(),
            githubToken: document.getElementById('i-token').value.trim(),
            aiKey: document.getElementById('i-ai').value.trim(),
            aiModel: document.getElementById('i-model').value.trim()
        };
        saveConfig(newCfg);
        showToast('配置已生效 🐾', 'success');
        switchTab('profile');
    };
}

// ---- AI 智能入口模块 ----

export function initAIEntry() {
    const btn = document.getElementById('ai-entry');
    if (!btn) return;

    btn.onclick = () => {
        const overlay = document.createElement('div');
        overlay.className = 'drawer-overlay';
        overlay.innerHTML = `
            <div class="drawer-panel" style="min-height:50vh;">
                <div class="drawer-handle"></div>
                <div class="drawer-header">
                    <h2 class="drawer-title">🐾 AI 智能记事</h2>
                    <span id="close-ai" class="drawer-close">×</span>
                </div>
                <div class="form-group">
                    <textarea id="ai-input" class="form-input" rows="5" placeholder="可以说：岁岁昨晚8点剪了指甲，表现超级棒！"></textarea>
                </div>
                <button id="ai-parse" class="btn-drawer-save" style="background:var(--color-yellow); color:#78350F; box-shadow:0 4px 14px rgba(250, 204, 21, 0.4);">
                    ✨ 让 AI 帮我记
                </button>
                <div id="ai-status" style="display:none; text-align:center; margin-top:20px; font-size:14px; font-weight:700; color:var(--color-primary);">
                    <div class="syncing" style="display:inline-block; margin-right:8px;"><span class="dot"></span></div>
                    喵喵正在思考中... 🧠
                </div>
                <div id="ai-result" style="display:none; margin-top:24px; padding:20px; background:var(--color-bg); border-radius:16px; border:2px dashed var(--color-yellow);">
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#close-ai').onclick = close;

        const input = overlay.querySelector('#ai-input');
        const parseBtn = overlay.querySelector('#ai-parse');
        const status = overlay.querySelector('#ai-status');
        const resultDiv = overlay.querySelector('#ai-result');

        parseBtn.onclick = async () => {
            const text = input.value.trim();
            if (!text) return;

            status.style.display = 'block';
            resultDiv.style.display = 'none';
            parseBtn.disabled = true;
            parseBtn.style.opacity = '0.6';

            try {
                const res = await parseTextWithAI(text);
                const time = processMentionedTime(res.mentioned_time);

                status.style.display = 'none';
                resultDiv.style.display = 'block';

                const catMap = { routine: '日常', food: '饮食', weight: '体重', medical: '就诊' };
                resultDiv.innerHTML = `
                    <div style="font-size:14px; line-height:1.6;">
                        <h4 style="margin-bottom:12px; color:var(--color-text-title); font-weight:900;">识别成果：</h4>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <p><b>分类：</b>${catMap[res.category] || res.category}</p>
                            <p><b>时间：</b>${time}</p>
                            <p><b>内容：</b>${JSON.stringify(res.parsed_data)}</p>
                        </div>
                        <button id="ai-confirm" class="btn-drawer-save" style="margin-top:20px;">确认录入</button>
                    </div>
                `;

                document.getElementById('ai-confirm').onclick = () => {
                    addOrUpdateRecord(getDB().cats[0].cat_id, res.category, {
                        record_id: 'r_' + Date.now(),
                        timestamp: time,
                        ...res.parsed_data
                    });
                    showToast('AI 记好啦 🐾', 'success');
                    close();
                    if (document.querySelector('.tab-item[data-tab="home"].active')) renderHome();
                    else switchTab('records');
                };
            } catch (e) {
                status.style.display = 'none';
                parseBtn.disabled = false;
                parseBtn.style.opacity = '1';
                showToast(e.message, 'error');
            }
        };
    };
}

// ---- 云端同步引擎 (Pull-Merge-Push) ----

export function initSyncButton() {
    const btn = document.getElementById('sync-btn');
    if (!btn) return;

    btn.onclick = async () => {
        const config = getConfig();
        if (!config.githubToken || !config.githubRepo) {
            showToast('请先在设置中配置 GitHub Token 和 仓库', 'error');
            switchTab('settings');
            return;
        }

        if (btn.classList.contains('syncing')) return; // 防止重复点击

        btn.classList.add('syncing');
        btn.querySelector('.sync-text').textContent = '同步中...';

        try {
            console.log('🐾 开始云端同步...');
            
            // 1. 获取云端数据 (Pull)
            const remote = await fetchCloudDB(config);
            console.log('✅ 云端拉取完成，SHA:', remote.sha);

            // 2. 合并数据 (Merge)
            const localDB = JSON.parse(JSON.stringify(getDB())); // 确保本地数据是最新的深拷贝
            const mergedDB = mergeDB(localDB, remote.db);
            console.log('✅ 数据合并完成');

            // 3. 推送到云端 (Push)
            await pushCloudDB(config, mergedDB, remote.sha);
            console.log('✅ 云端推送成功');

            // 4. 更新本地状态 (Update)
            setDB(mergedDB);
            
            showToast('云端同步成功 🐾', 'success');
            
            // 刷新当前 Tab 视图
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab) switchTab(activeTab.dataset.tab);

        } catch (e) {
            console.error('❌ 同步过程中出错:', e);
            showToast(e.message, 'error');
        } finally {
            btn.classList.remove('syncing');
            btn.querySelector('.sync-text').textContent = '云端同步';
        }
    };
}
