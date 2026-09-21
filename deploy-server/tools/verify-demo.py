#!/usr/bin/env python3
"""
eufy demo 线上验收 · 链接图爬取

沙箱里 Chromium 在 ARM64 上直跑就 core dump，截图不可用，所以用爬取代替"看一眼"：
从每个 demo 的入口页出发，抽出所有同源 href/src，逐个探测，把断链、MIME 错配、
体积异常（HTML 被当成 JS 返回之类）全部揪出来，最后再端到端探一次摄像头 Agent。

用法：
    python3 verify-demo.py                                 # 公网（默认 https://taoxie.vip/eufy-demo）
    python3 verify-demo.py --base http://127.0.0.1/eufy-demo   # 本机 nginx 直连（绕开公网代理）

注意：--base 必须指向「静态站点」所在的 URL（nginx 在 80/443 上服务 /var/www/eufy-demo）。
8111 只是摄像头 Agent 的后端（API 在 /eufy-demo/next/api/ 下、由 nginx 反代），
不要把 base 指到 8111 —— 那样静态资源会被 SPA 回退吞成 HTML，探测必然全红。
"""
import argparse
import http.client
import re
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

socket.setdefaulttimeout(20)

ENTRIES = [
    ("门户",       ""),
    ("cn 入口",    "cn/"),
    ("cn App",     "cn/app.html"),
    ("cn 路演",    "cn/deck.html"),
    ("cn 报告",    "cn/report.html"),
    ("cn 英研",    "cn/uk-deck.html"),
    ("next 入口",  "next/"),
    ("next 报告",  "next/report.html"),
    ("next 路演",  "next/deck.html"),
    ("react 入口", "react/"),
]

ATTR_RE = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I)
CSS_URL_RE = re.compile(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)', re.I)

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

problems: list[str] = []
notes: list[str] = []
probed: dict[str, str] = {}      # url -> "ok"/"fail"，已探测过的不重复发请求
crawled: set[str] = set()        # 已作为入口页展开过引用的 URL


