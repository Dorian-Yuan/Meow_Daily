/**
 * meow_phone.js - Meow Phone 隐藏手机系统
 * 
 * 触发条件：2秒内在顶部 Banner 头像上点击 5 次
 * 功能：模拟极简智能手机 UI，作为小游戏框架
 */
import { getDB, setDB } from '../store.js';
import { createCatSweepGame } from './games/cat_sweep.js';
import { createPixelArtApp } from './games/pixel_art.js';
import { createYarnBallApp } from './games/yarn_ball.js';
import { createCatFortuneApp } from './games/cat_fortune.js';
import { createCatMemoryApp } from './games/cat_memory.js';
import { createWhackMouseApp } from './games/whack_mouse.js';
import { createMeowPianoApp } from './games/meow_piano.js';
import { createMeowTimerApp } from './games/meow_timer.js';

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
        id: 'pixel_art',
        name: '像素画板',
        icon: '🎨',
        description: '创建像素艺术',
        launch: launchPixelArt
    },
    {
        id: 'yarn_ball',
        name: '毛线球',
        icon: '🧶',
        description: '解压弹跳玩具',
        launch: launchYarnBall
    },
    {
        id: 'cat_fortune',
        name: '猫咪占卜',
        icon: '🎲',
        description: '今日猫咪运势',
        launch: launchCatFortune
    },
    {
        id: 'cat_memory',
        name: '猫咪翻牌',
        icon: '🧩',
        description: '记忆配对游戏',
        launch: launchCatMemory
    },
    {
        id: 'whack_mouse',
        name: '打地鼠',
        icon: '🎯',
        description: '反应力挑战',
        launch: launchWhackMouse
    },
    {
        id: 'meow_piano',
        name: '喵喵琴',
        icon: '🎵',
        description: '猫咪音乐盒',
        launch: launchMeowPiano
    },
    {
        id: 'meow_timer',
        name: '喵喵计时',
        icon: '⏰',
        description: '倒计时与秒表',
        launch: launchMeowTimer
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
                <span></span>
                <span></span>
            </div>
            <div class="sweep-info-bar">
                <div class="sweep-stat">
                    <span class="sweep-stat-icon">🚩</span>
                    <span id="sweep-flags">0/${prefs.difficulty === 'easy' ? 10 : (prefs.difficulty === 'medium' ? 25 : (prefs.difficulty === 'hard' ? 40 : (prefs.custom?.mice || 10)))}</span>
                </div>
                <div class="sweep-stat">
                    <span class="sweep-stat-icon">⏱️</span>
                    <span id="sweep-timer">00:00</span>
                </div>
                <div class="sweep-stat">
                    <span class="sweep-stat-icon">📐</span>
                    <span id="sweep-difficulty">${prefs.difficulty === 'easy' ? '简单' : (prefs.difficulty === 'medium' ? '中等' : (prefs.difficulty === 'hard' ? '困难' : '自定义'))}</span>
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
    const timerEl = phoneOverlay.querySelector('#sweep-timer');
    let timerInterval;

    // 格式化时间为 MM:SS 格式
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    const game = createCatSweepGame(boardEl, {
        difficulty: prefs.difficulty,
        custom: prefs.custom,
        onWin: (time) => {
            clearInterval(timerInterval);
            resultEl.style.display = 'flex';
            resultEl.innerHTML = `
                <div class="sweep-result-content win">
                    <span class="result-emoji">🎉</span>
                    <h3>猫咪大获全胜！</h3>
                    <p>所有老鼠都被找到了喵~</p>
                    <p>用时：${formatTime(time)}</p>
                </div>
            `;
        },
        onLose: () => {
            clearInterval(timerInterval);
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
        },
        onMultipleSolutions: () => {
            // 当检测到多解法情况时，更新重新开始按钮的文本
            const restartBtn = phoneOverlay.querySelector('#sweep-restart');
            restartBtn.textContent = '🔄 重新开始：已通过';
        }
    });

    game.start();

    // 启动计时器更新
    timerInterval = setInterval(() => {
        const time = game.getElapsedTime();
        timerEl.textContent = formatTime(time);
    }, 1000);

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
        timerEl.textContent = '00:00';
        phoneOverlay.querySelector('#sweep-restart').textContent = '🔄 重新开始';
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const time = game.getElapsedTime();
            timerEl.textContent = formatTime(time);
        }, 1000);
    });
}

// ---- 设置 App ----

