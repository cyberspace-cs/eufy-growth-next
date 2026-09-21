#!/usr/bin/env node
/**
 * eufy-growth-next · LLM Gateway（可选服务，默认不启动）
 *
 * 边界（学 FinSight「AI 获取 Context、代码计算、AI 解释」）：
 *  - 输入只接受家长已确认的结构化记录（status === 'confirmed'）
 *  - 只做两件事：① 下周陪玩活动建议文案 ② 儿保沟通摘要
 *  - 不做里程碑判定、不做排名、不接收儿童原始音视频
 *  - 无 API key 时返回 503 + 降级文案，前端走本地模板
 *
 * 环境变量（只填变量名，密钥永不入库）：
 *   LLM_PROVIDER   = deepseek | qwen | ark
 *   LLM_API_KEY    = 对应平台的 sk-… 
 *   LLM_BASE_URL   = 可选，默认按 provider 推断
 *   LLM_MODEL      = 可选，模型名
 *   PORT           = 默认 8081
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8081);
const API_KEY = process.env.LLM_API_KEY || '';
const PROVIDER = process.env.LLM_PROVIDER || '';
const MODEL = process.env.LLM_MODEL || '';

const DEFAULTS = {
  deepseek: { base: 'https://api.deepseek.com/v1', model: 'deepseek-v4-flash' },
  qwen: { base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen3.8-flash' },
  ark: { base: 'https://ark.cn-beijing.volces.com/api/v3', model: '' },
};

const SYSTEM_PROMPT = `你是幼儿成长记录产品的文案助手。铁律：
1. 不诊断、不评分、不排名、不与同龄比较；
2. 不使用这些词：发育商、智商、百分位、人生第一次、掌握、正常、落后、达标；
3. 输入只有家长已确认的观察记录，不要推测记录之外的能力；
4. 没有样本的领域只说「未获得可判断样本，不等同于不会」；
5. 建议必须挂证据编号（如 w4），不可追溯的建议不要输出。`;

function localFallback(kind) {
  return kind === 'activity'
    ? { text: '（本地模板）本周可玩「兔子跳过线」：在客厅地面贴 5cm 宽胶带线，和小满轮流跳，拍 3 次即可。', source: 'local-template' }
    : { text: '（本地模板）本周已确认记录：会走 4 条（跳过线最远 23.5cm）、会说 3 条（新词：月亮、蚂蚁）、会吃 4 条。未获得样本的项目不等同于不会。', source: 'local-template' };
}

async function callLLM(kind, records) {
  const conf = DEFAULTS[PROVIDER];
  if (!conf) throw new Error('LLM_PROVIDER 未配置或未知');
  const base = process.env.LLM_BASE_URL || conf.base;
  const model = MODEL || conf.model;
  const user = kind === 'activity'
    ? `根据以下已确认记录，写一段下周陪玩活动建议（100字内，中文，家长口吻）：\n${records}`
    : `把以下已确认记录整理成一段社区儿保门诊沟通摘要（150字内，中文）：\n${records}`;
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 400,
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content?.trim() || '', source: `${PROVIDER}/${model}` };
}

createServer(async (req, res) => {
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };
  if (req.method === 'GET' && req.url === '/healthz') return json(200, { ok: true, provider: PROVIDER || 'none' });

  if (req.method === 'POST' && (req.url === '/api/activity' || req.url === '/api/summary')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    let records = [];
    try { records = JSON.parse(body); } catch { return json(400, { error: 'bad json' }); }
    // 边界：只接受已确认记录
    if (!Array.isArray(records)) return json(400, { error: 'expect array' });
    const safe = records.filter((r) => r && r.status === 'confirmed');
    if (!safe.length) return json(422, { error: 'no confirmed records' });
    const brief = safe.map((r) => `[${r.id}] ${r.blade}/${r.code}: ${r.value}`).join('\n');

    if (!API_KEY || !PROVIDER) {
      return json(200, { ...localFallback(req.url === '/api/activity' ? 'activity' : 'summary'), degraded: true });
    }
    try {
      const out = await callLLM(req.url === '/api/activity' ? 'activity' : 'summary', brief);
      return json(200, out);
    } catch (e) {
      return json(200, { ...localFallback(req.url === '/api/activity' ? 'activity' : 'summary'), degraded: true, error: String(e.message) });
    }
  }
  json(404, { error: 'not found' });
}).listen(PORT, () => console.log(`llm-gateway on :${PORT} provider=${PROVIDER || 'none(降级模式)'}`));
