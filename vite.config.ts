import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 开发模式下把 /api 转发给本机摄像头 Agent 服务
      '/api': 'http://localhost:8081',
    },
  },
});
