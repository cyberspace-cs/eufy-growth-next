/** 三尖刀 */
export type Knife = 'walk' | 'talk' | 'eat';

/** 四色来源标签：全站每一条输出都必须带其一 */
export type Level = 'visible' | 'parent' | 'suggestion' | 'unknown';

/** 证据状态机：candidate → 家长三态确认 → confirmed / rejected / unjudgeable */
export type EvidenceStatus = 'candidate' | 'confirmed' | 'rejected' | 'unjudgeable';

/** 家长三态 */
export type TriState = 'done' | 'sometimes' | 'notyet';

/** 数据来源 */
export type SourceKind = 'vision' | 'audio' | 'demo';

export interface Evidence {
  id: string;
  blade: Knife;
  /** 观察类型 code，对应 OBS 目录 */
  code: string;
  observedAt: string;
  source: SourceKind;
  level: Level;
  status: EvidenceStatus;
  tri: TriState | null;
  /** 人读描述 */
  value: string;
  confidence: number;
  note: string;
  /** 会说：词/句 */
  words: string[] | null;
  /** 会吃：食物候选（家长确认才入账） */
  foods: string[] | null;
  /** 会走：跳过线距离 cm（已知物体标定，个体记录） */
  distCm: number | null;
}

export interface Settings {
  mode: 'mock' | 'live';
  cloudOff: boolean;
  trainOff: boolean;
  autoDelete7d: boolean;
  collecting: boolean;
  maskBedroom: boolean;
  maskBathroom: boolean;
  calibCm: number;
  shareExpireDays: number;
}

export interface AppState {
  evidence: Evidence[];
  settings: Settings;
}

/** 里程碑（WS/T 月龄对照，不做评分） */
export interface Milestone {
  blade: Knife;
  age: number;
  code: string;
  name: string;
  src: string;
}
