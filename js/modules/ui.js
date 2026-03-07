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

    const reminders = [];
    const catRecs = db.records[suiSui.cat_id] || {};
    const todayStr = getBJNow().split(' ')[0];
    const todayDate = new Date(todayStr.replace(/-/g, '/'));
    const tMonth = todayDate.getMonth();
    const tDay = todayDate.getDate();

    // 1. 纪念日检测
    const birthDate = new Date(suiSui.birth_date.replace(/-/g, '/'));
    if (birthDate.getMonth() === tMonth && birthDate.getDate() === tDay) {
        const age = todayDate.getFullYear() - birthDate.getFullYear();
        reminders.push({ special: true, icon: '🎂', label: `今天是${suiSui.name}的 ${age} 岁生日！` });
    }

    const adoptDate = new Date(suiSui.adoption_date.replace(/-/g, '/'));
    if (adoptDate.getMonth() === tMonth && adoptDate.getDate() === tDay) {
        const years = todayDate.getFullYear() - adoptDate.getFullYear();
        if (years > 0) {
            reminders.push({ special: true, icon: '🏠', label: `今天是${suiSui.name}到家 ${years} 周年纪念日！` });
        }
    }

    // 2. 动态提醒事项检测
    const customReminders = db.settings.reminders || [];
    customReminders.forEach(rm => {
        const lastRec = (catRecs.routine || []).filter(r => r.type === rm.label)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
        
        let statusHtml = '';

        if (lastRec) {
            const lastDate = new Date(lastRec.timestamp.split(' ')[0].replace(/-/g, '/'));
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                statusHtml = `<div style="font-size:11px; color:var(--color-primary); font-weight:700;">✅ 今天已完成</div>`;
            } else {
                const daysLeft = rm.days - diffDays;
                if (daysLeft > 0) { 
                    statusHtml = `<div style="font-size:11px; color:var(--color-text-hint);">⏳ 还有 ${daysLeft} 天</div>`;
                } else if (daysLeft === 0) {
                    statusHtml = `<div style="font-size:11px; color:#F59E0B; font-weight:700;">⚠️ 今天该做了！</div>`;
                } else {
                    statusHtml = `<div style="font-size:11px; color:#EF4444; font-weight:700;">⚠️ 已逾期 ${Math.abs(daysLeft)} 天</div>`;
                }
            }
        } else {
            statusHtml = `<div style="font-size:11px; color:var(--color-text-hint);">❓ 尚未记录过</div>`;
        }

        reminders.push({ label: rm.label, icon: rm.icon || '🐾', statusHtml });
    });

    mainContent.innerHTML = `
        <div class="content-wrapper">
            <section class="quick-actions">
                <div class="action-item" data-type="routine"><div class="action-icon">🧹</div><div class="action-label">日常</div></div>
                <div class="action-item" data-type="food"><div class="action-icon">🍴</div><div class="action-label">饮食</div></div>
                <div class="action-item" data-type="weight"><div class="action-icon">⚖️</div><div class="action-label">体重</div></div>
                <div class="action-item" data-type="medical"><div class="action-icon">🏥</div><div class="action-label">就诊</div></div>
            </section>

            <div class="card" id="home-weight-card" style="cursor:pointer; display:flex; flex-direction:row; justify-content:space-between; align-items:center; padding:var(--spacing-l);">
                <div style="display:flex; flex-direction:column; justify-content:center; align-items:flex-start; gap:var(--spacing-s);">
                    <div style="font-size:16px; font-weight:800; color:var(--color-text-title); line-height:1;">⚖️ 体重监测</div>
                    <div style="font-size:12px; color:var(--color-text-hint); font-weight:600; line-height:1;">✨ 最近记录：${weightRecords.length > 0 ? weightRecords[weightRecords.length - 1].timestamp.split(' ')[0] : '尚未记录'}</div>
                </div>
                <div style="display:flex; align-items:baseline; justify-content:flex-end; gap:2px; height:100%;">
                    <span style="font-size:32px; font-weight:900; color:var(--color-primary); line-height:1;">${latestWeight}</span>
                    <span style="font-size:14px; color:var(--color-text-hint); font-weight:700;">kg</span>
                </div>
            </div>

            <div class="card" style="border-left: 6px solid var(--color-yellow); background: #FFFDF5; padding-left: 20px;">
                <h3 style="font-size:15px; font-weight:800; color:var(--color-text-title); margin:0;">提醒事项</h3>
                ${reminders.length === 0 ?
            `<p style="font-size:14px; color:var(--color-text-main); font-weight:500;">${suiSui.name}今天表现很棒喵，近期没有待办任务！🐾</p>` :
            reminders.map(r => r.special ? `
                        <div style="display:flex; align-items:center; gap:var(--spacing-m); background:var(--color-bg); padding:10px; border-radius:var(--radius-12);">
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
    `;

    document.querySelectorAll('.action-item').forEach(el => {
        el.onclick = () => showEntryDrawer(el.dataset.type);
    });

    window.meow_quick_record = (label) => {
        const type = 'routine';
        showEntryDrawer(type, null, label);
    };

    document.getElementById('home-weight-card').onclick = () => {
        showWeightChartDrawer(weightRecords);
    };
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
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.textAlign = 'right';
    
    const steps = 4;
    for(let i = 0; i <= steps; i++) {
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
        ctx.strokeStyle = '#4066E0';
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
            ctx.fillStyle = '#FFFFFF';
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
        let title = r.type || (r._c === 'weight' ? '称重记录' : '记录');
        let iconHtml = `<div style="width:44px; height:44px; background:var(--color-bg); border-radius:var(--radius-12); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">${icons[r._c] || '🐾'}</div>`;

        let rightContent = '';
        if (r._c === 'weight') {
            rightContent = `<div style="font-size:22px; font-weight:900; color:var(--color-primary); line-height:1;">${r.weight_kg}<span style="font-size:12px; margin-left:2px; color:var(--color-text-hint);">kg</span></div>`;
        } else if (r._c === 'medical') {
            rightContent = `<div style="font-size:20px; font-weight:900; color:#EF4444; line-height:1;">￥${r.cost || 0}</div>`;
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

        html += `
            <div class="card" style="margin-bottom:12px; padding:16px; display:flex; flex-direction:column; cursor:pointer;" data-id="${r.record_id}" data-category="${r._c}">
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

    let genderIcon = suiSui.gender.includes('female') 
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><circle cx="12" cy="10" r="7"></circle><line x1="12" y1="17" x2="12" y2="23"></line><line x1="9" y1="20" x2="15" y2="20"></line></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><circle cx="10" cy="14" r="7"></circle><line x1="15" y1="9" x2="21" y2="3"></line><polyline points="15 3 21 3 21 9"></polyline></svg>`;
    
    let genderText = '未绝育';
    if (suiSui.gender === 'neutered_male' || suiSui.gender === 'neutered_female') {
        genderText = '已绝育';
    }

    mainContent.innerHTML = `
        <div class="content-wrapper">
            <div class="card" style="display:flex; flex-direction:row; align-items:center; gap:var(--spacing-l); padding:var(--spacing-l);">
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
            
            <button id="btn-edit-profile" class="btn profile-edit-btn" style="width:100%; margin:0; justify-content:center;">⚙️ 修改资料</button>

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
    const db = getDB();
    const reminders = db.settings.reminders || [];

    mainContent.innerHTML = `
        <div class="content-wrapper">
            <div style="display:flex; align-items:center; margin-bottom:12px; gap:8px;">
                <span id="btn-back" style="cursor:pointer; font-size:24px; padding:4px;">←</span>
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
                <h3 style="margin-bottom:12px;">🔗 云端与 AI 配置</h3>
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
                <p style="font-size:11px; color:var(--color-text-hint); font-weight:600;">Meow_Daily V2.0.18 "SuiSui" Premium Build</p>
            </div>
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
                <button id="ai-parse" class="btn-drawer-save" style="background:var(--color-yellow); color:#78350F; box-shadow:var(--shadow-soft);">
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
