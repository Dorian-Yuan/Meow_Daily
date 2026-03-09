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
let currentRecordFilter = 'all'; // 记录页分类筛选状态


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
/**
 * 首页渲染 - 仪表盘与提醒引擎
 */
function renderHome() {
    const db = getDB();
    const suiSui = db.cats[0];
    const catRecs = db.records[suiSui.cat_id] || {};
    const weightRecords = catRecs.weight || [];
    const sortedWeights = [...weightRecords].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const latestWeight = sortedWeights.length > 0 ? sortedWeights[0].weight_kg : '--';
    const latestWeightDate = sortedWeights.length > 0 ? sortedWeights[0].timestamp.split(' ')[0] : '尚未记录';

    const todayStr = getBJNow().split(' ')[0];
    const todayDate = new Date(todayStr.replace(/-/g, '/'));
    const currentMonth = todayStr.slice(0, 7);

    // 1. 统计数据计算
    // 陪伴天数
    const adoptionDate = new Date(suiSui.adoption_date.replace(/-/g, '/'));
    const companionDays = Math.floor((todayDate - adoptionDate) / (1000 * 60 * 60 * 24)) + 1;
    // 本月饮食记录数
    const monthFoodCount = (catRecs.food || []).filter(r => r.timestamp.startsWith(currentMonth)).length;

    // 2. 提醒引擎
    const reminders = [];
    const tMonth = todayDate.getMonth();
    const tDay = todayDate.getDate();

    // 纪念日检测
    const birthDate = new Date(suiSui.birth_date.replace(/-/g, '/'));
    if (birthDate.getMonth() === tMonth && birthDate.getDate() === tDay) {
        reminders.push({ special: true, icon: '🎂', label: `今天是${suiSui.name}的 ${todayDate.getFullYear() - birthDate.getFullYear()} 岁生日！` });
    }

    let healthTipHtml = '';
    const customReminders = db.settings.reminders || [];
    let urgentCount = 0;

    customReminders.forEach(rm => {
        const lastRec = (catRecs.routine || []).filter(r => r.type === rm.label)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

        let statusHtml = '';
        if (lastRec) {
            const lastDate = new Date(lastRec.timestamp.split(' ')[0].replace(/-/g, '/'));
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            const daysLeft = rm.days - diffDays;

            if (diffDays === 0) {
                statusHtml = `<div style="font-size:11px; color:var(--color-primary); font-weight:700;">✅ 今天已完成</div>`;
            } else if (daysLeft > 0) {
                statusHtml = `<div style="font-size:11px; color:var(--color-text-hint);">⏳ 还有 ${daysLeft} 天</div>`;
            } else {
                statusHtml = `<div style="font-size:11px; color:#EF4444; font-weight:700;">⚠️ 已逾期 ${Math.abs(daysLeft)} 天</div>`;
                urgentCount++;
            }
        } else {
            statusHtml = `<div style="font-size:11px; color:var(--color-text-hint);">❓ 尚未记录过</div>`;
            urgentCount++;
        }
        reminders.push({ label: rm.label, icon: rm.icon || '🐾', statusHtml });
    });

    if (urgentCount > 0) {
        healthTipHtml = `
            <div class="health-tip fade-up delay-3">
                <span class="tip-icon">💜</span>
                <span>主子提醒：喵！有 ${urgentCount} 项待办已经过期或需要关注啦，快去看看！</span>
            </div>
        `;
    }

    mainContent.innerHTML = `
        <div class="content-wrapper">
            <!-- 快速入口置顶 -->
            <section class="quick-actions fade-up delay-1">
                <div class="action-item" data-type="routine"><div class="action-icon">🧹</div><div class="action-label">日常</div></div>
                <div class="action-item" data-type="food"><div class="action-icon">🍴</div><div class="action-label">饮食</div></div>
                <div class="action-item" data-type="weight"><div class="action-icon">⚖️</div><div class="action-label">体重</div></div>
                <div class="action-item" data-type="medical"><div class="action-icon">🏥</div><div class="action-label">就诊</div></div>
            </section>

            <!-- 2x2 概览仪表盘 - 紧凑型横向布局 -->
            <section class="overview-grid fade-up delay-2">
                <div class="overview-item">
                    <span class="ov-icon">🏠</span>
                    <div class="ov-text">
                        <span class="ov-value">${companionDays}</span>
                        <span class="ov-label">陪伴天数</span>
                    </div>
                </div>
                <div class="overview-item">
                    <span class="ov-icon">🍴</span>
                    <div class="ov-text">
                        <span class="ov-value">${monthFoodCount}</span>
                        <span class="ov-label">本月开饭</span>
                    </div>
                </div>
                <div class="overview-item" id="nav-weight-grid" style="cursor:pointer;">
                    <span class="ov-icon">⚖️</span>
                    <div class="ov-text">
                        <span class="ov-value">${latestWeight}<small style="font-size:9px; margin-left:1px; opacity:0.6;">kg</small></span>
                        <span class="ov-label">当前体重 <span style="font-size:8px; opacity:0.6; font-weight:500;">(${latestWeightDate})</span></span>
                    </div>
                </div>
                <div class="overview-item">
                    <span class="ov-icon">✨</span>
                    <div class="ov-text">
                        <span class="ov-value">V2.4.11</span>
                        <span class="ov-label">系统版本</span>
                    </div>
                </div>
            </section>

            ${healthTipHtml}

            <div class="card fade-up delay-4" style="border-left: 6px solid var(--color-yellow); background: var(--color-reminder-bg); padding-left: 20px;">
                <h3 style="font-size:15px; font-weight:800; color:var(--color-text-title); margin-bottom:12px;">提醒事项</h3>
                <div style="display:flex; flex-direction:column; gap:16px;">
                    ${reminders.length === 0 ?
            `<p style="font-size:14px; color:var(--color-text-main); font-weight:500;">${suiSui.name}今天表现很棒喵，近期没有待办任务！🐾</p>` :
            reminders.map(r => r.special ? `
                            <div style="display:flex; align-items:center; gap:var(--spacing-m); background:rgba(225, 29, 72, 0.05); padding:10px; border-radius:var(--radius-12);">
                                <span style="font-size:24px;">${r.icon}</span>
                                <div style="flex:1; font-size:14px; font-weight:800; color:#E11D48;">${r.label}</div>
                            </div>
                        ` : `
                            <div style="display:flex; align-items:center; gap:var(--spacing-m);">
                                <span style="font-size:18px;">${r.icon}</span>
                                <div style="flex:1;">
                                    <div style="font-size:14px; font-weight:800; margin-bottom:var(--spacing-xs);">${r.label}</div>
                                    ${r.statusHtml}
                                </div>
                                <button class="btn profile-edit-btn" style="padding:6px 12px; margin:0; font-size:11px;" onclick="window.meow_quick_record('${r.label}')">去记录</button>
                            </div>
                        `).join('')
        }
                </div>
            </div>
        </div>
    `;

    document.querySelectorAll('.action-item').forEach(el => {
        el.onclick = () => showEntryDrawer(el.dataset.type);
    });

    window.meow_quick_record = (label) => showEntryDrawer('routine', null, label);

    const weightBtn = document.getElementById('nav-weight-grid');
    if (weightBtn) {
        weightBtn.onclick = () => showWeightChartDrawer(weightRecords);
    }
}

