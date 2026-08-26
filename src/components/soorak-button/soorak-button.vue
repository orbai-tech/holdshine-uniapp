<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    block?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', block: false, disabled: false },
)

const emit = defineEmits<{ click: []; tap: [] }>()

function onTap() {
  if (props.disabled) return
  emit('click')
  emit('tap')
}
</script>

<template>
  <view
    class="mp-btn"
    :class="[`mp-btn--${variant}`, { 'mp-btn--block': block, 'is-disabled': disabled }]"
    :hover-class="disabled ? '' : 'mp-btn--active'"
    @tap="onTap"
  >
    <slot />
  </view>
</template>

<style lang="scss" scoped>
.mp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  padding: 0 36rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.mp-btn--block {
  display: flex;
  width: 100%;
  box-sizing: border-box;
}

.mp-btn--primary {
  background: $mp-moss;
  color: $mp-paper;
}

.mp-btn--secondary {
  background: transparent;
  box-shadow: inset 0 0 0 1rpx $mp-border;
  color: $mp-text;
}

.mp-btn--ghost {
  min-height: auto;
  padding: 0;
  color: $mp-brass;
  letter-spacing: 0.1em;
}

.mp-btn.is-disabled {
  opacity: 0.45;
}

.mp-btn--active {
  opacity: 0.92;
  transform: scale(0.98);
}

.mp-btn--primary.mp-btn--active {
  background: $mp-moss-deep;
}
</style>
