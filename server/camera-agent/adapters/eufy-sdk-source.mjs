/**
 * EufySDKSource：预留接入位（未实现）。
 *
 * 接入验收清单（来自核心方案第 5 节，全部验证通过前不产生真实里程碑）：
 *  - [ ] 登录与设备列表（Web SDK 支持取流为材料所确认）
 *  - [ ] 前台短时取流稳定（不承诺电池设备全天采集）
 *  - [ ] 视频帧可绘入 canvas（可分析帧导出）
 *  - [ ] 音轨可访问、时间戳、有效帧率
 *  - [ ] 事件主动拉取（无 push 配置）
 *
 * 边界：不发明 API 名称；SDK 文档核对前本文件保持空实现。
 */
export function createEufySDKSource(/* { deviceId, credentialProvider } */) {
  throw new Error('EufySDKSource 未实现：等待现场 SDK 文档核对（见 docs/camera-agent-architecture.md 第五节）');
}
