# 毛线球 spawnFish 算法修复计划

## 问题
当前 `spawnFish` 函数中存在**双重触发**bug：
- 鱼自然消失后：先触发 800ms 延迟的 `spawnFish()`，又立即触发 `spawnFish()` → 导致鱼数量翻倍增长
- 收集鱼后：没有触发新鱼生成
- `showResult` 中引用了不存在的 `fishSpawnInterval` 变量 → 运行时报错

## 3.2.1 原始算法（用户要求恢复）
```
鱼自然消失 → 立即 spawnFish()
收集鱼 → 500ms 后 spawnFish()
无 MAX_FISH 限制
```

## 修改方案
1. **yarn_ball.js**：恢复 3.2.1 原始 spawnFish 算法
   - 鱼自然消失后：立即 `spawnFish()`
   - 收集鱼后：500ms 后 `spawnFish()`
   - 添加 `maxFish` 参数（从 prefs 读取，默认 100），在 `spawnFish` 开头检查 `fishes.length >= maxFish` 则 return
   - 删除不存在的 `fishSpawnInterval` 引用
   - 将 `MAX_FISH` 常量改为从 `prefs.maxFish` 读取

2. **meow_phone.js 设置页面**：毛线球设置区块添加「最大鱼数」配置
   - 使用数字输入框，范围 10-200，默认 100
   - 保存时写入 `game_prefs.yarn_ball.maxFish`

3. **store.js**：`yarn_ball` 默认配置添加 `maxFish: 100`

4. **版本号**：3.2.3 → 3.2.4（store.js + db.json）

## 具体代码修改

### yarn_ball.js spawnFish 函数
恢复为：
```js
function spawnFish() {
    if (!gameRunning) return;
    if (fishes.filter(f => f.alive).length >= maxFish) return;
    // ... 生成鱼的代码不变 ...
    const lifetime = Math.max(2000, 4000 - elapsed * 50);
    setTimeout(() => {
        if (fish.alive) {
            fish.alive = false;
            fish.el.remove();
            fishes = fishes.filter(f => f !== fish);
        }
        if (gameRunning) spawnFish();  // 鱼消失后立即生成新鱼
    }, lifetime);
}
```

### yarn_ball.js checkCollision 函数
恢复收集后触发：
```js
fishes = fishes.filter(f => f !== fish);
if (gameRunning) {
    setTimeout(() => { if (gameRunning) spawnFish(); }, 500);
}
```

### yarn_ball.js showResult 函数
删除 `fishSpawnInterval` 引用（该变量不存在）

### 设置页面
毛线球折叠区块中添加：
```html
<div class="settings-group">
    <label class="settings-label">最大鱼数</label>
    <div class="settings-radio-group">
        <label class="settings-radio ..."><input type="radio" name="yarnMaxFish" value="50">50</label>
        <label class="settings-radio ..."><input type="radio" name="yarnMaxFish" value="100">100</label>
        <label class="settings-radio ..."><input type="radio" name="yarnMaxFish" value="200">200</label>
    </div>
</div>
```
