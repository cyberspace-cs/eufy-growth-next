#!/usr/bin/env node
/**
 * 组装动态部署目录 deploy/：
 *   dist/（前端构建产物） + server/camera-agent/（零依赖 Node 服务） + 最小 package.json
 * deploy/ 是构建产物，已 gitignore，不入库。
 */
import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const deploy = join(root, 'deploy');

rmSync(deploy, { recursive: true, force: true });
mkdirSync(join(deploy, 'server'), { recursive: true });

cpSync(join(root, 'dist'), join(deploy, 'dist'), { recursive: true });
cpSync(join(root, 'server', 'camera-agent'), join(deploy, 'server', 'camera-agent'), { recursive: true });

writeFileSync(join(deploy, 'package.json'), JSON.stringify({
  name: 'eufy-growth-next-agent',
  private: true,
  version: '1.0.0',
  type: 'module',
  scripts: { start: 'node server/camera-agent/index.mjs' },
}, null, 2));

console.log('✓ deploy/ 组装完成：dist + server/camera-agent');
