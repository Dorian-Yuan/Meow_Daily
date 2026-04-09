# 像素画板导出图片有缝隙 - 修复计划

## 问题分析

像素画板的 `export()` 方法（[pixel_art.js:609-637](file:///d:/Sync/Project_yyh/VibeCoding_prj/Meow_Daily/js/modules/games/pixel_art.js#L609-L637)）在导出 PNG 图片时会出现缝隙（seams）。

**根本原因：亚像素渲染（Subpixel Rendering）**

```javascript
const exportSize = 512;
const pixelSize = exportSize / this.canvasSize;  // 可能是浮点数！
```

当 `canvasSize` 不能整除 512 时，`pixelSize` 为浮点数：

| canvasSize | pixelSize | 是否整数 |
|---|---|---|
| 8 | 64 | ✅ |
| 10 | 51.2 | ❌ 产生缝隙 |
| 12 | 42.666... | ❌ 产生缝隙 |
| 16 | 32 | ✅ |

浮点数的 `pixelSize` 导致 `ctx.fillRect(x, y, pixelSize, pixelSize)` 触发亚像素渲染，相邻像素之间出现半透明缝隙，导出的 PNG 中可见细线伪影。

## 修复方案

修改 `export()` 方法，确保每个像素的坐标和尺寸都是整数：

1. **计算整数 pixelSize**：`pixelSize = Math.floor(512 / canvasSize)`
2. **反算实际导出尺寸**：`actualExportSize = pixelSize * canvasSize`（确保画布恰好被完整填充）
3. **设置 `ctx.imageSmoothingEnabled = false`**：像素画应禁用抗锯齿
4. **使用整数坐标绘制**：`Math.floor` 确保无亚像素偏移

### 修改后的代码

```javascript
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
        const x = (i % this.canvasSize) * pixelSize;
        const y = Math.floor(i / this.canvasSize) * pixelSize;

        ctx.fillStyle = this.pixels[i];
        ctx.fillRect(x, y, pixelSize, pixelSize);
    }

    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixel-art-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
}
```

### 修改前后对比

| canvasSize | 修改前 exportSize | 修改前 pixelSize | 修改后 exportSize | 修改后 pixelSize |
|---|---|---|---|---|
| 8 | 512 | 64 | 512 | 64 |
| 10 | 512 | 51.2 ❌ | 510 | 51 ✅ |
| 12 | 512 | 42.67 ❌ | 504 | 42 ✅ |
| 16 | 512 | 32 | 512 | 32 |

## 修改文件

- [pixel_art.js](file:///d:/Sync/Project_yyh/VibeCoding_prj/Meow_Daily/js/modules/games/pixel_art.js) — 仅修改 `export()` 方法（第 609-637 行）
