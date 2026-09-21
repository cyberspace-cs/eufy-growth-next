import type { Evidence, Knife, Level } from '../types';
import { OBS, PHRASE } from './rules';

export interface BladeSection {
  blade: Knife;
  title: string;
  facts: { text: string; level: Level; ev: Evidence }[];
  coverage: string;
  pending: number;
}

export interface WeekReport {
  childName: string;
  ageMonths: number;
  weekLabel: string;
  sections: BladeSection[];
  pendingCount: number;
  confirmedCount: number;
  totalClips: number;
}

const TRI_LABEL: Record<string, string> = { done: '做到了', sometimes: '有时会', notyet: '还不会' };

export function statusOf(e: Evidence): { cls: string; txt: string } {
  if (e.status === 'confirmed')
    return { cls: e.tri === 'done' ? 'done' : e.tri === 'sometimes' ? 'some' : 'none', txt: TRI_LABEL[e.tri ?? ''] };
  if (e.status === 'rejected') return { cls: 'none', txt: '已排除' };
  if (e.status === 'unjudgeable') return { cls: 'none', txt: '无法判断' };
  return { cls: 'none', txt: '待确认' };
}

export function pendingList(ev: Evidence[]): Evidence[] {
  return ev.filter((e) => e.status === 'candidate');
}

export function confirmedList(ev: Evidence[]): Evidence[] {
  return ev.filter((e) => e.status === 'confirmed');
}

/** 里程碑状态：由已确认证据推导（没拍到 ≠ 不会） */
export function milestoneState(ev: Evidence[], code: string): Evidence | null {
  const hits = confirmedList(ev).filter((e) => OBS[e.code]?.ms === code);
  return hits.length ? hits[hits.length - 1] : null;
}

/** 报告只用已确认证据；覆盖率与待确认数永远显示 */
export function buildReport(
  ev: Evidence[],
  childName: string,
  ageMonths: number,
  weekLabel: string,
  bladeTitles: Record<Knife, string>,
): WeekReport {
  const sections: BladeSection[] = (['walk', 'talk', 'eat'] as Knife[]).map((blade) => {
    const all = ev.filter((e) => e.blade === blade);
    const confirmed = confirmedList(all);
    const facts = confirmed.map((e) => ({
      text: factText(e),
      level: (e.status === 'confirmed' ? 'parent' : e.level) as Level,
      ev: e,
    }));
    return {
      blade,
      title: bladeTitles[blade],
      facts,
      coverage: PHRASE.sampleNote(all.length),
      pending: pendingList(all).length,
    };
  });
  return {
    childName, ageMonths, weekLabel,
    sections,
    pendingCount: pendingList(ev).length,
    confirmedCount: confirmedList(ev).length,
    totalClips: ev.length,
  };
}

/** 表述纪律入口：结果文案只从这里出 */
function factText(e: Evidence): string {
  if (e.status === 'unjudgeable') return PHRASE.noSample();
  let base = e.value;
  if (e.words?.length) base += `（${e.words.join('、')}）`;
  if (e.distCm != null) base += `，${e.distCm.toFixed(1)}cm`;
  return base;
}
