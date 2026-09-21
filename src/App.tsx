import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store';
import { buildReport, pendingList, confirmedList } from './core/report';
import { BLADES, MILESTONES, OBS } from './core/rules';
import { CHILD, DAY_TIMELINE, META } from './data/seed';
import type { Evidence, Knife, TriState } from './types';

type Tab = 'home' | 'live' | 'review' | 'report' | 'settings';

/* ---------- 图标（内联 SVG，cn 同款） ---------- */
const ICO: Record<string, string> = {
  walk: '<circle cx="13" cy="4.3" r="2"/><path d="M12 8l-3 4 3 2.5L11 19M12 8l3.5 3L18 12M9 12l-3 1.5M11 14.5 8 20"/>',
  talk: '<path d="M4 5h16v11H9l-4 3.5V16H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  eat: '<path d="M7 3v6M5 3v6a2 2 0 0 0 4 0V3M7 9v12M17 3c-1.7 1.8-2.5 4-2.5 6.5 0 2 1 3.5 2.5 3.5V21"/>',
  home: '<path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10"/>',
  live: '<path d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9"/>',
  check: '<path d="M4 12.5 10 18 20 6"/>',
  report: '<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h5"/>',
  shield: '<path d="M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z"/>',
  logo: '<path d="M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
};
const Ico = ({ name }: { name: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" dangerouslySetInnerHTML={{ __html: ICO[name] }} />
);

const TABS: { key: Tab; label: string; icon: string; bell?: boolean }[] = [
  { key: 'home', label: '今天', icon: 'home' },
  { key: 'live', label: '实时', icon: 'live' },
  { key: 'review', label: '待确认', icon: 'check', bell: true },
  { key: 'report', label: '周报', icon: 'report' },
  { key: 'settings', label: '设置', icon: 'shield' },
];

const LEVEL_PILL: Record<string, string> = {
  visible: '画面/声音可见', parent: '家长确认', suggestion: '建议', unknown: '无法判断',
};

/* ---------- toast ---------- */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 1900);
  };
  return { msg, toast };
}

export default function App() {
  const { state, update, reset } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const { msg, toast } = useToast();
  const pending = pendingList(state.evidence);
  const report = useMemo(() => buildReport(
    state.evidence, CHILD.name, CHILD.ageMonths, META.week,
    { walk: '会走 · 大运动', talk: '会说 · 语言', eat: '会吃 · 回应式喂养' },
  ), [state.evidence]);

  const confirm = (id: string, tri: TriState) => {
    update((s) => ({
      ...s,
      evidence: s.evidence.map((e) =>
        e.id === id ? { ...e, status: 'confirmed' as const, tri, level: 'parent' as const } : e),
    }));
    toast(tri === 'done' ? '已入册：做到了 ✓' : tri === 'sometimes' ? '已入册：有时会' : '已入册：还不会 · 下次再玩');
  };
  const reject = (id: string) => {
    update((s) => ({ ...s, evidence: s.evidence.map((e) => (e.id === id ? { ...e, status: 'rejected' as const } : e)) }));
    toast('已排除，不进入成长册');
  };
  const unjudge = (id: string) => {
    update((s) => ({ ...s, evidence: s.evidence.map((e) => (e.id === id ? { ...e, status: 'unjudgeable' as const, level: 'unknown' as const } : e)) }));
    toast('已标无法判断：没拍到 ≠ 不会');
  };

  return (
    <div className="desk">
      {/* 桌面侧栏：品牌 + 静态交付物入口 */}
      <aside className="desk-side">
        <div className="logo-card">
          <b>eufy 成长同行 next</b>
          <small>中国 0–6 · 会走 会说 会吃</small>
        </div>
        <div className="stat-mini">手机 App 演示 · 桌面内嵌手机框</div>
        <a href="/deck.html" target="_blank" rel="noreferrer">6 分钟路演 <span>→</span></a>
        <a href="/report.html" target="_blank" rel="noreferrer">完整方案报告 <span>→</span></a>
        <a href="/uk-deck.html" target="_blank" rel="noreferrer">英国市场调研 <span>→</span></a>
        <div className="stat-mini">后端：camera-agent · 实时页需服务在线</div>
      </aside>

      {/* 390×844 手机框 */}
      <div className="phone">
        <StatusBar />
        <div className="appbar">
          <span className="brand"><span className="logo"><Ico name="logo" /></span>成长同行</span>
          <span className="child"><b>{CHILD.name}</b>· {CHILD.ageMonths} 个月</span>
        </div>
        <div className="source-badge"><span className="dot" />{META.disclaimer}</div>

        <div className="stage">
          {tab === 'home' && <Home evidence={state.evidence} pendingCount={pending.length} goReview={() => setTab('review')} />}
          {tab === 'live' && <Live toast={toast} />}
          {tab === 'review' && <Review list={pending} onConfirm={confirm} onReject={reject} onUnjudge={unjudge} />}
          {tab === 'report' && <Report report={report} />}
          {tab === 'settings' && <Settings state={state} update={update} reset={reset} toast={toast} />}
        </div>

        {msg && <div className="toast">{msg}</div>}

        <nav className="tabbar">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              <span className={t.bell && pending.length ? 'bell' : undefined}>
                <Ico name={t.icon} />
                {t.bell && pending.length > 0 && <em>{pending.length}</em>}
              </span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/* ---------- 状态栏（实时时钟） ---------- */
function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const hm = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="statusbar">
      <span>{hm}</span>
      <span className="sb-r">●●●●○ 5G ▮▮ 82%</span>
    </div>
  );
}

