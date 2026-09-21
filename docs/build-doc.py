#!/usr/bin/env python3
"""三份文档统一构建：注入共享 CSS，输出最终 HTML。"""
import re, sys

CSS = open('_shared-style.html.frag', encoding='utf-8').read()
TEMPLATE = """<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{title}</title><style>
{css}
</style></head><body>
{body}
</body></html>"""

def build(src, out, title):
    body = open(src, encoding='utf-8').read()
    if body.startswith('<!DOCTYPE') or '<style>' in body:
        html = body.replace('__TITLE__', title)
    else:
        html = TEMPLATE.format(title=title, css=CSS, body=body)
    open(out, 'w', encoding='utf-8').write(html)
    print(f"built {out}: {len(html)} chars")

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], sys.argv[3])
