<script lang="ts">
/** 去掉自定义组件宿主节点，避免微信端 fixed 相对 0 高宿主被裁切 */
export default {
  options: {
    virtualHost: true,
    styleIsolation: 'shared',
  },
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import type { TabUrl } from '@/stores/session'

type TabItem =
  | { text: string; url: TabUrl }
  | { text: string; action: 'cart' }

const TABS: TabItem[] = [
  { text: '首页', url: '/pages/home/index' },
  { text: '购物车', action: 'cart' },
  { text: '选物', url: '/pages/select/index' },
  { text: '我的', url: '/pages/mine/index' },
]

const session = useSessionStore()

/** 微信端 env(safe-area-inset-bottom) 在 root-portal 内常为 0，改用系统 API */
function readSafeBottomPx(): number {
  try {
    const win = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : null
    const fromWin = win?.safeAreaInsets?.bottom
    if (typeof fromWin === 'number' && fromWin > 0) return fromWin
  } catch {
    /* ignore */
  }
  try {
    const sys = uni.getSystemInfoSync()
    const inset = sys.safeAreaInsets?.bottom
    if (typeof inset === 'number' && inset > 0) return inset
    if (sys.safeArea && sys.screenHeight) {
      return Math.max(0, sys.screenHeight - sys.safeArea.bottom)
    }
  } catch {
    /* ignore */
  }
  return 0
}

const barStyle = computed(() => ({
  paddingBottom: `${Math.max(readSafeBottomPx(), 8)}px`,
}))

const activeUrl = computed(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page?.route ? `/${page.route}` : ''
})

function tabKey(tab: TabItem): string {
  if ('action' in tab) return tab.action
  return tab.url
}

function isTabOn(tab: TabItem): boolean {
  if ('action' in tab) return false
  return activeUrl.value === tab.url
}

function onTap(tab: TabItem) {
  if ('action' in tab) {
    if (tab.action === 'cart') {
      session.setCartOpen(true)
    }
    return
  }
  session.goTab(tab.url)
}
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <root-portal>
    <view class="mp-tabbar" :style="barStyle">
      <view
        v-for="tab in TABS"
        :key="tabKey(tab)"
        class="mp-tabbar__item"
        :class="{ 'is-on': isTabOn(tab) }"
        hover-class="mp-tabbar__item--active"
        @click="onTap(tab)"
      >
        <text class="mp-tabbar__label">{{ tab.text }}</text>
      </view>
    </view>
  </root-portal>
  <!-- #endif -->

  <!-- #ifndef MP-WEIXIN -->
  <view class="mp-tabbar" :style="barStyle">
    <view
      v-for="tab in TABS"
      :key="tabKey(tab)"
      class="mp-tabbar__item"
      :class="{ 'is-on': isTabOn(tab) }"
      hover-class="mp-tabbar__item--active"
      @click="onTap(tab)"
    >
      <text class="mp-tabbar__label">{{ tab.text }}</text>
    </view>
  </view>
  <!-- #endif -->
</template>

<style lang="scss">
/* 非 scoped：root-portal 挂到页面根后仍需样式生效 */
.mp-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 900;
  display: flex;
  align-items: stretch;
  background: #ffffff;
  border-top: 1rpx solid rgba(20, 17, 15, 0.1);
  box-sizing: border-box;
}

.mp-tabbar__item {
  flex: 1;
  min-height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mp-tabbar__item--active {
  opacity: 0.72;
}

.mp-tabbar__label {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 28rpx;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: #948c82;
  line-height: 1.2;
}

.mp-tabbar__item.is-on .mp-tabbar__label {
  color: #33473d;
}
</style>
