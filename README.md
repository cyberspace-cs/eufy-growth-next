# eufy 成长同行 next · 中国 0–6「会走 · 会说 · 会吃」

融合版：**架构取 eufy-growth（React 18 + TypeScript + Vite 分层 + 表述纪律），内容取 eufy-growth-cn（三尖刀 + WS/T 里程碑 + 小满一周剧本 + 证据状态机）**，叙事与工程流程参考 AdventureX 2026 获奖作品（见 `docs/hackathon-2026-study.md`）。

> 红线：不诊断、不评分排名、不识别身份（无人脸/声纹）、不做营养估算；mock 全程显著标注「演示数据流 · 非预录实测」。

## 叙事主线（学 Night Watch 反直觉开场 + Syna 一天时间线）

**国家为 0–6 岁安排了 13 次儿保随访，其中 36 月龄到 4 岁之间隔了 12 个月——而成长以「周」为单位发生。摄像头是随访之外每周都在场的观察者。**

产品只承诺三件事：这段拍清了、这个动作家长确认过、这份材料可以带去儿保门诊。

## 快速开始

```bash
npm install
npm run dev            # 开发服务器
npm run build          # tsc 类型检查 + vite 构建
npm run check:discipline  # 表述纪律校验（禁词 grep，出现即失败）
node server/llm-gateway/server.mjs   # 可选 LLM 网关（无 key 时自动降级本地模板）
```

## 架构

```
src/
  types.ts          # Evidence / AppState / Milestone 类型
  core/rules.ts     # 三尖刀目录、WS/T 里程碑、PHRASE 表述函数、FORBIDDEN 禁词表
  core/report.ts    # 证据状态机（candidate→三态确认→confirmed）+ 周报生成
  data/seed.ts      # 小满 26 月龄一周剧本（确定性脚本，非预录）+ 小满的一天时间线
  store.tsx         # localStorage 持久化
  App.tsx           # 手机底部导航 + 桌面侧栏双布局
scripts/
  check-discipline.mjs   # 构建期禁词校验（学 ShiftX 原则检验环节）
server/llm-gateway/
  server.mjs        # 可选 LLM 服务：只做活动文案与沟通摘要，输入限已确认记录
docs/
  hackathon-2026-study.md   # AdventureX 2026 七个获奖作品研究
  blueprint.md              # 产品与技术蓝图（继承自 cn 版）
public/
  deck.html report.html uk-deck.html   # 路演与报告（继承自 cn 版）
```

## 三尖刀

| 尖刀 | 政策锚点 | 旗舰任务 |
| --- | --- | --- |
| 会走（S350 客厅全身机位） | 五健 · 健康骨骼；WS/T 580 大运动能区 | 兔子跳过线（已知物体标定，30 月双脚向前跳，个体进步 Δ） |
| 会说（近端麦克风 + 视觉辅助） | 五健 · 健康心理；WS/T 580 语言能区 | 对话回合 + 家长确认的词/句 Firsts |
| 会吃（S350 餐桌机位） | 五健 · 健康体重；WS/T 479 回应式喂养 | 自主用勺、进餐不看屏、每餐约 20 分钟、追喂识别 |

## LLM 网关边界（学 FinSight「代码计算、AI 解释」）

- 输入只接受 `status === 'confirmed'` 的结构化记录；不接收儿童原始音视频
- 只生成两类文案：下周陪玩活动建议、儿保沟通摘要
- 无 API key 自动降级为本地模板（503 不出现，演示不中断）
- 密钥只走环境变量：`LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL`，永不入库

## 部署

- 静态站：`npm run build` 产物为纯静态，可托管任意静态服务
- LLM 网关：Node 22 兼容，`PORT` 环境变量（默认 8081）

## 合规

《个人信息保护法》最小必要、《儿童个人信息网络保护规定》（14 岁以下监护人同意）、《未成年人网络保护条例》；默认不上云、不用于训练、未确认素材 7 天自动删、敏感场景遮罩、分享可过期撤回。

## 声明

演示数据为虚构示例，非临床试验、非模型实测结果；政策表述以正式文件原文为准。
