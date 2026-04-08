/**
 * meow_phone.js - Meow Phone 隐藏手机系统
 * 
 * 触发条件：2秒内在顶部 Banner 头像上点击 5 次
 * 功能：模拟极简智能手机 UI，作为小游戏框架
 */
import { getDB, setDB } from '../store.js';
import { createCatSweepGame } from './games/cat_sweep.js';

// ---- 游戏注册表 ----
const APP_REGISTRY = [
    {
        id: 'cat_sweep',
        name: '猫抓老鼠',
        icon: '🐭',
        description: '经典扫雷改版',
        launch: launchCatSweep
    },
    {
        id: 'settings',
        name: '设置',
        icon: '⚙️',
        description: '游戏设置',
        launch: launchSettings
    }
];

let phoneOverlay = null;

// ---- 触发器：快速点击计数 ----
let clickTimestamps = [];
const TRIGGER_CLICKS = 5;
const TRIGGER_WINDOW = 2000; // 2秒

export function initMeowPhoneTrigger() {
    const ipContainer = document.querySelector('.ip-container');
    if (!ipContainer) return;

    ipContainer.style.cursor = 'pointer';
    ipContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        const now = Date.now();
        clickTimestamps.push(now);
        
        // 只保留窗口期内的点击
        clickTimestamps = clickTimestamps.filter(t => now - t < TRIGGER_WINDOW);
        
        if (clickTimestamps.length >= TRIGGER_CLICKS) {
            clickTimestamps = [];
            openMeowPhone();
        }
    });
}

// ---- Meow Phone 主系统 ----

function openMeowPhone() {
    if (phoneOverlay) return;

    phoneOverlay = document.createElement('div');
    phoneOverlay.className = 'meow-phone-overlay';
    phoneOverlay.innerHTML = '';

    renderHomeScreen();
    document.body.appendChild(phoneOverlay);

    // 入场动画
    requestAnimationFrame(() => {
        phoneOverlay.classList.add('active');
    });
}

function closeMeowPhone() {
    if (!phoneOverlay) return;
    phoneOverlay.classList.remove('active');
    phoneOverlay.classList.add('closing');
    setTimeout(() => {
        if (phoneOverlay && phoneOverlay.parentNode) {
            phoneOverlay.parentNode.removeChild(phoneOverlay);
        }
        phoneOverlay = null;
    }, 350);
}

function renderHomeScreen() {
    if (!phoneOverlay) return;

    // 当前时间
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-time">${hours}:${minutes}</span>
                <span class="phone-battery">🔋</span>
            </div>
            <div class="phone-wallpaper-text">
                <span class="phone-clock">${hours}:${minutes}</span>
                <span class="phone-date">${now.getMonth() + 1}月${now.getDate()}日 周${'日一二三四五六'[now.getDay()]}</span>
            </div>
            <div class="phone-app-grid">
                ${APP_REGISTRY.filter(a => a.id !== 'settings').map(app => `
                    <div class="phone-app-icon" data-app="${app.id}">
                        <div class="app-icon-inner">${app.icon}</div>
                        <span class="app-icon-label">${app.name}</span>
                    </div>
                `).join('')}
            </div>
            <div class="phone-dock">
                <div class="dock-btn dock-home" id="phone-home-btn" title="返回主页">
                    <span>🏠</span>
                </div>
                <div class="dock-btn dock-settings" data-app="settings" title="设置">
                    <span>⚙️</span>
                </div>
            </div>
        </div>
    `;

    // 绑定 App 启动
    phoneOverlay.querySelectorAll('.phone-app-icon, .dock-settings').forEach(el => {
        el.addEventListener('click', () => {
            const appId = el.dataset.app;
            const app = APP_REGISTRY.find(a => a.id === appId);
            if (app) app.launch();
        });
    });

    // Home 按钮关闭
    phoneOverlay.querySelector('#phone-home-btn').addEventListener('click', () => {
        closeMeowPhone();
    });
}

// ---- 猫抓老鼠启动器 ----

function launchCatSweep() {
    if (!phoneOverlay) return;

    const db = getDB();
    const prefs = db.settings.game_prefs?.cat_sweep || { difficulty: 'easy', custom: { rows: 8, cols: 8, mice: 10 } };

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="sweep-back">← 返回</span>
                <span class="phone-app-title">🐭 猫抓老鼠</span>
                <span class="phone-battery">🔋</span>
            </div>
            <div class="sweep-info-bar">
                <div class="sweep-stat">
                    <span class="sweep-stat-icon">🚩</span>
                    <span id="sweep-flags">0/${prefs.difficulty === 'easy' ? 10 : prefs.difficulty === 'medium' ? 25 : prefs.custom?.mice || 10}</span>
                </div>
                <div class="sweep-stat">
                    <span class="sweep-stat-icon">📐</span>
                    <span id="sweep-difficulty">${prefs.difficulty === 'easy' ? '简单' : prefs.difficulty === 'medium' ? '中等' : '自定义'}</span>
                </div>
            </div>
            <div class="sweep-hint">
                <span>💡 单击插旗 · 双击翻开</span>
            </div>
            <div id="sweep-board" class="sweep-board-container"></div>
            <div id="sweep-result" class="sweep-result" style="display:none;"></div>
            <button id="sweep-restart" class="sweep-restart-btn">🔄 重新开始</button>
        </div>
    `;

    const boardEl = phoneOverlay.querySelector('#sweep-board');
    const resultEl = phoneOverlay.querySelector('#sweep-result');
    const flagsEl = phoneOverlay.querySelector('#sweep-flags');

    const game = createCatSweepGame(boardEl, {
        difficulty: prefs.difficulty,
        custom: prefs.custom,
        onWin: () => {
            resultEl.style.display = 'flex';
            resultEl.innerHTML = `
                <div class="sweep-result-content win">
                    <span class="result-emoji">🎉</span>
                    <h3>猫咪大获全胜！</h3>
                    <p>所有老鼠都被找到了喵~</p>
                </div>
            `;
        },
        onLose: () => {
            resultEl.style.display = 'flex';
            resultEl.innerHTML = `
                <div class="sweep-result-content lose">
                    <span class="result-emoji">🐭</span>
                    <h3>老鼠溜走了！</h3>
                    <p>下次要更小心喵...</p>
                </div>
            `;
        },
        onFlagChange: (flagged, total) => {
            flagsEl.textContent = `${flagged}/${total}`;
        }
    });

    game.start();

    // 点击空白处关闭结果弹窗以查看最终棋盘
    resultEl.addEventListener('click', (e) => {
        if (e.target === resultEl) {
            resultEl.style.display = 'none';
        }
    });

    // 返回主屏
    phoneOverlay.querySelector('#sweep-back').addEventListener('click', renderHomeScreen);

    // 重新开始
    phoneOverlay.querySelector('#sweep-restart').addEventListener('click', () => {
        resultEl.style.display = 'none';
        game.reset();
    });
}