/**
 * 渲染体重历史趋势图弹窗
 */
function showWeightChartDrawer(weightRecords) {
    if (!weightRecords || weightRecords.length === 0) {
        showToast('暂无体重记录', 'info');
        return;
    }

    const records = [...weightRecords].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const displayRecords = records.slice(-10); // 取最近10条

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';

    overlay.innerHTML = `
        <div class="drawer-panel" style="min-height: 55vh;">
            <div class="drawer-handle"></div>
            <div class="drawer-header">
                <h2 class="drawer-title">📈 体重变化趋势</h2>
                <span id="close-chart" class="drawer-close">×</span>
            </div>
            <div style="padding: 10px 0;">
                <canvas id="weight-chart-canvas" width="320" height="200" style="width: 100%; height: auto; border-radius: 12px; background: var(--color-bg);"></canvas>
            </div>
            <div style="margin-top: 16px;">
                <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--color-text-title);">近期记录</h3>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${[...displayRecords].reverse().map(r => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 16px; background: var(--color-bg); border-radius: 12px;">
                            <span style="font-size: 13px; font-weight: 600; color: var(--color-text-title);">${r.timestamp.split(' ')[0]}</span>
                            <span style="font-size: 15px; font-weight: 800; color: var(--color-primary);">${r.weight_kg} kg</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
        overlay.querySelector('.drawer-panel').style.transform = 'translateY(100%)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('#close-chart').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    // 获取当前计算后的颜色 (适配暗黑模式)
    const style = getComputedStyle(document.documentElement);
    const colorPrimary = style.getPropertyValue('--color-primary').trim() || '#4066E0';
    const colorDivider = style.getPropertyValue('--color-divider').trim() || '#E5E7EB';
    const colorTextHint = style.getPropertyValue('--color-text-hint').trim() || '#9CA3AF';
    const colorBg = style.getPropertyValue('--color-bg').trim() || '#FBF8F4';

    // 绘制图表
    const canvas = overlay.querySelector('#weight-chart-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;

    const padding = 30;
    const weights = displayRecords.map(r => r.weight_kg);
    const maxW = Math.max(...weights) + 0.5;
    const minW = Math.max(0, Math.min(...weights) - 0.5);

    ctx.clearRect(0, 0, cw, ch);

    // 背景网格线与Y轴文字
    ctx.strokeStyle = colorDivider;
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = colorTextHint;
    ctx.textAlign = 'right';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
        const y = padding + (ch - padding * 2) * (1 - i / steps);
        const val = minW + (maxW - minW) * (i / steps);

        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(cw - padding, y);
        ctx.stroke();
        ctx.fillText(val.toFixed(1), padding - 5, y + 3);
    }

    // 数据折线
    if (weights.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = colorPrimary;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';

        displayRecords.forEach((r, i) => {
            const x = padding + (cw - padding * 2) * (i / Math.max(1, displayRecords.length - 1));
            const y = padding + (ch - padding * 2) * (1 - (r.weight_kg - minW) / (maxW - minW));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 数据点圆圈
        displayRecords.forEach((r, i) => {
            const x = padding + (cw - padding * 2) * (i / Math.max(1, displayRecords.length - 1));
            const y = padding + (ch - padding * 2) * (1 - (r.weight_kg - minW) / (maxW - minW));

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = colorBg;
            ctx.fill();
            ctx.stroke();
        });
    }
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

    // 分类筛选逻辑
    let filteredRecords = all;
    if (currentRecordFilter !== 'all') {
        filteredRecords = all.filter(r => r._c === currentRecordFilter);
    }

    filteredRecords.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (all.length === 0) {
        mainContent.innerHTML = `
            <div class="content-wrapper fade-in delay-1">
                <div class="card" style="text-align:center; padding:60px 24px;">
                    <p style="color:var(--color-text-hint); font-size:14px; font-weight:600;">还没有记过${suiSui.name}的生活呢喵~ 🐾</p>
                </div>
            </div>
        `;
        return;
    }

    // 记录筛选栏 HTML
    const filterTabs = [
        { id: 'all', label: '全部', icon: '🐾' },
        { id: 'routine', label: '日常', icon: '🧹' },
        { id: 'food', label: '饮食', icon: '🍴' },
        { id: 'weight', label: '体重', icon: '⚖️' },
        { id: 'medical', label: '就诊', icon: '🏥' }
    ];

    let html = `
        <div class="record-filter-bar">
            ${filterTabs.map(t => `
                <div class="filter-chip ${currentRecordFilter === t.id ? 'active' : ''}" data-filter="${t.id}">
                    ${t.icon} ${t.label}
                </div>
            `).join('')}
        </div>
        <div class="content-wrapper fade-in" style="margin-top:0; padding-top:16px;">
    `;

    let lastMonth = '';

    filteredRecords.forEach((r, idx) => {
        const month = r.timestamp.slice(0, 7);
        if (month !== lastMonth) {
            lastMonth = month;
            html += `<h2 class="sticky-month">${month.replace('-', '年')}月</h2>`;
        }

        const icons = { routine: '🧹', food: '🍴', weight: '⚖️', medical: '🏥' };
        let title = r.type || (r._c === 'weight' ? '称重记录' : '记录');
        let iconHtml = `<div style="width:44px; height:44px; background:var(--color-bg); border-radius:var(--radius-12); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">${icons[r._c] || '🐾'}</div>`;

        let rightContent = '';
        let badgeHtml = '';

        if (r._c === 'weight') {
            rightContent = `<div style="font-size:22px; font-weight:900; color:var(--color-primary); line-height:1;">${r.weight_kg}<span style="font-size:12px; margin-left:2px; color:var(--color-text-hint);">kg</span></div>`;
            // 比较上一次体重（all 是降序，所以 idx+1 是上一个记录）
            const prev = all.slice(idx + 1).find(p => p._c === 'weight');
            if (prev && r.weight_kg > prev.weight_kg) {
                badgeHtml = `<span class="badge badge-success">增长 +${(r.weight_kg - prev.weight_kg).toFixed(2)}</span>`;
            }
        } else if (r._c === 'medical') {
            rightContent = `<div style="font-size:20px; font-weight:900; color:#EF4444; line-height:1;">￥${r.cost || 0}</div>`;
            badgeHtml = `<span class="badge badge-info">${r.type || '就诊'}</span>`;
        } else if (r._c === 'food') {
            let tags = [];
            if (r.brand) tags.push(r.brand);
            if (r.type) tags.push(r.type);
            let tagStr = tags.length > 0 ? tags.join(' · ') : '未填写';
            rightContent = `<div style="font-size:13px; font-weight:800; color:var(--color-text-title); background:var(--color-bg); padding:6px 10px; border-radius:8px;">${tagStr}</div>`;
        } else if (r._c === 'routine') {
            rightContent = `<div style="font-size:13px; font-weight:800; color:var(--color-primary); background:#EEF2FF; padding:6px 10px; border-radius:8px;">✨ 已完成</div>`;
        }

        let noteHtml = r.note
            ? `<div style="margin-top:12px; padding-top:12px; border-top:1.5px dashed var(--color-divider); font-size:13px; color:var(--color-text-hint); line-height:1.5; word-break:break-all;">${r.note}</div>`
            : '';

        const delay = Math.min(6, (idx % 6) + 1);
        html += `
            <div class="card fade-up delay-${delay}" style="padding:16px; display:flex; flex-direction:column; cursor:pointer;" data-id="${r.record_id}" data-category="${r._c}">
                ${badgeHtml}
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                        ${iconHtml}
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:15px; font-weight:800; color:var(--color-text-title); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r._catLabel} · ${title}</div>
                            <div style="font-size:12px; color:var(--color-text-hint); margin-top:4px; font-weight:600;">${r.timestamp}</div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; text-align:right;">
                        ${rightContent}
                    </div>
                </div>
                ${noteHtml}
            </div>
        `;
    });
    mainContent.innerHTML = html + '</div>';

    // 绑定筛选点击事件
    mainContent.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => {
            currentRecordFilter = chip.dataset.filter;
            renderRecords();
        };
    });

    mainContent.querySelectorAll('.card[data-id]').forEach(card => {
        card.onclick = () => showEntryDrawer(card.dataset.category, card.dataset.id);
    });
}

/**
 * 唤起录入/编辑抽屉 - 深度重绘
 */
function showEntryDrawer(category, recordId = null, presetSubtype = null, prefillData = null) {
    const titles = { routine: '日常记录', food: '饮食录入', weight: '称重记录', medical: '就诊/健康' };
    const db = getDB();
    const suiSui = db.cats[0];
    let oldData = recordId ? db.records[suiSui.cat_id][category].find(r => r.record_id === recordId) : null;

    if (prefillData) {
        oldData = prefillData;
    }

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
            </div>
            <div style="display:flex; gap:12px;">
                <div class="form-group" style="flex:1;">
                    <label>单价 (元/kg)</label>
                    <input type="number" step="0.1" id="f-price" class="form-input" value="${oldData?.price_per_kg || ''}" placeholder="0.0">
                </div>
                <div class="form-group" style="flex:1;">
                    <label>日均食量 (g)</label>
                    <input type="number" id="f-intake" class="form-input" value="${oldData?.daily_intake_g || ''}" placeholder="0">
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
                <label>就诊医院</label>
                <input type="text" id="f-hospital" class="form-input" value="${oldData?.hospital || ''}" placeholder="如：瑞鹏宠物医院">
            </div>
            <div class="form-group">
                <label>症状/起因</label>
                <input type="text" id="f-symptom" class="form-input" value="${oldData?.symptom || ''}" placeholder="如：软便/例行体检">
            </div>
            <div class="form-group">
                <label>治疗方案</label>
                <input type="text" id="f-treatment" class="form-input" value="${oldData?.treatment || ''}" placeholder="如：开益生菌/打消炎针">
            </div>
            <div class="form-group">
                <label>花费金额 (元)</label>
                <input type="number" id="f-cost" class="form-input" value="${oldData?.cost || ''}" placeholder="0">
            </div>`;
    }

    const isEditing = (oldData && recordId);

    overlay.innerHTML = `
        <div class="drawer-panel">
            <div class="drawer-handle"></div>
            <div class="drawer-header">
                <h2 class="drawer-title">${isEditing ? '🐾 修改' : '🐾 记一笔'}${titles[category]}</h2>
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
                ${isEditing ? `<button id="btn-del" class="btn-drawer-delete">删除记录</button>` : ''}
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
            record_id: isEditing ? oldData.record_id : 'r_' + Date.now(),
            timestamp: overlay.querySelector('#f-time').value.replace('T', ' '),
            note: overlay.querySelector('#f-note').value
        };

        if (category === 'routine') record.type = overlay.querySelector('#f-type').value;
        if (category === 'food') {
            record.brand = overlay.querySelector('#f-brand').value;
            record.type = overlay.querySelector('#f-kind').value;
            record.price_per_kg = parseFloat(overlay.querySelector('#f-price').value) || 0;
            record.daily_intake_g = parseFloat(overlay.querySelector('#f-intake').value) || 0;
        }
        if (category === 'weight') record.weight_kg = parseFloat(overlay.querySelector('#f-weight').value) || 0;
        if (category === 'medical') {
            record.type = overlay.querySelector('#f-type').value;
            record.hospital = overlay.querySelector('#f-hospital').value;
            record.symptom = overlay.querySelector('#f-symptom').value;
            record.treatment = overlay.querySelector('#f-treatment').value;
            record.cost = parseFloat(overlay.querySelector('#f-cost').value) || 0;
        }

        addOrUpdateRecord(suiSui.cat_id, category, record);
        showToast(isEditing ? '已更新 🐾' : '记录成功 🐾', 'success');
        close();
        switchTab(document.querySelector('.tab-item.active').dataset.tab);
    };

    if (isEditing) {
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

    let genderIcon = suiSui.gender.includes('female')
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><circle cx="12" cy="10" r="7"></circle><line x1="12" y1="17" x2="12" y2="23"></line><line x1="9" y1="20" x2="15" y2="20"></line></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><circle cx="10" cy="14" r="7"></circle><line x1="15" y1="9" x2="21" y2="3"></line><polyline points="15 3 21 3 21 9"></polyline></svg>`;

    let genderText = '未绝育';
    if (suiSui.gender === 'neutered_male' || suiSui.gender === 'neutered_female') {
        genderText = '已绝育';
    }

    mainContent.innerHTML = `
        <div class="content-wrapper fade-up delay-1">
            <div class="card" id="profile-card" style="display:flex; flex-direction:row; align-items:center; gap:var(--spacing-l); padding:var(--spacing-l); cursor:pointer;">
                <div style="width:72px; height:72px; background:var(--color-bg); border-radius:36px; display:flex; align-items:center; justify-content:center; font-size:32px; border:3px solid var(--color-divider); flex-shrink:0;">🐱</div>
                <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:flex-start; gap:var(--spacing-xs);">
                    <div style="display:flex; align-items:center; gap:var(--spacing-s);">
                        <h2 style="font-size:20px; font-weight:900; color:var(--color-text-title); line-height:1;">${suiSui.name}</h2>
                        <div class="tag tag-success" style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:var(--radius-12);">
                            <span style="display:flex; align-items:center;">${genderIcon}</span> 
                            <span style="font-size:11px; font-weight:700; line-height:1;">${genderText}</span>
                        </div>
                    </div>
                    <p style="color:var(--color-text-hint); font-size:13px; font-weight:700; line-height:1; margin-top:4px;">陪伴第 ${companionDays} 天</p>
                </div>
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

            <div id="btn-settings" class="card" style="flex-direction:row; justify-content:space-between; align-items:center; padding:20px 24px; cursor:pointer; overflow:visible; transform:translateZ(0);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:18px;">⚙️</span>
                    <span style="font-size:15px; font-weight:700;">系统设置</span>
                </div>
                <span style="color:var(--color-text-hint); font-size:12px;">❯</span>
            </div>
        </div>
    `;

    document.getElementById('btn-settings').onclick = () => switchTab('settings');
    document.getElementById('profile-card').onclick = () => showProfileDrawer();
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
    const db = getDB();
    const reminders = db.settings.reminders || [];

    mainContent.innerHTML = `
        <div class="content-wrapper fade-in delay-1">
            <div class="sticky-nav-header">
                <span id="btn-back" style="cursor:pointer; font-size:24px;">←</span>
                <h2 style="font-size:18px; font-weight:900;">系统设置</h2>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom:12px;">⏰ 提醒事项管理</h3>
                <div id="reminder-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                    ${reminders.map((rm, idx) => `
                        <div style="display:flex; align-items:center; gap:8px; background:var(--color-bg); padding:8px 12px; border-radius:8px;">
                            <span>${rm.icon}</span>
                            <div style="flex:1; font-size:13px; font-weight:700;">${rm.label}</div>
                            <div style="font-size:12px; color:var(--color-text-hint);">${rm.days} 天</div>
                            <button class="btn-del-rm" data-idx="${idx}" style="background:none; border:none; color:#EF4444; font-size:16px; cursor:pointer; padding:0 4px;">×</button>
                        </div>
                    `).join('')}
                </div>
                <button id="btn-add-rm" class="btn profile-edit-btn" style="width:100%; margin:0; justify-content:center;">+ 添加新提醒</button>
            </div>

            <div class="card">
                <h3 style="margin-bottom:12px;">🔗 云端同步配置</h3>
                <div class="form-group">
                    <label>GITHUB REPO (USER/REPO)</label>
                    <input type="text" id="i-repo" class="form-input" value="${config.githubRepo || ''}" placeholder="例如: yourname/meow_daily">
                </div>
                <div class="form-group">
                    <label>GITHUB TOKEN</label>
                    <input type="password" id="i-token" class="form-input" value="${config.githubToken || ''}">
                </div>
                
                <button id="i-save" class="btn-drawer-save" style="margin-top:12px;">保存配置</button>
            </div>

            <div id="btn-ai-settings" class="card" style="flex-direction:row; justify-content:space-between; align-items:center; padding:20px 24px; cursor:pointer; overflow:visible; transform:translateZ(0);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:18px;">🤖</span>
                    <span style="font-size:15px; font-weight:700;">AI 设置</span>
                </div>
                <span style="color:var(--color-text-hint); font-size:12px;">❯</span>
            </div>
            
                <p style="font-size:11px; color:var(--color-text-hint); font-weight:600; text-align:center;">Meow_Daily V2.4.11 "SuiSui" PWA Logo Update Build</p>
        </div>
    `;

    document.getElementById('btn-back').onclick = () => switchTab('profile');

    document.querySelectorAll('.btn-del-rm').forEach(btn => {
        btn.onclick = () => {
            if (confirm('确定删除该提醒吗？')) {
                db.settings.reminders.splice(btn.dataset.idx, 1);
                setDB(db);
                renderSettings();
            }
        };
    });

    document.getElementById('btn-add-rm').onclick = () => {
        const label = prompt('请输入提醒事项名称 (如: 梳毛)');
        if (!label) return;
        const daysStr = prompt('请输入提醒间隔天数 (如: 7)');
        const days = parseInt(daysStr);
        if (isNaN(days) || days <= 0) return alert('请输入有效的天数！');
        const icon = prompt('请输入一个 Emoji 图标 (如: 🛁)', '🐾') || '🐾';

        db.settings.reminders.push({ id: 'rm_' + Date.now(), label, days, icon });
        setDB(db);
        renderSettings();
    };

    document.getElementById('i-save').onclick = () => {
        const currentConfig = getConfig();
        const newCfg = {
            ...currentConfig,
            githubRepo: document.getElementById('i-repo').value.trim(),
            githubToken: document.getElementById('i-token').value.trim()
        };
        saveConfig(newCfg);
        showToast('配置已生效 🐾', 'success');
        switchTab('profile');
    };

    document.getElementById('btn-ai-settings').onclick = () => renderAISettings();
}

