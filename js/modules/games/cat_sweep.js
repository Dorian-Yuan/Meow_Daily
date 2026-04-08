/**
 * cat_sweep.js - 猫抓老鼠（扫雷改版）
 * 
 * 核心逻辑：
 * - 单击插旗（红色激光点 🔴）
 * - 双击翻开方块
 * - 首点安全（第一次双击后才生成老鼠位置）
 * - 标准扫雷邻居计算
 */

// 难度预设
const PRESETS = {
    easy:   { rows: 8,  cols: 8,  mice: 10 },
    medium: { rows: 12, cols: 12, mice: 25 },
    hard:   { rows: 16, cols: 12, mice: 40 }
};

/**
 * 创建猫抓老鼠游戏实例
 * @param {HTMLElement} container - 游戏容器
 * @param {object} options - { difficulty, custom, onWin, onLose, onFlagChange }
 */
export function createCatSweepGame(container, options = {}) {
    const difficulty = options.difficulty || 'easy';
    const preset = PRESETS[difficulty] || options.custom || PRESETS.easy;
    const { rows, cols, mice } = preset;

    // 游戏状态
    let board = [];        // 2D array: { isMouse, revealed, flagged, adjacentMice }
    let miceGenerated = false;
    let gameOver = false;
    let flagCount = 0;
    let revealedCount = 0;
    const totalSafe = rows * cols - mice;

    // 点击定时器（区分单击/双击）
    let clickTimer = null;
    const DOUBLE_CLICK_DELAY = 280; // ms

    // 初始化空棋盘
    function initBoard() {
        board = [];
        for (let r = 0; r < rows; r++) {
            board[r] = [];
            for (let c = 0; c < cols; c++) {
                board[r][c] = {
                    isMouse: false,
                    revealed: false,
                    flagged: false,
                    adjacentMice: 0
                };
            }
        }
        miceGenerated = false;
        gameOver = false;
        flagCount = 0;
        revealedCount = 0;
    }

    // 生成老鼠（首次翻开后）
    function generateMice(safeRow, safeCol) {
        // 安全区：首次点击周围 3x3 区域
        const safeZone = new Set();
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = safeRow + dr;
                const nc = safeCol + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    safeZone.add(`${nr},${nc}`);
                }
            }
        }

        let placed = 0;
        while (placed < mice) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            if (!board[r][c].isMouse && !safeZone.has(`${r},${c}`)) {
                board[r][c].isMouse = true;
                placed++;
            }
        }

        // 计算每格邻居老鼠数
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!board[r][c].isMouse) {
                    board[r][c].adjacentMice = countAdjacentMice(r, c);
                }
            }
        }

        miceGenerated = true;
    }

    function countAdjacentMice(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMouse) {
                    count++;
                }
            }
        }
        return count;
    }

    // 翻开格子（递归展开 0 邻居）
    function revealCell(r, c) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        const cell = board[r][c];
        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;
        revealedCount++;

        if (cell.isMouse) {
            // 踩雷
            gameOver = true;
            revealAllMice();
            renderBoard();
            if (options.onLose) options.onLose();
            return;
        }

        if (cell.adjacentMice === 0) {
            // 递归翻开周围
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    revealCell(r + dr, c + dc);
                }
            }
        }
    }

    // 揭露所有老鼠
    function revealAllMice() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].isMouse) {
                    board[r][c].revealed = true;
                }
            }
        }
    }

    // 检查胜利
    function checkWin() {
        if (revealedCount >= totalSafe) {
            gameOver = true;
            if (options.onWin) options.onWin();
            return true;
        }
        return false;
    }

    // 处理单击（插旗）
    function handleSingleClick(r, c) {
        if (gameOver) return;
        const cell = board[r][c];
        if (cell.revealed) return;

        cell.flagged = !cell.flagged;
        flagCount += cell.flagged ? 1 : -1;
        if (options.onFlagChange) options.onFlagChange(flagCount, mice);
        renderBoard();
    }

    // 处理双击（翻开）
    function handleDoubleClick(r, c) {
        if (gameOver) return;
        const cell = board[r][c];

        if (cell.revealed && cell.adjacentMice > 0) {
            let flagCount = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].flagged) {
                        flagCount++;
                    }
                }
            }
            if (flagCount === cell.adjacentMice) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !board[nr][nc].flagged && !board[nr][nc].revealed) {
                            revealCell(nr, nc);
                        }
                    }
                }
                renderBoard();
                if (!gameOver) checkWin();
            }
            return;
        }

        if (cell.revealed || cell.flagged) return;

        if (!miceGenerated) {
            generateMice(r, c);
        }

        revealCell(r, c);
        renderBoard();

        if (!gameOver) {
            checkWin();
        }
    }

    // 数字颜色
    function getNumberColor(n) {
        const colors = {
            1: '#6CB4EE',  // 淡蓝
            2: '#F28C38',  // 橘色
            3: '#E11D48',  // 玫瑰红
            4: '#7C3AED',  // 紫色
            5: '#DC2626',  // 深红
            6: '#059669',  // 青绿
            7: '#1F1814',  // 深色
            8: '#6B7280',  // 灰色
        };
        return colors[n] || '#1F1814';
    }

    // 渲染棋盘
    function renderBoard() {
        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'sweep-grid';
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = board[r][c];
                const tile = document.createElement('div');
                tile.className = 'sweep-tile';

                if (cell.revealed) {
                    tile.classList.add('revealed');
                    if (cell.isMouse) {
                        tile.classList.add('mouse');
                        tile.textContent = '🐭';
                    } else if (cell.adjacentMice > 0) {
                        tile.textContent = cell.adjacentMice;
                        tile.style.color = getNumberColor(cell.adjacentMice);
                        tile.style.fontWeight = '900';
                    }
                } else if (cell.flagged) {
                    tile.classList.add('flagged');
                    tile.textContent = '🔴';
                }

                // 绑定点击事件（用定时器区分单击/双击）
                const row = r, col = c;
                tile.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (gameOver) return;

                    if (clickTimer) {
                        // 第二次点击 = 双击
                        clearTimeout(clickTimer);
                        clickTimer = null;
                        handleDoubleClick(row, col);
                    } else {
                        // 第一次点击，等待是否有第二次
                        clickTimer = setTimeout(() => {
                            clickTimer = null;
                            handleSingleClick(row, col);
                        }, DOUBLE_CLICK_DELAY);
                    }
                });

                // 阻止原生双击缩放
                tile.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });

                // 阻止长按上下文菜单
                tile.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                });

                grid.appendChild(tile);
            }
        }

        container.appendChild(grid);
    }

    // 公共API
    const game = {
        start() {
            initBoard();
            renderBoard();
            if (options.onFlagChange) options.onFlagChange(0, mice);
        },
        reset() {
            this.start();
        },
        getState() {
            return { gameOver, flagCount, mice, revealedCount, totalSafe };
        }
    };

    return game;
}
