const EMOJI_MAP = {
    2: '🐱', 4: '😺', 8: '😻', 16: '😼', 32: '🐾',
    64: '🐟', 128: '🧶', 256: '🐭', 512: '🐈', 1024: '👑', 2048: '🌟'
};

const TILE_COLORS = {
    0: 'var(--color-bg-warm)',
    2: '#EBF0FF', 4: '#FEF4EB', 8: '#FEFBEB',
    16: '#F5F3FF', 32: '#FDF2F8', 64: '#F3EFFF',
    128: '#E8F5E9', 256: '#FFF3E0', 512: '#E0F7FA',
    1024: '#FCE4EC', 2048: '#FFD700'
};

export function createCat2048App(container, options = {}) {
    container.innerHTML = '';
    const gridSize = options.size || 4;
    let grid = [];
    let score = 0;
    let bestScore = 0;
    let gameOver = false;
    let touchStartX = 0, touchStartY = 0;
    let newTilePos = null;
    let mergedPositions = [];

    try { bestScore = parseInt(localStorage.getItem('meow_2048_best') || '0'); } catch {}

    function init() {
        grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
        score = 0;
        gameOver = false;
        newTilePos = null;
        mergedPositions = [];
        addRandomTile();
        addRandomTile();
        buildGrid();
        updateScores();
        const overlayEl = container.querySelector('.merge-overlay');
        if (overlayEl) overlayEl.style.display = 'none';
    }

    function addRandomTile() {
        const empty = [];
        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++)
                if (grid[r][c] === 0) empty.push({ r, c });
        if (empty.length === 0) return;
        const pos = empty[Math.floor(Math.random() * empty.length)];
        grid[pos.r][pos.c] = Math.random() < 0.9 ? 2 : 4;
        newTilePos = pos;
    }

    function slide(row) {
        let arr = row.filter(v => v !== 0);
        let merged = [];
        let mergeIndices = [];
        for (let i = 0; i < arr.length; i++) {
            if (i < arr.length - 1 && arr[i] === arr[i + 1]) {
                merged.push(arr[i] * 2);
                score += arr[i] * 2;
                mergeIndices.push(merged.length - 1);
                i++;
            } else {
                merged.push(arr[i]);
            }
        }
        while (merged.length < gridSize) merged.push(0);
        return { result: merged, mergeIndices };
    }

    function move(direction) {
        if (gameOver) return false;
        let moved = false;
        const old = grid.map(r => [...r]);
        mergedPositions = [];

        if (direction === 'left') {
            for (let r = 0; r < gridSize; r++) {
                const { result, mergeIndices } = slide(grid[r]);
                grid[r] = result;
                mergeIndices.forEach(c => mergedPositions.push({ r, c }));
            }
        } else if (direction === 'right') {
            for (let r = 0; r < gridSize; r++) {
                const { result, mergeIndices } = slide([...grid[r]].reverse());
                grid[r] = result.reverse();
                mergeIndices.forEach(ci => mergedPositions.push({ r, c: gridSize - 1 - ci }));
            }
        } else if (direction === 'up') {
            for (let c = 0; c < gridSize; c++) {
                let col = [];
                for (let r = 0; r < gridSize; r++) col.push(grid[r][c]);
                const { result, mergeIndices } = slide(col);
                for (let r = 0; r < gridSize; r++) grid[r][c] = result[r];
                mergeIndices.forEach(ri => mergedPositions.push({ r: ri, c }));
            }
        } else if (direction === 'down') {
            for (let c = 0; c < gridSize; c++) {
                let col = [];
                for (let r = 0; r < gridSize; r++) col.push(grid[r][c]);
                const { result, mergeIndices } = slide(col.reverse());
                const reversed = result.reverse();
                for (let r = 0; r < gridSize; r++) grid[r][c] = reversed[r];
                mergeIndices.forEach(ri => mergedPositions.push({ r: gridSize - 1 - ri, c }));
            }
        }

        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++)
                if (grid[r][c] !== old[r][c]) moved = true;

        if (moved) {
            addRandomTile();
            if (score > bestScore) {
                bestScore = score;
                try { localStorage.setItem('meow_2048_best', String(bestScore)); } catch {}
            }
            updateGrid();
            updateScores();
            checkGameOver();
        }
        return moved;
    }

    function checkGameOver() {
        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] === 0) return;
                if (c < gridSize - 1 && grid[r][c] === grid[r][c + 1]) return;
                if (r < gridSize - 1 && grid[r][c] === grid[r + 1][c]) return;
            }
        gameOver = true;
        const overlayEl = container.querySelector('.merge-overlay');
        if (overlayEl) {
            overlayEl.style.display = 'flex';
            overlayEl.querySelector('.merge-overlay-score').textContent = score;
        }
    }

    function cellContent(val) {
        if (val > 0) {
            const emoji = EMOJI_MAP[val] || '🌟';
            return `<span class="merge-emoji">${emoji}</span><span class="merge-num">${val}</span>`;
        }
        return '';
    }

    function buildGrid() {
        const gridEl = container.querySelector('.merge-grid');
        if (!gridEl) return;
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const val = grid[r][c];
                const cell = document.createElement('div');
                cell.className = 'merge-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.style.background = TILE_COLORS[val] || 'var(--color-bg-warm)';
                cell.innerHTML = cellContent(val);
                if (newTilePos && newTilePos.r === r && newTilePos.c === c) {
                    cell.classList.add('merge-new');
                }
                gridEl.appendChild(cell);
            }
        }
    }

    function updateGrid() {
        const gridEl = container.querySelector('.merge-grid');
        if (!gridEl) return;
        const cells = gridEl.querySelectorAll('.merge-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const val = grid[r][c];
            const oldVal = cell.dataset.val || '0';
            const valStr = String(val);

            cell.style.background = TILE_COLORS[val] || 'var(--color-bg-warm)';
            cell.innerHTML = cellContent(val);
            cell.dataset.val = valStr;

            cell.classList.remove('merge-new', 'merge-pop');

            if (newTilePos && newTilePos.r === r && newTilePos.c === c && val > 0) {
                void cell.offsetWidth;
                cell.classList.add('merge-new');
            }

            if (mergedPositions.some(p => p.r === r && p.c === c)) {
                void cell.offsetWidth;
                cell.classList.add('merge-pop');
            }
        });
    }

    function updateScores() {
        const scoreEl = container.querySelector('.merge-score-val');
        const bestEl = container.querySelector('.merge-best-val');
        if (scoreEl) scoreEl.textContent = score;
        if (bestEl) bestEl.textContent = bestScore;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'merge-wrapper';
    wrapper.innerHTML = `
        <div class="merge-info">
            <span>🐾 <span class="merge-score-val">0</span></span>
            <span>🏆 <span class="merge-best-val">${bestScore}</span></span>
        </div>
        <div class="merge-grid"></div>
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
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) < 30) return;
        if (absDx > absDy) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    }, { passive: true });

    init();

    return {
        destroy() {
            document.removeEventListener('keydown', onKeyDown);
        }
    };
}
