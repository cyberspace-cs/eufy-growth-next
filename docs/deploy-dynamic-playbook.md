# 动态版部署手册（给新会话用）

目标：把摄像头 Agent 动态版发布为 QW Pages dynamic page。本会话（静态版所在会话）无法发 dynamic，必须在新会话执行。

## 步骤

```bash
# 1. 克隆（仓库公开，无需凭据）
git clone https://gitee.com/buleboy8065/eufy-growth-next.git
cd eufy-growth-next

# 2. 构建前端 + 组装部署包
npm install
npm run build
node scripts/build-deploy.mjs    # 生成 deploy/（dist + server/camera-agent + package.json）
```

## 3. 发布（调用一次 qwenwork_pages_publish）

- file_path: `<绝对路径>/eufy-growth-next/deploy`
- category: `dynamic`
- entrypoint: `server/camera-agent/index.mjs`
- port: `8081`
- name: `安克eufy成长相机-摄像头Agent版`

## 验收（发布成功后）

- 打开返回的公开 URL → 应显示成长记录 App（手机底导/桌面侧栏）
- 「实时」页：若 SSE 已连上，点「开始一次 · 会走」→ 事件流滚动、出 3 条候选、可三态确认
- 若网关不代理 SSE，实时页会显示「Agent 服务未连接」——属预期降级，静态功能不受影响

## 约束

- deploy/ 是构建产物（已 gitignore），不要手工改其中文件
- 服务端零依赖（仅 node 内置模块），不需要预装 npm 包
- 服务读 process.env.PORT / HOST，默认 8081；勿用 9000
- /healthz 被 Page 网关保留，健康检查请用 /api/health
