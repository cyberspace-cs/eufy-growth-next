#!/usr/bin/env bash
# ============================================================
# eufy demo 部署服务器 · 一键安装（在服务器上执行）
#
#   bash install.sh
#
# 做四件事（幂等，可重复执行）：
#   1) 建目录 /var/www/eufy-demo/{portal→index,cn,next,react} 与 ~/eufy-demo/{repos,apps,logs}
#   2) 建三个裸仓库并装 post-receive hook
#   3) 安装聚合门户页到 /var/www/eufy-demo/index.html
#   4) 把 nginx 片段插进 taoxie.vip 的 443 server 块并 reload
#
# 不负责：上传各 demo 构建产物（由 git push 触发 hook 自动完成）
# ============================================================
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HOME/eufy-demo"
WEBROOT="/var/www/eufy-demo"
NGINX_SITE="/etc/nginx/sites-available/portfolio"
MARKER="# ===== eufy demo 聚合入口"

echo "==> 1/4 建目录"
sudo mkdir -p "$WEBROOT"/{cn,next,react}
sudo chown -R "$USER:$USER" "$WEBROOT"
mkdir -p "$ROOT"/{repos,apps,logs}
chmod +x "$HERE/hooks/post-receive"

echo "==> 2/4 建裸仓库 + 装 hook"
for repo in eufy-growth-cn eufy-growth-next eufy-growth; do
  dir="$ROOT/repos/$repo.git"
  if [ ! -d "$dir" ]; then
    git init --bare -q -b main "$dir"
    echo "    + 新建 $dir"
  else
    echo "    = 已存在 $dir"
  fi
  install -m 0755 "$HERE/hooks/post-receive" "$dir/hooks/post-receive"
  echo "      hook 已装 ($repo)"
done

echo "==> 3/4 安装门户页"
install -m 0644 "$HERE/portal/index.html" "$WEBROOT/index.html"
echo "    $WEBROOT/index.html"

echo "==> 4/4 打 nginx 补丁"
if sudo grep -qF "$MARKER" "$NGINX_SITE"; then
  echo "    已存在补丁，跳过"
else
  sudo cp -a "$NGINX_SITE" "${NGINX_SITE}.bak-$(date +%Y%m%d-%H%M%S)"
  sudo python3 - "$NGINX_SITE" "$HERE/nginx/eufy-demo.conf" <<'PY'
import sys, pathlib
site, frag = sys.argv[1], sys.argv[2]
p = pathlib.Path(site)
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)
snippet = pathlib.Path(frag).read_text(encoding='utf-8')
# 插到第一个 `location ^~ /eufy/` 之前；找不到就插到最后一个 `location / {` 之前
idx = next((i for i, l in enumerate(lines) if l.strip().startswith('location ^~ /eufy/')), None)
if idx is None:
    idx = next((i for i, l in enumerate(lines) if l.strip().startswith('location / {')), len(lines))
lines.insert(idx, snippet.rstrip('\n') + '\n\n')
p.write_text(''.join(lines), encoding='utf-8')
print(f'    插入位置：第 {idx + 1} 行之前')
PY
fi

sudo nginx -t
sudo systemctl reload nginx
echo "    nginx 已 reload"

echo
echo "==> 完成。接下来在各本地仓库 push 即可上线："
echo "    git push demo main"
echo
echo "    入口： https://taoxie.vip/eufy-demo/"
echo "    服务： systemctl status eufy-next"
