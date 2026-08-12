<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { useSessionStore } from '@/stores/session'

onLaunch(() => {
  console.info('[SOORAK] 应用启动')
  useSessionStore().restoreSession()
})

onShow(() => {
  console.info('[SOORAK] 应用进入前台')
  void useSessionStore().verifySession()
})

onHide(() => {
  console.info('[SOORAK] 应用进入后台')
})
</script>

<style lang="scss">
@use '@/styles/global.scss';
</style>
