/**
 * Mock 信号源：确定性脚本生成信号流（非预录视频、非模型实测）。
 * 信号是适配器与管道之间的唯一契约——换成真实 SDK 时只改本目录。
 */

export function walkSessionSignals() {
  // 3 次跳跃；disp 单位 px（由关键点/脚部框给出），clarity 为落地帧清晰度
  const jumps = [
    { disp: 58, clarity: 0.95 },
    { disp: 61, clarity: 0.9 },
    { disp: 47, clarity: 0.55 }, // 落地帧脚部略糊
  ];
  const signals = [];
  let t = 2;
  for (const j of jumps) {
    signals.push({ t, kind: 'motion', value: 0.15, phase: 'standing' });
    signals.push({ t: t + 0.6, kind: 'motion', value: 0.92, phase: 'takeoff' });
    signals.push({ t: t + 1.0, kind: 'motion', value: 0.71, phase: 'airborne' });
    signals.push({ t: t + 1.5, kind: 'motion', value: 0.88, phase: 'landing', disp: j.disp, clarity: j.clarity });
    t += 4;
  }
  signals.push({ t: t + 0.5, kind: 'motion', value: 0.1, phase: 'end' });
  return { blade: 'walk', durationSec: t + 2, signals, tickMs: 220 };
}

export function talkSessionSignals() {
  // 语音活动段（VAD 输出，不做角色分离）+ 一段双声源重叠
  const segs = [
    { on: 2, off: 4.2 }, { on: 4.9, off: 6.8 }, { on: 7.5, off: 9.9 },
    { on: 10.6, off: 12.4 }, { on: 13.1, off: 15.6 }, { on: 16.2, off: 18.1 },
  ];
  const signals = [];
  for (const s of segs) {
    signals.push({ t: s.on, kind: 'audio', value: 1, phase: 'voice-on' });
    signals.push({ t: s.off, kind: 'audio', value: 0, phase: 'voice-off' });
  }
  // 双声源重叠窗口（电视 + 3 人说话）
  signals.push({ t: 20, kind: 'audio', value: 1, phase: 'voice-on', overlap: true });
  signals.push({ t: 23, kind: 'audio', value: 0, phase: 'voice-off', overlap: true });
  signals.push({ t: 24.5, kind: 'audio', value: 0, phase: 'end' });
  return { blade: 'talk', durationSec: 25, signals, tickMs: 220 };
}

export function eatSessionSignals() {
  // 分钟级采样：utensil 每分钟举勺周期数、screen 屏幕在场分钟数
  const signals = [];
  for (let m = 1; m <= 21; m++) {
    const rate = m <= 12 ? 11 : 4; // 前 12 分钟自主用勺，后段成人喂
    signals.push({ t: m, kind: 'utensil', value: rate, phase: 'meal' });
    if (m >= 12 && m <= 19) signals.push({ t: m + 0.5, kind: 'screen', value: 1, phase: 'screen-on' });
  }
  signals.push({ t: 21.5, kind: 'utensil', value: 0, phase: 'end' });
  return { blade: 'eat', durationSec: 21.5, signals, tickMs: 320 };
}
