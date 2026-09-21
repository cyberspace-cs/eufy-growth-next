/**
 * 会走管道：运动信号 → 跳跃状态机（判定层，纯代码，不经 LLM）。
 * 状态：standing → possible_takeoff → possible_airborne → possible_landing → review(出候选)
 * 超时 3 秒未迁移即回 standing，并记录放弃原因（无法测量保留原因，不写零分）。
 */

const TAKEOFF_THRESH = 0.85;
const AIRBORNE_RANGE = [0.5, 0.8];
const LANDING_THRESH = 0.85;
const STUCK_TIMEOUT_MS = 3000;

export function createWalkPipeline(emit) {
  let state = 'standing';
  let stateAt = 0;
  let tAir = null;

  const setState = (s, ev) => {
    state = s;
    stateAt = ev.t;
    emit({ type: 'state', machine: 'walk', state: s, t: ev.t });
  };

  return {
    machine: 'walk',
    feed(ev) {
      if (ev.kind !== 'motion') return;
      const elapsed = (ev.t - stateAt) * 1000;
      if (state !== 'standing' && elapsed > STUCK_TIMEOUT_MS) {
        emit({ type: 'audit', machine: 'walk', reason: `状态 ${state} 超过 3s 未迁移，重置`, t: ev.t });
        setState('standing', ev);
      }
      switch (state) {
        case 'standing':
          if (ev.value >= TAKEOFF_THRESH || ev.phase === 'takeoff') setState('possible_takeoff', ev);
          break;
        case 'possible_takeoff':
          if (ev.value >= AIRBORNE_RANGE[0] && ev.value <= AIRBORNE_RANGE[1]) {
            tAir = ev.t;
            setState('possible_airborne', ev);
          }
          break;
        case 'possible_airborne':
          if (ev.value >= LANDING_THRESH && ev.phase === 'landing') {
            // 已知物体标定换算：胶带线宽 5cm 占 12.4px
            const CALIB_CM = 5, CALIB_PX = 12.4;
            const distCm = ev.disp != null ? (ev.disp * CALIB_CM) / CALIB_PX : null;
            const confidence = Math.min(0.95, 0.55 + 0.4 * (ev.clarity ?? 0.6));
            emit({
              type: 'candidate',
              blade: 'walk', code: 'hop_over_line', t: ev.t,
              value: distCm != null ? `双脚向前跳过胶带线，估算 ${distCm.toFixed(1)}cm` : '双脚向前跳过胶带线',
              distCm, confidence,
              note: (ev.clarity ?? 1) < 0.7 ? '落地帧脚部略糊，需家长确认' : '胶带线宽 5cm 已知物体标定',
              level: 'visible', source: 'demo-mock-signal',
            });
            setState('standing', ev);
          }
          break;
        default: break;
      }
    },
  };
}
