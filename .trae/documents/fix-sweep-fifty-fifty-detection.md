# 修复猫抓老鼠"多解法(50/50)检测"不触发 Bug

## 问题描述

猫抓老鼠游戏中，当场上剩余未翻卡片处于 50/50 多解法状态（多种有效地雷配置，且没有任何一个未翻方块在所有配置中始终安全），应将底部按钮文本从 `🔄 重新开始` 改为 `🔄 重新开始：已通过`，但该功能始终未生效。

## 根因分析

### 核心 Bug：`coveredNeighbors` 包含已插旗格子，导致提前返回

`getSafeMove()` 函数（[cat_sweep.js:324-435](file:///d:/Sync/Project_yyh/VibeCoding_prj/Meow_Daily/js/modules/games/cat_sweep.js#L324-L435)）的三层推理中，`coveredNeighbors` 的计算方式为：

```javascript
const coveredNeighbors = neighbors.filter(n => !board[n.r][n.c].revealed);
```

这会包含**已插旗的格子**。然而 `remainingMines` 的计算已经减去了插旗数：

```javascript
const remainingMines = cell.adjacentMice - flaggedNeighbors.length;
```

这导致两个致命问题：

#### 问题 1：「All Safe」规则误触发（最关键）

```javascript
if (remainingMines === 0 && coveredNeighbors.length > 0) {
    return coveredNeighbors[0]; // 提前返回！
}
```

**场景复现**：当一个已揭示数字格周围的所有地雷都已被正确插旗时：
- `remainingMines = 0`（所有地雷已标记）
- `coveredNeighbors` 包含已插旗格子 → `coveredNeighbors.length > 0`
- 条件成立 → **提前返回一个已插旗格子**
- 后续的子集逻辑和多解法检测**被完全跳过**

在典型的 50/50 局面中，玩家通常已正确插旗了已知地雷，因此必然存在这样的已揭示格子，导致函数永远无法到达第 405 行的多解法检测代码。

#### 问题 2：「All Mines」规则比较对象错误

```javascript
if (remainingMines === coveredNeighbors.length && remainingMines > 0) {
    return null; // 提前返回！
}
```

`remainingMines` 是**未插旗覆盖邻居中的地雷数**，而 `coveredNeighbors.length` 是**所有覆盖邻居数（含已插旗）**。两者语义不匹配，可能导致误判。

#### 问题 3：子集逻辑同样受影响

子集逻辑（第 360-402 行）中的 `coveredNeighbors1` 和 `coveredNeighbors2` 也包含已插旗格子，导致：
- 子集判断可能错误（已插旗格子不应参与子集比较）
- `extraCells` 可能包含已插旗格子
- `mineDiff` 计算可能不准确

### 次要 Bug：重新开始时按钮文本未重置

[meow_phone.js:299-310](file:///d:/Sync/Project_yyh/VibeCoding_prj/Meow_Daily/js/modules/meow_phone.js#L299-L310) 中，点击重新开始按钮时未将按钮文本恢复为 `🔄 重新开始`。

### 增强建议：插旗后也应检测多解法

当前 `getSafeMove()` 仅在双击翻开后调用（[cat_sweep.js:209,229](file:///d:/Sync/Project_yyh/VibeCoding_prj/Meow_Daily/js/modules/games/cat_sweep.js#L209)），单击插旗后不调用。插旗改变了约束条件，可能产生新的安全走法或多解法局面。

## 修复方案

### 步骤 1：修复基础约束传播中的 `coveredNeighbors`（cat_sweep.js 第 337-357 行）

将 `coveredNeighbors` 改为只包含**未插旗**的覆盖格子：

```javascript
// 修改前
const coveredNeighbors = neighbors.filter(n => !board[n.r][n.c].revealed);

// 修改后
const coveredNeighbors = neighbors.filter(n => !board[n.r][n.c].revealed && !board[n.r][n.c].flagged);
```

同时修改「All Mines」规则的比较对象：

```javascript
// 修改前
if (remainingMines === coveredNeighbors.length && remainingMines > 0) {

// 修改后（coveredNeighbors 已不含插旗格子，语义一致）
if (remainingMines === coveredNeighbors.length && remainingMines > 0) {
```

修改后 `remainingMines` 和 `coveredNeighbors.length` 语义一致（都是针对未插旗覆盖邻居），比较正确。

### 步骤 2：修复子集逻辑中的 `coveredNeighbors`（cat_sweep.js 第 360-402 行）

同样将 `coveredNeighbors1` 和 `coveredNeighbors2` 改为只包含未插旗的覆盖格子：

```javascript
// 修改前
const coveredNeighbors1 = neighbors1.filter(n => !board[n.r][n.c].revealed);
const coveredNeighbors2 = neighbors2.filter(n => !board[n.r][n.c].revealed);

// 修改后
const coveredNeighbors1 = neighbors1.filter(n => !board[n.r][n.c].revealed && !board[n.r][n.c].flagged);
const coveredNeighbors2 = neighbors2.filter(n => !board[n.r][n.c].revealed && !board[n.r][n.c].flagged);
```

### 步骤 3：插旗后调用 `getSafeMove()`（cat_sweep.js `handleSingleClick` 函数）

在 `handleSingleClick` 末尾添加 `getSafeMove()` 调用：

```javascript
function handleSingleClick(r, c) {
    if (gameOver) return;
    const cell = board[r][c];
    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
    flagCount += cell.flagged ? 1 : -1;
    if (options.onFlagChange) options.onFlagChange(flagCount, mice);
    renderBoard();
    if (!gameOver) getSafeMove();  // 新增
}
```

### 步骤 4：重新开始时重置按钮文本（meow_phone.js 第 299-310 行）

在重新开始按钮的点击事件中添加按钮文本重置：

```javascript
phoneOverlay.querySelector('#sweep-restart').addEventListener('click', () => {
    resultEl.style.display = 'none';
    game.reset();
    timerEl.textContent = '00:00';
    // 新增：重置按钮文本
    phoneOverlay.querySelector('#sweep-restart').textContent = '🔄 重新开始';
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const time = game.getElapsedTime();
        timerEl.textContent = formatTime(time);
    }, 1000);
});
```

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `js/modules/games/cat_sweep.js` | 修复 `coveredNeighbors` 过滤逻辑（3处）、插旗后调用 `getSafeMove()` |
| `js/modules/meow_phone.js` | 重新开始时重置按钮文本 |

## 验证方法

1. 启动猫抓老鼠游戏（简单难度）
2. 正常游戏直到出现 50/50 局面（剩余 2 个未知格子，无法通过逻辑判断）
3. 验证：游戏应自动完成，按钮文本应变为 `🔄 重新开始：已通过`
4. 点击重新开始，验证按钮文本恢复为 `🔄 重新开始`
5. 再次游戏验证功能正常
