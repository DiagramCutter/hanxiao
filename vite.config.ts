import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
      vue(),
      {
        name: 'configure-response-headers',
        configureServer: (server) => {
          server.middlewares.use((req, res, next) => {
            if (req.url?.includes('/models/')) {
              res.setHeader('Cache-Control', 'public, max-age=3600')
            }
            next()
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0', // 服务器地址
      open: env.VITE_OPEN === 'true', // 是否自动打开浏览器
      port: 63434,
      proxy: {
        '/api': {
          target: env.VITE_ADMIN_PROXY_PATH, // 目标服务器地址
          changeOrigin: true, // 是否修改请求头中的 Origin 字段
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
