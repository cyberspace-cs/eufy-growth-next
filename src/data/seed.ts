import type { AppState, Evidence, SourceKind } from '../types';

export const CHILD = { name: '小满', ageMonths: 26 };
export const DEMO_MODE: 'mock' | 'live' = 'mock';
export const META = {
  week: '2026-W38（09-15 ~ 09-21）',
  disclaimer: '演示数据流 · 非预录实测 · 非真实儿童',
};

type Raw = Partial<Evidence> & { id: string; code: string; at: string };

const mk = (o: Raw): Evidence => ({
  blade: (OBS_CODE_BLADE[o.code]),
  code: o.code,
  observedAt: o.at,
  source: (o.source ?? 'vision') as SourceKind,
  level: o.level ?? 'visible',
  status: o.status ?? 'candidate',
  tri: o.tri ?? null,
  value: o.value ?? '',
  confidence: o.confidence ?? 0.85,
  note: o.note ?? '',
  words: o.words ?? null,
  foods: o.foods ?? null,
  distCm: o.distCm ?? null,
  id: o.id,
});

/** code → blade 查表（避免循环依赖，从 rules 复制映射） */
const OBS_CODE_BLADE: Record<string, Evidence['blade']> = {
  run_stop: 'walk', hop_in_place: 'walk', kick_ball: 'walk', hop_over_line: 'walk',
  turn_take: 'talk', first_word: 'talk', simple_sentence: 'talk',
  self_spoon: 'eat', cup_use: 'eat', no_screen: 'eat', meal_duration: 'eat',
  responsive: 'eat', force_feed: 'eat', food_candidate: 'eat',
};

/** 预置剧本：小满 26 月龄 · 一周（2026-09-15 ~ 09-21）
 * 确定性脚本数据，非预录视频、非模型实测；现场点按即走通三尖刀闭环。 */
