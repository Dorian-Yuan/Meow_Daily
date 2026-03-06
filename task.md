# Meow_Daily 项目开发进度

- [x] 创建核心行为准则 `MEMORANDUM.md`

## Phase 1: 底层架构与 AI 基础环境搭建
- [x] 创建 `meow_daily` 目录结构与基础文件系统
- [x] 初始化 `variables.css` (8pt 网格与色彩系统)
- [x] 配置 `manifest.json` 与 PWA 基础
- [ ] 在 GitHub Secrets 配置 `BARK_KEY` 和 `CHATANYWHERE_API_KEY` (需手动)
- [ ] 编写 `.github/workflows/daily_reminder.yml` (测试 AI 解析与 Bark 推送)

## Phase 2: 核心前端与 UI 规范落地
- [x] 更新图标引用为 `meow-ip.png` (主角：岁岁)
- [x] 编写 `css/main.css` (实现流式布局与圆角卡片)
- [x] 编写 `css/components.css` (按钮、输入框、Tabbar 样式)
- [x] 实现 `index.html` 的头部 Banner 与 岁岁 IP 展示
- [x] 编写 `sw.js` (实现 Service Worker 离线缓存)

## Phase 3: 本地 CRUD 与云端同步闭环
- [x] 开发 `js/store.js` (基于 LocalStorage 的数据暂存管理)
- [x] 开发 `js/api/github.js` (封装 GitHub REST API: 获取 SHA、PUT 提交)
- [x] 实现鉴权弹窗 (输入 PAT 和 API Key 并加密保存)
- [x] 实现记录的增删改查 UI 逻辑 (首页快捷入口 + 录入抽屉)
- [x] 开发「记录」页按月聚合列表与删除功能
- [ ] 开发「记录」页按月聚合列表与删除功能 (已完成)

## Phase 4: AI 智能录入增强 (前端侧)
- [x] 开发 `js/api/ai.js` (封装 ChatAnywhere API 调用)
- [x] 实现“一句话智能记事”悬浮窗口与解析确认流程
- [ ] 实现 AI 返回数据的结构化展示与“确认同步”流程 (已在确认中包含)
- [ ] 完善 AI 解析确认 UI 逻辑 (已完成)

## Phase 5: AI 智能化定时推送与周报 (后端侧)
- [x] 完善定时任务脚本 (读取 db.json 触发提醒)
- [x] 实现 AI 生成“宠物视角”催促文案逻辑
- [ ] 开发每周报告生成逻辑 (提取 7 天数据总结开销与健康)
