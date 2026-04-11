const EMOJI_MAP = {
    2: '🐱', 4: '😺', 8: '😻', 16: '😼', 32: '🐾',
    64: '🐟', 128: '🧶', 256: '🐭', 512: '🐈', 1024: '👑', 2048: '🌟'
};

const TILE_COLORS = {
    2: '#EBF0FF', 4: '#FEF4EB', 8: '#FEFBEB',
    16: '#F5F3FF', 32: '#FDF2F8', 64: '#F3EFFF',
    128: '#E8F5E9', 256: '#FFF3E0', 512: '#E0F7FA',
    1024: '#FCE4EC', 2048: '#FFD700'
};

const ANIM_DURATION = 120;

export function createCat2048App(container, options = {}) {
    container.innerHTML = '';
    const gridSize = options.size || 4;
    let score = 0;
    let bestScore = 0;
    let gameOver = false;
    let isAnimating = false;
    let touchStartX = 0, touchStartY = 0;
    let nextId = 1;

    let tileMap = {};
    let gridCells = [];

    try { bestScore = parseInt(localStorage.getItem('meow_2048_best') || '0'); } catch {}

    const GAP = 8;
    const PAD = 10;

    function getCellSize() {
        const gridEl = container.querySelector('.merge-grid');
        if (!gridEl) return 70;
        const w = gridEl.clientWidth - PAD * 2;
        return (w - GAP * (gridSize - 1)) / gridSize;
    }

    function cellPos(row, col) {
        const s = getCellSize();
        return { x: PAD + col * (s + GAP), y: PAD + row * (s + GAP) };
    }

    function init() {
        score = 0;
        gameOver = false;
        isAnimating = false;
        tileMap = {};
        gridCells = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
        nextId = 1;

        const tilesEl = container.querySelector('.merge-tiles');
        if (tilesEl) tilesEl.innerHTML = '';

        addRandomTile();
        addRandomTile();
        updateScores();

        const overlayEl = container.querySelector('.merge-overlay');
        if (overlayEl) overlayEl.style.display = 'none';
    }

    function addRandomTile() {
        const empty = [];
        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++)
                if (gridCells[r][c] === 0) empty.push({ r, c });
        if (empty.length === 0) return;
        const pos = empty[Math.floor(Math.random() * empty.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        createTile(pos.r, pos.c, value, true);
    }

    function createTile(row, col, value, isNew) {
        const id = nextId++;
        const tile = { id, value, row, col, el: null };
        tileMap[id] = tile;
        gridCells[row][col] = id;

        const el = document.createElement('div');
        el.className = 'merge-tile';
        const s = getCellSize();
        el.style.width = s + 'px';
        el.style.height = s + 'px';
        const pos = cellPos(row, col);
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
        el.style.background = TILE_COLORS[value] || '#FFD700';
        const emoji = EMOJI_MAP[value] || '🌟';
        el.innerHTML = `<span class="merge-emoji">${emoji}</span><span class="merge-num">${value}</span>`;

        if (isNew) {
            el.classList.add('merge-new');
        }

        const tilesEl = container.querySelector('.merge-tiles');
        if (tilesEl) tilesEl.appendChild(el);
        tile.el = el;

        return tile;
    }

    function moveTile(tile, newRow, newCol) {
        tile.row = newRow;
        tile.col = newCol;
        const pos = cellPos(newRow, newCol);
        tile.el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }

    function removeTile(id) {
        const tile = tileMap[id];
        if (tile && tile.el) tile.el.remove();
        delete tileMap[id];
    }

    function updateTileValue(tile, newValue) {
        tile.value = newValue;
        tile.el.style.background = TILE_COLORS[newValue] || '#FFD700';
        const emoji = EMOJI_MAP[newValue] || '🌟';
        tile.el.innerHTML = `<span class="merge-emoji">${emoji}</span><span class="merge-num">${newValue}</span>`;
        tile.el.classList.remove('merge-pop');
        void tile.el.offsetWidth;
        tile.el.classList.add('merge-pop');
    }

    function move(direction) {
        if (gameOver || isAnimating) return false;

        const vector = { up: { r: -1, c: 0 }, down: { r: 1, c: 0 }, left: { r: 0, c: -1 }, right: { r: 0, c: 1 } }[direction];
        const traversals = getTraversals(direction);

        let moved = false;
        const mergeActions = [];

        traversals.rows.forEach(r => {
            traversals.cols.forEach(c => {
                const id = gridCells[r][c];
                if (id === 0) return;
                const tile = tileMap[id];
                if (!tile) return;

                const { farthest, next } = findFarthest(r, c, vector);

                if (next && gridCells[next.r][next.c] !== 0) {
                    const nextId = gridCells[next.r][next.c];
                    const nextTile = tileMap[nextId];
                    if (nextTile && nextTile.value === tile.value && !nextTile._merged) {
                        gridCells[r][c] = 0;
                        moveTile(tile, next.r, next.c);
                        nextTile._merged = true;
                        mergeActions.push({ movingId: id, targetId: nextId, row: next.r, col: next.c, newValue: tile.value * 2 });
                        score += tile.value * 2;
                        moved = true;
                        return;
                    }
                }

                if (farthest.r !== r || farthest.c !== c) {
                    gridCells[r][c] = 0;
                    gridCells[farthest.r][farthest.c] = id;
                    moveTile(tile, farthest.r, farthest.c);
                    moved = true;
                }
            });
        });

        if (!moved) return false;

        isAnimating = true;

        setTimeout(() => {
            mergeActions.forEach(({ movingId, targetId, row, col, newValue }) => {
                removeTile(movingId);
                const target = tileMap[targetId];
                if (target) {
                    gridCells[row][col] = targetId;
                    target._merged = false;
                    updateTileValue(target, newValue);
                }
            });

            addRandomTile();

            if (score > bestScore) {
                bestScore = score;
                try { localStorage.setItem('meow_2048_best', String(bestScore)); } catch {}
            }
            updateScores();
            checkGameOver();
            isAnimating = false;
        }, ANIM_DURATION);

        return true;
    }

    function getTraversals(direction) {
        const rows = [], cols = [];
        for (let i = 0; i < gridSize; i++) { rows.push(i); cols.push(i); }
        if (direction === 'down') rows.reverse();
        if (direction === 'right') cols.reverse();
        return { rows, cols };
    }

    function findFarthest(row, col, vector) {
        let prev = { r: row, c: col };
        let curr = { r: row + vector.r, c: col + vector.c };
        while (curr.r >= 0 && curr.r < gridSize && curr.c >= 0 && curr.c < gridSize && gridCells[curr.r][curr.c] === 0) {
            prev = { r: curr.r, c: curr.c };
            curr = { r: curr.r + vector.r, c: curr.c + vector.c };
        }
        const next = (curr.r >= 0 && curr.r < gridSize && curr.c >= 0 && curr.c < gridSize) ? curr : null;
        return { farthest: prev, next };
    }

    function checkGameOver() {
        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++) {
                if (gridCells[r][c] === 0) return;
                const val = tileMap[gridCells[r][c]]?.value;
                if (c < gridSize - 1 && val === tileMap[gridCells[r][c + 1]]?.value) return;
                if (r < gridSize - 1 && val === tileMap[gridCells[r + 1][c]]?.value) return;
            }
        gameOver = true;
        const overlayEl = container.querySelector('.merge-overlay');
        if (overlayEl) {
            overlayEl.style.display = 'flex';
            overlayEl.querySelector('.merge-overlay-score').textContent = score;
        }
    }

    function updateScores() {
        const scoreEl = container.querySelector('.merge-score-val');
        const bestEl = container.querySelector('.merge-best-val');
        if (scoreEl) scoreEl.textContent = score;
        if (bestEl) bestEl.textContent = bestScore;
    }

    function buildBackgroundGrid() {
        const gridEl = container.querySelector('.merge-grid');
        if (!gridEl) return;
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'merge-cell-bg';
                gridEl.appendChild(cell);
            }
        }
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'merge-wrapper';
    wrapper.innerHTML = `
        <div class="merge-info">
            <span>🐾 <span class="merge-score-val">0</span></span>
            <span>🏆 <span class="merge-best-val">${bestScore}</span></span>
        </div>
        <div class="merge-grid-container">
            <div class="merge-grid"></div>
            <div class="merge-tiles"></div>
        </div>
        <button class="merge-btn" id="merge-restart">重新开始</button>
        <div class="merge-overlay">
            <div class="merge-overlay-content">
                <div style="font-size:22px;font-weight:bold;color:var(--color-text-title)">游戏结束!</div>
                <div class="merge-overlay-score">0</div>
                <button class="merge-btn" id="merge-overlay-restart">再来一局</button>
            </div>
        </div>
    `;
    container.appendChild(wrapper);

    buildBackgroundGrid();

    wrapper.querySelector('#merge-restart').addEventListener('click', init);
    wrapper.querySelector('#merge-overlay-restart').addEventListener('click', init);

    function onKeyDown(e) {
        const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
        if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    }
    document.addEventListener('keydown', onKeyDown);

    wrapper.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    wrapper.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    }, { passive: true });

    init();

    return {
        destroy() {
            document.removeEventListener('keydown', onKeyDown);
        }
    };
}