def fetch(url: str, limit: int = 0):
    """(status, ctype, body)。SSE 是无限流，用 limit 主动截断；
    截断时 http 层抛 IncompleteRead，取其 partial 视为成功。"""
    req = urllib.request.Request(url, headers={"User-Agent": "eufy-demo-verify/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            body = r.read() if limit == 0 else r.read(limit)
            return r.status, r.headers.get("Content-Type", ""), body
    except http.client.IncompleteRead as e:
        if e.partial:                      # 流被主动截断，有数据就算通
            return 200, "text/event-stream", e.partial
        raise


def norm(base: str, href: str):
    """把 href 归一化成同源绝对 URL；外链/锚点/伪协议返回 None"""
    href = href.strip()
    if not href or href.startswith(("#", "data:", "mailto:", "javascript:", "tel:")):
        return None
    p = urllib.parse.urlparse(urllib.parse.urljoin(base, href))
    b = urllib.parse.urlparse(base)
    if (p.scheme, p.netloc) != (b.scheme, b.netloc):
        return None
    return urllib.parse.urlunparse((p.scheme, p.netloc, p.path, "", "", ""))


def probe(url: str, source: str = ""):
    """探测单个 URL 是否可达且 MIME 正常"""
    if url in probed:
        return None
    try:
        status, ctype, body = fetch(url)
    except urllib.error.HTTPError as e:
        probed[url] = "fail"
        problems.append(f"[HTTP {e.code}] {url}" + (f"\n        来自 {source}" if source else ""))
        return None
    except Exception as e:
        probed[url] = "fail"
        problems.append(f"[不可达] {url}" + (f"\n        来自 {source}" if source else "") +
                        f"\n        {type(e).__name__}: {e}")
        return None

    if status != 200:
        probed[url] = "fail"
        problems.append(f"[HTTP {status}] {url}")
        return None
    if not body:
        probed[url] = "fail"
        problems.append(f"[空响应] {url}")
        return None

    path = urllib.parse.urlparse(url).path
    if path.endswith(".js") and not re.search(r"javascript|ecmascript", ctype):
        problems.append(f"[MIME 错配] {url}\n        期望 JS，实得 {ctype} —— 多为 SPA 回退吞掉了真实文件")
    elif path.endswith(".css") and "text/css" not in ctype:
        problems.append(f"[MIME 错配] {url}\n        期望 CSS，实得 {ctype}")
    elif path.endswith(".html") and "text/html" not in ctype:
        problems.append(f"[MIME 错配] {url}\n        期望 HTML，实得 {ctype}")

    probed[url] = "ok"
    return body


def crawl(base: str):
    for label, rel in ENTRIES:
        url = urllib.parse.urljoin(base, rel)
        try:
            _s, _c, body = fetch(url)
        except Exception as e:
            problems.append(f"[入口不可达] {url}\n        {type(e).__name__}: {e}")
            print(f"  ✗ {label:12} {url}  不可达")
            sys.stdout.flush()
            continue

        probed[url] = "ok"
        crawled.add(url)
        text = body.decode("utf-8", "replace")

        refs = set(ATTR_RE.findall(text))
        for style in re.findall(r"<style[^>]*>(.*?)</style>", text, re.S | re.I):
            refs |= set(CSS_URL_RE.findall(style))

        internal = sorted({u for u in (norm(url, h) for h in refs) if u and u != url})
        for u in internal:
            probe(u, url)
        ok = sum(1 for u in internal if probed.get(u) == "ok")
        ext = len(internal)
        print(f"  {'✓' if ok == ext else '✗'} {label:12} {url}\n      └─ 同源引用 {ext} 条，可达 {ok} 条")
        sys.stdout.flush()


def probe_agent(base: str):
    api = urllib.parse.urljoin(base, "next/api/")
    for path, expect in (("health", '"ok"'), ("stream", "hello")):
        url = api + path
        try:
            _s, ctype, body = fetch(url, limit=400)
            head = body.decode("utf-8", "replace")
            if expect not in head:
                problems.append(f"[Agent] {url} 响应里找不到 {expect}：{head[:120]!r}")
            else:
                notes.append(f"  Agent /{path:8} 200 · {ctype.split(';')[0]} · 命中 {expect!r}")
            probed[url] = "ok"
        except Exception as e:
            problems.append(f"[Agent] {url} 探测失败：{type(e).__name__}: {e}")

    try:
        req = urllib.request.Request(
            api + "session/start", data=b'{"blade":"walk"}',
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            body = r.read().decode("utf-8", "replace")
        if '"walk"' in body:
            notes.append(f"  Agent 会话开启 ✓ {body.strip()}")
        else:
            problems.append(f"[Agent] session/start 响应异常：{body[:120]!r}")

        req = urllib.request.Request(api + "session/stop", method="POST")
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            notes.append(f"  Agent 会话关闭 ✓ HTTP {r.status}")
    except Exception as e:
        problems.append(f"[Agent] 会话写路径失败：{type(e).__name__}: {e}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://taoxie.vip/eufy-demo/")
    args = ap.parse_args()
    base = args.base if args.base.endswith("/") else args.base + "/"

    print(f"目标 {base}\n" + "=" * 66)
    sys.stdout.flush()
    crawl(base)
    probe_agent(base)

    print("\n" + "=" * 66)
    for n in notes:
        print(n)
    print("=" * 66)

    if problems:
        print(f"[FAIL] {len(problems)} 处问题：")
        for p in problems:
            print("  ✗", p)
        sys.exit(1)
    okn = sum(1 for v in probed.values() if v == "ok")
    print(f"[PASS] 无断链 · 无 MIME 错配 · Agent 端到端正常"
          f"（探测 {okn} 个 URL，其中 {len(crawled)} 个入口页做了引用展开）")


if __name__ == "__main__":
    main()
