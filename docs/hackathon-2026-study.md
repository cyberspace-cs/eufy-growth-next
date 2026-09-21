# AdventureX 2026 获奖作品研究：叙事与架构学习笔记

> 研究日期：2026-09-21。来源：gallery.adventure-x.cn（AdventureX 2026 黑客松画廊）。
> 目的：为 eufy-growth-next 提炼可借鉴的叙事方式与代码/产品架构。

## 一、七个作品概览

| 作品 | 定位 | 获奖情况 | 对我们最有价值的一点 |
|---|---|---|---|
| ShiftX | 睡眠：游戏（夜班侦探）+ 开源硬件（Mini Lindo） | 双料冠军（AWS 赛道第一 + Injective AI 极客奖） | 双线叙事 + Agent 驱动开发流程（Graph-Prompt-For-Agent-Loop） |
| Night Watch 守夜犬 | 自主巡逻机器狗，识别疲劳后"邀请你去休息" | Dimensional 赛道 Grand Prize（全球第一） | 反向产品哲学 + 同意优先 + 诚实的边界声明 |
| AI 冰箱精灵 Fridge Spirit | T5AI 开发板 + 手机双端，食材库存/菜谱/采购清单 | 涂鸦智能赛道一等奖 | 存量设备改造 + "痛点→闭环流程→价值主张"叙事 |
| Ember | iOS 睡眠改善：健康数据 + 日程 + 环境 | 蓝盒子赛道三等奖 | 回答"今晚该怎么做"而非"昨晚睡得怎么样" |
| Syna | Rokid 智能眼镜：AI 日记 + 可问答的外置记忆 + 同频社交 | 未获奖但叙事完整 | "日记让你读过去，Syna 让你问过去" + 证据必须附带 + 明确的"不做什么" |
| Toy Diary | 玩偶数字生命，反转"谁记录谁" | 未获奖 | 把比赛主题（Reverse）做成产品核心而非贴标签 |
| Fiona | 大模型自主驱动的人头机器人 | 3 项奖（小红书/地瓜/Reverse 第四） | 双模型架构（主路人格 + 旁路情绪转表情动作） |

## 二、叙事层面的共性规律（可直接迁移）

### 1. 反直觉开场（Night Watch、Ember、Toy Diary）
- Night Watch："每个 AI 都想让你更努力，而它想让你休息。"
- Ember："不是告诉你昨晚睡得怎么样，而是回答今晚该怎么做。"
- Toy Diary："不是人记录玩偶，而是玩偶成为记录者。"

**迁移到我们**：当前 eufy-growth 的开场是"摄像头能记录成长"，太平了。应该反着说：
- "别的东西拍下孩子的过去，我们让家长看清孩子的现在。"
- 或对齐"13 次儿保随访之外的那 51 周"：国家安排了 13 次检查，而成长以周为单位发生——**摄像头是唯一每周都在场的观察者**。
- 会走线旗舰叙事："不是告诉你孩子跳得多远，而是这段拍清了、这个动作你确认过、这份材料可以带去儿保门诊。"

### 2. 具体场景做钩子（Night Watch、Syna）
- Night Watch："凌晨 2:27，你反复读同一段代码……"
- Syna："我钥匙放哪了？——昨天 17:42 你在玄关柜上放下了钥匙。"

**迁移到我们**：不用"成长记录"这种抽象词开场，用具体时刻：
- "周六下午 5 点，客厅。小满第 4 次双脚跳过那条胶带线——上一次是 3 天前，远了 5.5cm。你当时在厨房。"
- 儿保门诊场景："医生问'孩子 30 个月会双脚跳吗'，家长说不清——因为家长没在场。摄像头在场。"

### 3. 诚实边界作为卖点而非免责声明（Night Watch、Syna、StepInto）
获奖作品把"我们不做什么"写成了产品原则：
- Night Watch：不是医疗诊断、不默认身份识别、不强制休息、不无人值守照护；区分"当前可演示"与"仍在验证"。
- Syna：AI 回答必须附证据，找不到就承认找不到。

**迁移到我们**：eufy-growth 已有 FORBIDDEN 禁词表和四色标签，这是同类思路，但藏在代码里。应该把它**前台化**：
- 每条记录旁永远显示"画面可见 / 家长确认 / 无法判断"四色标签；
- "没拍到 ≠ 不会"直接做成产品 slogan 级别的原则；
- 设置页的"不上云 / 不训练 / 7 天删"从隐私声明升级为"信任设计"面板（学 Syna 的信任设计一节）。

### 4. 竞品对比表（Syna、FinSight）
Syna 用"传统日记 App / 社交 App / 语音助手"三列对比突出"只有第一人称全天候记录才能支撑问回来"。