function launchSettings() {
    if (!phoneOverlay) return;

    const db = getDB();
    const catSweepPrefs = db.settings.game_prefs?.cat_sweep || { difficulty: 'easy', custom: { rows: 8, cols: 8, mice: 10 } };
    const pixelArtPrefs = db.settings.game_prefs?.pixel_art || { canvasSize: 10 };
    const yarnBallPrefs = db.settings.game_prefs?.yarn_ball || { mode: 'challenge', challengeTime: 30, maxFish: 100 };

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="settings-back">← 返回</span>
                <span class="phone-app-title">⚙️ 设置</span>
                <span></span>
            </div>
            <div class="phone-settings-content">
                <div class="settings-section" data-collapsible>
                    <h3 class="settings-section-title" data-toggle>🐭 猫抓老鼠 <span class="settings-arrow">›</span></h3>
                    
                    <div class="settings-collapsible">
                    <div class="settings-group">
                        <label class="settings-label">游戏难度</label>
                        <div class="settings-radio-group">
                            <label class="settings-radio ${catSweepPrefs.difficulty === 'easy' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="easy" ${catSweepPrefs.difficulty === 'easy' ? 'checked' : ''}>
                                <span>🟢 简单</span>
                                <small>8×8 · 10只鼠</small>
                            </label>
                            <label class="settings-radio ${catSweepPrefs.difficulty === 'medium' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="medium" ${catSweepPrefs.difficulty === 'medium' ? 'checked' : ''}>
                                <span>🟡 中等</span>
                                <small>12×12 · 25只鼠</small>
                            </label>
                            <label class="settings-radio ${catSweepPrefs.difficulty === 'hard' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="hard" ${catSweepPrefs.difficulty === 'hard' ? 'checked' : ''}>
                                <span>🔴 困难</span>
                                <small>16×12 · 40只鼠</small>
                            </label>
                        </div>
                    </div>
                    </div>
                </div>
                
                <div class="settings-section" data-collapsible>
                    <h3 class="settings-section-title" data-toggle>🎨 像素画板 <span class="settings-arrow">›</span></h3>
                    
                    <div class="settings-collapsible">
                    <div class="settings-group">
                        <label class="settings-label">画布尺寸</label>
                        <div class="settings-radio-group">
                            <label class="settings-radio ${pixelArtPrefs.canvasSize === 8 ? 'active' : ''}">
                                <input type="radio" name="canvasSize" value="8" ${pixelArtPrefs.canvasSize === 8 ? 'checked' : ''}>
                                <span>8×8</span>
                            </label>
                            <label class="settings-radio ${pixelArtPrefs.canvasSize === 10 ? 'active' : ''}">
                                <input type="radio" name="canvasSize" value="10" ${pixelArtPrefs.canvasSize === 10 ? 'checked' : ''}>
                                <span>10×10</span>
                            </label>
                            <label class="settings-radio ${pixelArtPrefs.canvasSize === 12 ? 'active' : ''}">
                                <input type="radio" name="canvasSize" value="12" ${pixelArtPrefs.canvasSize === 12 ? 'checked' : ''}>
                                <span>12×12</span>
                            </label>
                            <label class="settings-radio ${pixelArtPrefs.canvasSize === 16 ? 'active' : ''}">
                                <input type="radio" name="canvasSize" value="16" ${pixelArtPrefs.canvasSize === 16 ? 'checked' : ''}>
                                <span>16×16</span>
                            </label>
                        </div>
                    </div>
                    </div>
                </div>
                
                <div class="settings-section" data-collapsible>
                    <h3 class="settings-section-title" data-toggle>🧶 毛线球 <span class="settings-arrow">›</span></h3>
                    
                    <div class="settings-collapsible">
                    <div class="settings-group">
                        <label class="settings-label">默认模式</label>
                        <div class="settings-radio-group">
                            <label class="settings-radio ${yarnBallPrefs.mode === 'free' ? 'active' : ''}">
                                <input type="radio" name="yarnMode" value="free" ${yarnBallPrefs.mode === 'free' ? 'checked' : ''}>
                                <span>🧶 自由模式</span>
                                <small>纯解压弹跳</small>
                            </label>
                            <label class="settings-radio ${yarnBallPrefs.mode === 'challenge' ? 'active' : ''}">
                                <input type="radio" name="yarnMode" value="challenge" ${yarnBallPrefs.mode === 'challenge' ? 'checked' : ''}>
                                <span>🐟 挑战模式</span>
                                <small>收集小鱼干</small>
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <label class="settings-label">挑战时长</label>
                        <div class="settings-radio-group">
                            <label class="settings-radio ${yarnBallPrefs.challengeTime === 30 ? 'active' : ''}">
                                <input type="radio" name="yarnTime" value="30" ${yarnBallPrefs.challengeTime === 30 ? 'checked' : ''}>
                                <span>30 秒</span>
                                <small>快速挑战</small>
                            </label>
                            <label class="settings-radio ${yarnBallPrefs.challengeTime === 60 ? 'active' : ''}">
                                <input type="radio" name="yarnTime" value="60" ${yarnBallPrefs.challengeTime === 60 ? 'checked' : ''}>
                                <span>60 秒</span>
                                <small>持久战</small>
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <label class="settings-label">最大鱼数</label>
                        <div class="settings-radio-group">
                            <label class="settings-radio ${yarnBallPrefs.maxFish === 50 ? 'active' : ''}">
                                <input type="radio" name="yarnMaxFish" value="50" ${yarnBallPrefs.maxFish === 50 ? 'checked' : ''}>
                                <span>50</span>
                                <small>低性能设备</small>
                            </label>
                            <label class="settings-radio ${yarnBallPrefs.maxFish === 100 ? 'active' : ''}">
                                <input type="radio" name="yarnMaxFish" value="100" ${yarnBallPrefs.maxFish === 100 ? 'checked' : ''}>
                                <span>100</span>
                                <small>默认</small>
                            </label>
                            <label class="settings-radio ${yarnBallPrefs.maxFish === 200 ? 'active' : ''}">
                                <input type="radio" name="yarnMaxFish" value="200" ${yarnBallPrefs.maxFish === 200 ? 'checked' : ''}>
                                <span>200</span>
                                <small>鱼群风暴</small>
                            </label>
                        </div>
                    </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <button id="settings-save" class="settings-save-btn">💾 保存设置</button>
                </div>
                
                <div class="settings-section">
                    <p class="settings-about">Meow Phone V${getDB().settings.version || '3.2.5'}<br>一个隐藏的彩蛋系统 🐾<br>8款小应用等你探索 ✨</p>
                </div>
            </div>
        </div>
    `;

    // 返回
    phoneOverlay.querySelector('#settings-back').addEventListener('click', renderHomeScreen);

    // 折叠切换
    phoneOverlay.querySelectorAll('[data-toggle]').forEach(title => {
        title.addEventListener('click', () => {
            const section = title.closest('[data-collapsible]');
            const content = section.querySelector('.settings-collapsible');
            const arrow = title.querySelector('.settings-arrow');
            const isOpen = section.classList.contains('settings-open');
            if (isOpen) {
                section.classList.remove('settings-open');
                content.style.maxHeight = '0';
                arrow.style.transform = 'rotate(0deg)';
            } else {
                section.classList.add('settings-open');
                content.style.maxHeight = content.scrollHeight + 'px';
                arrow.style.transform = 'rotate(90deg)';
            }
        });
    });

    // 难度 radio 切换
    phoneOverlay.querySelectorAll('input[name="difficulty"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            // 更新 active 样式
            phoneOverlay.querySelectorAll('input[name="difficulty"]').forEach(r => r.closest('.settings-radio').classList.remove('active'));
            e.target.closest('.settings-radio').classList.add('active');
        });
    });

    // 画布尺寸 radio 切换
    phoneOverlay.querySelectorAll('input[name="canvasSize"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            phoneOverlay.querySelectorAll('input[name="canvasSize"]').forEach(r => r.closest('.settings-radio').classList.remove('active'));
            e.target.closest('.settings-radio').classList.add('active');
        });
    });

    // 毛线球模式 radio 切换
    phoneOverlay.querySelectorAll('input[name="yarnMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            phoneOverlay.querySelectorAll('input[name="yarnMode"]').forEach(r => r.closest('.settings-radio').classList.remove('active'));
            e.target.closest('.settings-radio').classList.add('active');
        });
    });

    // 毛线球时长 radio 切换
    phoneOverlay.querySelectorAll('input[name="yarnTime"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            phoneOverlay.querySelectorAll('input[name="yarnTime"]').forEach(r => r.closest('.settings-radio').classList.remove('active'));
            e.target.closest('.settings-radio').classList.add('active');
        });
    });

    // 毛线球最大鱼数 radio 切换
    phoneOverlay.querySelectorAll('input[name="yarnMaxFish"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            phoneOverlay.querySelectorAll('input[name="yarnMaxFish"]').forEach(r => r.closest('.settings-radio').classList.remove('active'));
            e.target.closest('.settings-radio').classList.add('active');
        });
    });

    // 保存
    phoneOverlay.querySelector('#settings-save').addEventListener('click', () => {
        const difficulty = phoneOverlay.querySelector('input[name="difficulty"]:checked').value;
        const canvasSize = parseInt(phoneOverlay.querySelector('input[name="canvasSize"]:checked').value);
        
        db.settings.game_prefs = db.settings.game_prefs || {};
        db.settings.game_prefs.cat_sweep = { difficulty };
        db.settings.game_prefs.pixel_art = { canvasSize };
        db.settings.game_prefs.yarn_ball = {
            mode: phoneOverlay.querySelector('input[name="yarnMode"]:checked').value,
            challengeTime: parseInt(phoneOverlay.querySelector('input[name="yarnTime"]:checked').value),
            maxFish: parseInt(phoneOverlay.querySelector('input[name="yarnMaxFish"]:checked').value)
        };
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

// ---- 像素画板启动器 ----

function launchPixelArt() {
    if (!phoneOverlay) return;

    const db = getDB();
    const pixelArtPrefs = db.settings.game_prefs?.pixel_art || { canvasSize: 10 };

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="pixel-back">← 返回</span>
                <span></span>
                <span></span>
            </div>
            <div id="pixel-art-container" class="pixel-art-app-container"></div>
        </div>
    `;

    const container = phoneOverlay.querySelector('#pixel-art-container');
    const app = createPixelArtApp(container);
    
    // 从设置中加载画布尺寸
    app.canvasSize = pixelArtPrefs.canvasSize;
    app.pixels = Array(app.canvasSize * app.canvasSize).fill('transparent');
    app.history = [];
    app.historyIndex = -1;
    app.renderCanvas();

    // 返回主屏
    phoneOverlay.querySelector('#pixel-back').addEventListener('click', renderHomeScreen);
}

