import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 部署挂载路径（base）
 * - 本地 dev / 独立端口（8081 根路径）:  EUFY_BASE 不设 → '/'
 * - 子路径部署（/eufy-demo/next/）:      EUFY_BASE=/eufy-demo/next/ npm run build
 *
 * src/App.tsx 里的 API 前缀由 import.meta.env.BASE_URL 派生，
 * 所以两种挂载方式不用改任何业务代码。
 */
const base = process.env.EUFY_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    proxy: {
      // 开发模式下把 /api 转发给本机摄像头 Agent 服务
      '/api': 'http://localhost:8081',
    },
  },
});
