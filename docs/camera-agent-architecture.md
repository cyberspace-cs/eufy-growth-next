# 摄像头 Agent 处理架构

> 状态：mock 信号源全链路可运行；eufy SDK / RTSP 适配器为预留接口位（未接入前不产生真实里程碑）。

## 一、设计原则（对照 AdventureX 2026 获奖作品）

| 原则 | 来源作品 | 在本项目的落地 |
|---|---|---|
| 实时信号 → 置信度 → 决策，全程留痕 | Night Watch（YOLOv8 + 决策日志） | 每个 candidate 附 confidence 与审计事件流 |
| 确定性计算交给代码，LLM 只负责解释 | FinSight | 判定层是纯代码状态机；LLM 网关只做文案 |
| 同意优先，会话由家长开启/结束 | Night Watch | 会话必须家长显式 start/stop，不后台常开 |
| 双端实时同步 | 冰箱精灵（MQTT） | SSE 推送（HTTP 直通，无需 WebSocket 升级） |
| 主路/旁路分离 | Fiona（双模型架构） | 判定主路（规则）与表述旁路（LLM）物理隔离 |
| 无法测量保留原因，不写零分 | 核心方案 2.2 节 | 多声源/遮挡 → unjudgeable + 原因文案 |

## 二、分层管道

```
采集层   adapters/   MockSource（确定性脚本信号）· EufySDKSource（预留）· RTSPSource（预留）
   ↓ 信号流（motion / audio / utensil 事件，带时间戳）
信号层   pipeline/  walk.mjs：帧间运动量 → 跳跃状态机
                    talk.mjs：VAD 语音活动段 → 回合计数
                    eat.mjs：餐具运动周期 + 屏幕标志 + 会话时长
   ↓ 状态机迁移事件（standing → possible_takeoff → airborne → landing → review）
判定层   engine.mjs 纯代码：阈值 + 时序 + 标定换算（disp_px × calibCm/calibPx）
   ↓ candidate 事件（confidence、note、来源标签 demo-mock-signal）
证据层   index.mjs 会话内事件存储 + 审计日志 + SSE 实时推送
   ↓ 家长三态确认（REST）
表述层   PHRASE 函数（确定性文案）+ llm-gateway（可选 LLM 润色，只收 confirmed）
```

### 关键决策

1. **判定永远不经过 LLM。** 跳跃检测是状态机 + 阈值；距离是单应标定换算。LLM 拿到的输入只有已确认的结构化记录（FinSight 模式）。
2. **会话制而非常开制。** 学 Night Watch 的同意优先：家长点「开始一次活动」才有采集，会话结束即停。默认不在卧室/浴室起会话。
3. **信号与判定分离。** 适配器只吐信号（可替换成真实 SDK 帧），管道只吃信号（可用录制的信号回放测试）。将来接 eufy Web SDK 时只改 adapters/，管道零改动。
4. **诚实降级。** 多声源 → 直接 unjudgeable；落地帧模糊 → 降低置信度并注明；无 LLM key → 本地模板。永远不静默冒充。
5. **SSE 而非 WebSocket。** 服务器推送用 Server-Sent Events，纯 HTTP，任何静态网关都能穿透，不需要协议升级。

## 三、API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/health | 服务与信号源状态 |
| POST | /api/session/start | `{blade}` 开启一次采集会话（walk/talk/eat） |
| POST | /api/session/stop | 结束当前会话 |
| GET | /api/stream | SSE：signal / state / candidate / session-end 事件流 |
| GET | /api/candidates | 当前会话候选列表 |
| POST | /api/candidates/:id/confirm | `{tri}` 家长三态确认 |

## 四、演示剧本（mock 信号源）

- 会走：3 次跳跃，位移 58/61/47 px，第三次落地帧模糊（置信度降到 0.77 以下）
- 会说：6 个一来一回语音段 + 1 段双声源重叠（触发 unjudgeable，保留原因）
- 会吃：21 分钟会话，前段自主用勺周期高、后段成人喂、中段屏幕出现 8 分钟

全部信号为确定性脚本生成，事件流显著标注 `demo-mock-signal`。

## 五、未实现与预留（诚实边界）

- EufySDKSource：等现场 SDK 文档，验证登录、取流、帧导出、音轨后实现；不发明 API 名称
- RTSPSource：ffmpeg 抽帧方案已写明参数，但本机不编译 ffmpeg，仅在服务器部署路径上生效
- 儿童语音角色分离（谁在说话）不做：VAD 只测语音活动，回合归属需家长在共读会话中背书
- 测距模式的地面单应标定（四角点选）在核心方案 6.1 节，前端标定 UI 未实现
