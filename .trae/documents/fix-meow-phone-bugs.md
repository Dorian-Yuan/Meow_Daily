# Bug 修复计划

## Bug 1：设置页展开箭头不一致

**问题**：Meow Phone 设置中，猫抓老鼠、像素画板、毛线球使用 `›`（右尖括号）作为展开箭头，而猫咪翻牌、打地鼠、喵喵琴使用 `▼`（向下三角形），视觉不一致。

**根因**：

* 猫抓老鼠（第334行）、像素画板（第361行）、毛线球（第389行）使用 `<span class="settings-arrow">›</span>`

* 猫咪翻牌（第449行）、打地鼠（第498行）、喵喵琴（第526行）使用 `<span class="settings-arrow">▼</span>`

**修复**：将猫咪翻牌、打地鼠、喵喵琴的 `▼` 统一改为 `›`，与猫抓老鼠等保持一致。同时，猫咪翻牌的标题标签从 `<div>` 改为 `<h3>`，与其他区块保持一致；移除重复的 `class="settings-open"` 属性。

**修改文件**：`js/modules/meow_phone.js`

* 第447-450行：猫咪翻牌标题，`▼` → `›`，`<div>` → `<h3>`，移除重复 class

* 第498行：打地鼠，`▼` → `›`

* 第526行：喵喵琴，`▼` → `›`

***

## Bug 2：猫咪翻牌和打地鼠不应在游戏内再选难度

**问题**：猫咪翻牌和打地鼠的难度已在 Meow Phone 设置页中配置，但点开游戏后还会出现一个难度选择开始页面，体验冗余。

**修复**：移除游戏内的难度选择开始页面，直接使用设置中的难度启动游戏。

**修改文件**：

1. `js/modules/games/cat_memory.js`

   * 移除 `showStartScreen()` 函数（第183-210行）

   * 将第239行的 `showStartScreen()` 调用改为直接调用 `restart()`（使用 `defaultDiff` 作为初始难度，已在第18行赋值给 `currentDiff`）

2. `js/modules/games/whack_mouse.js`

   * 移除 `showStartScreen()` 函数（第277-305行）

   * 将第307行的 `showStartScreen()` 调用改为直接调用 `startGame()`

***

## Bug 3：猫咪占卜按钮样式不一致

**问题**："换签文"按钮使用 `fortune-btn-secondary` 样式（描边、较小），"重新求签"按钮使用 `fortune-btn` 样式（实心、较大），两者形状、宽度、高度不一致。

**当前样式对比**：

* `fortune-btn`：`padding: 12px 28px`, `border-radius: 20px`, `font-size: 15px`, `font-weight: 800`, 实心背景

* `fortune-btn-secondary`：`padding: 10px 20px`, `border-radius: 20px`, `font-size: 14px`, `font-weight: 700`, 描边透明背景

**修复**：按照"重新求签"按钮（`fortune-btn`）的样式统一"换签文"按钮。

**修改文件**：

1. `js/modules/games/cat_fortune.js` 第144行：将 `reRollBtn.className = 'fortune-btn-secondary'` 改为 `reRollBtn.className = 'fortune-btn'`
2. `css/components.css`：可保留 `fortune-btn-secondary` 样式定义（无副作用），或删除以保持代码整洁

***

## Bug 4：版本号统一管理

**问题**：版本号在 `store.js` 中硬编码为 `VERSION = "3.2.7"`，`db.json` 中也有 `"version": "3.2.7"`。用户要求版本号只在 `db.json` 中维护，其他地方从 `db.json` 读取。

**当前版本号位置**：

* `store.js:13` — `export const VERSION = "3.2.7"` （硬编码常量）

* `db.json:281` — `"version": "3.2.7"`

* `store.js:68` — `version: VERSION` （DEFAULT\_DB 使用常量）

* `app.js:11` — `db.settings?.version || VERSION`

* `ui.js:177` — `db.settings?.version || VERSION`

* `ui.js:897` — `db.settings?.version || VERSION`

* `meow_phone.js:557` — `getDB().settings.version || VERSION`

**修复方案**：

1. `db.json`：版本号从 `"3.2.7"` 改为 `"3.2.8"`（+0.0.1）
2. `store.js`：移除 `VERSION` 常量的硬编码值，改为从 `db.json` 获取。具体做法：

   * 将 `VERSION` 改为 `let VERSION = "3.2.8"` 作为初始默认值

   * 在 `initStore()` 中从 `cloudData.settings.version` 更新 `VERSION` 变量

   * 保持 `VERSION` 的 export 不变，确保其他文件的 import 不受影响
3. `app.js`、`ui.js`、`meow_phone.js`：这些文件已经使用 `db.settings?.version || VERSION` 的模式，无需修改

**修改文件**：

1. `db.json` 第281行：`"version": "3.2.7"` → `"version": "3.2.8"`
2. `store.js` 第13行：`export const VERSION = "3.2.7"` → `export let VERSION = "3.2.8"`
3. `store.js` `initStore()` 中：在成功获取 `cloudData` 后，添加 `VERSION = cloudData.settings.version` 以同步版本号

***

## 修改文件汇总

| 文件                                | 修改内容                                           |
| --------------------------------- | ---------------------------------------------- |
| `js/modules/meow_phone.js`        | Bug1: 统一箭头符号 `▼`→`›`，修复标题标签和重复class            |
| `js/modules/games/cat_memory.js`  | Bug2: 移除游戏内难度选择页面，直接开始游戏                       |
| `js/modules/games/whack_mouse.js` | Bug2: 移除游戏内难度选择页面，直接开始游戏                       |
| `js/modules/games/cat_fortune.js` | Bug3: 换签文按钮样式统一为 fortune-btn                   |
| `js/store.js`                     | Bug4: VERSION 改为 let，initStore 中同步 db.json 版本号 |
| `db.json`                         | Bug4: 版本号 3.2.7 → 3.2.8                        |

