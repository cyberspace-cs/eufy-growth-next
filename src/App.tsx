import { useMemo, useState } from 'react';
import { useStore } from './store';
import { buildReport, pendingList, confirmedList } from './core/report';
import { BLADES, LEVEL_META, MILESTONES, OBS } from './core/rules';
import { CHILD, DAY_TIMELINE, META } from './data/seed';
import type { Evidence, Knife, TriState } from './types';

type Tab = 'home' | 'review' | 'report' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: '今天', icon: 'M3 11.5 12 4l9 7.5M5.5 10v10h13V10' },
  { key: 'review', label: '待确认', icon: 'M4 12.5 10 18 20 6' },
  { key: 'report', label: '周报', icon: 'M6 3h9l4 4v14H6zM9 12h7M9 16h5' },
  { key: 'settings', label: '设置', icon: 'M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z' },
];

export default function App() {
  const { state, update, reset } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const pending = pendingList(state.evidence);
  const report = useMemo(() => buildReport(
    state.evidence, CHILD.name, CHILD.ageMonths, META.week,
    { walk: '会走 · 大运动', talk: '会说 · 语言', eat: '会吃 · 回应式喂养' },
  ), [state.evidence]);

  const confirm = (id: string, tri: TriState) => update((s) => ({
    ...s,
    evidence: s.evidence.map((e) =>
      e.id === id ? { ...e, status: 'confirmed' as const, tri, level: 'parent' as const } : e),
  }));
  const reject = (id: string) => update((s) => ({
    ...s, evidence: s.evidence.map((e) => (e.id === id ? { ...e, status: 'rejected' as const } : e)),
  }));
  const unjudge = (id: string) => update((s) => ({
    ...s, evidence: s.evidence.map((e) => (e.id === id ? { ...e, status: 'unjudgeable' as const } : e)),
  }));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">eufy</span>
          <div><b>成长同行 next</b><small>中国 0–6 · 会走 会说 会吃</small></div>
        </div>
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'nav-item active' : 'nav-item'} onClick={() => setTab(t.key)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d={t.icon} /></svg>
            {t.label}
            {t.key === 'review' && pending.length > 0 && <span className="badge">{pending.length}</span>}
          </button>
        ))}
        <div className="sidebar-foot">
          <a href="/deck.html" target="_blank">路演 →</a>
          <a href="/report.html" target="_blank">方案报告 →</a>
          <a href="/uk-deck.html" target="_blank">英国调研 →</a>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <b>{CHILD.name}</b><span className="dim">· {CHILD.ageMonths} 个月</span>
          <span className="demo-tag">{META.disclaimer}</span>
        </header>

        {tab === 'home' && <Home evidence={state.evidence} pendingCount={pending.length} />}
        {tab === 'review' && <Review list={pending} onConfirm={confirm} onReject={reject} onUnjudge={unjudge} />}
        {tab === 'report' && <Report report={report} />}
        {tab === 'settings' && <Settings state={state} update={update} reset={reset} />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'tab active' : 'tab'} onClick={() => setTab(t.key)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d={t.icon} /></svg>
            <span>{t.label}</span>
            {t.key === 'review' && pending.length > 0 && <i className="badge">{pending.length}</i>}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------- 今天：小满的一天时间线（学 Syna 一天叙事） ---------- */
function Home({ evidence, pendingCount }: { evidence: Evidence[]; pendingCount: number }) {
  const confirmed = confirmedList(evidence);
  return (
    <div className="page">
      <section className="hero">
        <p className="hero-eyebrow">国家安排了 13 次儿保随访</p>
        <h1>36 月龄到 4 岁之间隔 12 个月——<br />而成长以「周」为单位发生。</h1>
        <p className="hero-sub">摄像头是随访之外<strong>每周都在场</strong>的观察者。不诊断、不评分、不识别身份；只回答三件事：这段拍清了、这个动作你确认过、这份材料能带去儿保门诊。</p>
      </section>

      <section className="card">
        <h3>小满的一天 · 2026-09-21</h3>
        <div className="timeline">
          {DAY_TIMELINE.map((d) => (
            <div key={d.time} className="tl-item">
              <span className={'tl-time ' + d.blade}>{d.time}</span>
              <span className={'tl-dot ' + d.blade} />
              <span className="tl-text">{d.text}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="stat-row">
        <div className="stat"><b>{confirmed.length}</b><span>已确认记录</span></div>
        <div className="stat warn"><b>{pendingCount}</b><span>待你确认</span></div>
        <div className="stat"><b>{evidence.length}</b><span>本周片段</span></div>
      </div>

      <div className="blade-grid">
        {(Object.keys(BLADES) as Knife[]).map((k) => {
          const ms = MILESTONES.filter((m) => m.blade === k && m.age <= CHILD.ageMonths + 6).slice(-3);
          return (
            <div key={k} className={'card blade ' + k}>
              <div className="blade-head">
                <b>{BLADES[k].name}</b><span className="en">{BLADES[k].en}</span>
              </div>
              <p className="dim">{BLADES[k].anchor}</p>
              <p className="cam">📷 {BLADES[k].cam}</p>
              <ul>
                {ms.map((m) => <li key={m.code}>{m.name}<i className="dim">{m.age} 月</i></li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 待确认：证据状态机 ---------- */
function Review({ list, onConfirm, onReject, onUnjudge }: {
  list: Evidence[];
  onConfirm: (id: string, tri: TriState) => void;
  onReject: (id: string) => void;
  onUnjudge: (id: string) => void;
}) {
  if (!list.length)
    return <div className="page empty">🎉 本周候选全部处理完。<br /><span className="dim">没拍到 ≠ 不会——未获得样本的里程碑一律显示「未获得可判断样本」。</span></div>;
  return (
    <div className="page">
      <p className="dim rule-note">候选不自动入册。家长三态确认（做到了 / 有时会 / 还不会）后才成为记录；可排除或标无法判断。</p>
      {list.map((e) => {
        const meta = OBS[e.code];
        return (
          <div key={e.id} className={'card cand ' + e.blade}>
            <div className="cand-head">
              <b>{meta?.label ?? e.code}</b>
              <span className="pill" style={{ color: LEVEL_META[e.level].color, background: LEVEL_META[e.level].bg }}>
                {LEVEL_META[e.level].label}
              </span>
            </div>
            <p className="cand-value">{e.value}
              {e.words?.length ? <em>（{e.words.join('、')}）</em> : null}
              {e.distCm != null ? <em>，{e.distCm.toFixed(1)}cm</em> : null}
            </p>
            <p className="dim">置信度 {(e.confidence * 100).toFixed(0)}% · {e.observedAt.slice(5)} {e.source === 'audio' ? '· 麦克风' : '· 摄像头'}</p>
            {e.note && <p className="note">{e.note}</p>}
            <div className="tri-row">
              <button className="btn ok" onClick={() => onConfirm(e.id, 'done')}>做到了</button>
              <button className="btn some" onClick={() => onConfirm(e.id, 'sometimes')}>有时会</button>
              <button className="btn no" onClick={() => onConfirm(e.id, 'notyet')}>还不会</button>
              <button className="btn ghost" onClick={() => onReject(e.id)}>排除</button>
              <button className="btn ghost" onClick={() => onUnjudge(e.id)}>无法判断</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 周报：只用已确认证据 ---------- */
function Report({ report }: { report: ReturnType<typeof buildReport> }) {
  return (
    <div className="page">
      <div className="report-head">
        <h2>{report.childName} · {report.ageMonths} 个月 · 成长周报</h2>
        <p className="dim">{report.weekLabel} · WS/T 月龄对照 · 不评分 · {report.confirmedCount} 条已确认 / {report.totalClips} 段片段</p>
      </div>
      {report.sections.map((s) => (
        <section key={s.blade} className={'card blade ' + s.blade}>
          <h3>{s.title}</h3>
          <p className="coverage">{s.coverage}{s.pending > 0 && <em>（{s.pending} 条待确认，未计入）</em>}</p>
          {s.facts.length === 0 && <p className="empty-note">未获得可判断样本，不等同于不会</p>}
          <ul className="facts">
            {s.facts.map((f, i) => (
              <li key={i}>
                <span className="pill" style={{ color: LEVEL_META[f.level].color, background: LEVEL_META[f.level].bg }}>
                  {LEVEL_META[f.level].label}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <button className="btn ok big" onClick={() => window.print()}>导出 / 打印沟通包</button>
    </div>
  );
}

/* ---------- 设置：信任设计面板（学 Syna 信任设计） ---------- */
function Settings({ state, update, reset }: {
  state: ReturnType<typeof useStore>['state'];
  update: ReturnType<typeof useStore>['update'];
  reset: () => void;
}) {
  const toggles: { key: keyof typeof state.settings; label: string; desc: string }[] = [
    { key: 'cloudOff', label: '素材不上云', desc: '视频/音频片段只在本机处理' },
    { key: 'trainOff', label: '不用于训练', desc: '任何数据不进入模型训练' },
    { key: 'autoDelete7d', label: '未确认 7 天自动删', desc: '候选未被确认即到期删除' },
    { key: 'maskBedroom', label: '卧室遮罩', desc: '敏感场景画面默认遮罩' },
    { key: 'maskBathroom', label: '浴室遮罩', desc: '敏感场景画面默认遮罩' },
  ];
  return (
    <div className="page">
      <section className="card">
        <h3>信任设计</h3>
        <p className="dim">红线：不诊断 / 不评分 / 不识别身份 / 不做营养估算。以下开关为产品原则，默认全部开启。</p>
        {toggles.map((t) => (
          <label key={t.key} className="toggle-row">
            <div><b>{t.label}</b><span className="dim">{t.desc}</span></div>
            <input
              type="checkbox"
              checked={state.settings[t.key] as boolean}
              onChange={(ev) => update((s) => ({ ...s, settings: { ...s.settings, [t.key]: ev.target.checked } }))}
            />
          </label>
        ))}
      </section>
      <section className="card">
        <h3>数据源</h3>
        <p className="dim">当前模式：<b>{state.settings.mode === 'mock' ? 'mock 演示数据流（非预录实测）' : 'live 本机真实摄像头/麦克风'}</b>。eufy Web SDK / P2P 为预留接入位，接入前不产生里程碑。</p>
        <p className="dim">跳远标定：胶带线宽 {state.settings.calibCm}cm（已知物体标定）。分享链接 {state.settings.shareExpireDays} 天过期可撤回。</p>
      </section>
      <button className="btn ghost big" onClick={reset}>重置演示数据（恢复小满一周剧本）</button>
    </div>
  );
}
