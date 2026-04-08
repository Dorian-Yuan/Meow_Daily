# 像素画板撤销与重做功能重构计划

## 当前问题分析

### 1. 现有实现的问题

**问题1：历史记录管理不够清晰**

* `history` 数组存储的是整个像素数组的深拷贝

* 每次操作都保存完整的像素状态，内存占用较大

* 没有区分"操作类型"，无法支持更精细的撤销控制

**问题2：撤销/重做按钮状态不直观**

* 按钮没有禁用状态提示

* 用户无法直观知道是否还能撤销/重做

**问题3：历史记录限制逻辑有问题**

* 当历史记录超过限制时，`historyIndex` 会递减，但索引0的状态可能被删除

* 初始状态（空白画布）应该始终保留

**问题4：批量操作不支持**

* 油漆桶填充等批量操作只保存一次状态，这是正确的

* 但未来如果要支持拖拽绘制，需要更灵活的状态管理

### 2. 需要改进的地方

1. **Command Pattern（命令模式）**：将每个操作封装为命令对象，支持撤销/重做
2. **状态快照优化**：使用更高效的差分存储或限制快照数量

## 重构方案

### 方案概述

采用 **Command Pattern（命令模式）** 重构撤销/重做功能：

1. 定义 `Command` 接口/基类
2. 每个操作（绘制、擦除、填充、清空）封装为一个 Command
3. Command 包含 `execute()` 和 `undo()` 方法
4. 历史记录管理器负责维护 Command 栈

### 详细设计

#### 1. Command 基类

```javascript
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
```

#### 2. 具体 Command 类

**绘制/擦除命令（单像素）**

```javascript
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
```

**填充命令（油漆桶）**

```javascript
class FillCommand extends PixelArtCommand {
    constructor(app, changedPixels) {
        super('fill');
        this.app = app;
        this.changedPixels = changedPixels; // [{index, oldColor, newColor}, ...]
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
```

**清空画布命令**

```javascript
class ClearCanvasCommand extends PixelArtCommand {
    constructor(app, oldPixels) {
        super('clear');
        this.app = app;
        this.oldPixels = oldPixels;
    }
    
    execute() {
        this.app.pixels.fill('#FFFFFF');
    }
    
    undo() {
        this.app.pixels = [...this.oldPixels];
    }
}
```

#### 3. 历史记录管理器

```javascript
class HistoryManager {
    constructor(limit = 50) {
        this.commands = [];
        this.currentIndex = -1;
        this.limit = limit;
    }
    
    execute(command) {
        // 清除当前位置之后的所有命令
        this.commands = this.commands.slice(0, this.currentIndex + 1);
        
        // 执行新命令
        command.execute();
        this.commands.push(command);
        this.currentIndex++;
        
        // 限制历史记录数量
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
```

### 实施步骤

#### 步骤1：创建 Command 类

在 `pixel_art.js` 中添加 Command 相关的类定义：

1. `PixelArtCommand` 基类
2. `DrawPixelCommand` 单像素绘制命令
3. `FillCommand` 填充命令
4. `ClearCanvasCommand` 清空命令

#### 步骤2：集成 HistoryManager

1. 在 `PixelArtApp` 构造函数中创建 `HistoryManager` 实例
2. 移除旧的 `history`、`historyIndex`、`historyLimit` 属性
3. 更新 `saveState()` 方法为使用 Command 模式

#### 步骤3：更新操作方法

修改以下方法以使用 Command 模式：

1. `handlePixelClick()` - 使用 `DrawPixelCommand`
2. `floodFill()` - 收集变更并创建 `FillCommand`
3. `clearCanvas()` - 使用 `ClearCanvasCommand`

#### 步骤4：更新撤销/重做方法

1. `undo()` - 调用 `HistoryManager.undo()`
2. `redo()` - 调用 `HistoryManager.redo()`

#### 步骤5：添加 UI 反馈

1. 更新按钮禁用状态
2. 添加键盘快捷键支持（Ctrl+Z / Ctrl+Y）

#### 步骤6：缓存集成

确保历史记录状态正确保存到 localStorage

### 代码变更预览

#### 修改构造函数

```javascript
constructor(container) {
    this.container = container;
    this.canvasSize = 10;
    this.pixels = Array(this.canvasSize * this.canvasSize).fill('#FFFFFF');
    this.currentColor = '#000000';
    this.tool = 'pen';
    this.colorPalette = [...CLASSIC_PALETTE.slice(0, 8)];
    
    // 使用 HistoryManager 替代旧的 history 数组
    this.historyManager = new HistoryManager(50);
    
    this.loadFromCache();
    this.init();
}
```

#### 修改 handlePixelClick

```javascript
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
            if (oldColor !== '#FFFFFF') {
                const command = new DrawPixelCommand(this, index, oldColor, '#FFFFFF');
                this.historyManager.execute(command);
                this.renderCanvas();
                this.updateUndoRedoButtons();
                this.saveToCache();
            }
            break;
        }
        // ... 其他工具
    }
}
```

#### 修改 floodFill

```javascript
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
```

#### 修改 clearCanvas

```javascript
clearCanvas() {
    const oldPixels = [...this.pixels];
    const command = new ClearCanvasCommand(this, oldPixels);
    this.historyManager.execute(command);
    this.renderCanvas();
    this.updateUndoRedoButtons();
    this.saveToCache();
}
```

#### 修改 undo/redo

```javascript
undo() {
    this.historyManager.undo();
    this.renderCanvas();
    this.updateUndoRedoButtons();
}

redo() {
    this.historyManager.redo();
    this.renderCanvas();
    this.updateUndoRedoButtons();
}
```

#### 添加按钮状态更新

```javascript
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
```

#### 添加键盘快捷键

```javascript
bindEvents() {
    // ... 现有代码
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                e.preventDefault();
                this.redo();
            }
        }
    });
}
```

## 测试计划

### 功能测试

1. **单像素绘制**

   * 绘制一个像素，撤销，重做

   * 验证像素状态正确恢复

2. **多像素绘制**

   * 绘制多个像素，多次撤销/重做

   * 验证历史记录顺序正确

3. **油漆桶填充**

   * 使用油漆桶填充，撤销，重做

   * 验证填充区域正确恢复

4. **清空画布**

   * 清空画布，撤销，重做

   * 验证画布正确恢复

5. **混合操作**

   * 绘制 → 填充 → 清空 → 绘制

   * 验证撤销/重做顺序正确

6. **历史记录限制**

   * 执行超过限制的操作次数

   * 验证最早的记录被正确移除

### UI 测试

1. **按钮状态**

   * 初始状态：撤销按钮禁用

   * 操作后：撤销按钮启用

   * 撤销后：重做按钮启用

   * 全部撤销后：撤销按钮禁用

### 性能测试

1. **大画布测试**

   * 32x32 画布，大量操作

   * 验证性能无明显下降

## 风险评估

1. **兼容性风险**：Command 模式引入新的类结构，需要确保与其他功能兼容
2. **性能风险**：频繁创建 Command 对象可能影响性能（可通过对象池优化）
3. **存储风险**：历史记录不再直接存储像素数组，需要确保缓存功能正常

## 回滚方案

如果重构出现问题，可以：

1. 恢复原始的 `history` 数组实现
2. 保留 Command 模式但简化实现
3. 仅添加 UI 反馈和键盘快捷键

## 时间估计

* 设计 Command 类：15分钟

* 实现 HistoryManager：20分钟

* 修改现有方法：20分钟

* 添加 UI 反馈：10分钟

* 添加键盘快捷键：10分钟

* 测试验证：25分钟

总计：约100分钟
