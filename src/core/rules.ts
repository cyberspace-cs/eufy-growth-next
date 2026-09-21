import type { Knife, Level, Milestone } from '../types';

/** 四色来源标签元数据 */
export const LEVEL_META: Record<Level, { label: string; color: string; bg: string }> = {
  visible: { label: '画面/声音可见', color: '#2f6d4f', bg: '#e4f2e8' },
  parent: { label: '家长确认', color: '#a8760d', bg: '#fbf1dd' },
  suggestion: { label: '建议', color: '#087c9a', bg: '#e3f1f6' },
  unknown: { label: '无法判断', color: '#b23b3b', bg: '#fbe9e7' },
};

/** 三尖刀元数据（政策锚点） */
export const BLADES: Record<Knife, {
  name: string; en: string; cls: string; anchor: string; cam: string; flagship: string;
}> = {
  walk: {
    name: '会走', en: 'GROSS MOTOR', cls: 'walk',
    anchor: '五健 · 健康骨骼 ｜ WS/T 580 大运动能区',
    cam: 'S350 客厅全身机位（云台俯拍）',
    flagship: '兔子跳过线',
  },
  talk: {
    name: '会说', en: 'LANGUAGE', cls: 'talk',
    anchor: '五健 · 健康心理（筛查率 2030 达 90%）｜ WS/T 580 语言能区',
    cam: '近端麦克风（soundcore/E21）+ 视觉辅助',
    flagship: '对话回合 + 词/句 Firsts',
  },
  eat: {
    name: '会吃', en: 'RESPONSIVE FEEDING', cls: 'eat',
    anchor: '五健 · 健康体重 ｜ WS/T 479 回应式喂养',
    cam: 'S350 餐桌机位（侧/俯视）',
    flagship: '自主用勺 · 进餐不看屏',
  },
};

/** WS/T 月龄里程碑目录（能力对齐，不做评分） */
export const MILESTONES: Milestone[] = [
  { blade: 'walk', age: 24, code: 'run_stop', name: '跑稳，能停下', src: 'WS/T 580' },
  { blade: 'walk', age: 24, code: 'hop_in_place', name: '双脚同时离地原地跳', src: 'WS/T 580' },
  { blade: 'walk', age: 24, code: 'kick_ball', name: '不扶物、摆腿踢大球', src: 'WS/T 580' },
  { blade: 'walk', age: 30, code: 'hop_over_line', name: '双脚向前跳', src: 'WS/T 580（旗舰）' },
  { blade: 'walk', age: 36, code: 'stairs_alt', name: '交替脚上楼', src: 'WS/T 580' },
  { blade: 'talk', age: 12, code: 'understand_name', name: '听懂 ≥1 个物品名', src: '早期发展服务指南' },
  { blade: 'talk', age: 18, code: 'three_words', name: '说出 3 个有意义的词', src: '早期发展服务指南' },
  { blade: 'talk', age: 24, code: 'simple_sentence', name: '说简单句子（2–3 字组合）', src: '早期发展服务指南' },
  { blade: 'talk', age: 30, code: 'answer_q', name: '回答简单问题', src: '早期发展服务指南' },
  { blade: 'eat', age: 9, code: 'hand_food', name: '手抓食物自主进食', src: 'WS/T 580 精细动作' },
  { blade: 'eat', age: 18, code: 'self_spoon', name: '自主用勺进食', src: 'WS/T 580 适应能力' },
  { blade: 'eat', age: 24, code: 'cup_use', name: '用杯喝水', src: 'WS/T 580' },
  { blade: 'eat', age: 0, code: 'responsive', name: '对饥饱信号有回应', src: 'WS/T 479' },
  { blade: 'eat', age: 0, code: 'no_screen', name: '进餐时不看电子屏', src: '早期发展指南' },
  { blade: 'eat', age: 0, code: 'meal_duration', name: '每餐约 20 分钟', src: '早期发展指南' },
];

/** 观察类型目录：code → 尖刀 + 里程碑 */
export const OBS: Record<string, { blade: Knife; label: string; ms: string | null }> = {
  run_stop: { blade: 'walk', label: '红灯停绿灯行 · 跑稳能停', ms: 'run_stop' },
  hop_in_place: { blade: 'walk', label: '袋鼠跳 · 双脚原地跳', ms: 'hop_in_place' },
  kick_ball: { blade: 'walk', label: '踢纸球 · 摆腿踢球', ms: 'kick_ball' },
  hop_over_line: { blade: 'walk', label: '兔子跳过线 · 双脚向前跳', ms: 'hop_over_line' },
  turn_take: { blade: 'talk', label: '回应式对话回合', ms: null },
  first_word: { blade: 'talk', label: '新词 Firsts（家长确认）', ms: 'three_words' },
  simple_sentence: { blade: 'talk', label: '简单句 Firsts', ms: 'simple_sentence' },
  self_spoon: { blade: 'eat', label: '自主用勺', ms: 'self_spoon' },
  cup_use: { blade: 'eat', label: '用杯喝水', ms: 'cup_use' },
  no_screen: { blade: 'eat', label: '进餐看屏情况', ms: 'no_screen' },
  meal_duration: { blade: 'eat', label: '进餐时长', ms: 'meal_duration' },
  responsive: { blade: 'eat', label: '饥饱信号与家长回应', ms: 'responsive' },
  force_feed: { blade: 'eat', label: '追喂 / 强迫喂养', ms: null },
  food_candidate: { blade: 'eat', label: '食物候选（家长确认）', ms: null },
};

/**
 * 表述纪律：只允许通过这些函数生成文案。
 * 任何一处直接拼接「第一次」「掌握」「正常」都视为违规。
 */
export const PHRASE = {
  firstRecord: (what: string) => `本系统首次记录到：${what}`,
  noSample: () => '未获得可判断样本，不等同于不会',
  modeled: (what: string) => `${what}（成人示范后完成）`,
  unclearAudio: () => '音频不清晰，保留片段，未生成解释',
  plateChange: () => '餐盘可见数量变化，不自动计为摄入',
  occluded: () => '画面遮挡，不评价是否独立完成',
  sampleNote: (n: number) => `本周有效片段 ${n} 段，样本变化会影响数量比较`,
  deltaNote: (d: number) => `较上次单次观测差值 +${d.toFixed(1)}cm（个体记录，非标准阈值）`,
  foodCandidate: () => '食物仅给候选，家长确认后入账；不做营养/热量/过敏原',
};

/** 全站禁止出现的词。构建期 grep 校验，出现即为 bug。 */
export const FORBIDDEN = [
  '发育商', '语言年龄', '同龄百分位', '百分位', '智商',
  '人生第一次', '掌握', '正常', '落后', '达标', '临床',
];
