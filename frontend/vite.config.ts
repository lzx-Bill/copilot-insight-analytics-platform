import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载项目根目录的 .env 文件
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  
  const backendPort = env.BACKEND_PORT || '8847'
  const frontendPort = parseInt(env.FRONTEND_PORT || '5173')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: frontendPort,
      host: true,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