// ---- 设置 App ----

function launchSettings() {
    if (!phoneOverlay) return;

    const db = getDB();
    const prefs = db.settings.game_prefs?.cat_sweep || { difficulty: 'easy', custom: { rows: 8, cols: 8, mice: 10 } };

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="settings-back">← 返回</span>
                <span class="phone-app-title">⚙️ 设置</span>
                <span></span>
            </div>
            <div class="phone-settings-content">
                <div class="settings-section">
                    <h3 class="settings-section-title">🐭 猫抓老鼠</h3>
                    
                    <div class="settings-group">
                        <label class="settings-label">游戏难度</label>
                        <div class="settings-radio-group">
                            <label class="settings-radio ${prefs.difficulty === 'easy' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="easy" ${prefs.difficulty === 'easy' ? 'checked' : ''}>
                                <span>🟢 简单</span>
                                <small>8×8 · 10只鼠</small>
                            </label>
                            <label class="settings-radio ${prefs.difficulty === 'medium' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="medium" ${prefs.difficulty === 'medium' ? 'checked' : ''}>
                                <span>🟡 中等</span>
                                <small>12×12 · 25只鼠</small>
                            </label>
                            <label class="settings-radio ${prefs.difficulty === 'custom' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="custom" ${prefs.difficulty === 'custom' ? 'checked' : ''}>
                                <span>🔧 自定义</span>
                                <small>自由设置</small>
                            </label>
                        </div>
                    </div>

                    <div id="custom-settings" class="settings-group" style="display:${prefs.difficulty === 'custom' ? 'block' : 'none'};">
                        <label class="settings-label">自定义参数</label>
                        <div class="settings-custom-inputs">
                            <div class="settings-input-row">
                                <span>行数</span>
                                <input type="number" id="custom-rows" class="settings-input" value="${prefs.custom?.rows || 8}" min="5" max="20">
                            </div>
                            <div class="settings-input-row">
                                <span>列数</span>
                                <input type="number" id="custom-cols" class="settings-input" value="${prefs.custom?.cols || 8}" min="5" max="20">
                            </div>
                            <div class="settings-input-row">
                                <span>老鼠数</span>
                                <input type="number" id="custom-mice" class="settings-input" value="${prefs.custom?.mice || 10}" min="1" max="99">
                            </div>
                        </div>
                    </div>

                    <button id="settings-save" class="settings-save-btn">💾 保存设置</button>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">ℹ️ 关于</h3>
                    <p class="settings-about">Meow Phone V1.0<br>一个隐藏的彩蛋系统 🐾</p>
                </div>
            </div>
        </div>
    `;

    // 返回
    phoneOverlay.querySelector('#settings-back').addEventListener('click', renderHomeScreen);

    // 难度 radio 切换
    const customPanel = phoneOverlay.querySelector('#custom-settings');
    phoneOverlay.querySelectorAll('input[name="difficulty"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            // 更新 active 样式
            phoneOverlay.querySelectorAll('.settings-radio').forEach(r => r.classList.remove('active'));
            e.target.closest('.settings-radio').classList.add('active');
            
            customPanel.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
    });

    // 保存
    phoneOverlay.querySelector('#settings-save').addEventListener('click', () => {
        const difficulty = phoneOverlay.querySelector('input[name="difficulty"]:checked').value;
        const custom = {
            rows: Math.min(20, Math.max(5, parseInt(phoneOverlay.querySelector('#custom-rows')?.value) || 8)),
            cols: Math.min(20, Math.max(5, parseInt(phoneOverlay.querySelector('#custom-cols')?.value) || 8)),
            mice: Math.min(99, Math.max(1, parseInt(phoneOverlay.querySelector('#custom-mice')?.value) || 10))
        };

        // 校验老鼠数不超过总格数-9
        const maxMice = custom.rows * custom.cols - 9;
        if (custom.mice > maxMice) {
            custom.mice = maxMice;
        }

        db.settings.game_prefs = db.settings.game_prefs || {};
        db.settings.game_prefs.cat_sweep = { difficulty, custom };
        setDB(db);

        // 显示保存成功反馈
        const saveBtn = phoneOverlay.querySelector('#settings-save');
        saveBtn.textContent = '✅ 已保存';
        saveBtn.style.background = '#10B981';
        setTimeout(() => {
            saveBtn.textContent = '💾 保存设置';
            saveBtn.style.background = '';
        }, 1500);
    });
}
