/**
 * pixel_art.js - 像素画板应用
 * 
 * 功能：简单的像素画板，支持多种画布尺寸、颜色选择和导出功能
 */

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
        this.pixels = Array(this.canvasSize * this.canvasSize).fill('#FFFFFF');
        this.currentColor = '#000000';
        this.tool = 'pen'; // pen, eraser, eyedropper, bucket
        this.history = [];
        this.historyIndex = -1;
        this.historyLimit = 20; // 历史记录上限
        this.colorPalette = [...CLASSIC_PALETTE.slice(0, 8)]; // 默认颜色槽位
        
        // 加载缓存数据
        this.loadFromCache();
        
        // 初始化历史记录，将当前状态作为初始状态
        this.history = [[...this.pixels]];
        this.historyIndex = 0;
        
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
        canvasContainer.innerHTML = `
            <div class="pixel-art-canvas" style="grid-template-columns: repeat(${this.canvasSize}, 1fr);">
                ${this.pixels.map((color, index) => `
                    <div class="pixel" data-index="${index}" style="background-color: ${color}"></div>
                `).join('')}
            </div>
        `;
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
    }
    
    clearCanvas() {
        this.pixels = Array(this.canvasSize * this.canvasSize).fill('#FFFFFF');
        this.saveState();
        this.renderCanvas();
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
        let stateChanged = false;
        
        switch (this.tool) {
            case 'pen':
                if (this.pixels[index] !== this.currentColor) {
                    this.pixels[index] = this.currentColor;
                    stateChanged = true;
                }
                break;
            case 'eraser':
                if (this.pixels[index] !== '#FFFFFF') {
                    this.pixels[index] = '#FFFFFF';
                    stateChanged = true;
                }
                break;
            case 'eyedropper':
                this.currentColor = this.pixels[index];
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
            case 'bucket':
                if (this.pixels[index] !== this.currentColor) {
                    // 为油漆桶操作创建一个新的数组副本，避免修改历史记录中的数据（现在我们在操作后保存，所以原数组也会被覆盖，但保证 floodFill 逻辑干净）
                    const newPixels = [...this.pixels];
                    this.floodFill(index, this.pixels[index], this.currentColor, newPixels);
                    this.pixels = newPixels;
                    stateChanged = true;
                }
                break;
        }
        
        if (stateChanged) {
            this.saveState();
            this.renderCanvas();
        }
    }
    
    floodFill(startIndex, targetColor, replacementColor, pixels) {
        if (targetColor === replacementColor) return;
        
        const queue = [startIndex];
        const visited = new Set();
        
        while (queue.length > 0) {
            const index = queue.shift();
            if (visited.has(index)) continue;
            
            visited.add(index);
            if (pixels[index] === targetColor) {
                pixels[index] = replacementColor;
                
                // 检查上下左右
                const x = index % this.canvasSize;
                const y = Math.floor(index / this.canvasSize);
                
                if (x > 0) queue.push(index - 1); // 左
                if (x < this.canvasSize - 1) queue.push(index + 1); // 右
                if (y > 0) queue.push(index - this.canvasSize); // 上
                if (y < this.canvasSize - 1) queue.push(index + this.canvasSize); // 下
            }
        }
    }
    
    resizeCanvas(size) {
        this.canvasSize = size;
        this.pixels = Array(size * size).fill('#FFFFFF');
        this.saveState();
        this.renderCanvas();
    }
    
    saveState() {
        // 保存当前状态到历史记录 (修改发生后调用)
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push([...this.pixels]);
        
        // 限制历史记录长度
        if (this.history.length > this.historyLimit) {
            this.history.shift();
            // 当移除最早的记录时，需要更新历史记录索引
            this.historyIndex--;
        }
        
        this.historyIndex = this.history.length - 1;
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.pixels = [...this.history[this.historyIndex]];
            this.renderCanvas();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.pixels = [...this.history[this.historyIndex]];
            this.renderCanvas();
        }
    }
    
    export() {
        // 创建一个临时画布用于导出
        const exportSize = 512; // 默认导出大小
        const pixelSize = exportSize / this.canvasSize;
        
        const canvas = document.createElement('canvas');
        canvas.width = exportSize;
        canvas.height = exportSize;
        const ctx = canvas.getContext('2d');
        
        // 绘制像素
        for (let i = 0; i < this.pixels.length; i++) {
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
