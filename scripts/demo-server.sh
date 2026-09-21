#!/usr/bin/env bash
# ============================================================
# eufy 成长相机 · Demo 服务器一键启停
# 用法: scripts/demo-server.sh start|stop|status|restart
#
# 端口规划（全部绑 0.0.0.0，局域网可访问）：
#   8000  导航门户（本页所在 demo/portal.html）
#   8081  eufy-growth-next 完整版（前端 + 摄像头 Agent）
#   8090  eufy-growth-cn 纯静态版
#   5173  eufy-growth React 原型（vite dev）
#
# 仓库根目录默认取本仓库的父目录（如 repos/），可用环境变量覆盖：
#   EUFY_REPOS_BASE=/path/to/repos scripts/demo-server.sh start
# 缺 eufy-growth-cn / eufy-growth 时自动从 Gitee 公开克隆。
# ============================================================
set -u
BASE="${EUFY_REPOS_BASE:-$(cd "$(dirname "$0")/.." && pwd)/..}"
BASE="$(cd "$BASE" && pwd)"
NEXT="$BASE/eufy-growth-next"
CN="$BASE/eufy-growth-cn"
GROWTH="$BASE/eufy-growth"
RUN="$NEXT/.demo-run"
PORTAL_PORT=8000; AGENT_PORT=8081; CN_PORT=8090; DEV_PORT=5173
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

mkdir -p "$RUN"
port_up(){ curl -s -o /dev/null -m 2 "http://localhost:$1/" 2>/dev/null; }

clone_if_missing(){ # $1=dir $2=url
  [ -d "$1/.git" ] && return 0
  echo "  克隆 $(basename "$1") ..."
  git clone --depth 1 "$2" "$1" >/dev/null 2>&1 || { echo "  ✗ 克隆失败: $2"; return 1; }
}

start(){
  echo "▶ 启动 Demo 服务器（局域网 IP: ${IP:-未知}）"
  # 1. 门户
  cp -f "$NEXT/demo/portal.html" "$NEXT/demo/index.html" 2>/dev/null
  if ! port_up $PORTAL_PORT; then
    (cd "$NEXT/demo" && nohup python3 -m http.server $PORTAL_PORT > "$RUN/portal.log" 2>&1 & echo $! > "$RUN/portal.pid")
    echo "  ✓ 门户    http://${IP}:${PORTAL_PORT}/"
  else echo "  · 门户已在运行"; fi
  # 2. next 完整版（agent 自带静态托管 dist；缺 dist 则先构建）
  if ! port_up $AGENT_PORT; then
    if [ ! -d "$NEXT/dist" ]; then
      echo "  构建 eufy-growth-next/dist ..."
      (cd "$NEXT" && npm install --silent >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
    fi
    (cd "$NEXT" && nohup node server/camera-agent/index.mjs > "$RUN/agent.log" 2>&1 & echo $! > "$RUN/agent.pid")
    echo "  ✓ 完整版  http://${IP}:${AGENT_PORT}/"
  else echo "  · 完整版已在运行"; fi
  # 3. cn 静态版
  clone_if_missing "$CN" https://gitee.com/buleboy8065/eufy-growth-cn.git
  if ! port_up $CN_PORT; then
    (cd "$CN" && nohup python3 -m http.server $CN_PORT > "$RUN/cn.log" 2>&1 & echo $! > "$RUN/cn.pid")
    echo "  ✓ cn 静态 http://${IP}:${CN_PORT}/"
  else echo "  · cn 静态已在运行"; fi
  # 4. growth React 原型
  clone_if_missing "$GROWTH" https://gitee.com/buleboy8065/eufy-growth.git
  if ! port_up $DEV_PORT; then
    if [ ! -d "$GROWTH/node_modules" ]; then
      echo "  安装 eufy-growth 依赖 ..."
      (cd "$GROWTH" && npm install --silent >/dev/null 2>&1)
    fi
    (cd "$GROWTH" && nohup npx vite --port $DEV_PORT --host > "$RUN/growth.log" 2>&1 & echo $! > "$RUN/growth.pid")
    echo "  ✓ 原型    http://${IP}:${DEV_PORT}/"
  else echo "  · 原型已在运行"; fi
  echo "完成。导航页：http://${IP}:${PORTAL_PORT}/"
}

stop(){
  echo "■ 停止 Demo 服务器"
  for name in portal agent cn growth; do
    pidfile="$RUN/$name.pid"
    if [ -f "$pidfile" ]; then
      pid=$(cat "$pidfile")
      # 只杀我们自己启动的进程（命令行匹配校验，防误杀）
      if kill -0 "$pid" 2>/dev/null && grep -qiE "http.server|camera-agent|vite" "/proc/$pid/cmdline" 2>/dev/null | true; then
        pkill -P "$pid" 2>/dev/null; kill "$pid" 2>/dev/null && echo "  ✓ 已停 $name (pid $pid)"
      fi
      rm -f "$pidfile"
    fi
  done
  # 兜底：按端口特征清理（避免 pkill 自匹配，用字符类断词）
  pkill -f "m http.se[r]ver $PORTAL_PORT" 2>/dev/null
  pkill -f "camera-age[n]t/index.mjs" 2>/dev/null
  pkill -f "m http.se[r]ver $CN_PORT" 2>/dev/null
  pkill -f "vit[e] --port $DEV_PORT" 2>/dev/null
  echo "完成。"
}

status(){
  printf "%-22s %-8s %s\n" "服务" "端口" "状态"
  for pair in "导航门户:$PORTAL_PORT" "next 完整版:$AGENT_PORT" "cn 静态版:$CN_PORT" "growth 原型:$DEV_PORT"; do
    name="${pair%%:*}"; port="${pair##*:}"
    if port_up "$port"; then st="✓ 在线  http://${IP}:${port}/"; else st="✗ 离线"; fi
    printf "%-20s %-8s %s\n" "$name" "$port" "$st"
  done
}

case "${1:-status}" in
  start) start;; stop) stop;; restart) stop; sleep 1; start;; status) status;;
  *) echo "用法: $0 start|stop|status|restart"; exit 1;;
esac
