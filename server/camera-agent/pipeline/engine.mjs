/**
 * 会话引擎：信号源 → 管道 → 事件总线（SSE）。
 * 会话制（同意优先，学 Night Watch）：家长显式 start，会话结束即停，不后台常开。
 */
import { walkSessionSignals, talkSessionSignals, eatSessionSignals } from '../adapters/mock-source.mjs';
import { createWalkPipeline } from './walk.mjs';
import { createTalkPipeline } from './talk.mjs';
import { createEatPipeline } from './eat.mjs';

const SOURCES = {
  walk: walkSessionSignals,
  talk: talkSessionSignals,
  eat: eatSessionSignals,
};
const PIPELINES = {
  walk: createWalkPipeline,
  talk: createTalkPipeline,
  eat: createEatPipeline,
};

let sessionSeq = 0;
let candSeq = 0;

export class SessionManager {
  constructor() {
    this.active = null;   // { id, blade, pipeline, signals, idx, timer, startedAt }
    this.listeners = new Set();
    this.candidates = [];
    this.audit = [];
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  broadcast(ev) {
    if (ev.type === 'audit') this.audit.push(ev);
    const s = JSON.stringify(ev);
    for (const fn of this.listeners) fn(s);
  }

  start(blade) {
    if (!SOURCES[blade]) throw new Error(`未知尖刀 ${blade}`);
    this.stop('被新会话替代');
    const spec = SOURCES[blade]();
    const id = `s${++sessionSeq}`;
    const pipeline = PIPELINES[blade]((ev) => this.broadcast({ ...ev, sessionId: id }));
    this.active = { id, blade, pipeline, signals: spec.signals, idx: 0, tickMs: spec.tickMs, timer: null };
    this.broadcast({ type: 'session-start', sessionId: id, blade, source: 'demo-mock-signal' });
    this.active.timer = setInterval(() => this.tick(), spec.tickMs);
    return { id, blade };
  }

  tick() {
    const a = this.active;
    if (!a) return;
    if (a.idx >= a.signals.length) return this.stop('信号播放完毕');
    const sig = a.signals[a.idx++];
    this.broadcast({ type: 'signal', sessionId: a.id, ...sig });
    a.pipeline.feed(sig);
  }

  stop(reason) {
    const a = this.active;
    if (!a) return;
    if (a.timer) clearInterval(a.timer);
    this.active = null;
    this.broadcast({ type: 'session-end', sessionId: a.id, blade: a.blade, reason });
  }

  /** 候选在引擎侧登记（管道只广播，状态机确认也在这里） */
  registerCandidate(c) {
    const id = `c${++candSeq}`;
    const cand = { ...c, id, status: 'candidate', tri: null };
    this.candidates.push(cand);
    return cand;
  }

  confirm(id, tri) {
    const c = this.candidates.find((x) => x.id === id);
    if (!c) throw new Error(`候选 ${id} 不存在`);
    c.status = tri === 'reject' ? 'rejected' : 'confirmed';
    if (c.status === 'confirmed') c.tri = tri;
    this.broadcast({ type: 'candidate-updated', candidate: c });
    return c;
  }
}

/** 包装：把管道的 candidate 事件登记进会话存储再广播 */
export function attachCandidateRegistration(mgr) {
  const origBroadcast = mgr.broadcast.bind(mgr);
  mgr.broadcast = (ev) => {
    if (ev.type === 'candidate') {
      const cand = mgr.registerCandidate(ev);
      return origBroadcast({ type: 'candidate', candidate: cand });
    }
    return origBroadcast(ev);
  };
}
