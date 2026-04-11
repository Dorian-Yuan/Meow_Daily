# Meow Phone 新应用集成计划（5个应用）

## 概述

新增 **5 个 mini-app**，版本号升级至 **3.3.0**，严格统一 UI 风格。

---

## 新增应用清单

### 1. 🔢 喵喵合并（2048）

| 属性 | 值 |
|------|------|
| id | `cat_2048` |
| name | 喵喵合并 |
| icon | 🔢 |
| description | 数字合并挑战 |
| 文件 | `js/modules/games/cat_2048.js` |
| 设置项 | 网格大小（4×4 经典 / 5×4 挑战） |

**核心玩法**：经典 2048 滑动合并，猫咪 emoji 替代数字
- 2→🐱, 4→😺, 8→😻, 16→😼, 32→🐾, 64→🐟, 128→🧶, 256→🐭, 512→🐈, 1024→👑, 2048→🌟

**功能**：
- 触摸滑动 + 键盘方向键
- 分数 + 最高分（localStorage）
- 合并动画（CSS transition + scale）
- 游戏结束检测 + 重新开始
- emoji 显示 + 对应数字（小字）

### 2. 🔮 喵喵序列（Simon Says）

| 属性 | 值 |
|------|------|
| id | `cat_simon` |
| name | 喵喵序列 |
| icon | 🔮 |
| description | 记忆序列挑战 |
| 文件 | `js/modules/games/cat_simon.js` |
| 设置项 | 按键数（4键普通 / 6键困难） |

**核心玩法**：观看猫咪序列 → 记忆 → 重复，每轮加长

**功能**：
- 4/6 个猫咪按钮（😸😺😻😼 / +🙀😾），独特颜色
- Web Audio API 猫叫声（不同频率）
- 序列播放速度随关卡递增
- 关卡数 + 最高纪录（localStorage）

### 3. ⚡ 猫猫反应力

| 属性 | 值 |
|------|------|
| id | `cat_reaction` |
| name | 猫猫反应力 |
| icon | ⚡ |
| description | 反应速度测试 |
| 文件 | `js/modules/games/cat_reaction.js` |
| 设置项 | 测试轮数（5轮 / 10轮） |

**核心玩法**：等待 → 出现🐭 → 尽快点击 → 记录反应时间

**功能**：
- 5/10 轮测试，随机等待 1-4 秒
- 误触检测（"太早了！"）
- 结果：平均/最快/最慢 + 评级
- 最佳成绩（localStorage）

### 4. 🎰 猫猫老虎机

| 属性 | 值 |
|------|------|
| id | `cat_slot` |
| name | 猫猫老虎机 |
| icon | 🎰 |
| description | 猫咪运气挑战 |
| 文件 | `js/modules/games/cat_slot.js` |
| 设置项 | 无（纯休闲） |

**核心玩法**：3 轮老虎机，猫咪 emoji 符号，拉杆旋转

**功能**：
- 符号：🐱🐟🧶🐭🐾😻 6 种
- 3 个转轮，CSS 动画滚动
- 点击/拉杆旋转
- 三连/两连判定 + 得分
- 小鱼干积分系统（初始 100🥫）
- 中奖动画（猫咪庆祝特效 + 闪光）

### 5. 🐱 猫咪百科

| 属性 | 值 |
|------|------|
| id | `cat_facts` |
| name | 猫咪百科 |
| icon | 🐱 |
| description | 猫咪冷知识 |
| 文件 | `js/modules/games/cat_facts.js` |
| 设置项 | 无 |

**核心玩法**：随机猫咪冷知识 + ASCII 猫颜文字生成器，二合一

**功能**：
- **猫知识**：调用 catfact.ninja API 获取随机猫知识（中文翻译预设 + 英文原文）
- 离线降级：预设 20 条中文猫咪冷知识，API 不可用时使用
- **猫颜文字**：随机生成 ASCII 猫表情（=^.^=、(=^･ω･^=) 等 30+ 种）
- 一键复制到剪贴板
- 收藏功能（localStorage）
- 每次打开自动刷新一条新知识

