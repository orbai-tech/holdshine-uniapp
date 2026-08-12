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

defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{ close: [] }>()

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

const safeBottomPx = readSafeBottomPx()
/** 至少留 24px，避免模拟器/无刘海机仍贴底 */
const footerStyle = computed(() => ({
  paddingBottom: `${Math.max(safeBottomPx, 24) + 12}px`,
}))
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <root-portal v-if="open">
    <view class="mp-sheet-root">
      <view class="mp-sheet-mask" @click="emit('close')" />
      <view class="mp-sheet">
        <view class="mp-sheet__bar">
          <text>{{ title }}</text>
          <view class="mp-sheet__close" @click="emit('close')">关闭</view>
        </view>
        <scroll-view scroll-y class="mp-sheet__body">
          <slot />
        </scroll-view>
        <view v-if="$slots.footer" class="mp-sheet__footer" :style="footerStyle">
          <!-- 显式拉满宽度：slot 直接子节点默认按内容收缩，内部 flex:1 会分不到剩余空间 -->
          <view class="mp-sheet__footer-inner">
            <slot name="footer" />
          </view>
        </view>
      </view>
    </view>
  </root-portal>
  <!-- #endif -->

  <!-- #ifndef MP-WEIXIN -->
  <view v-if="open" class="mp-sheet-root">
    <view class="mp-sheet-mask" @click="emit('close')" />
    <view class="mp-sheet">
      <view class="mp-sheet__bar">
        <text>{{ title }}</text>
        <view class="mp-sheet__close" @click="emit('close')">关闭</view>
      </view>
      <scroll-view scroll-y class="mp-sheet__body">
        <slot />
      </scroll-view>
      <view v-if="$slots.footer" class="mp-sheet__footer" :style="footerStyle">
        <view class="mp-sheet__footer-inner">
          <slot name="footer" />
        </view>
      </view>
    </view>
  </view>
  <!-- #endif -->
</template>

<style lang="scss">
/* 非 scoped：root-portal 挂到页面根后仍需样式生效 */
.mp-sheet-root {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  box-sizing: border-box;
}

.mp-sheet-mask {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: $mp-mask;
}

.mp-sheet {
  position: relative;
  width: 100%;
  max-height: 88%;
  background: $mp-paper;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.mp-sheet__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid $mp-border;
  font-size: 24rpx;
  letter-spacing: 0.12em;
  flex-shrink: 0;
}

.mp-sheet__close {
  color: $mp-text-2;
  min-height: 48rpx;
  display: flex;
  align-items: center;
}

/* 微信 scroll-view 不能靠 height:0 + flex 撑开，需显式上限高度 */
.mp-sheet__body {
  flex: 1;
  max-height: 62vh;
}

.mp-sheet__footer {
  flex-shrink: 0;
  width: 100%;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid $mp-border;
  background: rgba(247, 244, 238, 0.96);
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.mp-sheet__footer-inner {
  flex: 1;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* 兜底：若编译仍插入包裹节点，强制 footer 下直接子 view 拉满 */
.mp-sheet__footer > view {
  flex: 1;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
</style>