/**
 * 渲染 AI 设置独立页面
 */
function renderAISettings() {
    const config = getConfig();
    const db = getDB();

    // 默认 prompts
    const defaultParser = `你是一个严格的宠物日记数据提取API。请将用户的自然语言转化为精确的JSON格式。不要生成任何绝对时间戳（时间戳由前端系统自动生成）。\n【重要】如果用户提到了具体日期（如"26年1月31号"），请直接在 mentioned_time 中返回 "YYYY-MM-DD HH:mm" 格式。\n【示例】用户说 "26年1月31号去医院"，你应返回 "mentioned_time": "2026-01-31 00:00"。\n必须严格遵守以下JSON结构返回，缺失的数据用null表示：\n{\n  "category": "必须是以下枚举值之一：routine(日常护理), food(饮食), weight(体重), medical(医疗)",\n  "parsed_data": {\n    // 若 category=weight，必须包含: "weight_kg"(数字), "note"(字符串)\n    // 若 category=routine，必须包含: "type"(如驱虫、洗澡、换猫砂等), "note"(字符串)\n    // 若 category=food，必须包含: "brand"(品牌), "type"(干粮/罐头等), "daily_intake_g"(数字)\n    // 若 category=medical，必须包含: "hospital"(医院), "symptom"(症状), "treatment"(治疗方案), "cost"(数字金额)\n  },\n  "mentioned_time": "提取用户话语中提及的时间，尽量直接返回 YYYY-MM-DD HH:mm。"\n}\n严禁输出任何多余的解释性纯文本。`;
    const defaultDaily = `你是一只叫“岁岁”的傲娇小猫。你的主人设置了提醒。请根据提供的任务列表，用简短、傲娇、可爱的语气催促主人（铲屎官）去干活。如果今天是你的生日或纪念日，记得要礼物！字数控制在 60 字以内，多用 emoji。`;
    const defaultWeekly = `你是一只叫“岁岁”的橘猫。请根据提供的本周数据，给主人写一封简短的本周总结。要求：语气治愈、偶尔傲娇，包含本周开销汇总和健康建议（如体重变化）。字数 150 字以内，多用 emoji。`;

    const prompts = config.prompts || db.settings?.prompts || {};

    mainContent.innerHTML = `
        <div class="content-wrapper fade-in delay-1">
            <div class="sticky-nav-header">
                <span id="btn-back-ai" style="cursor:pointer; font-size:24px;">←</span>
                <h2 style="font-size:18px; font-weight:900;">AI 设置</h2>
            </div>
            
            <div class="card">
                <div class="form-group">
                    <label>AI KEY (CHATANYWHERE)</label>
                    <input type="password" id="ai-key" class="form-input" value="${config.aiKey || ''}">
                </div>
                <div class="form-group">
                    <label>AI MODEL NAME</label>
                    <input type="text" id="ai-model" class="form-input" value="${config.aiModel || 'gpt-3.5-turbo'}" placeholder="例如: gpt-4o-mini">
                </div>
            </div>

            <div class="card">
                <h3 style="margin-bottom:12px;">💬 Prompt 自定义</h3>
                
                <div class="form-group">
                    <label>智能记事 (前端提取数据)</label>
                    <textarea id="p-parser" class="form-input" rows="5" style="font-size: 12px;">${prompts.parser || defaultParser}</textarea>
                </div>

                <div class="form-group">
                    <label>日常提醒 (后台 Actions 语气)</label>
                    <textarea id="p-daily" class="form-input" rows="4" style="font-size: 12px;">${prompts.daily || defaultDaily}</textarea>
                </div>

                <div class="form-group">
                    <label>每周总结 (后台 Actions 语气)</label>
                    <textarea id="p-weekly" class="form-input" rows="4" style="font-size: 12px;">${prompts.weekly || defaultWeekly}</textarea>
                </div>
                
                <button id="ai-save" class="btn-drawer-save" style="margin-top:12px;">保存 AI 设置</button>
            </div>
        </div>
    `;

    document.getElementById('btn-back-ai').onclick = () => renderSettings();

    document.getElementById('ai-save').onclick = () => {
        const currentConfig = getConfig();
        const newCfg = {
            ...currentConfig,
            aiKey: document.getElementById('ai-key').value.trim(),
            aiModel: document.getElementById('ai-model').value.trim(),
            prompts: {
                parser: document.getElementById('p-parser').value.trim(),
                daily: document.getElementById('p-daily').value.trim(),
                weekly: document.getElementById('p-weekly').value.trim()
            }
        };
        saveConfig(newCfg);

        // 同时保存到 db.json，以便 GitHub Actions 后端读取
        const currentDB = getDB();
        if (!currentDB.settings) currentDB.settings = {};
        currentDB.settings.prompts = newCfg.prompts;
        setDB(currentDB);

        showToast('AI 设置已保存并暂存至本地 🐾', 'success');
        renderSettings();
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
                <button id="ai-parse" class="btn-drawer-save" style="background:var(--color-yellow); color:#78350F; box-shadow:var(--shadow-soft);">
                    ✨ 让 AI 帮我记
                </button>
                <div id="ai-status" style="display:none; text-align:center; margin-top:20px; font-size:14px; font-weight:700; color:var(--color-primary);">
                    <div class="syncing" style="display:inline-block; margin-right:8px;"><span class="dot"></span></div>
                    喵喵正在思考中... 🧠
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => {
            overlay.querySelector('.drawer-panel').style.transform = 'translateY(100%)';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        };
        overlay.querySelector('#close-ai').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        const input = overlay.querySelector('#ai-input');
        const parseBtn = overlay.querySelector('#ai-parse');
        const status = overlay.querySelector('#ai-status');

        parseBtn.onclick = async () => {
            const text = input.value.trim();
            if (!text) return;

            status.style.display = 'block';
            parseBtn.disabled = true;
            parseBtn.style.opacity = '0.6';

            try {
                const res = await parseTextWithAI(text);
                const time = processMentionedTime(res.mentioned_time);

                status.style.display = 'none';

                // 关闭当前 AI 输入抽屉，打开编辑抽屉
                close();

                // 将解析数据结构转化为 prefillData 格式
                const prefillData = {
                    timestamp: time,
                    ...res.parsed_data
                };

                showEntryDrawer(res.category, null, null, prefillData);

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
            btn.querySelector('.sync-text').textContent = '保存并同步';
        }
    };
}