/* ---------- 今天 ---------- */
function Home({ evidence, pendingCount, goReview }: {
  evidence: Evidence[]; pendingCount: number; goReview: () => void;
}) {
  const confirmed = confirmedList(evidence);
  return (
    <div>
      <div className="hero">
        <h1>13 次随访之外，<span className="hl">摄像头每周都在场</span></h1>
        <p>36 月龄到 4 岁隔 12 个月，而成长以「周」为单位发生。不诊断、不评分、不识别身份——只回答：这段拍清了、这个动作你确认过、这份材料能带去儿保门诊。</p>
      </div>

      <div className="stat3">
        <div className="s"><b>{confirmed.length}</b><span>已确认记录</span></div>
        <div className="s warn"><b>{pendingCount}</b><span>待家长确认</span></div>
        <div className="s"><b>{evidence.length}</b><span>本周片段</span></div>
      </div>

      <div className="card">
        <h3>小满的一天 · 2026-09-21<span className="more" onClick={goReview}>去确认 →</span></h3>
        <div className="tl">
          {DAY_TIMELINE.map((d) => (
            <div key={d.time} className="tl-item">
              <span className={'tl-time ' + d.blade}>{d.time}</span>
              <span className={'tl-dot ' + d.blade} />
              <span className="tl-text">{d.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">三尖刀 · 本周</div>
      {(['walk', 'talk', 'eat'] as Knife[]).map((k) => {
        const own = confirmed.filter((e) => e.blade === k);
        const ms = MILESTONES.filter((m) => m.blade === k && m.age <= CHILD.ageMonths + 6).slice(-3);
        return (
          <div key={k} className={'card blade-card ' + k}>
            <h3>
              <span className={'blade-ico ' + k}><Ico name={k} /></span>
              {BLADES[k].name}
              <span className="pill gray">{BLADES[k].en}</span>
              <span className="more">{own.length} 条已确认</span>
            </h3>
            <p className="hint">{BLADES[k].anchor}</p>
            <ul>
              {ms.map((m) => <li key={m.code}>{m.name}<i>{m.age} 月 · {m.src}</i></li>)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 待确认（证据状态机） ---------- */
function Review({ list, onConfirm, onReject, onUnjudge }: {
  list: Evidence[];
  onConfirm: (id: string, tri: TriState) => void;
  onReject: (id: string) => void;
  onUnjudge: (id: string) => void;
}) {
  if (!list.length)
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px 14px' }}>
        <h3 style={{ justifyContent: 'center' }}>本周候选全部处理完 ✓</h3>
        <p className="hint">没拍到 ≠ 不会——未获得样本的里程碑一律显示「未获得可判断样本」。</p>
      </div>
    );
  return (
    <div>
      <p className="hint" style={{ margin: '4px 2px 10px' }}>候选不自动入册。三态确认（做到了 / 有时会 / 还不会）后才成为记录；可排除或标无法判断。</p>
      {list.map((e) => (
        <div key={e.id} className={'card queue-item ' + e.blade}>
          <div className="q-head">
            <span className={'blade-ico ' + e.blade}><Ico name={e.blade} /></span>
            <b>{OBS[e.code]?.label ?? e.code}</b>
            <span className={'pill ' + e.level} style={{ marginLeft: 'auto' }}>{LEVEL_PILL[e.level]}</span>
          </div>
          <p className="q-value">{e.value}
            {e.words?.length ? <em>（{e.words.join('、')}）</em> : null}
            {e.distCm != null ? <em>，{e.distCm.toFixed(1)}cm</em> : null}
          </p>
          <p className="q-meta">置信度 {(e.confidence * 100).toFixed(0)}% · {e.observedAt.slice(5)} · {e.source === 'audio' ? '🎙 麦克风' : '📷 摄像头'}</p>
          {e.note && <p className="q-note">{e.note}</p>}
          <div className="tri-row">
            <button className="btn sm" onClick={() => onConfirm(e.id, 'done')}>做到了</button>
            <button className="btn sm amber" onClick={() => onConfirm(e.id, 'sometimes')}>有时会</button>
            <button className="btn sm danger" onClick={() => onConfirm(e.id, 'notyet')}>还不会</button>
            <button className="btn sm ghost" onClick={() => onReject(e.id)}>排除</button>
            <button className="btn sm ghost" onClick={() => onUnjudge(e.id)}>无法判断</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- 实时：摄像头 Agent（SSE） ---------- */
interface LiveCandidate {
  id: string; blade: string; code: string; value: string;
  confidence: number; note: string; status: string; tri?: string | null; level?: string;
}
interface LiveEvent {
  type: string; machine?: string; state?: string;
  blade?: string; candidate?: LiveCandidate; reason?: string; phase?: string; kind?: string; value?: number;
}

function Live({ toast }: { toast: (m: string) => void }) {
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [candidates, setCandidates] = useState<LiveCandidate[]>([]);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (msg) => {
      const ev: LiveEvent = JSON.parse(msg.data);
      if (ev.type === 'hello') { setConnected(true); return; }
      setEvents((prev) => [ev, ...prev].slice(0, 40));
      if (ev.type === 'session-start' && ev.blade) setRunning(ev.blade);
      if (ev.type === 'session-end') setRunning(null);
      if (ev.type === 'candidate' && ev.candidate) setCandidates((p) => [ev.candidate!, ...p]);
      if (ev.type === 'candidate-updated' && ev.candidate)
        setCandidates((p) => p.map((c) => (c.id === ev.candidate!.id ? ev.candidate! : c)));
    };
    return () => es.close();
  }, []);

  const startSession = async (blade: string) => {
    setCandidates([]); setEvents([]);
    const r = await fetch('/api/session/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blade }),
    });
    if (r.ok) toast(`会话已开启 · ${BLADES[blade as Knife].name}（同意优先，可随时结束）`);
  };
  const stopSession = async () => { await fetch('/api/session/stop', { method: 'POST' }); toast('会话已结束，采集即停'); };
  const confirmCand = async (id: string, tri: string) => {
    await fetch(`/api/candidates/${id}/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tri }),
    });
    toast(tri === 'reject' ? '已排除' : '已确认，进入成长册');
  };

  return (
    <div>
      <div className="live-status">
        <span className={connected ? 'dot ok' : 'dot off'} />
        <b>{connected ? 'Agent 服务已连接' : 'Agent 服务未连接'}</b>
        <span className="hint">信号源 demo-mock-signal · 判定纯代码，不经 LLM</span>
      </div>
      {!connected && <p className="q-note">静态部署不含后端。启动 <b>node server/camera-agent/index.mjs</b> 或访问 Agent 版部署地址后体验完整链路。</p>}

      <div className="row wrap" style={{ marginBottom: 12 }}>
        {(['walk', 'talk', 'eat'] as Knife[]).map((k) => (
          <button key={k} className={'btn sm ' + (running === k ? 'amber' : '')} disabled={!!running || !connected}
            onClick={() => startSession(k)} style={{ flex: 1 }}>
            {running === k ? `采集中·${BLADES[k].name}` : `开始·${BLADES[k].name}`}
          </button>
        ))}
        {running && <button className="btn sm ghost" onClick={stopSession}>结束</button>}
      </div>

      <div className="card">
        <h3>Agent 事件流 {running && <span className="live-badge">LIVE</span>}
          <span className="more">{events.length} 条</span></h3>
        <div className="console">
          {events.length === 0 && <div className="sig-row"><span className="sig-text">会话由家长显式开启（同意优先）。开启后这里实时显示信号、状态机迁移与审计记录。</span></div>}
          {events.map((ev, i) => (
            <div key={i} className="sig-row">
              <span className={'sig-kind ' + ev.type}>{ev.type}</span>
              <span className="sig-text">
                {ev.type === 'signal' && `信号 ${ev.kind} ${ev.value ?? ''} ${ev.phase ?? ''}`}
                {ev.type === 'state' && `状态机 ${ev.machine} → ${ev.state}`}
                {ev.type === 'audit' && `审计 ${ev.reason}`}
                {ev.type === 'candidate' && `候选 ${ev.candidate?.value}`}
                {ev.type === 'candidate-updated' && `确认 ${ev.candidate?.id} → ${ev.candidate?.status}`}
                {ev.type === 'session-start' && `会话开始 ${ev.blade}`}
                {ev.type === 'session-end' && `会话结束 ${ev.reason ?? ''}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">本会话候选 · {candidates.filter((c) => c.status === 'candidate').length} 待确认</div>
      {candidates.length === 0 && <p className="hint" style={{ padding: '0 2px' }}>候选不自动入册，家长三态确认后才成为记录。</p>}
      {candidates.map((c) => (
        <div key={c.id} className={'card queue-item live-cand ' + c.blade}>
          <div className="q-head">
            <b>{OBS[c.code]?.label ?? c.code}</b>
            <span className={'pill ' + (c.level || 'visible')} style={{ marginLeft: 'auto' }}>
              {c.level === 'unknown' ? '无法判断' : '画面/声音可见'}
            </span>
          </div>
          <p className="q-value">{c.value}</p>
          <p className="q-meta">置信度 {(c.confidence * 100).toFixed(0)}%{c.note ? ` · ${c.note}` : ''}</p>
          {c.status === 'candidate' ? (
            <div className="tri-row">
              <button className="btn sm" onClick={() => confirmCand(c.id, 'done')}>做到了</button>
              <button className="btn sm amber" onClick={() => confirmCand(c.id, 'sometimes')}>有时会</button>
              <button className="btn sm danger" onClick={() => confirmCand(c.id, 'notyet')}>还不会</button>
              <button className="btn sm ghost" onClick={() => confirmCand(c.id, 'reject')}>排除</button>
            </div>
          ) : (
            <p className="q-meta">已处理：{c.status === 'confirmed' ? `入册 · ${{ done: '做到了', sometimes: '有时会', notyet: '还不会' }[c.tri ?? ''] ?? ''}` : '已排除'}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- 周报 ---------- */
function Report({ report }: { report: ReturnType<typeof buildReport> }) {
  return (
    <div>
      <div className="hero">
        <h1>{report.childName} 的成长周报 · {report.ageMonths} 个月</h1>
        <p>{report.weekLabel} · WS/T 月龄对照 · 不评分 · {report.confirmedCount} 条已确认 / {report.totalClips} 段片段</p>
      </div>
      {report.sections.map((s) => (
        <div key={s.blade} className={'card rep-sec ' + s.blade}>
          <h3>
            <span className={'blade-ico ' + s.blade}><Ico name={s.blade} /></span>
            {s.title}
            {s.pending > 0 && <span className="pill parent" style={{ marginLeft: 'auto' }}>{s.pending} 条待确认未计入</span>}
          </h3>
          <p className="hint">{s.coverage}</p>
          {s.facts.length === 0 && <p className="empty-note">未获得可判断样本，不等同于不会</p>}
          <ul className="facts">
            {s.facts.map((f, i) => (
              <li key={i}>
                <span className={'pill ' + f.level}>{f.level === 'parent' ? '家长确认' : '画面可见'}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button className="btn" onClick={() => window.print()}>导出 / 打印沟通包（随访可夹入母子健康手册）</button>
    </div>
  );
}

/* ---------- 设置（信任设计面板） ---------- */
function Settings({ state, update, reset, toast }: {
  state: ReturnType<typeof useStore>['state'];
  update: ReturnType<typeof useStore>['update'];
  reset: () => void;
  toast: (m: string) => void;
}) {
  const toggles: { key: keyof typeof state.settings; label: string; desc: string }[] = [
    { key: 'cloudOff', label: '素材不上云', desc: '视频/音频片段只在本机处理' },
    { key: 'trainOff', label: '不用于训练', desc: '任何数据不进入模型训练' },
    { key: 'autoDelete7d', label: '未确认 7 天自动删', desc: '候选未被确认即到期删除' },
    { key: 'maskBedroom', label: '卧室遮罩', desc: '敏感场景画面默认遮罩' },
    { key: 'maskBathroom', label: '浴室遮罩', desc: '敏感场景画面默认遮罩' },
  ];
  return (
    <div>
      <div className="card">
        <h3>信任设计 · 产品原则</h3>
        <p className="hint">红线：不诊断 / 不评分 / 不识别身份 / 不做营养估算。以下开关为产品原则，默认全部开启。</p>
        {toggles.map((t) => (
          <label key={t.key} className="toggle-row">
            <div><b>{t.label}</b><small>{t.desc}</small></div>
            <input type="checkbox" checked={state.settings[t.key] as boolean}
              onChange={(ev) => update((s) => ({ ...s, settings: { ...s.settings, [t.key]: ev.target.checked } }))} />
          </label>
        ))}
      </div>
      <div className="card">
        <h3>数据源</h3>
        <p className="hint">当前：<b>{state.settings.mode === 'mock' ? 'mock 演示数据流（非预录实测）' : 'live 本机真实摄像头/麦克风'}</b>。eufy Web SDK / P2P 为预留接入位，接入前不产生里程碑。</p>
        <p className="hint">跳远标定：胶带线宽 {state.settings.calibCm}cm（已知物体标定）。分享链接 {state.settings.shareExpireDays} 天过期可撤回。</p>
      </div>
      <button className="btn ghost" onClick={() => { reset(); toast('已恢复小满一周剧本'); }}>重置演示数据</button>
    </div>
  );
}