// ---- 毛线球启动器 ----

function launchYarnBall() {
    if (!phoneOverlay) return;

    const db = getDB();
    const yarnBallPrefs = db.settings.game_prefs?.yarn_ball || { mode: 'challenge', challengeTime: 30 };

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="yarn-back">← 返回</span>
                <span></span>
                <span></span>
            </div>
            <div id="yarn-ball-container" class="yarn-ball-app-container"></div>
        </div>
    `;

    const container = phoneOverlay.querySelector('#yarn-ball-container');
    const yarnApp = createYarnBallApp(container, yarnBallPrefs);

    phoneOverlay.querySelector('#yarn-back').addEventListener('click', () => {
        if (yarnApp && yarnApp.destroy) yarnApp.destroy();
        renderHomeScreen();
    });
}

// ---- 猫咪占卜启动器 ----

function launchCatFortune() {
    if (!phoneOverlay) return;

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="fortune-back">← 返回</span>
                <span></span>
                <span></span>
            </div>
            <div id="cat-fortune-container" class="cat-fortune-app-container"></div>
        </div>
    `;

    const container = phoneOverlay.querySelector('#cat-fortune-container');
    const fortuneApp = createCatFortuneApp(container);

    phoneOverlay.querySelector('#fortune-back').addEventListener('click', () => {
        if (fortuneApp && fortuneApp.destroy) fortuneApp.destroy();
        renderHomeScreen();
    });
}

