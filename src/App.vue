<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { useSessionStore } from '@/stores/session'

onLaunch(() => {
  console.info('[元气善筑] 应用启动')
  const session = useSessionStore()
  session.restoreSession()
  session.hideNativeTabBar()
})

onShow(() => {
  console.info('[元气善筑] 应用进入前台')
  const session = useSessionStore()
  session.hideNativeTabBar()
  void session.verifySession()
})

onHide(() => {
  console.info('[元气善筑] 应用进入后台')
})
</script>

<style lang="scss">
@use '@/styles/global.scss';
</style>
