#!/usr/bin/env node
/**
 * 表述纪律校验（学 ShiftX 的「原则检验」环节）
 * 扫描 src/ 中的违规词；FORBIDDEN 词出现即为 bug，exit 1。
 * 注意：
 *  - 跳过 core/rules.ts 中 FORBIDDEN 数组自身的定义（否则自引用误报）
 *  - public/ 为继承自 eufy-growth-cn 的旧交付物（deck/report/uk-deck），
 *    其中禁词均出现在「不做 XX」的否定声明语境，不属于本仓库新代码，不扫描
 * 用法：node scripts/check-discipline.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  '发育商', '语言年龄', '同龄百分位', '百分位', '智商',
  '人生第一次', '落后', '达标线',
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'dist') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx?|html|md)$/.test(name)) files.push(p);
  }
  return files;
}

/** 去掉 FORBIDDEN 数组定义块，避免自引用误报 */
function stripForbiddenDef(text) {
  return text.replace(/export const FORBIDDEN = \[[\s\S]*?\];/, '');
}

let bad = 0;
for (const f of walk('src')) {
  const text = stripForbiddenDef(readFileSync(f, 'utf8'));
  for (const w of FORBIDDEN) {
    const i = text.indexOf(w);
    if (i >= 0) {
      const line = text.slice(0, i).split('\n').length;
      console.error(`✗ ${f}:${line} 出现禁词「${w}」`);
      bad++;
    }
  }
}
if (bad) { console.error(`\n表述纪律校验失败：${bad} 处违规`); process.exit(1); }
console.log('✓ 表述纪律校验通过：0 处禁词');
