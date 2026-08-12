import path from 'node:path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/** UniApp 编译插件负责根据命令参数输出 H5 或对应小程序产物。 */
export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  // host: true 等价于 0.0.0.0，同一局域网内可用本机 IP 访问，而不仅是 localhost
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3780',
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
