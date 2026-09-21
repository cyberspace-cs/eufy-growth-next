/**
 * 会吃管道：餐具运动周期 + 屏幕标志 + 会话时长（判定层，纯代码）。
 * 诚实边界：勺到嘴 ≠ 吞咽成功；屏幕入镜 ≠ 持续看屏；时长是会话起止，不宣称实际进食时长。
 */

const SELF_SPOON_RATE = 8;      // 每分钟举勺周期 ≥8 视为自主用勺段
const SCREEN_ALERT_MIN = 5;     // 屏幕在场 ≥5 分钟才出候选

export function createEatPipeline(emit) {
  let minutes = 0;
  let selfSpoonMin = 0;
  let fedMin = 0;
  let screenMin = 0;

  return {
    machine: 'eat',
    feed(ev) {
      if (ev.kind === 'utensil') {
        if (ev.phase === 'end') {
          if (selfSpoonMin >= 3) {
            emit({
              type: 'candidate',
              blade: 'eat', code: 'self_spoon', t: ev.t,
              value: `会话 ${minutes} 分钟，其中 ${selfSpoonMin} 分钟自主用勺（周期率 ≥8 次/分）`,
              confidence: 0.9, level: 'visible', source: 'demo-mock-signal',
              note: '勺到嘴不等于吞咽成功，仅记录可见行为',
            });
          }
          if (fedMin >= 3) {
            emit({
              type: 'candidate',
              blade: 'eat', code: 'force_feed', t: ev.t,
              value: `后段 ${fedMin} 分钟举勺周期骤降（≤4 次/分），疑似成人喂`,
              confidence: 0.66, level: 'visible', source: 'demo-mock-signal',
              note: '疑似追喂；指南要求不强迫进食，请家长确认',
            });
          }
          emit({
            type: 'candidate',
            blade: 'eat', code: 'meal_duration', t: ev.t,
            value: `会话 ${minutes} 分钟（指南建议每餐约 20 分钟）`,
            confidence: 0.95, level: 'visible', source: 'demo-mock-signal',
            note: '会话起止计时，不宣称实际进食时长',
          });
          minutes = 0; selfSpoonMin = 0; fedMin = 0; screenMin = 0;
          return;
        }
        minutes += 1;
        if (ev.value >= SELF_SPOON_RATE) selfSpoonMin += 1;
        else if (ev.value > 0 && ev.value <= 4) fedMin += 1;
        emit({ type: 'state', machine: 'eat', state: `minute ${minutes} · ${ev.value} 次/分`, t: ev.t });
      } else if (ev.kind === 'screen') {
        screenMin += 1;
        if (screenMin === SCREEN_ALERT_MIN) {
          emit({
            type: 'candidate',
            blade: 'eat', code: 'no_screen', t: ev.t,
            value: `餐桌屏幕在场已达 ${screenMin} 分钟`,
            confidence: 0.74, level: 'visible', source: 'demo-mock-signal',
            note: '屏幕入镜不等于儿童持续看屏；指南原话：进餐时不观看电视、手机',
          });
        }
      }
    },
  };
}
