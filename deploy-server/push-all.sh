#!/usr/bin/env bash
# ============================================================
# eufy demo · 一次把三个仓库推到部署服务器
#
#   bash deploy-server/push-all.sh              # 推全部
#   bash deploy-server/push-all.sh next         # 只推某一个
#
# 每个仓库会：确保有 demo remote → 推当前 HEAD 到远端 main
# 推送输出里会直接带回来服务器的构建日志。
#
# 可用环境变量覆盖：
#   EUFY_DEMO_SERVER  （默认 ubuntu@43.143.231.106）
#   EUFY_DEMO_REPOS   （默认 /home/ubuntu/eufy-demo/repos）
#   EUFY_DEMO_KEY     （默认 $HOME/.ssh/id_ed25519）
#   EUFY_CN_DIR / EUFY_NEXT_DIR / EUFY_REACT_DIR  三个本地仓库路径
# ============================================================
set -uo pipefail

SERVER="${EUFY_DEMO_SERVER:-ubuntu@43.143.231.106}"
REPOS="${EUFY_DEMO_REPOS:-/home/ubuntu/eufy-demo/repos}"
KEY="${EUFY_DEMO_KEY:-$HOME/.ssh/id_ed25519}"

HERE="$(cd "$(dirname "$0")" && pwd)"
GUESS_ROOT="$(cd "$HERE/../.." && pwd)"          # 本脚本所在仓库的父目录
NEXT_DIR="${EUFY_NEXT_DIR:-$HERE/..}"
CN_DIR="${EUFY_CN_DIR:-$GUESS_ROOT/eufy-growth-cn}"
REACT_DIR="${EUFY_REACT_DIR:-$GUESS_ROOT/eufy-growth}"

export GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=$HOME/.ssh/known_hosts"

declare -a FAILED=()

push_one() {
  local name="$1" dir="$2"
  local remote_url="ssh://$SERVER$REPOS/eufy-growth-$name.git"
  [ "$name" = "react" ] && remote_url="ssh://$SERVER$REPOS/eufy-growth.git"

  echo "──────────────────────────────────────────────"
  echo "▶ $name"
  if [ ! -d "$dir/.git" ]; then
    echo "  !! 跳过：$dir 不是 git 仓库"
    FAILED+=("$name(目录不存在)")
    return 1
  fi

  cd "$dir"
  # remote 存在但地址变了（换服务器/换路径）也要纠正
  if git remote get-url demo >/dev/null 2>&1; then
    [ "$(git remote get-url demo)" != "$remote_url" ] && git remote set-url demo "$remote_url"
  else
    git remote add demo "$remote_url"
  fi

  local branch head subject dirty
  branch="$(git rev-parse --abbrev-ref HEAD)"
  head="$(git rev-parse --short HEAD)"
  subject="$(git log -1 --format=%s)"
  dirty="$(git status --porcelain | wc -l | tr -d ' ')"

  echo "  分支 $branch @ $head  $subject"
  [ "$dirty" != "0" ] && echo "  ⚠ 有 $dirty 处未提交改动，本次只推已提交内容"

  if ! git push demo HEAD:main; then
    echo "  ✘ $name 推送失败"
    FAILED+=("$name")
    return 1
  fi
  echo "  ✔ $name 已推送"
}

targets=("$@")
[ "${#targets[@]}" -eq 0 ] && targets=(cn next react)

echo "部署目标 $SERVER$REPOS"
echo "本地仓库： cn=$CN_DIR  next=$NEXT_DIR  react=$REACT_DIR"
echo

for t in "${targets[@]}"; do
  case "$t" in
    cn)    push_one cn "$CN_DIR" ;;
    next)  push_one next "$NEXT_DIR" ;;
    react) push_one react "$REACT_DIR" ;;
    *)     echo "!! 未知目标 $t（可选：cn / next / react）"; FAILED+=("$t(未知)") ;;
  esac
done

echo "──────────────────────────────────────────────"
if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "✘ 失败：${FAILED[*]}"
  exit 1
fi
echo "✔ 三个 demo 均已发布"
echo "  https://taoxie.vip/eufy-demo/"
