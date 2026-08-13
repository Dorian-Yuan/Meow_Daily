/**
 * meow_phone.js - Meow Phone 隐藏手机系统
 * 
 * 触发条件：2秒内在顶部 Banner 头像上点击 5 次
 * 功能：模拟极简智能手机 UI，作为小游戏框架
 */
import { getDB, setDB, VERSION } from '../store.js';
import { createCatSweepGame } from './games/cat_sweep.js';
import { createPixelArtApp } from './games/pixel_art.js';
import { createMeowPianoApp } from './games/meow_piano.js';
import { icon, emojiIcon } from '../icons.js';

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
        id: 'meow_piano',
        name: '喵喵琴',
        icon: '🎵',
        description: '猫咪音乐盒',
        launch: launchMeowPiano
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
                <span class="phone-battery">${emojiIcon('🔋', '', 16)}</span>
            </div>
            <div class="phone-wallpaper-text">
                <span class="phone-clock">${hours}:${minutes}</span>
                <span class="phone-date">${now.getMonth() + 1}月${now.getDate()}日 周${'日一二三四五六'[now.getDay()]}</span>
            </div>
            <div class="phone-app-grid">
                ${APP_REGISTRY.filter(a => a.id !== 'settings').map(app => `
                    <div class="phone-app-icon" data-app="${app.id}">
                        <div class="app-icon-inner">${emojiIcon(app.icon, '', 28)}</div>
                        <span class="app-icon-label">${app.name}</span>
                    </div>
                `).join('')}
            </div>
            <div class="phone-dock">
                <div class="dock-btn dock-home" id="phone-home-btn" title="返回主页">
                    <span>${emojiIcon('🏠', '', 24)}</span>
                </div>
                <div class="dock-btn dock-settings" data-app="settings" title="设置">
                    <span>${emojiIcon('⚙️', '', 24)}</span>
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
                <span class="phone-back-btn" id="sweep-back">${icon('arrow-left', '', 14)} 返回</span>
                <span></span>
                <span></span>
            </div>
            <div class="sweep-info-bar">
                <div class="sweep-stat">
                    <span class="sweep-stat-icon">${emojiIcon('🚩', '', 16)}</span>
                    <span id="sweep-flags">0/${prefs.difficulty === 'easy' ? 10 : (prefs.difficulty === 'medium' ? 25 : (prefs.difficulty === 'hard' ? 40 : (prefs.custom?.mice || 10)))}</span>
                </div>
                <div class="sweep-stat">
                    <span class="sweep-stat-icon">${icon('timer', '', 16)}</span>
                    <span id="sweep-timer">00:00</span>
                </div>
                <div class="sweep-stat">
                    <span class="sweep-stat-icon">${emojiIcon('📐', '', 16)}</span>
                    <span id="sweep-difficulty">${prefs.difficulty === 'easy' ? '简单' : (prefs.difficulty === 'medium' ? '中等' : (prefs.difficulty === 'hard' ? '困难' : '自定义'))}</span>
                </div>
            </div>
            <div class="sweep-hint">
                <span>${emojiIcon('💡', '', 13)} 单击插旗 · 双击翻开</span>
            </div>
            <div id="sweep-board" class="sweep-board-container"></div>
            <div id="sweep-result" class="sweep-result" style="display:none;"></div>
            <button id="sweep-restart" class="sweep-restart-btn">${emojiIcon('🔄', '', 16)} 重新开始</button>
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
                    <span class="result-emoji">${emojiIcon('🎉', '', 64)}</span>
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
                    <span class="result-emoji">${emojiIcon('🐭', '', 64)}</span>
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
            restartBtn.innerHTML = `${emojiIcon('🔄', '', 16)} 重新开始：已通过`;
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
        phoneOverlay.querySelector('#sweep-restart').innerHTML = `${emojiIcon('🔄', '', 16)} 重新开始`;
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
    const meowPianoPrefs = db.settings.game_prefs?.meow_piano || { tone: 'soft' };

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="settings-back">${icon('arrow-left', '', 14)} 返回</span>
                <span class="phone-app-title">${emojiIcon('⚙️', '', 16)} 设置</span>
                <span></span>
            </div>
            <div class="phone-settings-content">
                <div class="settings-section" data-collapsible>
                    <h3 class="settings-section-title" data-toggle>${emojiIcon('🐭', '', 16)} 猫抓老鼠 <span class="settings-arrow">${icon('chevron-right', '', 16)}</span></h3>
                    
                    <div class="settings-collapsible">
                    <div class="settings-group">
                        <label class="settings-label">游戏难度</label>
                        <div class="settings-radio-group">
                            <label class="settings-radio ${catSweepPrefs.difficulty === 'easy' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="easy" ${catSweepPrefs.difficulty === 'easy' ? 'checked' : ''}>
                                <span>${icon('circle', 'diff-green', 12)} 简单</span>
                                <small>8×8 · 10只鼠</small>
                            </label>
                            <label class="settings-radio ${catSweepPrefs.difficulty === 'medium' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="medium" ${catSweepPrefs.difficulty === 'medium' ? 'checked' : ''}>
                                <span>${icon('circle', 'diff-yellow', 12)} 中等</span>
                                <small>12×12 · 25只鼠</small>
                            </label>
                            <label class="settings-radio ${catSweepPrefs.difficulty === 'hard' ? 'active' : ''}">
                                <input type="radio" name="difficulty" value="hard" ${catSweepPrefs.difficulty === 'hard' ? 'checked' : ''}>
                                <span>${icon('circle', 'diff-red', 12)} 困难</span>
                                <small>16×12 · 40只鼠</small>
                            </label>
                        </div>
                    </div>
                    </div>
                </div>
                
                <div class="settings-section" data-collapsible>
                    <h3 class="settings-section-title" data-toggle>${emojiIcon('🎨', '', 16)} 像素画板 <span class="settings-arrow">${icon('chevron-right', '', 16)}</span></h3>
                    
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
                    <div class="settings-section-title" data-toggle>
                        ${emojiIcon('🎵', '', 16)} 喵喵琴 <span class="settings-arrow">${icon('chevron-right', '', 16)}</span>
                    </div>
                    <div class="settings-collapsible">
                    <div class="settings-group">
                        <label class="settings-label">音色</label>
                        <div class="settings-radio-group">
                            <label class="settings-radio ${meowPianoPrefs.tone === 'soft' ? 'active' : ''}">
                                <input type="radio" name="pianoTone" value="soft" ${meowPianoPrefs.tone === 'soft' ? 'checked' : ''}>
                                <span>柔和</span>
                                <small>猫咪风铃</small>
                            </label>
                            <label class="settings-radio ${meowPianoPrefs.tone === 'bright' ? 'active' : ''}">
                                <input type="radio" name="pianoTone" value="bright" ${meowPianoPrefs.tone === 'bright' ? 'checked' : ''}>
                                <span>明亮</span>
                                <small>清脆铃声</small>
                            </label>
                            <label class="settings-radio ${meowPianoPrefs.tone === 'electric' ? 'active' : ''}">
                                <input type="radio" name="pianoTone" value="electric" ${meowPianoPrefs.tone === 'electric' ? 'checked' : ''}>
                                <span>电子</span>
                                <small>合成器</small>
                            </label>
                        </div>
                    </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <button id="settings-save" class="settings-save-btn">${emojiIcon('💾', '', 16)} 保存设置</button>
                </div>
                
                <div class="settings-section">
                    <p class="settings-about">Meow Phone V${getDB().settings.version || VERSION}<br>一个隐藏的彩蛋系统 ${emojiIcon('🐾', '', 13)}<br>3款小应用等你探索 ${emojiIcon('✨', '', 13)}</p>
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

    // 音色 radio 切换
    phoneOverlay.querySelectorAll('input[name="pianoTone"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            phoneOverlay.querySelectorAll('input[name="pianoTone"]').forEach(r => r.closest('.settings-radio').classList.remove('active'));
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
        db.settings.game_prefs.meow_piano = {
            tone: phoneOverlay.querySelector('input[name="pianoTone"]:checked')?.value || 'soft'
        };
        // 清理已下架游戏的残留配置
        ['yarn_ball', 'cat_fortune', 'cat_memory', 'whack_mouse', 'meow_timer', 'cat_2048', 'cat_simon', 'cat_reaction', 'cat_facts']
            .forEach(k => delete db.settings.game_prefs[k]);
        setDB(db);

        // 显示保存成功反馈
        const saveBtn = phoneOverlay.querySelector('#settings-save');
        saveBtn.innerHTML = `${emojiIcon('✅', '', 16)} 已保存`;
        saveBtn.style.background = '#10B981';
        setTimeout(() => {
            saveBtn.innerHTML = `${emojiIcon('💾', '', 16)} 保存设置`;
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
                <span class="phone-back-btn" id="pixel-back">${icon('arrow-left', '', 14)} 返回</span>
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

// ---- 喵喵琴启动器 ----

function launchMeowPiano() {
    if (!phoneOverlay) return;

    phoneOverlay.innerHTML = `
        <div class="phone-screen">
            <div class="phone-status-bar">
                <span class="phone-back-btn" id="piano-back">${icon('arrow-left', '', 14)} 返回</span>
                <span></span>
                <span></span>
            </div>
            <div id="meow-piano-container" class="meow-piano-app-container"></div>
        </div>
    `;

    const container = phoneOverlay.querySelector('#meow-piano-container');
    const prefs = getDB().settings?.game_prefs?.meow_piano || {};
    const pianoApp = createMeowPianoApp(container, prefs);

    phoneOverlay.querySelector('#piano-back').addEventListener('click', () => {
        if (pianoApp && pianoApp.destroy) pianoApp.destroy();
        renderHomeScreen();
    });
}

