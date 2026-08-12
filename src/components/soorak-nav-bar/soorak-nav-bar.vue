<script setup lang="ts">
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useSessionStore } from '@/stores/session'

const props = withDefaults(
  defineProps<{
    title: string
    showBack?: boolean
    showBag?: boolean
  }>(),
  { showBack: false, showBag: true },
)

const session = useSessionStore()
const cart = useCartStore()

// sticky 在自定义组件 + flex 下可能不占文档流，子页内容会顶进状态栏
const statusBarPx = uni.getSystemInfoSync().statusBarHeight || 0
const innerPx = uni.upx2px(88)
const wrapStyle = computed(() => ({
  height: `${statusBarPx + innerPx}px`,
}))
const navStyle = computed(() => ({
  paddingTop: `${statusBarPx}px`,
}))

function onBack() {
  // product sheet 优先关层；子页栈返回用 navigateBack
  if (session.productOpen) {
    session.closeProduct()
    return
  }
  if (props.showBack) uni.navigateBack()
}

function openCart() {
  session.setCartOpen(true)
}
</script>

<template>
  <view class="mp-navbar-wrap" :style="wrapStyle">
    <view class="mp-navbar" :style="navStyle">
      <view class="mp-navbar__inner">
        <view class="mp-navbar__left">
          <view v-if="showBack" class="mp-navbar__back" @click="onBack">‹</view>
          <text v-else class="mp-navbar__brand">元气善筑</text>
        </view>
        <text class="mp-navbar__title">{{ title }}</text>
        <view class="mp-navbar__right">
          <view v-if="showBag" class="mp-navbar__bag" @click="openCart">
            <text>袋</text>
            <text v-if="cart.cartCount > 0" class="mp-navbar__badge">{{ cart.cartCount }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mp-navbar-wrap {
  flex-shrink: 0;
}

.mp-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(247, 244, 238, 0.94);
  border-bottom: 1rpx solid $mp-border;
  z-index: 20;
}

.mp-navbar__inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.mp-navbar__left,
.mp-navbar__right {
  width: 144rpx;
}

.mp-navbar__right {
  display: flex;
  justify-content: flex-end;
}

.mp-navbar__brand {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 24rpx;
  letter-spacing: 0.22em;
  color: $mp-text-2;
}

.mp-navbar__title {
  flex: 1;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
}

.mp-navbar__back {
  font-size: 56rpx;
  line-height: 1;
  width: 64rpx;
  color: $mp-text;
}

.mp-navbar__bag {
  position: relative;
  font-size: 26rpx;
  letter-spacing: 0.1em;
  padding: 12rpx 8rpx;
}

.mp-navbar__badge {
  position: absolute;
  top: 0;
  right: -12rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  background: $mp-brass;
  color: #fff;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
