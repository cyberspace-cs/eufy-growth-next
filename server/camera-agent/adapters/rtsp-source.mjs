/**
 * RTSPSource：预留接入位（未实现）。
 *
 * 方案：ffmpeg 抽帧转 JPEG 序列，管道消费帧差信号。
 *   ffmpeg -rtsp_transport tcp -i <rtsp://...> -vf fps=4,scale=640:-1 -f image2pipe -
 * 注意：本机不编译 ffmpeg；仅在已具备 ffmpeg 的服务器部署路径上生效。
 * 帧差信号计算（与管道契约一致）：
 *   motion = mean(|gray_t - gray_{t-1}|) / 255，浮点 0..1
 */
export function createRTSPSource(/* { url, fps } */) {
  throw new Error('RTSPSource 未实现：需要部署环境具备 ffmpeg（见 docs/camera-agent-architecture.md 第五节）');
}
