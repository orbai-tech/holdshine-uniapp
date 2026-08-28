<script lang="ts">
export default {
  options: {
    virtualHost: true,
    styleIsolation: 'shared',
  },
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import SoorakNavBar from '@/components/soorak-nav-bar/soorak-nav-bar.vue'
import SoorakTabBar from '@/components/soorak-tab-bar/soorak-tab-bar.vue'
import SoorakCartSheet from '@/components/soorak-cart-sheet/soorak-cart-sheet.vue'
import { useSessionStore } from '@/stores/session'

const props = withDefaults(
  defineProps<{
    title: string
    /** 子页 navigateTo 栈返回 */
    showBack?: boolean
    /** 子页自绘 Nav 时关闭内置 Nav，避免叠两层 */
    hideNav?: boolean
    /** 商品详情等全屏子页：不渲染自绘 TabBar */
    hideTabBar?: boolean
  }>(),
  { showBack: false, hideNav: false, hideTabBar: false },
)

const session = useSessionStore()

const showNav = computed(() => !props.hideNav)
const showTabBar = computed(() => session.tabBarVisible && !props.hideTabBar)
</script>

<template>
  <view class="chrome">
    <SoorakNavBar v-if="showNav" :title="props.title" :show-back="props.showBack" />
    <view class="chrome__body" :class="{ 'chrome__body--tab': showTabBar }">
      <slot />
    </view>
    <view v-if="$slots.footer" class="chrome__footer">
      <slot name="footer" />
    </view>
    <SoorakTabBar v-if="showTabBar" />
    <SoorakCartSheet />
  </view>
</template>

<style lang="scss" scoped>
.chrome {
  min-height: 100vh;
  background: $mp-paper;
  display: flex;
  flex-direction: column;
}

.chrome__body {
  flex: 1;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.chrome__body--tab {
  padding-bottom: calc(96rpx + 24rpx + env(safe-area-inset-bottom));
}

.chrome__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  background: $mp-paper;
  box-shadow: 0 -2rpx 12rpx rgba(20, 17, 15, 0.06);
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
</style>
