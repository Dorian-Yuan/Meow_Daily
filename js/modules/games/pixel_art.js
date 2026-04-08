/**
 * pixel_art.js - 像素画板应用
 * 
 * 功能：简单的像素画板，支持多种画布尺寸、颜色选择和导出功能
 */

// ==================== Command Pattern Classes ====================

/**
 * 命令基类
 */
class PixelArtCommand {
    constructor(name) {
        this.name = name;
        this.timestamp = Date.now();
    }
    
    execute() {
        throw new Error('execute() must be implemented');
    }
    
    undo() {
        throw new Error('undo() must be implemented');
    }
}

/**
 * 单像素绘制/擦除命令
 */
class DrawPixelCommand extends PixelArtCommand {
    constructor(app, index, oldColor, newColor) {
        super('draw');
        this.app = app;
        this.index = index;
        this.oldColor = oldColor;
        this.newColor = newColor;
    }
    
    execute() {
        this.app.pixels[this.index] = this.newColor;
    }
    
    undo() {
        this.app.pixels[this.index] = this.oldColor;
    }
}

/**
 * 填充命令（油漆桶）
 */
class FillCommand extends PixelArtCommand {
    constructor(app, changedPixels) {
        super('fill');
        this.app = app;
        this.changedPixels = changedPixels;
    }
    
    execute() {
        this.changedPixels.forEach(({index, newColor}) => {
            this.app.pixels[index] = newColor;
        });
    }
    
    undo() {
        this.changedPixels.forEach(({index, oldColor}) => {
            this.app.pixels[index] = oldColor;
        });
    }
}

/**
 * 清空画布命令
 */
class ClearCanvasCommand extends PixelArtCommand {
    constructor(app, oldPixels) {
        super('clear');
        this.app = app;
        this.oldPixels = oldPixels;
    }
    
    execute() {
        this.app.pixels.fill('transparent');
    }
    
    undo() {
        this.app.pixels = [...this.oldPixels];
    }
}

/**
 * 历史记录管理器
 */
class HistoryManager {
    constructor(limit = 50) {
        this.commands = [];
        this.currentIndex = -1;
        this.limit = limit;
    }
    
    execute(command) {
        this.commands = this.commands.slice(0, this.currentIndex + 1);
        command.execute();
        this.commands.push(command);
        this.currentIndex++;
        
        if (this.commands.length > this.limit) {
            this.commands.shift();
            this.currentIndex--;
        }
        
        return this.getState();
    }
    
    undo() {
        if (this.currentIndex >= 0) {
            this.commands[this.currentIndex].undo();
            this.currentIndex--;
        }
        return this.getState();
    }
    
    redo() {
        if (this.currentIndex < this.commands.length - 1) {
            this.currentIndex++;
            this.commands[this.currentIndex].execute();
        }
        return this.getState();
    }
    
    canUndo() {
        return this.currentIndex >= 0;
    }
    
    canRedo() {
        return this.currentIndex < this.commands.length - 1;
    }
    
    getState() {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            commandCount: this.commands.length,
            currentIndex: this.currentIndex
        };
    }
    
    clear() {
        this.commands = [];
        this.currentIndex = -1;
    }
}

// ==================== Pixel Art Application ====================

// 经典调色板
const CLASSIC_PALETTE = [
    '#000000', // 黑色
    '#FFFFFF', // 白色
    '#FF0000', // 红色
    '#00FF00', // 绿色
    '#0000FF', // 蓝色
    '#FFFF00', // 黄色
    '#FF00FF', // 品红
    '#00FFFF', // 青色
    '#FFA500', // 橙色
    '#800080', // 紫色
    '#808080', // 灰色
    '#800000', // 栗色
    '#008000', // 深绿
    '#000080', // 深蓝
    '#808000', // 橄榄
    '#FFC0CB'  // 粉色
];

