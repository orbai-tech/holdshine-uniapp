import type { App } from 'vue'
import { createPinia } from 'pinia'

/** 全局只创建一个 Pinia 实例，各领域状态拆分到独立 Store。 */
const pinia = createPinia()

/** 由 plugin/index.ts 统一调用并注册 Pinia。 */
export function setup(app: App) {
  app.use(pinia)
}

export default pinia
