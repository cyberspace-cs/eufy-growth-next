/**
 * 会说管道：VAD 语音活动段 → 对话回合计数（判定层，纯代码）。
 * 诚实边界：VAD 只测语音活动，不做角色分离（谁在说话无法判定）；
 * 回合归属依赖家长在共读会话中的背书。双声源重叠 → unjudgeable 候选。
 */

const TURN_GAP_SEC = 2.5; // 静音间隙超过此值不算一来一回

export function createTalkPipeline(emit) {
  let turns = 0;
  let overlapSeen = false;
  let lastVoiceOff = null;
  let sawVoice = false;

  return {
    machine: 'talk',
    feed(ev) {
      if (ev.kind !== 'audio') return;
      if (ev.overlap) overlapSeen = true;
      if (ev.phase === 'voice-on') {
        if (lastVoiceOff != null && ev.t - lastVoiceOff <= TURN_GAP_SEC) turns += 1;
        sawVoice = true;
        emit({ type: 'state', machine: 'talk', state: 'voice-on', t: ev.t });
      } else if (ev.phase === 'voice-off') {
        lastVoiceOff = ev.t;
        emit({ type: 'state', machine: 'talk', state: 'voice-off', t: ev.t });
      } else if (ev.phase === 'end') {
        if (overlapSeen) {
          emit({
            type: 'candidate',
            blade: 'talk', code: 'turn_take', t: ev.t,
            value: '多声源重叠，无法切分儿童语音',
            confidence: 0.2, level: 'unknown', source: 'demo-mock-signal',
            note: '嘈杂/多声源直接标无法判断，不出提示',
          });
        }
        if (sawVoice && !overlapSeen) {
          emit({
            type: 'candidate',
            blade: 'talk', code: 'turn_take', t: ev.t,
            value: `共读会话：一来一回 ${turns} 个回合（语音活动推算，角色归属由共读场景背书）`,
            confidence: 0.87, level: 'visible', source: 'demo-mock-signal',
            note: 'VAD 只测语音活动，不做说话人分离',
          });
        }
        turns = 0; overlapSeen = false; sawVoice = false; lastVoiceOff = null;
      }
    },
  };
}
