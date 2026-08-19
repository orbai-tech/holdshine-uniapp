import type { App } from 'vue'
import { setup as setupPinia } from './pinia'

/** UniApp 插件统一注册入口；页面注册由 pages.json 管理。 */
const modules = [setupPinia]

export default function setupPlugins(app: App) {
  modules.forEach((setup) => setup(app))
}
