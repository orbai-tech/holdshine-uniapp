<script setup lang="ts">
defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
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
      <view v-if="$slots.footer" class="mp-sheet__footer">
        <slot name="footer" />
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mp-sheet-root {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
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
  max-height: 88%;
  background: $mp-paper;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
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

.mp-sheet__body {
  flex: 1;
  max-height: 70vh;
}

.mp-sheet__footer {
  flex-shrink: 0;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $mp-border;
  background: rgba(247, 244, 238, 0.96);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}
</style>
