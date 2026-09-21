# eufy demo 部署服务器

三个 eufy demo 的统一部署方案：**本地 `git push` → 服务器自动构建 → 上线**。

公开入口：<https://taoxie.vip/eufy-demo/>

---

## 线上拓扑

| 路径 | 内容 | 来源 | 类型 |
|---|---|---|---|
| `/eufy-demo/` | 聚合门户 | `portal/index.html` | 静态 |
| `/eufy-demo/cn/` | 纯静态完整版（8090 UI） | `eufy-growth-cn` 仓库 | 静态，无构建 |
| `/eufy-demo/next/` | React + 摄像头 Agent | `eufy-growth-next` 仓库 | 静态 + Node 服务 |
| `/eufy-demo/next/api/` | Agent HTTP / SSE | `127.0.0.1:8111` | 反代 |
| `/eufy-demo/react/` | React 早期原型 | `eufy-growth` 仓库 | 静态 |

服务器侧路径：

```
/home/ubuntu/eufy-demo/
├── repos/         裸仓库（各带 post-receive hook）
│   ├── eufy-growth-cn.git
│   ├── eufy-growth-next.git
│   └── eufy-growth.git
├── apps/          检出目录（hook 的工作区）
│   ├── cn/  next/  react/
└── logs/          deploy-<name>.log / eufy-next.log

/var/www/eufy-demo/    webroot（nginx 直接服务）
```

进程：`eufy-next.service`（systemd，Node 22，端口 8111，仅监听 127.0.0.1）

---

## 首次安装（服务器）

```bash
scp -r deploy-server ubuntu@43.143.231.106:~/
ssh ubuntu@43.143.231.106 'bash ~/deploy-server/install.sh'
```

`install.sh` 幂等，做四件事：建目录 → 建裸仓库并装 hook → 装门户页 → 给 `taoxie.vip` 的 443 server 块打 nginx 补丁并 reload。

前置依赖（均已具备）：`~/node22/bin`（Node 22.19 + npm）、nginx、`ubuntu` 用户免密 sudo。

---

## 日常发版

三个本地仓库各加一次 remote，之后只 push：

```bash
git remote add demo ssh://ubuntu@43.143.231.106/home/ubuntu/eufy-demo/repos/eufy-growth-next.git
git push demo main
```

`post-receive` 会按仓库名分发：

| 仓库 | hook 动作 |
|---|---|
| `eufy-growth-cn` | rsync 静态文件到 webroot（排除 `.git*` / `*.md`） |
| `eufy-growth-next` | `npm ci` → 禁词校验 → 子路径构建 → rsync → `systemctl restart eufy-next` |
| `eufy-growth` | `npm ci` → 构建（`base: './'` 相对路径）→ rsync |

> push 时客户端会直接看到 hook 输出，包含成功/失败与线上 URL。

### 一次性推三个：`push-all.sh`

```bash
bash deploy-server/push-all.sh              # 推全部三个
bash deploy-server/push-all.sh next         # 只推某个（cn / next / react）
bash deploy-server/push-all.sh --force next # 本地 rebase/reset 过后需要
```

它会自动校正 `demo` remote 地址、提示未提交改动、把服务器构建日志逐行回显到本地，
并在遇到远端分叉时（`non-fast-forward`）明确告诉你要不要加 `--force`。

> `HISTORY` 被重写过（本地 `git reset` / `rebase`）之后，部署远端裸仓库的旧历史
> 会挡住推送 —— 这是唯一需要 `--force` 的场景，用它之前先确认「以本地为准」。

---

## 上线验收

浏览器不可用的环境（本项目的沙箱里 Chromium 在 ARM64 上直跑 core dump）下，
用链接图爬取代替「人工看一眼」：断链、MIME 错配（静态文件被 SPA 回退吞成 `text/html`）、
空响应、Agent 的 HTTP + SSE + 会话写路径，一次跑完。

```bash
python3 deploy-server/tools/verify-demo.py                                 # 公网
python3 deploy-server/tools/verify-demo.py --base http://127.0.0.1:8111    # 后端直连
```

退出码 0 即全通；它会展开 10 个入口页的同源引用逐个探测，最后真开一次
`session/start` → `session/stop` 验证写路径。

---

## 子路径挂载要点

`next` 是唯一有构建步骤的：`vite.config.ts` 读环境变量 `EUFY_BASE` 决定 `base`，
`src/App.tsx` 里 API 前缀由 `import.meta.env.BASE_URL` 派生。

```bash
EUFY_BASE=/eufy-demo/next/ npm run build   # 子路径部署
npm run build                              # 本地 8081 根路径
```

同一份代码两种挂载都不用改业务逻辑。

---

## 排障

```bash
systemctl status eufy-next              # Agent 服务状态
tail -f ~/eufy-demo/logs/eufy-next.log  # Agent 运行日志
tail -50 ~/eufy-demo/logs/deploy-next.log
sudo nginx -t && sudo systemctl reload nginx
curl -s https://taoxie.vip/eufy-demo/next/api/health
```

**降级行为**：Agent 服务挂了，`/eufy-demo/next/` 的静态页照常打开，实时页显示
「Agent 服务未连接」——这是 App 内建的诚实降级，不是故障。

---

## 与旧入口的关系

`https://taoxie.vip/eufy/` 指向 `/var/www/eufy/`，内容与 `/eufy-demo/cn/` 等价，
但不受 push 流水线管理。收敛方式：在 `nginx/eufy-demo.conf` 末尾取消注释那条 301，
把 `/eufy/` 重定向到 `/eufy-demo/cn/`。
