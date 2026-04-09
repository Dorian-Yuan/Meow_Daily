# 重构像素画板中心线实现方案

## 问题

当前使用 SVG 叠加层 + `getBoundingClientRect()` 计算中心线位置，存在以下问题：
1. 手动计算的坐标与 CSS Grid 实际布局无法精确对齐
2. `requestAnimationFrame` 时序不可靠，DOM 可能尚未完成布局
3. 边框、padding、gap 的交互使计算复杂且脆弱

## 新方案：用 `box-shadow` 覆盖间隙

**核心思路**：不用 SVG 叠加层，而是用 CSS `box-shadow` 直接在特定像素元素上绘制阴影，覆盖其相邻的 gap 间隙。

- 中心垂直线：给 `x === midIndex` 的像素添加 `box-shadow: -1px 0 0 0 var(--color-text-hint)`（向左 1px 阴影覆盖左侧 gap）
- 中心水平线：给 `y === midIndex` 的像素添加 `box-shadow: 0 -1px 0 0 var(--color-text-hint)`（向上 1px 阴影覆盖上方 gap）
- 交叉点像素同时有两个阴影，用逗号合并

**优势**：
- 纯 CSS 方案，与 Grid 布局天然对齐，无需手动计算坐标
- 无时序问题，不需要 `requestAnimationFrame`
- `box-shadow` 不影响布局，不改变像素大小
- 代码大幅简化

## 修改步骤

### 1. 删除 `renderGridOverlay()` 方法（pixel_art.js 第 318-350 行）
整个方法删除，不再需要 SVG 叠加层。

### 2. 修改 `renderCanvas()` 方法（pixel_art.js 第 296-316 行）
- 移除 `renderGridOverlay()` 调用
- 移除无用的 `.pixel-center-line` 和 `.pixel-border-line` CSS 类
- 改用内联 `box-shadow` 样式绘制中心线

新逻辑：
```javascript
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
                
                const shadows = [];
                if (x === midIndex) shadows.push('-1px 0 0 0 var(--color-text-hint)');
                if (y === midIndex) shadows.push('0 -1px 0 0 var(--color-text-hint)');
                const shadowStyle = shadows.length > 0 ? `box-shadow: ${shadows.join(', ')};` : '';
                const bgStyle = !isTransparent ? `background-color: ${color};` : '';
                const style = (bgStyle || shadowStyle) ? `style="${bgStyle}${shadowStyle}"` : '';
                
                return `<div class="${classes.join(' ')}" data-index="${index}" ${style}></div>`;
            }).join('')}
        </div>
    `;
}
```

### 3. 删除 CSS 中 `.pixel-grid-overlay` 样式（components.css 第 1124-1132 行）
不再需要叠加层样式。

### 4. 更新版本号 db.json
`3.1.6` → `3.1.7`