**迁移到我们**：对比"家长手机拍视频 / 成长相册 App / 儿保随访"三列——只有固定机位 + 持续在场 + 家长确认闭环，才能产出"儿保医生看得懂"的材料。

### 5. 一天时间线叙事（Syna）
从 08:12 出门到次日 07:30 找钥匙，用完整一天串起所有功能。

**迁移到我们**：README 和路演首页做"小满的一天"：08:05 餐桌机位食物候选 → 12:05 自主用勺 → 17:06 兔子跳过线 → 20:05 睡前共读对话回合——四个时间点正好覆盖三尖刀，比按功能罗列有代入感得多。

## 三、架构层面的借鉴

### 1. ShiftX：Graph-Prompt-For-Agent-Loop（工程流程）
Plans 幂等提出 → 开发推进 → 美学与原则检验（Playwright 校对）→ 文档沉淀 → Plans 注销。初版 Agent 连续运行 12 小时自动完成。
**借鉴**：我们仓库加 `docs/plans/` 目录，每个计划一个 md 文件（幂等、可注销），配 `scripts/check-discipline.mjs` 做表述纪律的自动校验（grep FORBIDDEN 词表）——把"原则检验"从口头约定变成可执行脚本。

### 2. FinSight：AI 获取 Context、代码计算、AI 解释
确定性计算交给代码，LLM 只负责解释与沟通。
**借鉴**：这正是我们 server/llm-gateway 的定位——LLM 不做里程碑判定（判定走证据状态机），只做两件事：生成"下一周陪玩活动建议"文案、把已确认记录整理成儿保沟通摘要。

### 3. Fiona：双路模型架构
主路模型管人格与对话，旁路模型实时把情绪转成表情/动作。
**借鉴**：对应我们的"判定与表述分离"——core/rules.ts 的 PHRASE 函数（确定性表述）相当于主路，LLM gateway 只在表述安全区内润色。两者不混。

### 4. 冰箱精灵：存量改造 + 双端同步
不造新硬件，用涂鸦开发板改造存量冰箱；手机与冰箱屏 MQTT 实时同步。
**借鉴**：与我们的核心主张一致（复用家里已有的 eufy 摄像头）。它的"双端同步 + 离线可用"提醒我们：web 端必须 localStorage 优先、导出可携带，弱网/无网也能走完闭环。

### 5. Ember：数据可解释性
Rest Coach 能解释"为什么今晚的计划变了"。
**借鉴**：成长周报中每条建议都应可点开看到"依据是哪几条已确认记录"——建议永远挂证据 ID，不可追溯的建议不展示。

## 四、落地决策：eufy-growth-next 选用什么

| 决策点 | 选择 | 依据 |
|---|---|---|
| 叙事主线 | "13 次随访之外，摄像头每周都在场" + "小满的一天"时间线 | Night Watch 反直觉开场 + Syna 时间线 |
| 产品原则 | 四色标签前台化，"没拍到≠不会"做成 slogan | Night Watch/Syna 诚实边界 |
| 技术架构 | React 18 + TS + Vite 分层（types/store/rules/report） | 继承 eufy-growth，业界主流 |
| 内容配置 | 三尖刀目录 + WS/T 里程碑 + 小满剧本 | 继承 eufy-growth-cn |
| 表述纪律 | PHRASE 函数 + FORBIDDEN 禁词表 + 构建期 grep 校验脚本 | eufy-growth 已验证 + ShiftX 原则检验 |
| LLM 边界 | gateway 只做活动文案与沟通摘要，输入限已确认结构化记录 | FinSight "代码计算、AI 解释" |
| 部署形态 | 静态优先（Vite build），LLM 网关独立 Node 服务 | 冰箱精灵双端经验 + QW Pages 契约 |

## 五、来源链接

- ShiftX: https://gallery.adventure-x.cn/projects/cms0bwdu0000602iidhs63cmw
- Night Watch: https://gallery.adventure-x.cn/projects/cmrytbstu000002jgrd22bs75
- 冰箱精灵: https://gallery.adventure-x.cn/projects/cms0e2nyu000002kyp6mn2pws
- Ember: https://gallery.adventure-x.cn/projects/cmrymj150000c02jssmbee359
- Syna: https://gallery.adventure-x.cn/projects/cmrzqvcy1000602l7o4dphwr3
- Toy Diary: https://gallery.adventure-x.cn/projects/cmrzp8abo000102ibzrihv52g
- Fiona: https://gallery.adventure-x.cn/projects/cmrzzlykp000702litvnt1fji
