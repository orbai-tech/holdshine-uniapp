import { createSSRApp } from 'vue'
import App from './App.vue'
import setupPlugins from './plugins'

/**
 * UniApp Vue 3 应用入口。全局插件在这里注册，页面无需重复初始化。
 */
export function createApp() {
  const app = createSSRApp(App)
  setupPlugins(app)
  return { app }
}