// ---- 猫咪翻牌启动器 ----

function launchCatMemory() {
    if (!phoneOverlay) return;

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="memory-back">← 返回</span>
                <span></span>
                <span></span>
            </div>
            <div id="cat-memory-container" class="cat-memory-app-container"></div>
        </div>
    `;

    const container = phoneOverlay.querySelector('#cat-memory-container');
    const memoryApp = createCatMemoryApp(container);

    phoneOverlay.querySelector('#memory-back').addEventListener('click', () => {
        if (memoryApp && memoryApp.destroy) memoryApp.destroy();
        renderHomeScreen();
    });
}

// ---- 打地鼠启动器 ----

function launchWhackMouse() {
    if (!phoneOverlay) return;

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="whack-back">← 返回</span>
                <span></span>
                <span></span>
            </div>
            <div id="whack-mouse-container" class="whack-mouse-app-container"></div>
        </div>
    `;

    const container = phoneOverlay.querySelector('#whack-mouse-container');
    const whackApp = createWhackMouseApp(container);

    phoneOverlay.querySelector('#whack-back').addEventListener('click', () => {
        if (whackApp && whackApp.destroy) whackApp.destroy();
        renderHomeScreen();
    });
}

// ---- 喵喵琴启动器 ----

function launchMeowPiano() {
    if (!phoneOverlay) return;

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="piano-back">← 返回</span>
                <span></span>
                <span></span>
            </div>
            <div id="meow-piano-container" class="meow-piano-app-container"></div>
        </div>
    `;

    const container = phoneOverlay.querySelector('#meow-piano-container');
    const pianoApp = createMeowPianoApp(container);

    phoneOverlay.querySelector('#piano-back').addEventListener('click', () => {
        if (pianoApp && pianoApp.destroy) pianoApp.destroy();
        renderHomeScreen();
    });
}

// ---- 喵喵计时器启动器 ----

function launchMeowTimer() {
    if (!phoneOverlay) return;

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="timer-back">← 返回</span>
                <span></span>
                <span></span>
            </div>
            <div id="meow-timer-container" class="meow-timer-app-container"></div>
        </div>
    `;

    const container = phoneOverlay.querySelector('#meow-timer-container');
    const timerApp = createMeowTimerApp(container);

    phoneOverlay.querySelector('#timer-back').addEventListener('click', () => {
        if (timerApp && timerApp.destroy) timerApp.destroy();
        renderHomeScreen();
    });
}
