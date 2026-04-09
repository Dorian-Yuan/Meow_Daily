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
    let startTime = 0;
    let endTime = 0;
    let autoCompleted = false;

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
        startTime = 0;
        endTime = 0;
        autoCompleted = false;
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
            endTime = Date.now();
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
            endTime = Date.now();
            if (options.onWin) options.onWin(getElapsedTime());
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
                if (!gameOver) getSafeMove();
            }
            return;
        }

        if (cell.revealed || cell.flagged) return;

        if (!miceGenerated) {
            generateMice(r, c);
            startTime = Date.now();
        }

        revealCell(r, c);
        renderBoard();

        if (!gameOver) {
            checkWin();
        }

        if (!gameOver) {
            getSafeMove();
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

    // 获取游戏用时（秒）
    function getElapsedTime() {
        if (!startTime) return 0;
        const currentTime = endTime || Date.now();
        return Math.floor((currentTime - startTime) / 1000);
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

    // 智能猜测算法
    function getSafeMove() {
        // 收集所有未翻开且未插旗的格子
        const unknownCells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = board[r][c];
                if (!cell.revealed && !cell.flagged) {
                    unknownCells.push({ r, c });
                }
            }
        }

        // 基础约束传播
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = board[r][c];
                if (cell.revealed && !cell.isMouse) {
                    const neighbors = getNeighbors(r, c);
                    const coveredNeighbors = neighbors.filter(n => !board[n.r][n.c].revealed);
                    const flaggedNeighbors = neighbors.filter(n => board[n.r][n.c].flagged);
                    const remainingMines = cell.adjacentMice - flaggedNeighbors.length;

                    // All Mines 规则：如果剩余地雷数等于未翻开邻居数，则所有未翻开邻居都是地雷
                    if (remainingMines === coveredNeighbors.length && remainingMines > 0) {
                        return null; // 这里我们只找安全格子，不是找地雷
                    }

                    // All Safe 规则：如果剩余地雷数为0，则所有未翻开邻居都是安全的
                    if (remainingMines === 0 && coveredNeighbors.length > 0) {
                        return coveredNeighbors[0]; // 返回第一个安全格子
                    }
                }
            }
        }

        // 子集逻辑
        for (let r1 = 0; r1 < rows; r1++) {
            for (let c1 = 0; c1 < cols; c1++) {
                const cell1 = board[r1][c1];
                if (cell1.revealed && !cell1.isMouse) {
                    const neighbors1 = getNeighbors(r1, c1);
                    const coveredNeighbors1 = neighbors1.filter(n => !board[n.r][n.c].revealed);
                    const flaggedNeighbors1 = neighbors1.filter(n => board[n.r][n.c].flagged);
                    const remainingMines1 = cell1.adjacentMice - flaggedNeighbors1.length;

                    for (let r2 = 0; r2 < rows; r2++) {
                        for (let c2 = 0; c2 < cols; c2++) {
                            if (r1 === r2 && c1 === c2) continue;
                            const cell2 = board[r2][c2];
                            if (cell2.revealed && !cell2.isMouse) {
                                const neighbors2 = getNeighbors(r2, c2);
                                const coveredNeighbors2 = neighbors2.filter(n => !board[n.r][n.c].revealed);
                                const flaggedNeighbors2 = neighbors2.filter(n => board[n.r][n.c].flagged);
                                const remainingMines2 = cell2.adjacentMice - flaggedNeighbors2.length;

                                // 检查coveredNeighbors1是否是coveredNeighbors2的子集
                                const isSubset = coveredNeighbors1.every(n1 => 
                                    coveredNeighbors2.some(n2 => n1.r === n2.r && n1.c === n2.c)
                                );

                                if (isSubset) {
                                    const extraCells = coveredNeighbors2.filter(n2 => 
                                        !coveredNeighbors1.some(n1 => n1.r === n2.r && n1.c === n2.c)
                                    );
                                    const mineDiff = remainingMines2 - remainingMines1;

                                    // 如果差值为0，则额外的格子都是安全的
                                    if (mineDiff === 0 && extraCells.length > 0) {
                                        return extraCells[0];
                                    }

                                    // 如果差值等于额外格子数，则额外的格子都是地雷
                                    // 这里我们只找安全格子，不是找地雷
                                }
                            }
                        }
                    }
                }
            }
        }

        // 多解法处理：当只剩下最后几个格子时，检查是否存在多个有效配置
        if (unknownCells.length <= 10) {
            const validConfigurations = generateValidConfigurations(unknownCells);
            if (validConfigurations.length > 1) {
                // 检查是否存在某个格子在所有配置中状态一致（可以确定）
                let canDetermine = false;
                for (let i = 0; i < unknownCells.length; i++) {
                    const allSafe = validConfigurations.every(config => config[i] === 0);
                    const allMine = validConfigurations.every(config => config[i] === 1);
                    if (allSafe || allMine) {
                        canDetermine = true;
                        break;
                    }
                }

                // 如果没有任何格子能确定状态，说明需要猜测
                if (!canDetermine) {
                    // 存在多个有效配置，通知外部
                    if (options.onMultipleSolutions) {
                        options.onMultipleSolutions();
                    }
                    // 判定所有配置都正确，自动完成游戏
                    completeGameWithMultipleSolutions();
                    return null;
                }
            }
        }

        // 没有找到安全格子，返回null
        return null;
    }

    // 获取邻居格子
    function getNeighbors(r, c) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    neighbors.push({ r: nr, c: nc });
                }
            }
        }
        return neighbors;
    }

    // 生成所有有效的地雷配置（不考虑全局地雷总数，只考虑局部约束）
    function generateValidConfigurations(unknownCells) {
        const validConfigs = [];

        // 生成所有可能的地雷配置（2^n 种可能）
        function generateConfigs(index, currentConfig) {
            if (index === unknownCells.length) {
                if (isValidConfiguration(currentConfig, unknownCells)) {
                    validConfigs.push([...currentConfig]);
                }
                return;
            }

            // 尝试将当前格子设为安全
            currentConfig[index] = 0;
            generateConfigs(index + 1, currentConfig);

            // 尝试将当前格子设为地雷
            currentConfig[index] = 1;
            generateConfigs(index + 1, currentConfig);
        }

        generateConfigs(0, new Array(unknownCells.length));
        return validConfigs;
    }

    // 验证配置是否有效
    function isValidConfiguration(config, unknownCells) {
        // 检查所有已揭示的数字是否满足约束
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = board[r][c];
                if (cell.revealed && !cell.isMouse) {
                    const neighbors = getNeighbors(r, c);
                    let mineCount = 0;

                    // 计算邻居中的地雷数（包括已标记的和配置中的）
                    for (const n of neighbors) {
                        if (board[n.r][n.c].flagged) {
                            mineCount++;
                        } else if (!board[n.r][n.c].revealed) {
                            // 查找该格子在unknownCells中的索引
                            for (let i = 0; i < config.length; i++) {
                                if (n.r === unknownCells[i].r && n.c === unknownCells[i].c) {
                                    mineCount += config[i];
                                    break;
                                }
                            }
                        }
                    }

                    if (mineCount !== cell.adjacentMice) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // 当存在多个有效配置时，自动完成游戏
    function completeGameWithMultipleSolutions() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = board[r][c];
                if (!cell.revealed && !cell.flagged) {
                    cell.revealed = true;
                    revealedCount++;
                }
            }
        }
        autoCompleted = true;
        renderBoard();
        checkWin();
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
        },
        getElapsedTime() {
            return getElapsedTime();
        },
        getSafeMove() {
            return getSafeMove();
        },
        isAutoCompleted() {
            return autoCompleted;
        }
    };

    return game;
}
