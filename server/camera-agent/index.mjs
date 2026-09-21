#!/usr/bin/env node
/**
 * eufy-growth-next · 摄像头 Agent 服务
 * - 静态托管 dist/
 * - SSE 实时推送：/api/stream
 * - 会话制采集（同意优先）：POST /api/session/start|stop
 * - 家长三态确认：POST /api/candidates/:id/confirm
 * - 零依赖：仅 Node 内置模块，Node 22 兼容
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SessionManager, attachCandidateRegistration } from './pipeline/engine.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, '..', '..', 'dist');
const PORT = Number(process.env.PORT || 8081);
const HOST = process.env.HOST || '0.0.0.0';

const mgr = new SessionManager();
attachCandidateRegistration(mgr);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.ico': 'image/x-icon', '.map': 'application/json',
};

function serveStatic(req, res) {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (!file.startsWith(DIST) || !existsSync(file)) {
    // SPA 回退
    const index = join(DIST, 'index.html');
    if (existsSync(index)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(index));
    } else {
      res.writeHead(404); res.end('not found');
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}

async function readBody(req) {
  let b = '';
  for await (const c of req) b += c;
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}

const server = createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };

  // SSE 实时事件流
  if (req.method === 'GET' && url === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'hello', active: !!mgr.active })}\n\n`);
    const unsub = mgr.subscribe((s) => res.write(`data: ${s}\n\n`));
    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => { unsub(); clearInterval(ping); });
    return;
  }

  if (req.method === 'GET' && url === '/api/health')
    return json(200, { ok: true, activeSession: mgr.active ? mgr.active.blade : null, source: 'demo-mock-signal' });
  if (req.method === 'GET' && url === '/api/candidates')
    return json(200, { candidates: mgr.candidates, audit: mgr.audit.slice(-20) });

  if (req.method === 'POST' && url === '/api/session/start') {
    const { blade } = await readBody(req);
    try {
      const s = mgr.start(blade);
      return json(200, s);
    } catch (e) { return json(400, { error: e.message }); }
  }
  if (req.method === 'POST' && url === '/api/session/stop') {
    mgr.stop('家长手动结束');
    return json(200, { ok: true });
  }

  const m = url.match(/^\/api\/candidates\/([a-z0-9]+)\/confirm$/);
  if (req.method === 'POST' && m) {
    const { tri } = await readBody(req);
    if (!['done', 'sometimes', 'notyet', 'reject'].includes(tri)) return json(400, { error: 'tri 必须是 done/sometimes/notyet/reject' });
    try { return json(200, mgr.confirm(m[1], tri)); }
    catch (e) { return json(404, { error: e.message }); }
  }

  return serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`camera-agent on http://${HOST}:${PORT} · source=demo-mock-signal · dist=${DIST}`);
});
