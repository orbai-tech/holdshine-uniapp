import path from 'node:path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/** UniApp 编译插件负责根据命令参数输出 H5 或对应小程序产物。 */
export default defineConfig({
  plugins: [uni()],
  esbuild: {
    // 开发模式（真机调试）同样要降级，避免旧版微信 JSCore 无法解析 ?? /?.
    target: 'es2018',
  },
  build: {
    // 生产构建时继续降级，保持与开发模式一致。
    target: 'es2018',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  // host: true 等价于 0.0.0.0，同一局域网内可用本机 IP 访问，而不仅是 localhost
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      // H5 开发把 /api 代理到真实后端；更换后端地址时同步修改 target。
      // 前端接口路径本身带 /api 前缀，因此 rewrite 去掉最外层 /api 后透传。
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: false,
  },
})