class PixelArtApp {
    constructor(container) {
        this.container = container;
        this.canvasSize = 10; // 默认 10x10
        this.pixels = Array(this.canvasSize * this.canvasSize).fill('transparent');
        this.currentColor = '#000000';
        this.tool = 'pen'; // pen, eraser, eyedropper, bucket
        this.colorPalette = [...CLASSIC_PALETTE.slice(0, 8)]; // 默认颜色槽位
        
        // 使用 HistoryManager 替代旧的 history 数组
        this.historyManager = new HistoryManager(50);
        
        // 加载缓存数据
        this.loadFromCache();
        
        this.init();
    }
    
    init() {
        this.renderUI();
        this.renderCanvas();
        this.bindEvents();
        
        // 设置当前活跃的颜色按钮
        const colorBtns = this.container.querySelectorAll('.color-btn');
        this.activeColorBtn = Array.from(colorBtns).find(btn => btn.dataset.color === this.currentColor) || colorBtns[0];
        
        // 初始化颜色按钮状态
        console.log('Initializing color buttons, currentColor:', this.currentColor);
        this.updateColorButtons();
        
        // 初始化撤销/重做按钮状态
        this.updateUndoRedoButtons();
    }
    
    updateUndoRedoButtons() {
        const undoBtn = this.container.querySelector('#undo-btn');
        const redoBtn = this.container.querySelector('#redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = !this.historyManager.canUndo();
            undoBtn.style.opacity = this.historyManager.canUndo() ? '1' : '0.5';
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this.historyManager.canRedo();
            redoBtn.style.opacity = this.historyManager.canRedo() ? '1' : '0.5';
        }
    }
    
    updateColorButtons() {
        // 更新颜色按钮的边框，显示当前选中的颜色
        this.container.querySelectorAll('.color-btn').forEach(btn => {
            if (btn.dataset.color === this.currentColor) {
                btn.style.borderColor = 'var(--color-text-title)';
                btn.style.borderWidth = '3px';
            } else {
                btn.style.borderColor = 'var(--color-divider)';
                btn.style.borderWidth = '2px';
            }
        });
    }
    