export function seedEvidence(): Evidence[] {
  const D = '2026-09-';
  const raw: Raw[] = [
    // ===== 会走 =====
    { id: 'w1', code: 'run_stop', at: D + '16 16:40', status: 'confirmed', tri: 'done',
      value: '跑动后听到「红灯」能停下，共 3 次', confidence: .92, note: '成人在旁发口令' },
    { id: 'w2', code: 'hop_in_place', at: D + '17 17:02', status: 'confirmed', tri: 'done',
      value: '双脚同时离地原地跳 4 次', confidence: .88 },
    { id: 'w3', code: 'kick_ball', at: D + '18 16:55', status: 'confirmed', tri: 'sometimes',
      value: '不扶物摆腿踢中纸球 2 次，1 次踢空', confidence: .81 },
    { id: 'w4', code: 'hop_over_line', at: D + '18 17:10', status: 'confirmed', tri: 'done',
      value: '双脚向前跳过胶带线', distCm: 18.0, confidence: .86, note: '胶带线宽 5cm 已知物体标定' },
    { id: 'w5', code: 'hop_over_line', at: D + '19 17:06', status: 'confirmed', tri: 'done',
      value: '双脚向前跳过胶带线', distCm: 23.5, confidence: .89, note: '较 09-18 单次进步 +5.5cm（个体记录，非标准阈值）' },
    { id: 'w6', code: 'hop_over_line', at: D + '21 09:12',
      value: '疑似双脚向前跳过线，估算距离 24.0cm', distCm: 24.0, confidence: .62,
      note: '落地帧脚部略糊，需家长确认' },
    { id: 'w7', code: 'hop_in_place', at: D + '17 17:20', status: 'unjudgeable', level: 'unknown',
      value: '沙发扶走片段，下半身被茶几遮挡', confidence: .31, note: '没拍到 ≠ 不会' },

    // ===== 会说 =====
    { id: 't1', code: 'turn_take', at: D + '17 20:05', source: 'audio', status: 'confirmed', tri: 'done',
      value: '共读《月亮晚上好》：一来一回 6 个回合', confidence: .9 },
    { id: 't2', code: 'first_word', at: D + '17 20:12', source: 'audio', status: 'confirmed', tri: 'done',
      value: '新词', words: ['月亮'], confidence: .88 },
    { id: 't3', code: 'first_word', at: D + '18 08:30', source: 'audio', status: 'confirmed', tri: 'done',
      value: '新词', words: ['蚂蚁'], confidence: .7 },
    { id: 't4', code: 'turn_take', at: D + '19 19:40', source: 'audio', status: 'unjudgeable', level: 'unknown',
      value: '电视背景音 + 3 人同时说话，无法切分儿童语音', confidence: .2,
      note: '嘈杂/多声源直接标无法判断，不出提示' },
    { id: 't5', code: 'turn_take', at: D + '20 20:10', source: 'audio', status: 'confirmed', tri: 'done',
      value: '睡前对话：一来一回 5 个回合', confidence: .87 },
    { id: 't6', code: 'simple_sentence', at: D + '20 20:14', source: 'audio',
      value: '疑似 3 字简单句', words: ['我要香蕉'], confidence: .58,
      note: '对应 24 月龄「说简单句子」，家长确认后入册' },
    { id: 't7', code: 'first_word', at: D + '21 08:46', source: 'audio',
      value: '疑似新词', words: ['泡泡'], confidence: .61 },

    // ===== 会吃 =====
    { id: 'e1', code: 'self_spoon', at: D + '16 12:05', status: 'confirmed', tri: 'done',
      value: '多次自主用勺舀起食物送入口中', confidence: .9 },
    { id: 'e2', code: 'meal_duration', at: D + '16 12:26', status: 'confirmed', tri: 'done',
      value: '午餐 21 分钟（指南建议每餐约 20 分钟）', confidence: .95 },
    { id: 'e3', code: 'no_screen', at: D + '16 12:05', status: 'confirmed', tri: 'done',
      value: '餐桌未见电子屏，孩子未看屏', confidence: .93 },
    { id: 'e4', code: 'cup_use', at: D + '17 18:02', status: 'confirmed', tri: 'done',
      value: '双手端杯喝水，少量洒出', confidence: .84 },
    { id: 'e5', code: 'no_screen', at: D + '18 18:30',
      value: '晚餐期间餐桌出现手机，孩子注视屏幕约 12 分钟', confidence: .74,
      note: '指南原话：进餐时不观看电视、手机' },
    { id: 'e6', code: 'force_feed', at: D + '18 18:41',
      value: '成人端碗离开餐桌跟随喂饭约 40 秒', confidence: .66,
      note: '疑似追喂；指南要求不强迫进食，请家长确认' },
    { id: 'e7', code: 'responsive', at: D + '20 12:18', status: 'confirmed', tri: 'done',
      value: '孩子推开碗、转头（饱信号），家长随即停止喂食', confidence: .8 },
    { id: 'e8', code: 'meal_duration', at: D + '20 12:00', status: 'confirmed', tri: 'done',
      value: '午餐 19 分钟', confidence: .95 },
    { id: 'e9', code: 'self_spoon', at: D + '20 12:08', status: 'confirmed', tri: 'sometimes',
      value: '前半餐自主用勺，后半餐由成人喂', confidence: .72 },
    { id: 'e10', code: 'food_candidate', at: D + '21 08:05',
      value: '餐前清晰帧给出食物候选', foods: ['香蕉', '燕麦'], confidence: .6,
      note: '食物仅给候选，家长一键确认才入账；不做营养/热量/过敏原' },
  ];
  return raw.map(mk);
}

export function initialState(): AppState {
  return {
    evidence: seedEvidence(),
    settings: {
      mode: DEMO_MODE,
      cloudOff: true, trainOff: true, autoDelete7d: true,
      collecting: true, maskBedroom: true, maskBathroom: true,
      calibCm: 5, shareExpireDays: 7,
    },
  };
}

/** 「小满的一天」时间线（叙事钩子，学 Syna 的一天旅程叙事） */
export const DAY_TIMELINE: { time: string; blade: Evidence['blade']; text: string }[] = [
  { time: '08:05', blade: 'eat', text: '餐桌机位：餐前清晰帧给出食物候选（香蕉、燕麦），等你确认' },
  { time: '12:05', blade: 'eat', text: '自主用勺 4 次，午餐 21 分钟，餐桌无屏幕' },
  { time: '17:06', blade: 'walk', text: '兔子跳过线：双脚向前跳 23.5cm，比 3 天前远了 5.5cm——你当时在厨房' },
  { time: '20:05', blade: 'talk', text: '睡前共读：一来一回 6 个对话回合，新词「月亮」' },
];
