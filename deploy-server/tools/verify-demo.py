#!/usr/bin/env python3
"""
eufy demo 线上验收 · 链接图爬取

沙箱里 Chromium 在 ARM64 上直跑就 core dump，截图不可用，所以用爬取代替"看一眼"：
从每个 demo 的入口页出发，抽出所有同源 href/src，逐个鉴权头探测，
把断链、MIME 错配、体积异常（HTML 被当成 JS 返回之类）全部揪出来。

用法：
    python3 verify-demo.py                       # 走公网 https://taoxie.vip/eufy-demo/
    python3 verify-demo.py --base http://127.0.0.1:8111   # 也可打后端直连
"""
import argparse
import re
import ssl
import sys
import urllib.parse
import urllib.request
from collections import deque

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

# 从 HTML 里抓 href / src（含内联 script 里的字符串路径）
ATTR_RE = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I)
CSS_URL_RE = re.compile(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)', re.I)

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

problems: list[str] = []
notes: list[str] = []
seen: set[str] = set()


def fetch(url: str, method: str = "GET", limit: int = 0):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "eufy-demo-verify/1.0"})
    with urllib.request.urlopen(req, timeout=25, context=CTX) as r:
        body = r.read() if limit == 0 else r.read(limit)
        return r.status, r.headers.get("Content-Type", ""), body


def norm(base: str, href: str):
    """把 href 归一化成同源绝对 URL；外链/锚点/伪协议返回 None"""
    href = href.strip()
    if not href or href.startswith(("#", "data:", "mailto:", "javascript:", "tel:")):
        return None
    absu = urllib.parse.urljoin(base, href)
    p = urllib.parse.urlparse(absu)
    b = urllib.parse.urlparse(base)
    if (p.scheme, p.netloc) != (b.scheme, b.netloc):
        return None
    # 丢掉 query / fragment，避免 hash 路由与缓存串扰
    return urllib.parse.urlunparse((p.scheme, p.netloc, p.path, "", "", ""))


def check(url: str, source: str):
    if url in seen:
        return None
    seen.add(url)
    try:
        status, ctype, body = fetch(url)
    except urllib.error.HTTPError as e:
        problems.append(f"[404?] {url}  ← {source}\n        HTTP {e.code} {e.reason}")
        return None
    except Exception as e:
        problems.append(f"[ERR ] {url}  ← {source}\n        {type(e).__name__}: {e}")
        return None

    if status != 200:
        problems.append(f"[{status}] {url}  ← {source}")
        return None

    if not body:
        problems.append(f"[空响应] {url}  ← {source}")
        return None

    # MIME 与后缀一致性：静态页被 SPA 回退吞掉时会返回 text/html
    path = urllib.parse.urlparse(url).path
    if path.endswith(".js") and "javascript" not in ctype and "ecmascript" not in ctype:
        problems.append(f"[MIME 错配] {url}\n        期望 JS，实得 {ctype} —— 多为 SPA 回退吞掉了真实文件")
    if path.endswith(".css") and "text/css" not in ctype:
        problems.append(f"[MIME 错配] {url}\n        期望 CSS，实得 {ctype}")
    if path.endswith(".html") and "text/html" not in ctype:
        problems.append(f"[MIME 错配] {url}\n        期望 HTML，实得 {ctype}")

    return body


def crawl(base: str):
    for label, rel in ENTRIES:
        url = urllib.parse.urljoin(base, rel)
        body = check(url, "入口清单")
        if body is None:
            print(f"  ✗ {label:12} {url}  取不到")
            continue
        try:
            text = body.decode("utf-8", "replace")
        except Exception:
            continue

        refs = set(ATTR_RE.findall(text))
        # 内联 <style> 里的 url(...) 也抓一下（cn 版常把图标/背景内联）
        for style in re.findall(r"<style[^>]*>(.*?)</style>", text, re.S | re.I):
            refs |= set(CSS_URL_RE.findall(style))

        internal = {u for u in (norm(url, h) for h in refs) if u and u != url}
        ext, ok = 0, 0
        for u in sorted(internal):
            if u in seen:
                continue
            if check(u, url) is not None:
                ok += 1
            ext += 1
        flag = "✓" if ext == ok else "✗"
        print(f"  {flag} {label:12} {url}\n      └─ 同源引用 {ext} 条，可达 {ok} 条")
        sys.stdout.flush()


def probe_agent(base: str):
    """摄像头 Agent 的 HTTP 与 SSE 端到端探一次"""
    api = urllib.parse.urljoin(base, "next/api/")
    for path, expect in (("health", '"ok"'), ("stream", "hello")):
        url = api + path
        try:
            status, ctype, body = fetch(url, limit=400)
            head = body.decode("utf-8", "replace")
            if expect not in head:
                problems.append(f"[Agent] {url} 响应里找不到 {expect}：{head[:120]!r}")
            else:
                notes.append(f"  Agent /{path:8} 200 · {ctype.split(';')[0]} · 命中 {expect!r}")
        except Exception as e:
            problems.append(f"[Agent] {url} 探测失败：{type(e).__name__}: {e}")

    # 真开一次会话再停，验证写路径
    try:
        req = urllib.request.Request(
            api + "session/start",
            data=b'{"blade":"walk"}',
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=25, context=CTX) as r:
            body = r.read().decode("utf-8", "replace")
        if '"walk"' in body:
            notes.append(f"  Agent 会话开启 ✓ {body.strip()}")
        else:
            problems.append(f"[Agent] session/start 响应异常：{body[:120]!r}")
        req = urllib.request.Request(api + "session/stop", method="POST")
        with urllib.request.urlopen(req, timeout=25, context=CTX) as r:
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
    print(f"[PASS] 无断链 · 无 MIME 错配 · Agent 端到端正常（共探测 {len(seen)} 个同源 URL）")


if __name__ == "__main__":
    main()