    renderUI() {
        this.container.innerHTML = `
            <div class="pixel-art-container">
                <div class="pixel-art-canvas-container" id="pixel-canvas-container"></div>
                
                <div class="pixel-art-bottom">
                    <div class="pixel-art-color-row">
                        ${this.colorPalette.map(color => `
                            <div class="color-btn" data-color="${color}" style="background-color: ${color}"></div>
                        `).join('')}
                    </div>
                    
                    <div class="pixel-art-toolbar">
                        <button class="tool-btn ${this.tool === 'pen' ? 'active' : ''}" data-tool="pen" title="画笔">🖌️</button>
                        <button class="tool-btn ${this.tool === 'eraser' ? 'active' : ''}" data-tool="eraser" title="橡皮擦">🧽</button>
                        <button class="tool-btn ${this.tool === 'eyedropper' ? 'active' : ''}" data-tool="eyedropper" title="取色器">🎨</button>
                        <button class="tool-btn ${this.tool === 'bucket' ? 'active' : ''}" data-tool="bucket" title="油漆桶">🪣</button>
                        <button class="tool-btn" id="clear-btn" title="清空">🗑️</button>
                        <button class="tool-btn" id="undo-btn" title="撤回">↩️</button>
                        <button class="tool-btn" id="redo-btn" title="重做">↪️</button>
                        <button class="tool-btn" id="export-btn" title="导出">📤</button>
                    </div>
                </div>
                
                <!-- 颜色选择弹窗 -->
                <div class="color-picker-modal" id="color-picker-modal" style="display: none;">
                    <div class="color-picker-content">
                        <div class="color-picker-header">
                            <h3>选择颜色</h3>
                            <button class="color-picker-close">×</button>
                        </div>
                        <div class="color-palette">
                            ${CLASSIC_PALETTE.map(color => `
                                <div class="color-swatch" data-color="${color}" style="background-color: ${color}"></div>
                            `).join('')}
                        </div>
                        <div class="color-input">
                            <input type="color" id="color-picker" value="${this.currentColor}">
                            <input type="text" id="rgb-input" value="${this.currentColor}" placeholder="#RRGGBB">
                        </div>
                    </div>
                </div>
                
                <!-- 清空确认弹窗 -->
                <div class="confirm-modal" id="confirm-modal" style="display: none;">
                    <div class="confirm-content">
                        <h3>确认清空</h3>
                        <p>确定要清空画布吗？此操作不可撤销。</p>
                        <div class="confirm-buttons">
                            <button class="confirm-cancel">取消</button>
                            <button class="confirm-ok">确认</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCanvas() {
        const canvasContainer = this.container.querySelector('#pixel-canvas-container');
        const midIndex = Math.floor(this.canvasSize / 2);

        canvasContainer.innerHTML = `
            <div class="pixel-art-canvas" style="grid-template-columns: repeat(${this.canvasSize}, 1fr);">
                ${this.pixels.map((color, index) => {
                    const isTransparent = color === 'transparent';
                    const x = index % this.canvasSize;
                    const y = Math.floor(index / this.canvasSize);
                    const classes = ['pixel'];
                    if (isTransparent) classes.push('pixel-transparent');
                    if (x === midIndex || y === midIndex) classes.push('pixel-center-line');
                    if (x === 0 || x === this.canvasSize - 1 || y === 0 || y === this.canvasSize - 1) classes.push('pixel-border-line');
                    return `<div class="${classes.join(' ')}" data-index="${index}" ${!isTransparent ? `style="background-color: ${color}"` : ''}></div>`;
                }).join('')}
            </div>
        `;

        this.renderGridOverlay();
    }

    renderGridOverlay() {
        requestAnimationFrame(() => {
            const canvasEl = this.container.querySelector('.pixel-art-canvas');
            if (!canvasEl) return;

            let overlay = canvasEl.querySelector('.pixel-grid-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'pixel-grid-overlay';
                canvasEl.appendChild(overlay);
            }

            const midIndex = Math.floor(this.canvasSize / 2);
            const gapPx = 1;
            const totalGaps = this.canvasSize - 1;
            const canvasRect = canvasEl.getBoundingClientRect();
            const innerWidth = canvasRect.width - 4;
            const innerHeight = canvasRect.height - 4;
            const gapTotalWidth = totalGaps * gapPx;
            const cellWidth = (innerWidth - gapTotalWidth) / this.canvasSize;
            const cellHeight = (innerHeight - gapTotalWidth) / this.canvasSize;

            const centerLineX = midIndex * (cellWidth + gapPx) + cellWidth / 2;
            const centerLineY = midIndex * (cellHeight + gapPx) + cellHeight / 2;

            overlay.innerHTML = `
                <svg width="100%" height="100%" viewBox="0 0 ${canvasRect.width} ${canvasRect.height}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:-2px;left:-2px;">
                    <line x1="${centerLineX}" y1="0" x2="${centerLineX}" y2="${innerHeight}" stroke="var(--color-text-hint)" stroke-width="1" opacity="0.6"/>
                    <line x1="0" y1="${centerLineY}" x2="${innerWidth}" y2="${centerLineY}" stroke="var(--color-text-hint)" stroke-width="1" opacity="0.6"/>
                </svg>
            `;
        });
    }
    
    bindEvents() {
        const colorPickerModal = this.container.querySelector('#color-picker-modal');
        const colorPickerClose = this.container.querySelector('.color-picker-close');
        const confirmModal = this.container.querySelector('#confirm-modal');
        const confirmCancel = this.container.querySelector('.confirm-cancel');
        const confirmOk = this.container.querySelector('.confirm-ok');
        
        // 颜色按钮点击
        this.container.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activeColorBtn = btn;
                this.currentColor = btn.dataset.color;
                console.log('Color button clicked, currentColor:', this.currentColor);
                this.updateColorButtons();
                colorPickerModal.style.display = 'flex';
            });
        });
        
        // 关闭颜色选择弹窗
        colorPickerClose.addEventListener('click', () => {
            colorPickerModal.style.display = 'none';
        });
        
        // 点击弹窗外部关闭
        colorPickerModal.addEventListener('click', (e) => {
            if (e.target === colorPickerModal) {
                colorPickerModal.style.display = 'none';
            }
        });
        
        // 统一处理颜色更新
        const updateActiveColor = (newColor) => {
            this.currentColor = newColor;
            this.container.querySelector('#color-picker').value = this.currentColor;
            this.container.querySelector('#rgb-input').value = this.currentColor;
            
            if (this.activeColorBtn) {
                this.activeColorBtn.dataset.color = this.currentColor;
                this.activeColorBtn.style.backgroundColor = this.currentColor;
            }
            
            // 同步更新 colorPalette 数组以供缓存
            this.colorPalette = Array.from(this.container.querySelectorAll('.color-btn')).map(b => b.dataset.color);
            
            this.updateColorButtons();
            this.saveToCache();
        };

        // 颜色选择 (色块)
        this.container.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                updateActiveColor(swatch.dataset.color);
                console.log('Color swatch selected, currentColor:', this.currentColor);
                colorPickerModal.style.display = 'none';
            });
        });
        
        // 颜色选择器 (input type="color")
        this.container.querySelector('#color-picker').addEventListener('change', (e) => {
            console.log('Color picker changed, currentColor:', e.target.value);
            updateActiveColor(e.target.value);
        });
        
        // RGB 输入
        this.container.querySelector('#rgb-input').addEventListener('change', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                console.log('RGB input changed, currentColor:', color);
                updateActiveColor(color);
            }
        });
        
        // 工具选择
        this.container.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.tool = btn.dataset.tool;
                this.container.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // 清空按钮
        this.container.querySelector('#clear-btn').addEventListener('click', () => {
            confirmModal.style.display = 'flex';
        });
        
        // 取消清空
        confirmCancel.addEventListener('click', () => {
            confirmModal.style.display = 'none';
        });
        
        // 确认清空
        confirmOk.addEventListener('click', () => {
            this.clearCanvas();
            confirmModal.style.display = 'none';
        });
        
        // 点击弹窗外部关闭
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.style.display = 'none';
            }
        });
        
        // 像素点击
        this.container.addEventListener('click', (e) => {
            const pixel = e.target.closest('.pixel');
            if (pixel) {
                const index = parseInt(pixel.dataset.index);
                this.handlePixelClick(index);
                this.saveToCache();
            }
        });
        
        // 撤回
        this.container.querySelector('#undo-btn').addEventListener('click', () => {
            this.undo();
            this.saveToCache();
        });
        
        // 重做
        this.container.querySelector('#redo-btn').addEventListener('click', () => {
            this.redo();
            this.saveToCache();
        });
        
        // 导出
        this.container.querySelector('#export-btn').addEventListener('click', () => {
            this.export();
        });
        
        // 键盘快捷键
        this.keydownHandler = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                }
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }
    
    destroy() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
    }
    
    clearCanvas() {
        const oldPixels = [...this.pixels];
        const command = new ClearCanvasCommand(this, oldPixels);
        this.historyManager.execute(command);
        this.renderCanvas();
        this.updateUndoRedoButtons();
        this.saveToCache();
    }
    
    saveToCache() {
        // 保存到localStorage
        const cacheData = {
            pixels: this.pixels,
            canvasSize: this.canvasSize,
            currentColor: this.currentColor,
            tool: this.tool,
            colorPalette: this.colorPalette
        };
        localStorage.setItem('pixel-art-cache', JSON.stringify(cacheData));
    }
    
    loadFromCache() {
        // 从localStorage加载
        const cacheData = localStorage.getItem('pixel-art-cache');
        if (cacheData) {
            try {
                const data = JSON.parse(cacheData);
                if (data.pixels) this.pixels = data.pixels;
                if (data.canvasSize) this.canvasSize = data.canvasSize;
                if (data.currentColor) this.currentColor = data.currentColor;
                if (data.tool) this.tool = data.tool;
                if (data.colorPalette) this.colorPalette = data.colorPalette;
            } catch (e) {
                console.error('Failed to load from cache:', e);
            }
        }
    }
    
    handlePixelClick(index) {
        switch (this.tool) {
            case 'pen': {
                const oldColor = this.pixels[index];
                if (oldColor !== this.currentColor) {
                    const command = new DrawPixelCommand(this, index, oldColor, this.currentColor);
                    this.historyManager.execute(command);
                    this.renderCanvas();
                    this.updateUndoRedoButtons();
                    this.saveToCache();
                }
                break;
            }
            case 'eraser': {
                const oldColor = this.pixels[index];
                if (oldColor !== 'transparent') {
                    const command = new DrawPixelCommand(this, index, oldColor, 'transparent');
                    this.historyManager.execute(command);
                    this.renderCanvas();
                    this.updateUndoRedoButtons();
                    this.saveToCache();
                }
                break;
            }
            case 'eyedropper': {
                const pickedColor = this.pixels[index];
                if (pickedColor === 'transparent') break;
                this.currentColor = pickedColor;
                this.container.querySelector('#color-picker').value = this.currentColor;
                this.container.querySelector('#rgb-input').value = this.currentColor;
                
                if (this.activeColorBtn) {
                    this.activeColorBtn.dataset.color = this.currentColor;
                    this.activeColorBtn.style.backgroundColor = this.currentColor;
                }
                
                this.colorPalette = Array.from(this.container.querySelectorAll('.color-btn')).map(b => b.dataset.color);
                this.updateColorButtons();
                this.saveToCache();
                break;
            }
            case 'bucket': {
                const targetColor = this.pixels[index];
                if (targetColor !== this.currentColor) {
                    const changedPixels = this.floodFill(index, targetColor, this.currentColor);
                    if (changedPixels.length > 0) {
                        const command = new FillCommand(this, changedPixels);
                        this.historyManager.execute(command);
                        this.renderCanvas();
                        this.updateUndoRedoButtons();
                        this.saveToCache();
                    }
                }
                break;
            }
        }
    }
    
    floodFill(startIndex, targetColor, replacementColor) {
        if (targetColor === replacementColor) return [];
        
        const changedPixels = [];
        const queue = [startIndex];
        const visited = new Set();
        
        while (queue.length > 0) {
            const index = queue.shift();
            if (visited.has(index)) continue;
            
            visited.add(index);
            if (this.pixels[index] === targetColor) {
                changedPixels.push({
                    index,
                    oldColor: targetColor,
                    newColor: replacementColor
                });
                
                // 检查上下左右
                const x = index % this.canvasSize;
                const y = Math.floor(index / this.canvasSize);
                
                if (x > 0) queue.push(index - 1);
                if (x < this.canvasSize - 1) queue.push(index + 1);
                if (y > 0) queue.push(index - this.canvasSize);
                if (y < this.canvasSize - 1) queue.push(index + this.canvasSize);
            }
        }
        
        return changedPixels;
    }
    
    resizeCanvas(size) {
        this.canvasSize = size;
        this.pixels = Array(size * size).fill('transparent');
        this.historyManager.clear();
        this.renderCanvas();
        this.updateUndoRedoButtons();
    }
    
    undo() {
        this.historyManager.undo();
        this.renderCanvas();
        this.updateUndoRedoButtons();
        this.saveToCache();
    }
    
    redo() {
        this.historyManager.redo();
        this.renderCanvas();
        this.updateUndoRedoButtons();
        this.saveToCache();
    }
    
    export() {
        const targetSize = 512;
        const pixelSize = Math.floor(targetSize / this.canvasSize);
        const exportSize = pixelSize * this.canvasSize;

        const canvas = document.createElement('canvas');
        canvas.width = exportSize;
        canvas.height = exportSize;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        for (let i = 0; i < this.pixels.length; i++) {
            if (this.pixels[i] === 'transparent') continue;
            const x = (i % this.canvasSize) * pixelSize;
            const y = Math.floor(i / this.canvasSize) * pixelSize;

            ctx.fillStyle = this.pixels[i];
            ctx.fillRect(x, y, pixelSize, pixelSize);
        }
        
        // 创建下载链接
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pixel-art-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}

export function createPixelArtApp(container) {
    return new PixelArtApp(container);
}
