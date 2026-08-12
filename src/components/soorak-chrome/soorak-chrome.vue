<script setup lang="ts">
import { computed } from 'vue'
import SoorakNavBar from '@/components/soorak-nav-bar/soorak-nav-bar.vue'
import SoorakTabBar from '@/components/soorak-tab-bar/soorak-tab-bar.vue'
import SoorakProductSheet from '@/components/soorak-product-sheet/soorak-product-sheet.vue'
import SoorakCartSheet from '@/components/soorak-cart-sheet/soorak-cart-sheet.vue'
import { useSessionStore } from '@/stores/session'

const props = defineProps<{
  title: string
}>()

const session = useSessionStore()

const navTitle = computed(() => (session.productOpen ? '商品详情' : props.title))
const showTabBar = computed(() => session.tabBarVisible)
</script>

<template>
  <view class="chrome">
    <SoorakNavBar :title="navTitle" :show-back="session.productOpen" />
    <view class="chrome__body" :class="{ 'chrome__body--tab': showTabBar }">
      <slot />
    </view>
    <SoorakTabBar v-if="showTabBar" />
    <SoorakProductSheet />
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
</style>
