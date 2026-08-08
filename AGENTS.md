# AGENTS

## 项目硬性约束（最高优先级）

### 1. 禁止未批准提交 GitHub
- 未经用户**明确批准**，绝对禁止 `git commit` / `git push` / 任何推送到 GitHub 的操作。
- 本仓库已配置 git 钩子（`.git/hooks/pre-commit`、`.git/hooks/pre-push`）强制执行：除非显式设置环境变量 `MEOW_COMMIT_APPROVED=1`，否则 commit/push 一律被拒绝。
- 只有用户口头/文字明确说"可以提交/推送到 GitHub"之后，才允许执行：
  ```powershell
  $env:MEOW_COMMIT_APPROVED=1; git commit ...   # 提交
  $env:MEOW_COMMIT_APPROVED=1; git push ...     # 推送
  ```
- 修改代码后默认停留在本地工作区，等用户批准后再提交。

### 2. 修改后必须提供远程预览链接
- 每次对项目文件做出修改后，必须启动本地静态服务器并给出 Tailscale 远程预览链接，供用户用手机/其他设备预览。
- 服务器要求：绑定 `0.0.0.0`，端口固定为 **8000**。
  ```powershell
  python -m http.server 8000 --bind 0.0.0.0 --directory <项目根目录>
  ```
- 预览链接格式：`http://100.96.220.54:8000`（Tailscale 节点 galileo 的固定 IP，可用 `tailscale ip -4` 确认）。
- 如果端口 8000 已被占用或服务器未运行，先检查并重新启动后再向用户报告。