---

## 修改文件清单

### 新建文件（5个）

| 文件 | 内容 |
|------|------|
| `js/modules/games/cat_2048.js` | 喵喵合并 |
| `js/modules/games/cat_simon.js` | 喵喵序列 |
| `js/modules/games/cat_reaction.js` | 猫猫反应力 |
| `js/modules/games/cat_slot.js` | 猫猫老虎机 |
| `js/modules/games/cat_facts.js` | 猫咪百科 |

### 修改文件（4个）

| 文件 | 修改内容 |
|------|----------|
| `js/modules/meow_phone.js` | ① import 5 个新模块 ② APP_REGISTRY 添加 5 个条目 ③ 添加 5 个 launch 函数 ④ launchSettings 添加设置区块 ⑤ 设置保存逻辑 ⑥ "8款" → "13款" |
| `css/components.css` | 添加 5 个游戏的样式 |
| `js/store.js` | VERSION → "3.3.0"，DEFAULT_DB.game_prefs 添加配置 |
| `db.json` | version → "3.3.0"，game_prefs 添加配置 |

---

## 实施步骤

### Step 1: 创建 cat_2048.js
- 导出 `createCat2048App(container, options)`，options: `{ size: 4 | 5 }`
- 二维数组存储网格状态
- 触摸滑动检测 + 键盘方向键
- emoji 映射 + 数字小字显示
- 分数/最高分 localStorage
- 返回 `{ destroy() }`

### Step 2: 创建 cat_simon.js
- 导出 `createCatSimonApp(container, options)`，options: `{ keys: 4 | 6 }`
- 猫咪按钮数组，每个有 emoji/颜色/频率
- 序列播放 + 玩家输入比对
- Web Audio API 音效
- 返回 `{ destroy() }`

### Step 3: 创建 cat_reaction.js
- 导出 `createCatReactionApp(container, options)`，options: `{ rounds: 5 | 10 }`
- 状态机：idle → waiting → ready → clicked → result
- 随机等待 + 反应计时 + 误触检测
- 结果统计 + 评级
- 返回 `{ destroy() }`

### Step 4: 创建 cat_slot.js
- 导出 `createCatSlotApp(container)` 
- 3 个转轮，CSS transform 滚动动画
- 符号数组随机选取
- 三连/两连判定逻辑
- 小鱼干积分（初始 100）
- 中奖特效动画
- 返回 `{ destroy() }`

### Step 5: 创建 cat_facts.js
- 导出 `createCatFactsApp(container)`
- 猫知识区：fetch catfact.ninja + 离线降级预设
- ASCII 猫颜文字区：30+ 种预设，随机生成
- 一键复制（navigator.clipboard）
- 收藏功能（localStorage）
- 返回 `{ destroy() }`

### Step 6: 修改 meow_phone.js
1. 顶部添加 5 个 import
2. APP_REGISTRY 添加 5 个条目
3. 添加 5 个 launch 函数
4. launchSettings 添加 3 个设置区块（2048/序列/反应力）
5. 设置保存逻辑添加对应 prefs
6. "8款小应用" → "13款小应用"

### Step 7: 修改 components.css
添加 5 个游戏的完整样式，统一使用 CSS 变量

### Step 8: 修改 store.js + db.json
- VERSION → "3.3.0"
- game_prefs 添加：cat_2048/cat_simon/cat_reaction 的默认配置
- db.json 同步更新

---

## UI 风格统一规范

| 规范项 | 值 |
|--------|------|
| 容器 | `flex:1; display:flex; flex-direction:column; height:100%; overflow:hidden` |
| 背景 | `var(--color-bg)` |
| 卡片 | `var(--color-card-bg)` + `var(--radius-16~20)` + `var(--shadow-sm)` |
| 主色 | `var(--color-primary)` |
| 文字 | title/main/hint 三级 |
| 按钮 | 与 `memory-btn` / `fortune-btn` 风格一致 |
| 信息栏 | 与 `memory-info` / `whack-info` 风格一致 |
| 结果页 | 与 `memory-result` / `whack-result` 风格一致 |
